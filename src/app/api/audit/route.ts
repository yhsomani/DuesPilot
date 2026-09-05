import { withAuth, VIEW_ROLES, requireRole, ok } from "@/lib/server-context";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, VIEW_ROLES);
  if (forbidden) return forbidden;

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const entityType = url.searchParams.get("entityType");
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 50));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);

  const where: {
    organizationId: string;
    action?: string;
    entityType?: string;
  } = {
    organizationId: ctx.organizationId,
  };

  if (action) where.action = action;
  if (entityType) where.entityType = entityType;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const userIds = Array.from(
    new Set(logs.map((l) => l.userId).filter((id): id is string => Boolean(id)))
  );

  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, role: true },
        })
      : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  return ok({
    logs: logs.map((log) => {
      const user = log.userId ? userMap.get(log.userId) : null;
      return {
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
        user: user
          ? {
              id: user.id,
              name: user.name || user.email,
              email: user.email,
              role: user.role,
            }
          : null,
      };
    }),
    total,
    limit,
    offset,
  });
});
