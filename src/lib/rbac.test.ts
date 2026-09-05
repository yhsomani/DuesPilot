import { describe, it, expect } from "vitest";
import {
  ACTION_ROLES,
  MANAGE_ROLES,
  ROLES,
  requireRole,
  type SessionContext,
} from "@/lib/rbac";

function ctx(role: SessionContext["role"]): SessionContext {
  return { userId: "u-test", organizationId: "org-test", role };
}

describe("requireRole (server-context re-export)", () => {
  it("allows ACTION_ROLES for collection mutations and denies sales/viewer", () => {
    for (const role of ACTION_ROLES) {
      expect(requireRole(ctx(role), ACTION_ROLES)).toBeNull();
    }
    for (const role of [ROLES.SALES, ROLES.VIEWER]) {
      expect(requireRole(ctx(role), ACTION_ROLES)).toEqual(
        expect.objectContaining({ ok: false, status: 403 })
      );
    }
  });

  it("allows only OWNER and ADMIN for imports and settings", () => {
    expect(requireRole(ctx(ROLES.OWNER), MANAGE_ROLES)).toBeNull();
    expect(requireRole(ctx(ROLES.ADMIN), MANAGE_ROLES)).toBeNull();
    for (const role of [
      ROLES.FINANCE_MANAGER,
      ROLES.COLLECTOR,
      ROLES.SALES,
      ROLES.VIEWER,
    ]) {
      expect(requireRole(ctx(role), MANAGE_ROLES)).toEqual(
        expect.objectContaining({ ok: false, status: 403 })
      );
    }
  });

  it("reserves OWNER-only operations for OWNER", () => {
    const OWNER_ONLY = [ROLES.OWNER];
    expect(requireRole(ctx(ROLES.OWNER), OWNER_ONLY)).toBeNull();
    for (const role of [
      ROLES.ADMIN,
      ROLES.FINANCE_MANAGER,
      ROLES.COLLECTOR,
      ROLES.SALES,
      ROLES.VIEWER,
    ]) {
      expect(requireRole(ctx(role), OWNER_ONLY)).toMatchObject({ status: 403 });
    }
  });

  it("always returns a denial when no role is permitted", () => {
    expect(requireRole(ctx(ROLES.VIEWER), [])).toEqual({
      ok: false,
      error: "You do not have permission to perform this action",
      status: 403,
    });
  });
});