import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { normalizePhoneNumber, sendWhatsAppMessage } from "../whatsapp";

describe("WhatsApp Adapter & Dispatch Engine", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("normalizePhoneNumber", () => {
    it("normalizes 10-digit Indian numbers to +91 E.164", () => {
      expect(normalizePhoneNumber("9876543210")).toBe("+919876543210");
      expect(normalizePhoneNumber(" 98765 43210 ")).toBe("+919876543210");
    });

    it("handles numbers with 91 prefix without leading plus", () => {
      expect(normalizePhoneNumber("919876543210")).toBe("+919876543210");
    });

    it("preserves already formatted E.164 numbers", () => {
      expect(normalizePhoneNumber("+919876543210")).toBe("+919876543210");
      expect(normalizePhoneNumber("+14155552671")).toBe("+14155552671");
    });
  });

  describe("sendWhatsAppMessage", () => {
    it("falls back to deterministic mock provider in test/dev environment", async () => {
      delete process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
      delete process.env.INTERAKT_API_KEY;
      delete process.env.GUPSHUP_API_KEY;
      delete process.env.TWILIO_ACCOUNT_SID;

      const result = await sendWhatsAppMessage({
        to: "9876543210",
        message: "Your payment of ₹5,000 is due today.",
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe("mock");
      expect(result.messageId).toContain("mock_wa_");
    });

    it("routes to Meta Cloud API when token and phone ID are configured", async () => {
      process.env.WHATSAPP_CLOUD_ACCESS_TOKEN = "test_meta_token";
      process.env.WHATSAPP_PHONE_NUMBER_ID = "123456789";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          messages: [{ id: "wamid.HBgLMTIzNDU2" }],
        }),
      } as unknown as Response);

      const result = await sendWhatsAppMessage({
        to: "+919876543210",
        message: "Reminder: Invoice #INV-101 overdue.",
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe("meta");
      expect(result.messageId).toBe("wamid.HBgLMTIzNDU2");
    });

    it("routes to Interakt API when key is configured", async () => {
      delete process.env.WHATSAPP_CLOUD_ACCESS_TOKEN;
      process.env.INTERAKT_API_KEY = "test_interakt_key";

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "interakt_msg_987",
        }),
      } as unknown as Response);

      const result = await sendWhatsAppMessage({
        to: "9876543210",
        message: "Interakt notice",
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe("interakt");
      expect(result.messageId).toBe("interakt_msg_987");
    });
  });
});
