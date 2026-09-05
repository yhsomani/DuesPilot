import { withAuth, VIEW_ROLES, requireRole } from "@/lib/server-context";
import { generateSanitizedCsv } from "@/lib/security";

export const GET = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, VIEW_ROLES);
  if (forbidden) return forbidden;

  const columns = [
    { key: "customerName", label: "Customer Name" },
    { key: "gstin", label: "GSTIN" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "invoiceNumber", label: "Invoice Number" },
    { key: "invoiceDate", label: "Invoice Date" },
    { key: "dueDate", label: "Due Date" },
    { key: "amount", label: "Amount" },
    { key: "amountPaid", label: "Amount Paid" },
  ];

  const today = new Date();
  const formatIso = (d: Date) => d.toISOString().split("T")[0];

  const pastDate30 = new Date(today.getTime() - 30 * 86400000);
  const pastDate60 = new Date(today.getTime() - 60 * 86400000);
  const pastDate15 = new Date(today.getTime() - 15 * 86400000);
  const futureDate15 = new Date(today.getTime() + 15 * 86400000);

  const sampleRows = [
    {
      customerName: "Acme Industrial Supplies Pvt Ltd",
      gstin: "27AABCU9603R1ZM",
      email: "accounts@acmeindustrial.in",
      phone: "+91 98765 43210",
      invoiceNumber: "INV-2026-001",
      invoiceDate: formatIso(pastDate60),
      dueDate: formatIso(pastDate30),
      amount: "250000",
      amountPaid: "50000",
    },
    {
      customerName: "Bharat Electronics & Tech Corp",
      gstin: "29AADCB2230M1ZT",
      email: "finance@bharatelectronics.com",
      phone: "+91 91234 56789",
      invoiceNumber: "INV-2026-002",
      invoiceDate: formatIso(pastDate30),
      dueDate: formatIso(pastDate15),
      amount: "145000",
      amountPaid: "0",
    },
    {
      customerName: "Global Logistics & Freight Solutions",
      gstin: "07AAACG0561D1ZW",
      email: "billing@globallogistics.co.in",
      phone: "+91 98111 22334",
      invoiceNumber: "INV-2026-003",
      invoiceDate: formatIso(pastDate15),
      dueDate: formatIso(futureDate15),
      amount: "87500",
      amountPaid: "0",
    },
    {
      customerName: "Sunrise Agro Enterprises",
      gstin: "09AAICS3312P1ZN",
      email: "sunrise.agro@rediffmail.com",
      phone: "+91 94500 12345",
      invoiceNumber: "INV-2026-004",
      invoiceDate: formatIso(pastDate60),
      dueDate: formatIso(pastDate15),
      amount: "320000",
      amountPaid: "100000",
    },
  ];

  const csv = generateSanitizedCsv(columns, sampleRows);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="duespilot-sample-import.csv"',
    },
  });
});
