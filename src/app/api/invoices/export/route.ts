import { getSessionContext, requireRole, VIEW_ROLES } from "@/lib/server-context";
import { prisma } from "@/lib/prisma";
import { generateSanitizedCsv } from "@/lib/security";
import { writeAudit } from "@/lib/audit";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const forbidden = requireRole(ctx, VIEW_ROLES);
  if (forbidden) {
    return NextResponse.json({ error: forbidden.error }, { status: forbidden.status });
  }

  const invoices = await prisma.invoice.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { dueDate: "asc" },
    include: {
      customer: {
        select: {
          name: true,
          email: true,
          phone: true,
          gstin: true,
        },
      },
    },
  });

  const columns = [
    { key: "invoiceNumber", label: "Invoice Number" },
    { key: "customerName", label: "Customer Name" },
    { key: "customerGstin", label: "Customer GSTIN" },
    { key: "customerEmail", label: "Customer Email" },
    { key: "customerPhone", label: "Customer Phone" },
    { key: "invoiceDate", label: "Invoice Date" },
    { key: "dueDate", label: "Due Date" },
    { key: "amount", label: "Invoice Amount (INR)" },
    { key: "outstandingAmount", label: "Outstanding (INR)" },
    { key: "status", label: "Status" },
  ];

  const data = invoices.map((inv) => {
    const amt = Number(inv.amount);
    const outstanding = Number(inv.outstandingAmount);
    return {
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer.name,
      customerGstin: inv.customer.gstin || "",
      customerEmail: inv.customer.email || "",
      customerPhone: inv.customer.phone || "",
      invoiceDate: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split("T")[0] : "",
      dueDate: new Date(inv.dueDate).toISOString().split("T")[0],
      amount: amt,
      outstandingAmount: outstanding,
      status: inv.status,
    };
  });

  const csv = generateSanitizedCsv(columns, data);

  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "DATA_EXPORT",
      entityType: "invoices",
      metadata: { count: invoices.length, format: "CSV" },
    },
    req
  );

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="duespilot-invoices-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
