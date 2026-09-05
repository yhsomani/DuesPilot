import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function syncUsersCount(organizationId: string): Promise<void> {
  const count = await prisma.user.count({ where: { organizationId } });
  await prisma.organization.update({
    where: { id: organizationId },
    data: { usersCount: count },
  });
}

export async function countOwnersTxn(
  tx: Pick<PrismaClient, "user">,
  organizationId: string
): Promise<number> {
  return tx.user.count({ where: { organizationId, role: "OWNER" } });
}