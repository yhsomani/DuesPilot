import { getSessionContext, requireRole, VIEW_ROLES } from "@/lib/server-context";
import { getQueue } from "@/lib/repo";
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

  const queue = await getQueue(ctx.organizationId);

  const columns = [
    { key: "customer", label: "Customer Name" },
    { key: "priority", label: "Priority" },
    { key: "amount", label: "Total Overdue (INR)" },
    { key: "daysOverdue", label: "Days Overdue" },
    { key: "status", label: "Status" },
    { key: "lastAction", label: "Last Action" },
    { key: "nextAction", label: "Recommended Next Action" },
    { key: "why", label: "Priority Reason" },
  ];

  const data = queue.map((item) => ({
    customer: item.customer,
    priority: item.priority,
    amount: item.amount,
    daysOverdue: item.daysOverdue,
    status: item.status,
    lastAction: item.lastAction,
    nextAction: item.nextAction,
    why: item.why || "",
  }));

  const csv = generateSanitizedCsv(columns, data);

  // Write audit trail
  await writeAudit(
    {
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      action: "DATA_EXPORT",
      entityType: "queue",
      metadata: { count: queue.length, format: "CSV" },
    },
    req
  );

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="duespilot-queue-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
