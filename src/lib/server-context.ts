import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";

export const ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  FINANCE_MANAGER: "FINANCE_MANAGER",
  COLLECTOR: "COLLECTOR",
  SALES: "SALES",
  VIEWER: "VIEWER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Roles allowed to perform mutating collection actions.
export const ACTION_ROLES: Role[] = [
  ROLES.OWNER,
  ROLES.ADMIN,
  ROLES.FINANCE_MANAGER,
  ROLES.COLLECTOR,
];

// Roles allowed to manage organization settings/imports/integrations.
export const MANAGE_ROLES: Role[] = [ROLES.OWNER, ROLES.ADMIN];

export interface SessionContext {
  userId: string;
  organizationId: string;
  role: Role;
}

/** Resolve the authenticated session and ensure the user belongs to an organization. */
export async function getSessionContext(): Promise<SessionContext | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.organizationId || !session.user.role) {
    return null;
  }
  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    role: session.user.role as Role,
  };
}

type HandlerResult =
  | { ok: true; data: unknown; status?: number; headers?: Record<string, string> }
  | { ok: false; error: string; status: number };

type Params = Record<string, string>;

type Handler = (
  req: NextRequest,
  ctx: SessionContext,
  params: Params
) => Promise<HandlerResult> | HandlerResult;

/**
 * Wrap a route handler with authentication + tenant isolation.
 * Next.js invokes handlers as `(request, { params })` where params is a
 * Promise; we resolve the session and await params before delegating.
 * `unknown` is used so Next's per-route params types are accepted.
 */
export function withAuth(handler: Handler) {
  return async (
    req: NextRequest,
    routeCtx: { params: Promise<unknown> }
  ) => {
    const params = (await routeCtx.params) as Params;
    const ctx = await getSessionContext();
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const result = await handler(req, ctx, params);
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }
      if (result.status === 204 || result.status === 201) {
        return new NextResponse(null, { status: result.status });
      }
      return NextResponse.json({ data: result.data }, { status: result.status });
    } catch (e) {
      console.error("[api]", e);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 }
      );
    }
  };
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function ok<T>(data: T, status = 200): HandlerResult {
  return { ok: true, data, status };
}

export function noContent(status: number): HandlerResult {
  return { ok: true, data: null, status };
}

export function err(message: string, status: number): HandlerResult {
  return { ok: false, error: message, status };
}

export function requireRole(
  ctx: SessionContext,
  allowed: Role[]
): HandlerResult | null {
  if (!allowed.includes(ctx.role)) {
    return err("You do not have permission to perform this action", 403);
  }
  return null;
}
