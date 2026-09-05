import {
  err,
  ok,
  readJson,
  requireRole,
  withAuth,
} from "@/lib/server-context";
import { ACTION_ROLES } from "@/lib/server-context";
import { createDispute } from "@/lib/collections";
import { listDisputes } from "@/lib/repo";
import { z } from "zod";

const CATEGORIES = [
  "pricing",
  "quantity",
  "quality",
  "po_mismatch",
  "grn_missing",
  "tax_gst",
  "documentation",
  "delivery",
  "credit_note",
  "other",
];

const schema = z.object({
  invoiceId: z.string().min(1),
  reason: z.string().min(3).max(500),
  category: z.enum(CATEGORIES as [string, ...string[]]).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const GET = withAuth(async (_req, ctx) => {
  const disputes = await listDisputes(ctx.organizationId);
  return ok(disputes);
});

export const POST = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  await createDispute(ctx.organizationId, ctx.userId, parsed.data);
  return ok({ created: true }, 201);
});