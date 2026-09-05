import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { generateUpiDeepLink, generatePaymentLink } from "../payment-links";

describe("Payment Links & Dynamic UPI Engine", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("generateUpiDeepLink", () => {
    it("generates an NPCI compliant upi://pay URI", () => {
      const uri = generateUpiDeepLink({
        vpa: "duespilot@icici",
        payeeName: "DuesPilot Logistics",
        amount: 15400.5,
        invoiceNumber: "INV-2026-001",
      });

      expect(uri).toContain("upi://pay?");
      expect(uri).toContain("pa=duespilot%40icici");
      expect(uri).toContain("pn=DuesPilot+Logistics");
      expect(uri).toContain("am=15400.50");
      expect(uri).toContain("cu=INR");
      expect(uri).toContain("tn=Payment+for+Inv+INV-2026-001");
    });
  });

  describe("generatePaymentLink", () => {
    it("generates deterministic hosted payment link and UPI QR payload on fallback", async () => {
      delete process.env.RAZORPAY_KEY_ID;
      delete process.env.RAZORPAY_KEY_SECRET;

      const result = await generatePaymentLink({
        amount: 25000,
        customerId: "cust_abc123",
        customerName: "Acme Enterprises",
        invoiceNumber: "INV-890",
        merchantVpa: "settle@axisbank",
      });

      expect(result.amount).toBe(25000);
      expect(result.provider).toBe("duespilot_direct");
      expect(result.paymentUrl).toContain("https://pay.duespilot.com/plink_");
      expect(result.paymentUrl).toContain("amount=25000");
      expect(result.upiDeepLink).toContain("upi://pay?pa=settle%40axisbank");
      expect(result.qrPayload).toBe(result.upiDeepLink);
      expect(result.linkId).toContain("plink_c123_");
    });

    it("generates Razorpay payment link when API credentials are provided", async () => {
      process.env.RAZORPAY_KEY_ID = "rzp_test_key";
      process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "plink_rzp_999",
          short_url: "https://rzp.io/i/abc1234",
        }),
      } as unknown as Response);

      const result = await generatePaymentLink({
        amount: 5000,
        customerId: "cust_123",
        customerName: "Test Buyer",
      });

      expect(result.provider).toBe("razorpay");
      expect(result.paymentUrl).toBe("https://rzp.io/i/abc1234");
      expect(result.linkId).toBe("plink_rzp_999");
    });
  });
});
