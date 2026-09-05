import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export type Tx = Prisma.TransactionClient;

/**
 * Run a function inside a single database transaction. All writes in the
 * function succeed or none do — used for imports, payment allocation, and
 * promise transitions so financial state can never be left half-written.
 */
export async function withTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}