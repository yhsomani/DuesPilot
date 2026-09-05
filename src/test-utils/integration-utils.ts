import { prisma } from "@/lib/prisma";
import type { ImportColumnMapping } from "@/lib/types";

export const MAPPING: ImportColumnMapping = {
  customerName: "customer",
  invoiceNumber: "invoiceNumber",
  invoiceDate: "invoiceDate",
  dueDate: "dueDate",
  amount: "amount",
  outstanding: "outstanding",
  email: "email",
  phone: "phone",
};

export function daysFromNowISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export function isoFrom(date: Date): string {
  return date.toISOString();
}

let seq = 0;

export async function createTestOrg(namePrefix: string): Promise<{ id: string; name: string }> {
  const name = `${namePrefix}-${process.pid}-${Date.now()}-${seq++}`;
  const org = await prisma.organization.create({ data: { name } });
  return { id: org.id, name: org.name };
}

export async function cleanupOrgs(orgIds: string[]): Promise<void> {
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
}