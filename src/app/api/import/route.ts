import { err, ok, readJson, requireRole, withAuth } from "@/lib/server-context";
import { importReceivables } from "@/lib/repo";
import { MANAGE_ROLES } from "@/lib/server-context";
import { writeAudit } from "@/lib/audit";
import type { ImportColumnMapping } from "@/lib/types";

const REQUIRED_FIELDS: (keyof ImportColumnMapping)[] = [
  "customerName",
  "invoiceNumber",
  "dueDate",
  "amount",
];

export const POST = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, MANAGE_ROLES);
  if (forbidden) return forbidden;

  const body = (await readJson(req)) as {
    rows?: Record<string, string>[];
    mapping?: ImportColumnMapping;
  } | null;

  const rows = body?.rows;
  const mapping = body?.mapping;
  if (!Array.isArray(rows) || rows.length === 0) {
    return err("No rows to import", 400);
  }
  if (!mapping || typeof mapping !== "object") {
    return err("Missing column mapping", 400);
  }
  const missing = REQUIRED_FIELDS.filter(
    (f) => typeof mapping[f] !== "string" || mapping[f].trim() === ""
  );
  if (missing.length > 0) {
    return err(`Missing required mapping: ${missing.join(", ")}`, 400);
  }
  // Cap payload size defensively.
  if (rows.length > 5000) {
    return err("Too many rows. Please split your file into batches of 5000.", 400);
  }

  const result = await importReceivables(
    ctx.organizationId,
    rows,
    mapping,
    req.headers.get("idempotency-key")
  );

  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "IMPORT_RECEIVABLES",
      entityType: "organization",
      entityId: ctx.organizationId,
      metadata: {
        rows: rows.length,
        invoicesCreated: result.invoicesCreated,
        customersCreated: result.customersCreated,
        skippedRows: result.skippedRows,
      },
    },
    req
  );

  return ok(result, 201);
});
