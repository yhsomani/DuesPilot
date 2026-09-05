import { withAuth, VIEW_ROLES, requireRole, ok } from "@/lib/server-context";
import { prisma } from "@/lib/prisma";

export interface SearchResultItem {
  id: string;
  type: "customer" | "invoice" | "promise" | "dispute";
  title: string;
  subtitle: string;
  badge?: string;
  url: string;
  amount?: number;
}

export const GET = withAuth(async (req, ctx) => {
  const forbidden = requireRole(ctx, VIEW_ROLES);
  if (forbidden) return forbidden;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();

  if (!q || q.length < 2) {
    return ok({
      results: [],
      total: 0,
      query: q,
    });
  }

  const organizationId = ctx.organizationId;

  const [customers, invoices, promises, disputes] = await Promise.all([
    // Customers search
    prisma.customer.findMany({
      where: {
        organizationId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q } },
          { gstin: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 6,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gstin: true,
        status: true,
        totalOutstanding: true,
      },
    }),

    // Invoices search
    prisma.invoice.findMany({
      where: {
        organizationId,
        OR: [
          { invoiceNumber: { contains: q, mode: "insensitive" } },
          { customer: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 6,
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        outstandingAmount: true,
        status: true,
        dueDate: true,
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),

    // Promises search
    prisma.promiseToPay.findMany({
      where: {
        organizationId,
        OR: [
          { note: { contains: q, mode: "insensitive" } },
          { customer: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      take: 5,
      select: {
        id: true,
        amount: true,
        promiseDate: true,
        status: true,
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),

    // Disputes search
    prisma.dispute.findMany({
      where: {
        invoice: {
          organizationId,
        },
        OR: [
          { reason: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
          { invoice: { customer: { name: { contains: q, mode: "insensitive" } } } },
        ],
      },
      take: 5,
      select: {
        id: true,
        reason: true,
        status: true,
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            amount: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const results: SearchResultItem[] = [];

  // Map customers
  for (const c of customers) {
    results.push({
      id: c.id,
      type: "customer",
      title: c.name,
      subtitle: [c.email, c.phone, c.gstin ? `GST: ${c.gstin}` : null]
        .filter(Boolean)
        .join(" • ") || "Customer account",
      badge: c.status?.toUpperCase() || "ACTIVE",
      amount: Number(c.totalOutstanding || 0),
      url: `/dashboard/customers/${c.id}`,
    });
  }

  // Map invoices
  for (const inv of invoices) {
    results.push({
      id: inv.id,
      type: "invoice",
      title: `Invoice #${inv.invoiceNumber}`,
      subtitle: `${inv.customer.name} • Due ${new Date(inv.dueDate).toLocaleDateString("en-IN")}`,
      badge: inv.status,
      amount: Number(inv.outstandingAmount),
      url: `/dashboard/invoices/${inv.id}`,
    });
  }

  // Map promises
  for (const p of promises) {
    results.push({
      id: p.id,
      type: "promise",
      title: `Promise from ${p.customer.name}`,
      subtitle: `Target date: ${new Date(p.promiseDate).toLocaleDateString("en-IN")}`,
      badge: p.status,
      amount: Number(p.amount),
      url: `/dashboard/promises`,
    });
  }

  // Map disputes
  for (const d of disputes) {
    results.push({
      id: d.id,
      type: "dispute",
      title: `Dispute: ${d.reason}`,
      subtitle: `Customer: ${d.invoice.customer.name} (Inv #${d.invoice.invoiceNumber})`,
      badge: d.status,
      amount: Number(d.invoice.amount),
      url: `/dashboard/disputes`,
    });
  }

  return ok({
    results,
    total: results.length,
    query: q,
  });
});
