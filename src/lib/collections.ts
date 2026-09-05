import { prisma } from "@/lib/prisma";
import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { InvoiceStatus, PromiseStatus, type Prisma } from "@/generated/prisma/client";
import type {
  CollectionEventInput,
  CreatePaymentInput,
  CreatePromiseInput,
  PaymentRow,
  PromiseRow,
  PromiseStatusView,
} from "@/lib/types";
import { refreshCustomerTotals } from "@/lib/repo";
import { writeAudit } from "@/lib/audit";
import { consumeIdempotencyKey } from "@/lib/idempotency";
import {
  allocatePayment,
  nextInvoiceStatus,
  type AllocationEntry,
} from "@/lib/payment-allocation";
import { promiseRenegotiationError } from "@/lib/promise-state";

/* --------------------------------- Promises ------------------------------- */

function toPromiseRow(p: {
  id: string;
  amount: number;
  promiseDate: Date;
  source: string;
  confidence: number;
  status: PromiseStatus;
  customer: { name: string };
  invoice: { invoiceNumber: string } | null;
}): PromiseRow {
  return {
    id: p.id,
    customer: p.customer.name,
    initials: p.customer.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase() ?? "")
      .join(""),
    amount: p.amount,
    promiseDate: p.promiseDate.toISOString(),
    source: p.source,
    confidence: p.confidence,
    status: p.status as unknown as PromiseStatusView,
    invoiceNumber: p.invoice?.invoiceNumber ?? null,
  };
}

const PROMISE_INCLUDE = {
  customer: { select: { name: true } },
  invoice: { select: { invoiceNumber: true } },
} as const;

export async function createPromise(
  organizationId: string,
  userId: string | null,
  input: CreatePromiseInput
): Promise<PromiseRow> {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError("Promise amount must be a positive number");
  }
  const promiseDate = new Date(input.promiseDate);
  if (Number.isNaN(promiseDate.getTime())) {
    throw new ValidationError("Invalid promise date");
  }

  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, organizationId },
    select: { id: true },
  });
  if (!customer) throw new NotFoundError("Customer not found");

  const promise = await prisma.$transaction(async (tx) => {
    await consumeIdempotencyKey(
      tx,
      organizationId,
      input.idempotencyKey,
      "promise:create"
    );
    const created = await tx.promiseToPay.create({
      data: {
        organizationId,
        customerId: customer.id,
        invoiceId: input.invoiceId ?? null,
        amount,
        promiseDate,
        source: input.source ?? "manual",
        confidence: input.confidence ?? 100,
        status: PromiseStatus.ACTIVE,
        note: input.note ?? null,
      },
      include: PROMISE_INCLUDE,
    });

    if (input.invoiceId) {
      const inv = await tx.invoice.findFirst({
        where: { id: input.invoiceId, organizationId },
        select: { id: true, status: true },
      });
      const PROMISABLE: InvoiceStatus[] = [
        InvoiceStatus.OPEN,
        InvoiceStatus.DUE_SOON,
        InvoiceStatus.OVERDUE,
        InvoiceStatus.PARTIALLY_PAID,
        InvoiceStatus.PROMISE_BROKEN,
      ];
      if (inv && PROMISABLE.includes(inv.status)) {
        await tx.invoice.update({
          where: { id: inv.id },
          data: { status: InvoiceStatus.PROMISED },
        });
      }
    }
    return created;
  });

  await writeAudit({
    organizationId,
    userId,
    action: "PROMISE_CREATE",
    entityType: "promise",
    entityId: promise.id,
    metadata: {
      customerId: customer.id,
      amount,
      promiseDate: promiseDate.toISOString(),
      invoiceId: input.invoiceId ?? null,
    },
  });

  return toPromiseRow(promise);
}

/**
 * Promise transition: KEPT / BROKEN / RENEGOTIATED.
 * RENEGOTIATED updates the promise with a new date+amount.
 */
export async function updatePromiseStatus(
  organizationId: string,
  userId: string | null,
  promiseId: string,
  patch: { status: PromiseStatusView; amount?: number; promiseDate?: string; note?: string }
): Promise<PromiseRow> {
  const promise = await prisma.promiseToPay.findFirst({
    where: { id: promiseId, organizationId },
    include: PROMISE_INCLUDE,
  });
  if (!promise) throw new NotFoundError("Promise not found");

  const data: {
    status?: PromiseStatus;
    promiseDate?: Date;
    amount?: number;
    note?: string;
  } = {};

  if (patch.status === "RENEGOTIATED") {
    const guard = promiseRenegotiationError(promise.status);
    if (guard) throw new BusinessRuleError(guard, 422);
    data.status = PromiseStatus.RENEGOTIATED;
    if (patch.promiseDate) {
      const d = new Date(patch.promiseDate);
      if (!Number.isNaN(d.getTime())) data.promiseDate = d;
    }
    if (patch.amount != null && Number.isFinite(Number(patch.amount)) && Number(patch.amount) > 0) {
      data.amount = Number(patch.amount);
    }
  } else if (patch.status === "KEPT") {
    data.status = PromiseStatus.KEPT;
  } else if (patch.status === "BROKEN") {
    data.status = PromiseStatus.BROKEN;
  } else {
    throw new ValidationError("Unsupported promise status");
  }

  const updated = await prisma.promiseToPay.update({
    where: { id: promise.id },
    data,
    include: PROMISE_INCLUDE,
  });

  await writeAudit({
    organizationId,
    userId,
    action: "PROMISE_UPDATE",
    entityType: "promise",
    entityId: promise.id,
    metadata: { status: patch.status, amount: data.amount, promiseDate: data.promiseDate?.toISOString() },
  });

  return toPromiseRow(updated);
}

/**
 * Queue "manage" action: update status + record a note as a collection event.
 */
export async function managePromise(
  organizationId: string,
  userId: string | null,
  promiseId: string,
  input: {
    action: "mark_broken" | "mark_kept" | "add_note";
    note: string;
    newAmount?: number;
    newPromiseDate?: string;
  }
): Promise<void> {
  const promise = await prisma.promiseToPay.findFirst({
    where: { id: promiseId, organizationId },
    select: {
      id: true,
      customerId: true,
      status: true,
      invoice: { select: { id: true } },
    },
  });
  if (!promise) throw new NotFoundError("Promise not found");

  if (input.action === "mark_broken" && promise.status === PromiseStatus.ACTIVE) {
    await updatePromiseStatus(organizationId, userId, promiseId, {
      status: "BROKEN",
    });
  } else if (input.action === "mark_kept" && promise.status === PromiseStatus.ACTIVE) {
    await updatePromiseStatus(organizationId, userId, promiseId, {
      status: "KEPT",
    });
  } else if (input.action === "add_note") {
    // no-op — note recorded below
  }

  if (input.note?.trim()) {
    await createCollectionEvent(organizationId, userId, {
      customerId: promise.customerId,
      invoiceId: promise.invoice?.id ?? null,
      type: "NOTE",
      description: input.note.trim(),
    });
  }
}

/**
 * Idempotent daily sweep: any ACTIVE promise whose date has passed with
 * insufficient payments is BROKEN; KEPT is handled at payment time.
 */
export async function sweepOverduePromises(): Promise<{ broken: number; kept: number }> {
  const orgs = await prisma.organization.findMany({ select: { id: true } });
  let totalBroken = 0;
  let totalKept = 0;
  for (const org of orgs) {
    const result = await sweepOverduePromisesForOrg(org.id);
    totalBroken += result.broken;
    totalKept += result.kept;
  }
  return { broken: totalBroken, kept: totalKept };
}

async function sweepOverduePromisesForOrg(
  organizationId: string
): Promise<{ broken: number; kept: number }> {
  const today = new Date();
  const active = await prisma.promiseToPay.findMany({
    where: { organizationId, status: PromiseStatus.ACTIVE },
    select: {
      id: true,
      customerId: true,
      amount: true,
      promiseDate: true,
      invoiceId: true,
    },
  });

  let broken = 0;
  let kept = 0;

  for (const p of active) {
    const paid = await prisma.payment.aggregate({
      where: {
        organizationId,
        customerId: p.customerId,
        status: { not: "reversed" },
        paymentDate: { lte: today },
      },
      _sum: { amount: true },
    });
    const paidAmount = paid._sum.amount ?? 0;

    if (paidAmount >= p.amount) {
      await prisma.promiseToPay.update({
        where: { id: p.id },
        data: { status: PromiseStatus.KEPT },
      });
      kept++;
    } else if (p.promiseDate < today) {
      await prisma.promiseToPay.update({
        where: { id: p.id },
        data: { status: PromiseStatus.BROKEN },
      });
      if (p.invoiceId) {
        const inv = await prisma.invoice.findFirst({
          where: { id: p.invoiceId, organizationId },
          select: { status: true },
        });
        if (inv && inv.status === InvoiceStatus.PROMISED) {
          await prisma.invoice.update({
            where: { id: p.invoiceId },
            data: { status: InvoiceStatus.PROMISE_BROKEN },
          });
        }
      }
      broken++;
    }
  }

  if (broken + kept > 0) {
    await refreshCustomerTotals(organizationId);
  }
  return { broken, kept };
}

/* --------------------------------- Payments ------------------------------- */

export async function listPayments(organizationId: string): Promise<PaymentRow[]> {
  const payments = await prisma.payment.findMany({
    where: { organizationId },
    include: {
      customer: { select: { id: true, name: true } },
      allocations: { include: { invoice: { select: { invoiceNumber: true } } } },
    },
    orderBy: { paymentDate: "desc" },
  });
  return payments.map((p) => ({
    id: p.id,
    customerId: p.customer.id,
    customer: p.customer.name,
    reference: p.reference,
    amount: p.amount,
    paymentDate: p.paymentDate.toISOString(),
    mode: p.mode,
    status: p.status,
    allocations: p.allocations.map((a) => ({
      id: a.id,
      invoiceId: a.invoiceId,
      invoiceNumber: a.invoice.invoiceNumber,
      amount: a.amount,
    })),
  }));
}

export interface PaymentQuery {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function queryPayments(
  organizationId: string,
  q: PaymentQuery
): Promise<{
  items: PaymentRow[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}> {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, q.pageSize ?? 50));

  const where: Prisma.PaymentWhereInput = { organizationId };
  if (q.search?.trim()) {
    const needle = q.search.trim();
    where.OR = [
      { reference: { contains: needle, mode: "insensitive" } },
      { customer: { name: { contains: needle, mode: "insensitive" } } },
    ];
  }
  if (q.status) where.status = q.status;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        allocations: { include: { invoice: { select: { invoiceNumber: true } } } },
      },
      orderBy: { paymentDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payment.count({ where }),
  ]);

  return {
    items: payments.map((p) => ({
      id: p.id,
      customerId: p.customer.id,
      customer: p.customer.name,
      reference: p.reference,
      amount: p.amount,
      paymentDate: p.paymentDate.toISOString(),
      mode: p.mode,
      status: p.status,
      allocations: p.allocations.map((a) => ({
        id: a.id,
        invoiceId: a.invoiceId,
        invoiceNumber: a.invoice.invoiceNumber,
        amount: a.amount,
      })),
    })),
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total,
  };
}

export interface RecordPaymentResult {
  payment: PaymentRow;
  keptPromises: number;
}

async function keepPromiseOnPayment(
  organizationId: string,
  customerId: string,
  paymentDate: Date
): Promise<number> {
  const [promises, payments] = await Promise.all([
    prisma.promiseToPay.findMany({
      where: { organizationId, customerId, status: PromiseStatus.ACTIVE },
      select: { id: true, amount: true, promiseDate: true, createdAt: true },
    }),
    prisma.payment.findMany({
      where: {
        organizationId,
        customerId,
        status: { not: "reversed" },
        paymentDate: { lte: paymentDate },
      },
      select: { amount: true, paymentDate: true },
    }),
  ]);

  let kept = 0;
  for (const p of promises) {
    const paidForPromise = payments
      .filter((pay) => pay.paymentDate >= p.createdAt)
      .reduce((s, pay) => s + pay.amount, 0);
    if (paidForPromise >= p.amount) {
      await prisma.promiseToPay.update({
        where: { id: p.id },
        data: { status: PromiseStatus.KEPT },
      });
      kept++;
    }
  }
  return kept;
}

/**
 * Record a payment against a customer. Allocation is FIFO (oldest due date
 * first) unless explicit `allocations` are supplied. Updates invoice
 * outstanding + status, refreshes customer totals, and automatically marks
 * active promises KEPT when the customer has paid enough.
 */
export async function recordPayment(
  organizationId: string,
  userId: string | null,
  input: CreatePaymentInput
): Promise<RecordPaymentResult> {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError("Payment amount must be a positive number");
  }
  const paymentDate = new Date(input.paymentDate);
  if (Number.isNaN(paymentDate.getTime())) {
    throw new ValidationError("Invalid payment date");
  }

  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, organizationId },
    select: { id: true, name: true },
  });
  if (!customer) throw new NotFoundError("Customer not found");

  // Duplicate-payment guard using a natural key.
  const dup = await prisma.payment.findFirst({
    where: {
      organizationId,
      customerId: customer.id,
      amount,
      paymentDate: { equals: paymentDate },
      reference: input.reference ? { equals: input.reference } : undefined,
    },
  });
  if (dup) throw new BusinessRuleError("A matching payment already exists", 409);

  const explicit = input.allocations ?? null;

  const result = await prisma.$transaction(async (tx) => {
    await consumeIdempotencyKey(
      tx,
      organizationId,
      input.idempotencyKey,
      "payment:create"
    );
    const invoiceRows = await tx.invoice.findMany({
      where: {
        organizationId,
        customerId: customer.id,
        outstandingAmount: { gt: 0 },
      },
      orderBy: [{ dueDate: "asc" }, { id: "asc" }],
      select: {
        id: true,
        invoiceNumber: true,
        amount: true,
        outstandingAmount: true,
        status: true,
      },
    });

    const allocation = allocatePayment(amount, invoiceRows, explicit);
    const allocEntries = allocation.entries;
    const status = allocation.status;

    const payment = await tx.payment.create({
      data: {
        organizationId,
        customerId: customer.id,
        reference: input.reference?.trim() || null,
        amount,
        paymentDate,
        mode: input.mode || null,
        status,
      },
      include: {
        customer: { select: { id: true, name: true } },
        allocations: { include: { invoice: { select: { invoiceNumber: true } } } },
      },
    });

    for (const entry of allocEntries) {
      const inv = invoiceRows.find((i) => i.id === entry.invoiceId);
      if (!inv) continue;
      const newOutstanding = inv.outstandingAmount - entry.amount;
      await tx.invoice.update({
        where: { id: entry.invoiceId },
        data: {
          outstandingAmount: newOutstanding,
          status: nextInvoiceStatus(inv.status, newOutstanding, inv.amount) as InvoiceStatus,
        },
      });
      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          invoiceId: entry.invoiceId,
          amount: entry.amount,
        },
      });
    }

    return { payment, allocatedTotal: allocation.allocatedTotal };
  });

  await refreshCustomerTotals(organizationId);
  const keptPromises = await keepPromiseOnPayment(
    organizationId,
    customer.id,
    paymentDate
  );

  await writeAudit({
    organizationId,
    userId,
    action: "PAYMENT_CREATE",
    entityType: "payment",
    entityId: result.payment.id,
    metadata: {
      customerId: customer.id,
      amount,
      paymentDate: paymentDate.toISOString(),
      mode: input.mode ?? null,
      reference: input.reference ?? null,
      allocated: result.allocatedTotal,
      keptPromises,
    },
  });

  return {
    payment: toPaymentRow(result.payment),
    keptPromises,
  };
}

export async function reversePayment(
  organizationId: string,
  userId: string | null,
  paymentId: string
): Promise<void> {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, organizationId },
    include: { allocations: true },
  });
  if (!payment) throw new NotFoundError("Payment not found");
  if (payment.status === "reversed") {
    throw new BusinessRuleError("Payment is already reversed");
  }

  await prisma.$transaction(async (tx) => {
    const invIds = payment.allocations.map((a) => a.invoiceId);
    const invoices = await tx.invoice.findMany({
      where: { id: { in: invIds } },
      select: { id: true, amount: true, outstandingAmount: true },
    });
    for (const inv of invoices) {
      const allocatedHere = payment.allocations
        .filter((a) => a.invoiceId === inv.id)
        .reduce((s, a) => s + a.amount, 0);
      const newOutstanding = inv.outstandingAmount + allocatedHere;
      await tx.invoice.update({
        where: { id: inv.id },
        data: {
          outstandingAmount: newOutstanding,
          status: nextInvoiceStatus(
            InvoiceStatus.OPEN,
            newOutstanding,
            inv.amount
          ) as InvoiceStatus,
        },
      });
    }
    await tx.paymentAllocation.deleteMany({ where: { paymentId: payment.id } });
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: "reversed" },
    });
  });

  await refreshCustomerTotals(organizationId);

  await writeAudit({
    organizationId,
    userId,
    action: "PAYMENT_REVERSE",
    entityType: "payment",
    entityId: payment.id,
    metadata: { amount: payment.amount },
  });
}

/**
 * Manually allocate an existing payment's unallocated remainder to specific
 * invoices. The caller supplies explicit entries; allocation is clamped to the
 * available remainder and to each invoice's outstanding balance (reusing the
 * pure allocation math). Fully allocatable payments are rejected; an empty
 * result is also rejected so partial-input typing cannot silently no-op.
 */
export async function allocatePaymentManual(
  organizationId: string,
  userId: string | null,
  paymentId: string,
  allocations: AllocationEntry[]
): Promise<{ payment: PaymentRow; allocatedTotal: number }> {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, organizationId },
    select: {
      id: true,
      customerId: true,
      amount: true,
      status: true,
    },
  });
  if (!payment) throw new NotFoundError("Payment not found");
  if (payment.status === "reversed") {
    throw new BusinessRuleError("Cannot allocate a reversed payment", 409);
  }

  const existing = await prisma.paymentAllocation.aggregate({
    where: { paymentId: payment.id },
    _sum: { amount: true },
  });
  const allocatedSoFar = existing._sum.amount ?? 0;
  const remaining = payment.amount - allocatedSoFar;
  if (remaining <= 0) {
    throw new BusinessRuleError("Payment is already fully allocated", 409);
  }

  const invoiceRows = await prisma.invoice.findMany({
    where: {
      organizationId,
      customerId: payment.customerId,
      outstandingAmount: { gt: 0 },
    },
    orderBy: [{ dueDate: "asc" }, { id: "asc" }],
    select: {
      id: true,
      invoiceNumber: true,
      amount: true,
      outstandingAmount: true,
      status: true,
    },
  });

  const allocation = allocatePayment(remaining, invoiceRows, allocations);
  if (allocation.entries.length === 0) {
    throw new ValidationError("Nothing to allocate for the selected invoices");
  }

  await prisma.$transaction(async (tx) => {
    for (const entry of allocation.entries) {
      const inv = invoiceRows.find((i) => i.id === entry.invoiceId);
      if (!inv) continue;
      const newOutstanding = inv.outstandingAmount - entry.amount;
      await tx.invoice.update({
        where: { id: entry.invoiceId },
        data: {
          outstandingAmount: newOutstanding,
          status: nextInvoiceStatus(
            inv.status,
            newOutstanding,
            inv.amount
          ) as InvoiceStatus,
        },
      });
      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          invoiceId: entry.invoiceId,
          amount: entry.amount,
        },
      });
    }
  });

  const newAllocated = allocatedSoFar + allocation.allocatedTotal;
  const newStatus =
    newAllocated >= payment.amount ? "fully_allocated" : "partially_allocated";
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: newStatus },
  });

  await refreshCustomerTotals(organizationId);

  await writeAudit({
    organizationId,
    userId,
    action: "PAYMENT_ALLOCATE",
    entityType: "payment",
    entityId: payment.id,
    metadata: {
      customerId: payment.customerId,
      amount: allocation.allocatedTotal,
    },
  });

  const updated = await prisma.payment.findFirst({
    where: { id: payment.id, organizationId },
    include: {
      customer: { select: { id: true, name: true } },
      allocations: {
        include: { invoice: { select: { invoiceNumber: true } } },
      },
    },
  });
  if (!updated) throw new NotFoundError("Payment not found");
  return { payment: toPaymentRow(updated), allocatedTotal: allocation.allocatedTotal };
}

function toPaymentRow(p: {
  id: string;
  customerId: string;
  reference: string | null;
  amount: number;
  paymentDate: Date;
  mode: string | null;
  status: string;
  customer: { id: string; name: string };
  allocations: {
    id: string;
    invoiceId: string;
    amount: number;
    invoice: { invoiceNumber: string };
  }[];
}): PaymentRow {
  return {
    id: p.id,
    customerId: p.customerId,
    customer: p.customer.name,
    reference: p.reference,
    amount: p.amount,
    paymentDate: p.paymentDate.toISOString(),
    mode: p.mode,
    status: p.status,
    allocations: p.allocations.map((a) => ({
      id: a.id,
      invoiceId: a.invoiceId,
      invoiceNumber: a.invoice.invoiceNumber,
      amount: a.amount,
    })),
  };
}

/* ---------------------------- Collection events --------------------------- */

export async function createCollectionEvent(
  organizationId: string,
  userId: string | null,
  input: CollectionEventInput
): Promise<{ id: string; createdAt: Date }> {
  if (!input.type || !input.description?.trim()) {
    throw new ValidationError("Type and description are required");
  }
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, organizationId },
    select: { id: true },
  });
  if (!customer) throw new NotFoundError("Customer not found");

  const event = await prisma.collectionEvent.create({
    data: {
      organizationId,
      customerId: customer.id,
      invoiceId: input.invoiceId ?? null,
      type: input.type,
      description: input.description,
      metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      createdById: userId,
    },
  });

  await writeAudit({
    organizationId,
    userId,
    action: "COLLECTION_EVENT_CREATE",
    entityType: "collectionEvent",
    entityId: event.id,
    metadata: { customerId: customer.id, type: input.type, description: input.description },
  });

  return { id: event.id, createdAt: event.createdAt };
}

/* --------------------------- Account / org purge -------------------------- */

export async function deleteOrganization(organizationId: string): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      const memberEmails = await tx.user.findMany({
        where: { organizationId },
        select: { email: true },
      });

      await tx.message.deleteMany({ where: { organizationId } });
      await tx.workflowAction.deleteMany({ where: { workflow: { organizationId } } });
      await tx.collectionWorkflow.deleteMany({ where: { organizationId } });
      await tx.integrationCredential.deleteMany({ where: { organizationId } });
      await tx.auditLog.deleteMany({ where: { organizationId } });
      await tx.verificationToken.deleteMany({
        where: { identifier: { in: memberEmails.map((u) => u.email) } },
      });
      await tx.user.deleteMany({ where: { organizationId } });
      await tx.organization.delete({ where: { id: organizationId } });
    },
    { timeout: 30_000 }
  );
}

/* ------------------------------ Customer merge ---------------------------- */

export async function mergeCustomers(
  organizationId: string,
  userId: string | null,
  targetId: string,
  sourceIds: string[]
): Promise<void> {
  const target = await prisma.customer.findFirst({
    where: { id: targetId, organizationId },
    select: { id: true, name: true },
  });
  if (!target) throw new NotFoundError("Target customer not found");

  const sources = await prisma.customer.findMany({
    where: { id: { in: sourceIds }, organizationId },
    select: { id: true, name: true },
  });
  if (sources.length === 0) throw new NotFoundError("No matching source customers");
  if (sources.some((s) => s.id === target.id)) throw new ValidationError("Cannot merge a customer into itself");

  await prisma.$transaction(
    async (tx) => {
      for (const source of sources) {
        await tx.invoice.updateMany({
          where: { customerId: source.id },
          data: { customerId: target.id },
        });
        await tx.promiseToPay.updateMany({
          where: { customerId: source.id },
          data: { customerId: target.id },
        });
        await tx.collectionEvent.updateMany({
          where: { customerId: source.id },
          data: { customerId: target.id },
        });
        await tx.payment.updateMany({
          where: { customerId: source.id },
          data: { customerId: target.id },
        });
        await tx.contact.updateMany({
          where: { customerId: source.id },
          data: { customerId: target.id },
        });
        await tx.customer.delete({
          where: { id: source.id },
        });
      }
    },
    { timeout: 30_000 }
  );

  await refreshCustomerTotals(organizationId);

  await writeAudit({
    organizationId,
    userId,
    action: "CUSTOMER_MERGE",
    entityType: "customer",
    entityId: target.id,
    metadata: {
      targetName: target.name,
      sourceIds: sources.map((s) => s.id),
      sourceNames: sources.map((s) => s.name),
    },
  });
}

/* --------------------------------- Disputes ------------------------------- */

export interface CreateDisputeInput {
  invoiceId: string;
  reason: string;
  category?: string | null;
  notes?: string | null;
}

export async function createDispute(
  organizationId: string,
  userId: string | null,
  input: CreateDisputeInput
): Promise<void> {
  if (!input.reason?.trim()) throw new ValidationError("Dispute reason is required");
  const invoice = await prisma.invoice.findFirst({
    where: { id: input.invoiceId, organizationId },
    include: { dispute: true },
  });
  if (!invoice) throw new NotFoundError("Invoice not found");
  if (invoice.dispute) throw new BusinessRuleError("Invoice already has a dispute", 409);

  await prisma.$transaction(async (tx) => {
    await tx.dispute.create({
      data: {
        invoiceId: invoice.id,
        reason: input.reason.trim(),
        category: input.category ?? null,
        status: "open",
        notes: input.notes ?? null,
      },
    });
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { status: InvoiceStatus.DISPUTED },
    });
  });

  await writeAudit({
    organizationId,
    userId,
    action: "DISPUTE_CREATE",
    entityType: "dispute",
    entityId: invoice.id,
    metadata: {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      reason: input.reason,
      category: input.category ?? null,
    },
  });
}

export async function resolveDispute(
  organizationId: string,
  userId: string | null,
  disputeId: string,
  patch: { status: "resolved" | "withdrawn" | "rejected"; notes?: string }
): Promise<void> {
  const dispute = await prisma.dispute.findFirst({
    where: { id: disputeId, invoice: { organizationId } },
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          amount: true,
          outstandingAmount: true,
        },
      },
    },
  });
  if (!dispute) throw new NotFoundError("Dispute not found");

  await prisma.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { id: dispute.id },
      data: {
        status: patch.status,
        notes: patch.notes ?? dispute.notes ?? null,
        resolvedAt: patch.status === "resolved" ? new Date() : dispute.resolvedAt,
      },
    });
    if (patch.status === "resolved" || patch.status === "withdrawn") {
      await tx.invoice.update({
        where: { id: dispute.invoiceId },
        data: {
          status: nextInvoiceStatus(
            InvoiceStatus.OPEN,
            dispute.invoice.outstandingAmount,
            dispute.invoice.amount
          ) as InvoiceStatus,
        },
      });
    }
  });

  await writeAudit({
    organizationId,
    userId,
    action: "DISPUTE_RESOLVE",
    entityType: "dispute",
    entityId: dispute.id,
    metadata: { invoiceId: dispute.invoiceId, status: patch.status },
  });
}

/* --------------------------- Internal helpers ----------------------------- */