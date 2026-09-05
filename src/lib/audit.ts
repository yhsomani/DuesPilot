import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export interface AuditInput {
  organizationId: string;
  userId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

function clientIp(
  forwarded: string | null,
  cfConnecting: string | null
): string | null {
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return cfConnecting?.trim() ?? null;
}

/**
 * Write an audit log row. Audit failures must never break the main
 * operation, so failures are logged and swallowed.
 */
export async function writeAudit(
  ctx: AuditInput,
  req?: { headers: Headers }
): Promise<void> {
  try {
    const ip = req?.headers
      ? clientIp(
          req.headers.get("x-forwarded-for"),
          req.headers.get("cf-connecting-ip")
        )
      : null;
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        action: ctx.action,
        entityType: ctx.entityType,
        entityId: ctx.entityId,
        metadata: (ctx.metadata as Prisma.InputJsonValue) ?? undefined,
        ipAddress: ip,
      },
    });
  } catch (e) {
    console.error("[audit] write failed:", e);
  }
}