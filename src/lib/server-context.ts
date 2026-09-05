import { auth } from "@/lib/auth";
import { NextResponse, type NextRequest } from "next/server";
import { DomainError } from "@/lib/errors";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { randomUUID } from "crypto";

function requestId(req: NextRequest): string {
  return (
    req.headers.get("x-request-id") ??
    req.headers.get("x-correlation-id") ??
    randomUUID()
  );
}

export function structuredLog(
  level: "info" | "warn" | "error",
  fields: Record<string, string>
) {
  const line = JSON.stringify({ level, ts: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export {
  ROLES,
  ACTION_ROLES,
  MANAGE_ROLES,
  requireRole,
} from "@/lib/rbac";
export type { Role, SessionContext } from "@/lib/rbac";
import type { Role, SessionContext } from "@/lib/rbac";

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
    const rid = requestId(req);
    const start = performance.now();
    const params = (await routeCtx.params) as Params;
    const ctx = await getSessionContext();
    if (!ctx) {
      structuredLog("info", {
        rid,
        msg: "request.unauthorized",
        method: req.method,
        path: req.nextUrl.pathname,
      });
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "x-request-id": rid } }
      );
    }
    // Global guard on authenticated mutating calls (per user, per endpoint).
    const method = req.method ?? "GET";
    const respond = (status: number, body: unknown, headers?: Record<string, string>) => {
      const res = NextResponse.json(body, {
        status,
        headers: { "x-request-id": rid, ...headers },
      });
      const durationMs = Math.round(performance.now() - start);
      structuredLog(
        status >= 500 ? "error" : status >= 400 ? "warn" : "info",
        {
          rid,
          msg: "request",
          method,
          path: req.nextUrl.pathname,
          status: String(status),
          durationMs: String(durationMs),
          orgId: ctx.organizationId,
          userId: ctx.userId,
          role: ctx.role,
        }
      );
      return res;
    };
    if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
      const blocked = rateLimit(clientKey(ctx.userId, req.nextUrl.pathname), {
        limit: 300,
        windowMs: 60 * 1000,
      });
      if (!blocked.allowed) {
        return respond(429, { error: "Too many requests. Please slow down." });
      }
    }
    try {
      const result = await handler(req, ctx, params);
      if (!result.ok) {
        return respond(result.status, { error: result.error });
      }
      if (result.status === 204 || result.status === 201) {
        const res = new NextResponse(null, {
          status: result.status,
          headers: { "x-request-id": rid, ...result.headers },
        });
        const durationMs = Math.round(performance.now() - start);
        structuredLog("info", {
          rid,
          msg: "request",
          method,
          path: req.nextUrl.pathname,
          status: String(result.status),
          durationMs: String(durationMs),
          orgId: ctx.organizationId,
          userId: ctx.userId,
          role: ctx.role,
        });
        return res;
      }
      return respond(result.status ?? 200, { data: result.data }, result.headers);
    } catch (e) {
      if (e instanceof DomainError) {
        return respond(e.status, { error: e.message });
      }
      structuredLog("error", {
        rid,
        msg: "request.error",
        method,
        path: req.nextUrl.pathname,
        orgId: ctx.organizationId,
        userId: ctx.userId,
        error: e instanceof Error ? e.message : String(e),
      });
      return respond(500, {
        error: "Something went wrong. Please try again.",
      });
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
