import {
  err,
  ok,
  readJson,
  requireRole,
  withAuth,
  ACTION_ROLES,
} from "@/lib/server-context";
import { extractPromiseFromCommunication } from "@/lib/copilot";
import { z } from "zod";

const extractSchema = z.object({
  text: z.string().min(1, "Communication text is required"),
});

export const POST = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, ACTION_ROLES);
  if (forbidden) return forbidden;

  const body = await readJson(req);
  const parsed = extractSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input", 400);
  }

  const result = await extractPromiseFromCommunication(parsed.data.text);
  return ok(result);
});
