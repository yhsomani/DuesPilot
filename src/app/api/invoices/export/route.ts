import { withAuth, VIEW_ROLES, requireRole } from "@/lib/server-context";
import { prisma } from "@/lib/prisma";
import { generateSanitizedCsv } from "@/lib/security";
import { writeAudit } from "@/lib/audit";

export const GET = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, VIEW_ROLES);
  if (forbidden) return forbidden;

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
    { key: "issueDate", label: "Issue Date" },
    { key: "dueDate", label: "Due Date" },
    { key: "amount", label: "Invoice Amount (INR)" },
    { key: "amountPaid", label: "Amount Paid (INR)" },
    { key: "outstanding", label: "Outstanding (INR)" },
    { key: "status", label: "Status" },
  ];

  const data = invoices.map((inv) => {
    const amt = Number(inv.amount);
    const paid = Number(inv.amountPaid);
    const outstanding = Math.max(0, amt - paid);
    return {
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customer.name,
      customerGstin: inv.customer.gstin || "",
      customerEmail: inv.customer.email || "",
      customerPhone: inv.customer.phone || "",
      issueDate: inv.issueDate ? new Date(inv.issueDate).toISOString().split("T")[0] : "",
      dueDate: new Date(inv.dueDate).toISOString().split("T")[0],
      amount: amt,
      amountPaid: paid,
      outstanding,
      status: inv.status,
    };
  });

  const csv = generateSanitizedCsv(columns, data);

  writeAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "DATA_EXPORT",
    entityType: "invoices",
    metadata: { count: invoices.length, format: "CSV" },
    ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
  });

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="duespilot-invoices-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
});
