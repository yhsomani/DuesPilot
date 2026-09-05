import { withAuth, VIEW_ROLES, requireRole } from "@/lib/server-context";
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
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return Response.json({
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
      user: log.user
        ? {
            id: log.user.id,
            name: log.user.name || log.user.email,
            email: log.user.email,
            role: log.user.role,
          }
        : null,
    })),
    total,
    limit,
    offset,
  });
});
