import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "crypto";
import { writeAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function verifyHmacSignature(rawBody: string, signature: string, secret: string): boolean {
  try {
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    let body: any = {}; // eslint-disable-line @typescript-eslint/no-explicit-any

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // 1. Signature Verification for Razorpay if secret configured
    const razorpaySignature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (razorpaySignature && webhookSecret) {
      const isValid = verifyHmacSignature(rawBody, razorpaySignature, webhookSecret);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    }

    let invoiceId: string | null = null;
    let invoiceNumber: string | null = null;
    let amountPaid: number = 0;
    let paymentRef: string | null = null;
    let paymentMode = "UPI";
    let provider = "generic";
    let orgId: string | null = null;

    // 2. Razorpay payload format (payment_link.paid / payment.captured)
    if (body.event && body.payload) {
      provider = "razorpay";
      if (body.event === "payment_link.paid" || body.event === "payment.captured") {
        const plink = body.payload.payment_link?.entity;
        const payment = body.payload.payment?.entity;

        if (plink?.notes?.invoiceId) invoiceId = plink.notes.invoiceId;
        if (plink?.notes?.invoiceNumber) invoiceNumber = plink.notes.invoiceNumber;
        if (plink?.notes?.organizationId) orgId = plink.notes.organizationId;

        if (payment?.notes?.invoiceId) invoiceId = payment.notes.invoiceId;
        if (payment?.notes?.invoiceNumber) invoiceNumber = payment.notes.invoiceNumber;
        if (payment?.notes?.organizationId) orgId = payment.notes.organizationId;

        // Razorpay amounts are in paise (e.g. 50000 = ₹500)
        const rawAmount = payment?.amount ?? plink?.amount_paid ?? plink?.amount ?? 0;
        amountPaid = rawAmount > 0 ? rawAmount / 100 : 0;
        paymentRef = payment?.id || plink?.id || `rzp_${Date.now()}`;
        paymentMode = payment?.method?.toUpperCase() || "ONLINE";
      }
    }
    // 3. Cashfree / Stripe / Generic JSON format
    else {
      invoiceId = body.invoiceId || body.invoice_id || null;
      invoiceNumber = body.invoiceNumber || body.invoice_number || null;
      amountPaid = Number(body.amount ?? body.amountPaid ?? 0);
      paymentRef = body.reference || body.paymentId || body.transactionId || `pay_${Date.now()}`;
      paymentMode = body.mode || body.paymentMode || "UPI";
      orgId = body.organizationId || null;
      provider = body.provider || "generic";
    }

    if (!invoiceId && !invoiceNumber) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "No invoice identifier (invoiceId or invoiceNumber) in payload",
      });
    }

    if (amountPaid <= 0) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "Zero or invalid payment amount",
      });
    }

    // 4. Idempotency Check: Don't reconcile the same paymentRef twice
    if (paymentRef) {
      const existingPayment = await prisma.payment.findFirst({
        where: { reference: paymentRef },
      });
      if (existingPayment) {
        return NextResponse.json({
          ok: true,
          reconciled: false,
          reason: "Payment reference already reconciled",
          paymentId: existingPayment.id,
        });
      }
    }

    // 5. Lookup Invoice
    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          ...(invoiceId ? [{ id: invoiceId }] : []),
          ...(invoiceNumber ? [{ invoiceNumber, ...(orgId ? { organizationId: orgId } : {}) }] : []),
        ],
      },
      include: {
        customer: {
          include: {
            promisesToPay: {
              where: { status: "ACTIVE" },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({
        ok: true,
        matched: false,
        reason: "Invoice not found for reconciliation",
        invoiceId,
        invoiceNumber,
      });
    }

    const organizationId = invoice.organizationId;
    const customerId = invoice.customerId;
    const currentOutstanding = invoice.outstandingAmount;
    const newOutstanding = Math.max(0, Math.round((currentOutstanding - amountPaid) * 100) / 100);
    const newStatus = newOutstanding <= 0 ? "PAID" : "PARTIALLY_PAID";

    // 6. Execute Transactional Database Updates
    const result = await prisma.$transaction(async (tx) => {
      // Create Payment record
      const payment = await tx.payment.create({
        data: {
          organizationId,
          customerId,
          reference: paymentRef,
          amount: amountPaid,
          paymentDate: new Date(),
          mode: paymentMode,
          status: "received",
        },
      });

      // Create Payment Allocation linking to Invoice
      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          invoiceId: invoice.id,
          amount: amountPaid,
        },
      });

      // Update Invoice balance and status
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          outstandingAmount: newOutstanding,
          status: newStatus,
        },
      });

      // Recalculate customer outstanding and overdue balances
      const customerInvoices = await tx.invoice.findMany({
        where: { customerId },
        select: { outstandingAmount: true, dueDate: true, status: true },
      });

      const now = new Date();
      const totalOutstanding = customerInvoices.reduce((acc, inv) => acc + inv.outstandingAmount, 0);
      const totalOverdue = customerInvoices
        .filter((inv) => new Date(inv.dueDate) < now && inv.outstandingAmount > 0)
        .reduce((acc, inv) => acc + inv.outstandingAmount, 0);

      await tx.customer.update({
        where: { id: customerId },
        data: {
          totalOutstanding,
          totalOverdue,
          lastPaymentAt: new Date(),
        },
      });

      // Check and fulfill active promises to pay
      for (const p of invoice.customer.promisesToPay) {
        if (p.invoiceId === invoice.id || !p.invoiceId) {
          if (amountPaid >= p.amount * 0.9) {
            // Settle promise if payment covers at least 90%
            await tx.promiseToPay.update({
              where: { id: p.id },
              data: { status: "KEPT" },
            });
          }
        }
      }

      // Record CollectionEvent on Customer Timeline
      await tx.collectionEvent.create({
        data: {
          organizationId,
          customerId,
          invoiceId: invoice.id,
          type: "payment_received",
          description: `Online payment received ₹${amountPaid.toLocaleString("en-IN")} via ${paymentMode} (${provider})`,
          metadata: {
            paymentId: payment.id,
            reference: paymentRef,
            amount: amountPaid,
            mode: paymentMode,
            provider,
            previousBalance: currentOutstanding,
            newBalance: newOutstanding,
            invoiceStatus: newStatus,
          },
        },
      });

      return { payment, updatedInvoice };
    });

    // Write Audit Log
    await writeAudit({
      organizationId,
      userId: null,
      action: "PAYMENT_WEBHOOK_RECONCILED",
      entityType: "payment",
      entityId: result.payment.id,
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: amountPaid,
        mode: paymentMode,
        provider,
        reference: paymentRef,
        newStatus,
      },
    });

    return NextResponse.json({
      ok: true,
      reconciled: true,
      paymentId: result.payment.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: amountPaid,
      previousBalance: currentOutstanding,
      newBalance: newOutstanding,
      status: newStatus,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
