import {
  err,
  ok,
  readJson,
  requireRole,
  withAuth,
} from "@/lib/server-context";
import { ACTION_ROLES } from "@/lib/server-context";
import { createCollectionEvent } from "@/lib/collections";
import { z } from "zod";

const VALID_TYPES = [
  "CALL",
  "EMAIL",
  "WHATSAPP",
  "SMS",
  "MEETING",
  "NOTE",
  "REMINDER",
];

const schema = z.object({
  customerId: z.string().min(1),
  invoiceId: z.string().optional().nullable(),
  type: z.enum(VALID_TYPES as [string, ...string[]]),
  description: z.string().min(1).max(2000),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const POST = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const event = await createCollectionEvent(
    ctx.organizationId,
    ctx.userId,
    parsed.data
  );
  return ok(event, 201);
});