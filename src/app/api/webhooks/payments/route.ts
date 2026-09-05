import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAudit } from "@/lib/audit";
import {
  parsePaymentWebhookPayload,
  verifyGatewaySignature,
  reconcileInvoicePayment,
  type PaymentGateway,
} from "@/lib/payment-webhooks";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any = {};

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const headers: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
    });

    // 1. Identify Gateway Provider & Verify Signature
    let provider: PaymentGateway = "generic";
    if (headers["x-razorpay-signature"] || body.event?.startsWith("payment") || body.event?.startsWith("order")) {
      provider = "razorpay";
    } else if (headers["x-webhook-signature"] || body.type?.includes("PAYMENT") || body.data?.payment) {
      provider = "cashfree";
    } else if (headers["stripe-signature"] || body.object === "event" || body.type?.startsWith("payment_intent") || body.type?.startsWith("charge")) {
      provider = "stripe";
    }

    // Verify cryptographic signature if secret is configured in environment
    const webhookSecret =
      (provider === "razorpay" && process.env.RAZORPAY_WEBHOOK_SECRET) ||
      (provider === "cashfree" && process.env.CASHFREE_WEBHOOK_SECRET) ||
      (provider === "stripe" && process.env.STRIPE_WEBHOOK_SECRET) ||
      process.env.WEBHOOK_SECRET;

    if (webhookSecret) {
      const isValid = verifyGatewaySignature(provider, rawBody, headers, webhookSecret);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
      }
    }

    // 2. Parse & Normalize Payload
    const parsed = parsePaymentWebhookPayload(body, headers);

    // 3. Handle Non-Success Events (Failures / Refunds)
    if (parsed.eventType === "PAYMENT_FAILED") {
      if (parsed.customerId || parsed.invoiceId) {
        // Record failed attempt in Collection Events if we have customer context
        const orgId = parsed.organizationId;
        if (orgId && parsed.customerId) {
          await prisma.collectionEvent.create({
            data: {
              organizationId: orgId,
              customerId: parsed.customerId,
              invoiceId: parsed.invoiceId || null,
              type: "payment_failed",
              description: `Payment attempt of ₹${parsed.amount.toLocaleString("en-IN")} failed via ${parsed.paymentMode} (${parsed.provider}): ${parsed.failureReason || "Transaction declined"}`,
              metadata: {
                reference: parsed.paymentRef,
                amount: parsed.amount,
                failureReason: parsed.failureReason,
                provider: parsed.provider,
              },
            },
          });
        }
      }

      return NextResponse.json({
        ok: true,
        processed: true,
        eventType: "PAYMENT_FAILED",
        reason: parsed.failureReason || "Payment failed",
      });
    }

    if (parsed.eventType === "REFUND") {
      return NextResponse.json({
        ok: true,
        processed: true,
        eventType: "REFUND",
        paymentRef: parsed.paymentRef,
      });
    }

    if (parsed.eventType !== "PAYMENT_SUCCESS") {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: `Ignored unhandled event type: ${parsed.rawEvent || parsed.eventType}`,
      });
    }

    if (!parsed.invoiceId && !parsed.invoiceNumber) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "No invoice identifier (invoiceId or invoiceNumber) in payload",
      });
    }

    if (parsed.amount <= 0) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "Zero or invalid payment amount in payload",
      });
    }

    // 4. Idempotency Verification
    if (parsed.paymentRef) {
      const existingPayment = await prisma.payment.findFirst({
        where: { reference: parsed.paymentRef },
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

    // 5. Lookup Target Invoice
    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          ...(parsed.invoiceId ? [{ id: parsed.invoiceId }] : []),
          ...(parsed.invoiceNumber
            ? [
                {
                  invoiceNumber: parsed.invoiceNumber,
                  ...(parsed.organizationId ? { organizationId: parsed.organizationId } : {}),
                },
              ]
            : []),
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
        invoiceId: parsed.invoiceId,
        invoiceNumber: parsed.invoiceNumber,
      });
    }

    const organizationId = invoice.organizationId;
    const customerId = invoice.customerId;

    // 6. Calculate Reconciliation
    const reconciliation = reconcileInvoicePayment({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        outstandingAmount: invoice.outstandingAmount,
        organizationId: invoice.organizationId,
        customerId: invoice.customerId,
        status: invoice.status,
      },
      amountPaid: parsed.amount,
      paymentRef: parsed.paymentRef,
      paymentMode: parsed.paymentMode,
      provider: parsed.provider,
      promisesToPay: invoice.customer.promisesToPay,
    });

    // 7. Atomic Database Execution
    const result = await prisma.$transaction(async (tx) => {
      // Create Payment record
      const payment = await tx.payment.create({
        data: {
          organizationId,
          customerId,
          reference: parsed.paymentRef,
          amount: parsed.amount,
          paymentDate: new Date(),
          mode: parsed.paymentMode,
          status: "received",
        },
      });

      // Create Payment Allocation linking to Invoice
      await tx.paymentAllocation.create({
        data: {
          paymentId: payment.id,
          invoiceId: invoice.id,
          amount: parsed.amount,
        },
      });

      // Update Invoice outstanding balance & status
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          outstandingAmount: reconciliation.newBalance,
          status: reconciliation.newInvoiceStatus,
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

      // Settle resolved promises to pay
      if (reconciliation.resolvedPromiseIds.length > 0) {
        await tx.promiseToPay.updateMany({
          where: { id: { in: reconciliation.resolvedPromiseIds } },
          data: { status: "KEPT" },
        });
      }

      // Record CollectionEvent on Customer Timeline
      await tx.collectionEvent.create({
        data: {
          organizationId,
          customerId,
          invoiceId: invoice.id,
          type: "payment_received",
          description: `Instant online settlement received ₹${parsed.amount.toLocaleString("en-IN")} via ${parsed.paymentMode} (${parsed.provider})`,
          metadata: {
            paymentId: payment.id,
            reference: parsed.paymentRef,
            amount: parsed.amount,
            mode: parsed.paymentMode,
            provider: parsed.provider,
            previousBalance: reconciliation.previousBalance,
            newBalance: reconciliation.newBalance,
            invoiceStatus: reconciliation.newInvoiceStatus,
            resolvedPromiseIds: reconciliation.resolvedPromiseIds,
          },
        },
      });

      return { payment, updatedInvoice };
    });

    // 8. Record Audit Log
    await writeAudit({
      organizationId,
      userId: null,
      action: "PAYMENT_WEBHOOK_RECONCILED",
      entityType: "payment",
      entityId: result.payment.id,
      metadata: {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: parsed.amount,
        mode: parsed.paymentMode,
        provider: parsed.provider,
        reference: parsed.paymentRef,
        newStatus: reconciliation.newInvoiceStatus,
      },
    });

    return NextResponse.json({
      ok: true,
      reconciled: true,
      paymentId: result.payment.id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: parsed.amount,
      previousBalance: reconciliation.previousBalance,
      newBalance: reconciliation.newBalance,
      status: reconciliation.newInvoiceStatus,
      resolvedPromises: reconciliation.resolvedPromiseIds.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
