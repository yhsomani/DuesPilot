import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import {
  safeCompare,
  verifyGatewaySignature,
  parsePaymentWebhookPayload,
  reconcileInvoicePayment,
} from "@/lib/payment-webhooks";

describe("Payment Gateway Webhooks & Instant Settlement Engine", () => {
  describe("safeCompare", () => {
    it("returns true for identical strings", () => {
      expect(safeCompare("secret_signature_123", "secret_signature_123")).toBe(true);
    });

    it("returns false for different strings or length mismatch", () => {
      expect(safeCompare("secret_signature_123", "secret_signature_456")).toBe(false);
      expect(safeCompare("short", "longer_string")).toBe(false);
    });
  });

  describe("verifyGatewaySignature", () => {
    const secret = "whsec_test_secret_key_999";
    const payload = JSON.stringify({ event: "payment.captured", id: "pay_12345" });

    it("validates Razorpay HMAC SHA-256 hex signature", () => {
      const signature = createHmac("sha256", secret).update(payload).digest("hex");
      const isValid = verifyGatewaySignature(
        "razorpay",
        payload,
        { "x-razorpay-signature": signature },
        secret
      );
      expect(isValid).toBe(true);
    });

    it("rejects invalid Razorpay signature", () => {
      const isValid = verifyGatewaySignature(
        "razorpay",
        payload,
        { "x-razorpay-signature": "tampered_signature" },
        secret
      );
      expect(isValid).toBe(false);
    });

    it("validates Cashfree timestamped base64 signature", () => {
      const timestamp = "1725500000";
      const signaturePayload = `${timestamp}${payload}`;
      const signature = createHmac("sha256", secret).update(signaturePayload).digest("base64");

      const isValid = verifyGatewaySignature(
        "cashfree",
        payload,
        {
          "x-webhook-signature": signature,
          "x-webhook-timestamp": timestamp,
        },
        secret
      );
      expect(isValid).toBe(true);
    });

    it("validates Stripe v1 signature header format", () => {
      const timestamp = "1725500000";
      const signedPayload = `${timestamp}.${payload}`;
      const sig = createHmac("sha256", secret).update(signedPayload).digest("hex");
      const stripeHeader = `t=${timestamp},v1=${sig}`;

      const isValid = verifyGatewaySignature(
        "stripe",
        payload,
        { "stripe-signature": stripeHeader },
        secret
      );
      expect(isValid).toBe(true);
    });

    it("validates generic x-signature header", () => {
      const signature = createHmac("sha256", secret).update(payload).digest("hex");
      const isValid = verifyGatewaySignature(
        "generic",
        payload,
        { "x-signature": signature },
        secret
      );
      expect(isValid).toBe(true);
    });
  });

  describe("parsePaymentWebhookPayload", () => {
    it("parses Razorpay payment.captured event with paise-to-rupees conversion", () => {
      const rzpPayload = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_Rzp123456",
              amount: 4500000, // 45,000 INR in paise
              currency: "INR",
              status: "captured",
              method: "upi",
              email: "rajesh@acme.com",
              contact: "+919876543210",
              notes: {
                invoiceId: "inv_abc_1",
                invoiceNumber: "INV-2026-001",
                customerId: "cust_123",
                organizationId: "org_999",
              },
            },
          },
        },
      };

      const parsed = parsePaymentWebhookPayload(rzpPayload);
      expect(parsed.eventType).toBe("PAYMENT_SUCCESS");
      expect(parsed.provider).toBe("razorpay");
      expect(parsed.paymentRef).toBe("pay_Rzp123456");
      expect(parsed.amount).toBe(45000);
      expect(parsed.currency).toBe("INR");
      expect(parsed.paymentMode).toBe("UPI");
      expect(parsed.invoiceId).toBe("inv_abc_1");
      expect(parsed.invoiceNumber).toBe("INV-2026-001");
      expect(parsed.customerId).toBe("cust_123");
      expect(parsed.organizationId).toBe("org_999");
    });

    it("parses Razorpay payment.failed event", () => {
      const rzpFailed = {
        event: "payment.failed",
        payload: {
          payment: {
            entity: {
              id: "pay_Fail999",
              amount: 1000000,
              method: "card",
              error_description: "Insufficient funds in customer account",
              notes: {
                invoiceNumber: "INV-2026-002",
                customerId: "cust_456",
              },
            },
          },
        },
      };

      const parsed = parsePaymentWebhookPayload(rzpFailed);
      expect(parsed.eventType).toBe("PAYMENT_FAILED");
      expect(parsed.provider).toBe("razorpay");
      expect(parsed.amount).toBe(10000);
      expect(parsed.failureReason).toBe("Insufficient funds in customer account");
    });

    it("parses Cashfree PAYMENT_SUCCESS_WEBHOOK event", () => {
      const cfPayload = {
        type: "PAYMENT_SUCCESS_WEBHOOK",
        data: {
          order: {
            order_id: "cf_order_789",
            order_amount: 25000,
            order_tags: {
              invoiceNumber: "INV-CF-009",
              customerId: "cust_777",
            },
          },
          payment: {
            cf_payment_id: "cf_pay_987654",
            payment_amount: 25000,
            payment_currency: "INR",
            payment_status: "SUCCESS",
            payment_group: "netbanking",
          },
          customer_details: {
            customer_email: "accounts@supplier.in",
            customer_phone: "9876543210",
          },
        },
      };

      const parsed = parsePaymentWebhookPayload(cfPayload);
      expect(parsed.eventType).toBe("PAYMENT_SUCCESS");
      expect(parsed.provider).toBe("cashfree");
      expect(parsed.paymentRef).toBe("cf_pay_987654");
      expect(parsed.amount).toBe(25000);
      expect(parsed.paymentMode).toBe("NETBANKING");
      expect(parsed.invoiceNumber).toBe("INV-CF-009");
    });

    it("parses Stripe payment_intent.succeeded event", () => {
      const stripePayload = {
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: "pi_stripe_111",
            amount: 500000, // 5,000 INR
            currency: "inr",
            status: "succeeded",
            payment_method_types: ["card"],
            metadata: {
              invoiceId: "inv_stripe_01",
              invoiceNumber: "INV-STR-01",
              customerId: "cust_888",
            },
          },
        },
      };

      const parsed = parsePaymentWebhookPayload(stripePayload);
      expect(parsed.eventType).toBe("PAYMENT_SUCCESS");
      expect(parsed.provider).toBe("stripe");
      expect(parsed.paymentRef).toBe("pi_stripe_111");
      expect(parsed.amount).toBe(5000);
      expect(parsed.invoiceId).toBe("inv_stripe_01");
      expect(parsed.invoiceNumber).toBe("INV-STR-01");
    });

    it("parses Generic settlement payload", () => {
      const genericPayload = {
        status: "SUCCESS",
        amount: 15000,
        reference: "UTR_SBI_99887766",
        mode: "NEFT",
        invoiceNumber: "INV-GEN-99",
        customerId: "cust_gen_1",
      };

      const parsed = parsePaymentWebhookPayload(genericPayload);
      expect(parsed.eventType).toBe("PAYMENT_SUCCESS");
      expect(parsed.provider).toBe("generic");
      expect(parsed.paymentRef).toBe("UTR_SBI_99887766");
      expect(parsed.amount).toBe(15000);
      expect(parsed.paymentMode).toBe("NEFT");
    });
  });

  describe("reconcileInvoicePayment", () => {
    const mockInvoice = {
      id: "inv_1",
      invoiceNumber: "INV-100",
      amount: 100000,
      outstandingAmount: 100000,
      organizationId: "org_1",
      customerId: "cust_1",
      status: "OPEN",
    };

    it("reconciles full payment and marks invoice PAID", () => {
      const result = reconcileInvoicePayment({
        invoice: mockInvoice,
        amountPaid: 100000,
        paymentRef: "pay_full_1",
        paymentMode: "UPI",
        provider: "razorpay",
      });

      expect(result.previousBalance).toBe(100000);
      expect(result.newBalance).toBe(0);
      expect(result.newInvoiceStatus).toBe("PAID");
      expect(result.amountAllocated).toBe(100000);
    });

    it("reconciles partial payment and marks invoice PARTIALLY_PAID", () => {
      const result = reconcileInvoicePayment({
        invoice: mockInvoice,
        amountPaid: 40000,
        paymentRef: "pay_part_1",
        paymentMode: "NEFT",
        provider: "generic",
      });

      expect(result.previousBalance).toBe(100000);
      expect(result.newBalance).toBe(60000);
      expect(result.newInvoiceStatus).toBe("PARTIALLY_PAID");
      expect(result.amountAllocated).toBe(40000);
    });

    it("resolves eligible active promises to pay when payment meets threshold (>= 90%)", () => {
      const promises = [
        {
          id: "ptp_1",
          invoiceId: "inv_1",
          amount: 50000,
          status: "ACTIVE",
        },
        {
          id: "ptp_2",
          invoiceId: "inv_2", // Different invoice
          amount: 50000,
          status: "ACTIVE",
        },
      ];

      const result = reconcileInvoicePayment({
        invoice: mockInvoice,
        amountPaid: 48000, // 96% of ptp_1 amount (>= 90%)
        paymentRef: "pay_ptp_1",
        paymentMode: "UPI",
        provider: "razorpay",
        promisesToPay: promises,
      });

      expect(result.resolvedPromiseIds).toContain("ptp_1");
      expect(result.resolvedPromiseIds).not.toContain("ptp_2");
    });

    it("settles multi-installment payment plan progression", () => {
      const installments = [
        {
          sequence: 1,
          dueDate: "2026-09-10",
          amount: 50000,
          paidAmount: 0,
          status: "PENDING" as const,
        },
        {
          sequence: 2,
          dueDate: "2026-09-25",
          amount: 50000,
          paidAmount: 0,
          status: "PENDING" as const,
        },
      ];

      const result = reconcileInvoicePayment({
        invoice: mockInvoice,
        amountPaid: 60000,
        paymentRef: "pay_plan_1",
        paymentMode: "UPI",
        provider: "razorpay",
        paymentPlan: {
          id: "plan_1",
          installments,
        },
      });

      expect(result.updatedInstallments).toBeDefined();
      expect(result.updatedInstallments![0].status).toBe("KEPT");
      expect(result.updatedInstallments![0].paidAmount).toBe(50000);
      expect(result.updatedInstallments![1].status).toBe("PARTIALLY_PAID");
      expect(result.updatedInstallments![1].paidAmount).toBe(10000);
      expect(result.newPlanStatus).toBe("ACTIVE");
    });
  });
});
