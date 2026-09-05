import { withAuth, VIEW_ROLES, requireRole } from "@/lib/server-context";
import { getQueue } from "@/lib/repo";
import { generateSanitizedCsv } from "@/lib/security";
import { writeAudit } from "@/lib/audit";

export const GET = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, VIEW_ROLES);
  if (forbidden) return forbidden;

  const queue = await getQueue(ctx.organizationId);

  const columns = [
    { key: "customerName", label: "Customer Name" },
    { key: "priority", label: "Priority" },
    { key: "totalOverdue", label: "Total Overdue (INR)" },
    { key: "oldestOverdueDate", label: "Oldest Overdue Date" },
    { key: "daysOverdue", label: "Days Overdue" },
    { key: "openInvoiceCount", label: "Open Invoices" },
    { key: "suggestedAction", label: "Recommended Action" },
    { key: "primaryContactName", label: "Contact Person" },
    { key: "primaryPhone", label: "Phone" },
    { key: "primaryEmail", label: "Email" },
    { key: "why", label: "Priority Reason" },
  ];

  const data = queue.map((item) => ({
    customerName: item.customerName,
    priority: item.priority,
    totalOverdue: item.totalOverdue,
    oldestOverdueDate: item.oldestOverdueDate || "",
    daysOverdue: item.daysOverdue,
    openInvoiceCount: item.openInvoiceCount,
    suggestedAction: item.suggestedAction,
    primaryContactName: item.primaryContactName || "",
    primaryPhone: item.primaryPhone || "",
    primaryEmail: item.primaryEmail || "",
    why: item.why || "",
  }));

  const csv = generateSanitizedCsv(columns, data);

  // Write audit trail
  writeAudit({
    organizationId: ctx.organizationId,
    userId: ctx.user.id,
    action: "DATA_EXPORT",
    entityType: "queue",
    metadata: { count: queue.length, format: "CSV" },
    ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
  });

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="duespilot-queue-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
});
