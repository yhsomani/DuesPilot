/**
 * Pure role-based access-control definitions. Kept free of Next.js and
 * database imports so the policy matrix can be unit-tested anywhere.
 */
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

// All authenticated roles allowed to view data.
export const VIEW_ROLES: Role[] = Object.values(ROLES);

export interface SessionContext {
  userId: string;
  organizationId: string;
  role: Role;
}

export type DenyResult = { ok: false; error: string; status: number };

/**
 * Role gate shared by mutating API routes. Returns null when the caller's
 * role is allowed, otherwise a 403 response shape to be returned as-is.
 */
export function requireRole(
  ctx: SessionContext,
  allowed: Role[]
): DenyResult | null {
  if (!allowed.includes(ctx.role)) {
    return {
      ok: false,
      error: "You do not have permission to perform this action",
      status: 403,
    };
  }
  return null;
}