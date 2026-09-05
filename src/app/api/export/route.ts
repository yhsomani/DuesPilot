import { NextRequest, NextResponse } from "next/server";
import { getSessionContext, structuredLog } from "@/lib/server-context";
import { exportOrganizationData } from "@/lib/repo";
import { randomUUID } from "crypto";

const CSV_SAFE = /[",\n\r]/;

function toCsvRows(headers: string[], rows: unknown[][]) {
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return CSV_SAFE.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

export async function GET(req: NextRequest) {
  const rid = req.headers.get("x-request-id") ?? randomUUID();
  const start = performance.now();
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const format = req.nextUrl.searchParams.get("format");
  try {
    const data = await exportOrganizationData(ctx.organizationId);
    structuredLog("info", {
      rid,
      msg: "export.ok",
      format: format ?? "csv",
      orgId: ctx.organizationId,
      durationMs: String(Math.round(performance.now() - start)),
    });

    if (format === "json") {
      return new Response(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="duespilot-export-${data.exportedAt.slice(0, 10)}.json"`,
        },
      });
    }

    const orgName = data.organization?.name ?? "organization";
    const parts: string[] = [];

    parts.push("# DuesPilot data export - " + orgName);
    parts.push(`exported_at,${data.exportedAt}`);
    parts.push("");

    parts.push("## customers");
    parts.push(
      toCsvRows(
        ["id", "name", "email", "phone", "gstin", "status", "totalOutstanding", "totalOverdue", "riskScore", "notes", "lastPaymentAt", "createdAt"],
        data.customers.map((c) => [
          c.id, c.name, c.email, c.phone, c.gstin, c.status,
          c.totalOutstanding, c.totalOverdue, c.riskScore ?? "", c.notes, c.lastPaymentAt, c.createdAt,
        ])
      )
    );
    parts.push("");

    parts.push("## invoices");
    parts.push(
      toCsvRows(
        ["id", "customerId", "invoiceNumber", "invoiceDate", "dueDate", "amount", "outstandingAmount", "status", "currency", "source", "externalId", "notes"],
        data.invoices.map((i) => [
          i.id, i.customerId, i.invoiceNumber, i.invoiceDate, i.dueDate,
          i.amount, i.outstandingAmount, i.status, i.currency, i.source, i.externalId, i.notes,
        ])
      )
    );
    parts.push("");

    parts.push("## invoiceItems");
    parts.push(
      toCsvRows(
        ["id", "invoiceId", "description", "quantity", "unitPrice", "taxRate", "amount"],
        data.invoiceItems.map((i) => [i.id, i.invoiceId, i.description, i.quantity, i.unitPrice, i.taxRate, i.amount])
      )
    );
    parts.push("");

    parts.push("## payments");
    parts.push(
      toCsvRows(
        ["id", "customerId", "reference", "amount", "paymentDate", "mode", "status", "createdAt"],
        data.payments.map((p) => [p.id, p.customerId, p.reference, p.amount, p.paymentDate, p.mode, p.status, p.createdAt])
      )
    );
    parts.push("");

    parts.push("## allocations");
    parts.push(
      toCsvRows(
        ["id", "paymentId", "invoiceId", "amount", "createdAt"],
        data.allocations.map((a) => [a.id, a.paymentId, a.invoiceId, a.amount, a.createdAt])
      )
    );
    parts.push("");

    parts.push("## promises");
    parts.push(
      toCsvRows(
        ["id", "customerId", "invoiceId", "amount", "promiseDate", "confidence", "status", "source", "note", "createdAt"],
        data.promises.map((p) => [p.id, p.customerId, p.invoiceId, p.amount, p.promiseDate, p.confidence, p.status, p.source, p.note, p.createdAt])
      )
    );
    parts.push("");

    parts.push("## disputes");
    parts.push(
      toCsvRows(
        ["id", "invoiceId", "reason", "category", "status", "notes", "createdAt", "resolvedAt"],
        data.disputes.map((d) => [d.id, d.invoiceId, d.reason, d.category, d.status, d.notes, d.createdAt, d.resolvedAt])
      )
    );
    parts.push("");

    parts.push("## collectionEvents");
    parts.push(
      toCsvRows(
        ["id", "customerId", "invoiceId", "type", "description", "metadata", "createdAt", "createdById"],
        data.collectionEvents.map((e) => [e.id, e.customerId, e.invoiceId, e.type, e.description, e.metadata, e.createdAt, e.createdById])
      )
    );
    parts.push("");

    parts.push("## contacts");
    parts.push(
      toCsvRows(
        ["id", "customerId", "name", "designation", "phone", "email", "isPrimary", "createdAt"],
        data.contacts.map((c) => [c.id, c.customerId, c.name, c.designation, c.phone, c.email, c.isPrimary, c.createdAt])
      )
    );
    parts.push("");

    return new Response(parts.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="duespilot-export-${data.exportedAt.slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    structuredLog("error", {
      rid,
      msg: "export.error",
      orgId: ctx.organizationId,
      error: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}