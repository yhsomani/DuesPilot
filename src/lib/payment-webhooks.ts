import { createHmac, timingSafeEqual } from "crypto";
import { allocatePaymentToInstallments, type Installment, type PaymentPlanStatus } from "@/lib/payment-plans";

export type PaymentGateway = "razorpay" | "cashfree" | "stripe" | "generic";

export type WebhookPaymentEventType = "PAYMENT_SUCCESS" | "PAYMENT_FAILED" | "REFUND" | "UNKNOWN";

export interface ParsedPaymentWebhook {
  eventType: WebhookPaymentEventType;
  provider: PaymentGateway;
  paymentRef: string;
  amount: number; // in INR
  currency: string;
  paymentMode: string;
  status: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  customerId?: string | null;
  organizationId?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  failureReason?: string | null;
  rawEvent?: string;
  metadata?: Record<string, unknown>;
}

export interface ReconcilePaymentInput {
  invoice: {
    id: string;
    invoiceNumber: string;
    amount: number;
    outstandingAmount: number;
    organizationId: string;
    customerId: string;
    status: string;
  };
  amountPaid: number;
  paymentRef: string;
  paymentMode: string;
  provider: string;
  promisesToPay?: Array<{
    id: string;
    invoiceId?: string | null;
    amount: number;
    status: string;
  }>;
  paymentPlan?: {
    id: string;
    installments: Installment[];
  } | null;
}

export interface ReconcilePaymentResult {
  previousBalance: number;
  newBalance: number;
  newInvoiceStatus: "PAID" | "PARTIALLY_PAID" | "OPEN";
  amountAllocated: number;
  resolvedPromiseIds: string[];
  updatedInstallments?: Installment[];
  newPlanStatus?: PaymentPlanStatus;
}

/**
 * Constant-time string equality check to prevent timing attacks.
 */
export function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, "utf-8");
    const bufB = Buffer.from(b, "utf-8");
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Validates HMAC signatures from supported payment gateways.
 */
export function verifyGatewaySignature(
  gateway: PaymentGateway,
  rawPayload: string,
  headers: Record<string, string | null | undefined>,
  secret: string
): boolean {
  if (!secret || !rawPayload) return false;

  const normalizedHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    if (v) normalizedHeaders[k.toLowerCase()] = v;
  }

  try {
    switch (gateway) {
      case "razorpay": {
        const signature = normalizedHeaders["x-razorpay-signature"];
        if (!signature) return false;
        const expected = createHmac("sha256", secret).update(rawPayload).digest("hex");
        return safeCompare(signature, expected);
      }

      case "cashfree": {
        const signature = normalizedHeaders["x-webhook-signature"];
        const timestamp = normalizedHeaders["x-webhook-timestamp"] || "";
        if (!signature) return false;
        const signaturePayload = timestamp ? `${timestamp}${rawPayload}` : rawPayload;
        const expected = createHmac("sha256", secret).update(signaturePayload).digest("base64");
        return safeCompare(signature, expected);
      }

      case "stripe": {
        const signatureHeader = normalizedHeaders["stripe-signature"];
        if (!signatureHeader) return false;

        // Parse t=timestamp,v1=signature
        const parts = signatureHeader.split(",");
        const timestampPart = parts.find((p) => p.startsWith("t="));
        const sigPart = parts.find((p) => p.startsWith("v1="));

        if (!sigPart) return false;
        const sig = sigPart.slice(3);
        const timestamp = timestampPart ? timestampPart.slice(2) : "";
        const signedPayload = timestamp ? `${timestamp}.${rawPayload}` : rawPayload;
        const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

        return safeCompare(sig, expected);
      }

      case "generic":
      default: {
        const signature =
          normalizedHeaders["x-signature"] ||
          normalizedHeaders["x-duespilot-signature"] ||
          normalizedHeaders["signature"];
        if (!signature) return false;
        const expected = createHmac("sha256", secret).update(rawPayload).digest("hex");
        return safeCompare(signature, expected);
      }
    }
  } catch {
    return false;
  }
}

/**
 * Parses and normalizes incoming payment webhook payloads from Razorpay, Cashfree, Stripe, or Generic.
 */
export function parsePaymentWebhookPayload(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  headers?: Record<string, string | null | undefined>
): ParsedPaymentWebhook {
  const normHeaders: Record<string, string> = {};
  if (headers) {
    for (const [k, v] of Object.entries(headers)) {
      if (v) normHeaders[k.toLowerCase()] = v;
    }
  }

  // 1. Razorpay Webhook Event Format
  if (body?.event && body?.payload) {
    const event = String(body.event);
    const plink = body.payload?.payment_link?.entity;
    const payment = body.payload?.payment?.entity;
    const order = body.payload?.order?.entity;
    const refund = body.payload?.refund?.entity;

    const notes = payment?.notes || plink?.notes || order?.notes || {};
    const invoiceId = notes.invoiceId || notes.invoice_id || null;
    const invoiceNumber = notes.invoiceNumber || notes.invoice_number || null;
    const customerId = notes.customerId || notes.customer_id || null;
    const organizationId = notes.organizationId || notes.organization_id || null;

    let eventType: WebhookPaymentEventType = "UNKNOWN";
    if (
      event === "payment_link.paid" ||
      event === "payment.captured" ||
      event === "order.paid" ||
      event === "payment.authorized"
    ) {
      eventType = "PAYMENT_SUCCESS";
    } else if (event === "payment.failed") {
      eventType = "PAYMENT_FAILED";
    } else if (event === "refund.processed" || event === "refund.created") {
      eventType = "REFUND";
    }

    // Razorpay amounts are in paise (1 INR = 100 paise)
    const rawPaise = payment?.amount ?? plink?.amount_paid ?? plink?.amount ?? order?.amount_paid ?? refund?.amount ?? 0;
    const amount = rawPaise > 0 ? Math.round((rawPaise / 100) * 100) / 100 : 0;
    const paymentRef = payment?.id || plink?.id || order?.id || refund?.id || `rzp_${Date.now()}`;
    const paymentMode = (payment?.method || payment?.wallet || "ONLINE").toUpperCase();

    return {
      eventType,
      provider: "razorpay",
      paymentRef,
      amount,
      currency: (payment?.currency || plink?.currency || "INR").toUpperCase(),
      paymentMode,
      status: payment?.status || plink?.status || event,
      invoiceId,
      invoiceNumber,
      customerId,
      organizationId,
      customerEmail: payment?.email || plink?.customer?.email || null,
      customerPhone: payment?.contact || plink?.customer?.contact || null,
      failureReason: payment?.error_description || payment?.error_reason || null,
      rawEvent: event,
      metadata: notes,
    };
  }

  // 2. Cashfree Webhook Event Format
  if (body?.type && (body.type.includes("PAYMENT") || body.type.includes("TRANSFER") || body.type.includes("ORDER") || body?.data?.payment)) {
    const eventTypeStr = String(body.type || "");
    const paymentObj = body.data?.payment || body.data?.order || {};
    const customerDetails = body.data?.customer_details || {};

    let eventType: WebhookPaymentEventType = "UNKNOWN";
    if (eventTypeStr.includes("SUCCESS") || eventTypeStr === "PAYMENT_SUCCESS_WEBHOOK" || paymentObj.payment_status === "SUCCESS") {
      eventType = "PAYMENT_SUCCESS";
    } else if (eventTypeStr.includes("FAILED") || paymentObj.payment_status === "FAILED") {
      eventType = "PAYMENT_FAILED";
    } else if (eventTypeStr.includes("REFUND")) {
      eventType = "REFUND";
    }

    const orderTags = body.data?.order?.order_tags || paymentObj.order_tags || {};
    const invoiceId = orderTags.invoiceId || orderTags.invoice_id || null;
    const invoiceNumber = orderTags.invoiceNumber || orderTags.invoice_number || body.data?.order?.order_id || null;
    const customerId = orderTags.customerId || orderTags.customer_id || customerDetails.customer_id || null;
    const organizationId = orderTags.organizationId || orderTags.organization_id || null;

    const amount = Number(paymentObj.payment_amount ?? body.data?.order?.order_amount ?? 0);
    const paymentRef = String(paymentObj.cf_payment_id || paymentObj.payment_id || body.data?.order?.order_id || `cf_${Date.now()}`);
    const paymentMode = String(paymentObj.payment_group || paymentObj.payment_method || "ONLINE").toUpperCase();

    return {
      eventType,
      provider: "cashfree",
      paymentRef,
      amount: Math.round(amount * 100) / 100,
      currency: (paymentObj.payment_currency || "INR").toUpperCase(),
      paymentMode,
      status: paymentObj.payment_status || eventTypeStr,
      invoiceId,
      invoiceNumber,
      customerId,
      organizationId,
      customerEmail: customerDetails.customer_email || null,
      customerPhone: customerDetails.customer_phone || null,
      failureReason: paymentObj.payment_message || null,
      rawEvent: eventTypeStr,
      metadata: orderTags,
    };
  }

  // 3. Stripe Webhook Event Format
  if (body?.type && body?.data?.object) {
    const stripeEvent = String(body.type);
    const obj = body.data.object;
    const metadata = obj.metadata || {};

    let eventType: WebhookPaymentEventType = "UNKNOWN";
    if (
      stripeEvent === "payment_intent.succeeded" ||
      stripeEvent === "charge.succeeded" ||
      stripeEvent === "checkout.session.completed"
    ) {
      eventType = "PAYMENT_SUCCESS";
    } else if (
      stripeEvent === "payment_intent.payment_failed" ||
      stripeEvent === "charge.failed"
    ) {
      eventType = "PAYMENT_FAILED";
    } else if (stripeEvent.startsWith("charge.refunded") || stripeEvent.startsWith("refund.")) {
      eventType = "REFUND";
    }

    // Stripe amounts are in lowest denomination (e.g., cents/paise)
    const rawAmount = obj.amount_received ?? obj.amount ?? 0;
    const amount = Math.round((rawAmount / 100) * 100) / 100;
    const paymentRef = obj.id || `str_${Date.now()}`;
    const paymentMode = (obj.payment_method_types?.[0] || "CARD").toUpperCase();

    return {
      eventType,
      provider: "stripe",
      paymentRef,
      amount,
      currency: (obj.currency || "INR").toUpperCase(),
      paymentMode,
      status: obj.status || stripeEvent,
      invoiceId: metadata.invoiceId || metadata.invoice_id || null,
      invoiceNumber: metadata.invoiceNumber || metadata.invoice_number || null,
      customerId: metadata.customerId || metadata.customer_id || null,
      organizationId: metadata.organizationId || metadata.organization_id || null,
      customerEmail: obj.receipt_email || obj.customer_email || metadata.customerEmail || null,
      customerPhone: metadata.customerPhone || null,
      failureReason: obj.last_payment_error?.message || null,
      rawEvent: stripeEvent,
      metadata,
    };
  }

  // 4. Generic / Direct Settlement Payload
  const rawStatus = String(body?.status || body?.event || "SUCCESS").toUpperCase();
  let eventType: WebhookPaymentEventType = "PAYMENT_SUCCESS";
  if (rawStatus.includes("FAIL") || rawStatus.includes("REJECT")) {
    eventType = "PAYMENT_FAILED";
  } else if (rawStatus.includes("REFUND")) {
    eventType = "REFUND";
  }

  const amountPaid = Number(body?.amount ?? body?.amountPaid ?? body?.paymentAmount ?? 0);
  const paymentRef = String(body?.reference || body?.paymentId || body?.transactionId || body?.id || `pay_${Date.now()}`);
  const paymentMode = String(body?.mode || body?.paymentMode || body?.paymentMethod || "UPI").toUpperCase();

  return {
    eventType,
    provider: (body?.provider as PaymentGateway) || "generic",
    paymentRef,
    amount: Math.round(amountPaid * 100) / 100,
    currency: String(body?.currency || "INR").toUpperCase(),
    paymentMode,
    status: rawStatus,
    invoiceId: body?.invoiceId || body?.invoice_id || null,
    invoiceNumber: body?.invoiceNumber || body?.invoice_number || null,
    customerId: body?.customerId || body?.customer_id || null,
    organizationId: body?.organizationId || body?.organization_id || null,
    customerEmail: body?.customerEmail || body?.email || null,
    customerPhone: body?.customerPhone || body?.phone || null,
    failureReason: body?.failureReason || body?.error || null,
    rawEvent: rawStatus,
    metadata: body?.metadata || {},
  };
}

/**
 * Reconciles invoice balance, updates invoice status, resolves promises, and settles payment plan installments.
 */
export function reconcileInvoicePayment({
  invoice,
  amountPaid,
  promisesToPay = [],
  paymentPlan,
}: ReconcilePaymentInput): ReconcilePaymentResult {
  const currentOutstanding = Math.max(0, invoice.outstandingAmount);
  const newOutstanding = Math.max(0, Math.round((currentOutstanding - amountPaid) * 100) / 100);

  let newInvoiceStatus: "PAID" | "PARTIALLY_PAID" | "OPEN" = "OPEN";
  if (newOutstanding <= 0) {
    newInvoiceStatus = "PAID";
  } else if (newOutstanding < invoice.amount) {
    newInvoiceStatus = "PARTIALLY_PAID";
  }

  // 1. Resolve eligible active promises to pay
  const resolvedPromiseIds: string[] = [];
  for (const promise of promisesToPay) {
    if (promise.status === "ACTIVE") {
      // If promise matches invoice or customer-wide, and payment is at least 90% of promised amount
      if (promise.invoiceId === invoice.id || !promise.invoiceId) {
        if (amountPaid >= promise.amount * 0.9) {
          resolvedPromiseIds.push(promise.id);
        }
      }
    }
  }

  // 2. Settle payment plan installments if applicable
  let updatedInstallments: Installment[] | undefined;
  let newPlanStatus: PaymentPlanStatus | undefined;

  if (paymentPlan && paymentPlan.installments.length > 0) {
    const planResult = allocatePaymentToInstallments(paymentPlan.installments, amountPaid);
    updatedInstallments = planResult.updatedInstallments;
    newPlanStatus = planResult.planStatus;
  }

  return {
    previousBalance: currentOutstanding,
    newBalance: newOutstanding,
    newInvoiceStatus,
    amountAllocated: Math.min(currentOutstanding, amountPaid),
    resolvedPromiseIds,
    updatedInstallments,
    newPlanStatus,
  };
}
