import type { Prisma } from "@/generated/prisma/client";
import { BusinessRuleError } from "@/lib/errors";

export type Tx = Prisma.TransactionClient;

/**
 * Record an idempotency key inside an open transaction, atomically with the
 * mutating write it guards. If the same (organization, key) was already
 * recorded by a previously committed transaction, a unique-violation is
 * raised and surfaced as a 409 so duplicate submissions (double-clicks,
 * retried network requests after a lost response) are rejected instead of
 * double-applied. Because the key is created INSIDE the mutation's
 * transaction, a failed operation rolls the key back too, so a retry after a
 * real failure is allowed.
 */
export async function consumeIdempotencyKey(
  tx: Tx,
  organizationId: string,
  key: string | null | undefined,
  action: string
): Promise<void> {
  if (!key) return;
  try {
    await tx.idempotencyKey.create({
      data: { organizationId, key, action },
    });
  } catch (e) {
    if (
      typeof e === "object" &&
      e !== null &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      throw new BusinessRuleError(
        "This request was already processed. Use a new idempotency key.",
        409
      );
    }
    throw e;
  }
}