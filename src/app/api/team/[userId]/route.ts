import {
  err,
  ok,
  readJson,
  requireRole,
  withAuth,
  ROLES,
} from "@/lib/server-context";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import { syncUsersCount } from "@/lib/team";
import { z } from "zod";

const roleSchema = z.object({
  role: z.enum([
    "OWNER",
    "ADMIN",
    "FINANCE_MANAGER",
    "COLLECTOR",
    "SALES",
    "VIEWER",
  ]),
});

export const PATCH = withAuth(async (req, ctx, params) => {
  const forbidden = requireRole(ctx, [ROLES.OWNER, ROLES.ADMIN]);
  if (forbidden) return forbidden;

  const targetId = params?.userId || params?.id;
  if (!targetId) return err("Missing user id", 400);

  const body = await readJson(req);
  const parsed = roleSchema.safeParse(body);
  if (!parsed.success) return err("Invalid role", 400);

  const target = await prisma.user.findFirst({
    where: { id: targetId, organizationId: ctx.organizationId },
    select: { id: true, email: true, role: true },
  });
  if (!target) return err("Member not found", 404);

  if (parsed.data.role === target.role) {
    return ok({ id: target.id, role: target.role });
  }

  if (target.role === ROLES.OWNER && parsed.data.role !== ROLES.OWNER) {
    const ownerCount = await prisma.user.count({
      where: { organizationId: ctx.organizationId, role: ROLES.OWNER },
    });
    if (ownerCount <= 1) {
      return err("You cannot demote the last owner", 400);
    }
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { role: parsed.data.role },
    select: { id: true, email: true, role: true },
  });

  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "ROLE_CHANGE",
      entityType: "user",
      entityId: target.id,
      metadata: { email: target.email, from: target.role, to: updated.role },
    },
    req
  );

  return ok({ id: updated.id, email: updated.email, role: updated.role });
});

export const DELETE = withAuth(async (req, ctx, params) => {
  const forbidden = requireRole(ctx, [ROLES.OWNER]);
  if (forbidden) return forbidden;

  const targetId = params?.userId || params?.id;
  if (!targetId) return err("Missing user id", 400);
  if (targetId === ctx.userId) {
    return err("You cannot remove your own account this way", 400);
  }

  const target = await prisma.user.findFirst({
    where: { id: targetId, organizationId: ctx.organizationId },
    select: { id: true, email: true, role: true },
  });
  if (!target) return err("Member not found", 404);

  if (target.role === ROLES.OWNER) {
    const ownerCount = await prisma.user.count({
      where: { organizationId: ctx.organizationId, role: ROLES.OWNER },
    });
    if (ownerCount <= 1) {
      return err("You cannot remove the last owner", 400);
    }
  }

  await prisma.user.delete({ where: { id: target.id } });
  await syncUsersCount(ctx.organizationId);

  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "TEAM_REMOVE",
      entityType: "user",
      entityId: target.id,
      metadata: { email: target.email, role: target.role },
    },
    req
  );

  return ok({ removed: true });
});