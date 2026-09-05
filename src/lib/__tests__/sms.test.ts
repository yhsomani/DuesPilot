import { describe, it, expect } from "vitest";
import {
  normalizeIndianPhoneNumber,
  isUnicodeText,
  calculateSmsSegments,
  verifyDltCompliance,
  sendSms,
  DLT_TEMPLATES,
} from "@/lib/sms";

describe("Indian DLT SMS Gateway Adapter", () => {
  describe("normalizeIndianPhoneNumber", () => {
    it("normalizes clean 10-digit Indian numbers", () => {
      const res = normalizeIndianPhoneNumber("9876543210");
      expect(res.isValid).toBe(true);
      expect(res.e164).toBe("+919876543210");
      expect(res.rawTenDigit).toBe("9876543210");
    });

    it("normalizes numbers with +91 or 91 or 0 prefix", () => {
      expect(normalizeIndianPhoneNumber("+919876543210").e164).toBe("+919876543210");
      expect(normalizeIndianPhoneNumber("919876543210").e164).toBe("+919876543210");
      expect(normalizeIndianPhoneNumber("09876543210").e164).toBe("+919876543210");
    });

    it("strips formatting spaces, dashes, and parentheses", () => {
      const res = normalizeIndianPhoneNumber("+91 (98765) - 43210");
      expect(res.isValid).toBe(true);
      expect(res.e164).toBe("+919876543210");
    });

    it("rejects invalid numbers", () => {
      expect(normalizeIndianPhoneNumber("12345").isValid).toBe(false);
      expect(normalizeIndianPhoneNumber("5876543210").isValid).toBe(false); // Does not start with 6-9
      expect(normalizeIndianPhoneNumber("").isValid).toBe(false);
    });
  });

  describe("isUnicodeText & calculateSmsSegments", () => {
    it("detects standard ASCII as non-unicode", () => {
      const text = "Dear Customer, reminder that invoice INV-123 is due today.";
      expect(isUnicodeText(text)).toBe(false);
      const seg = calculateSmsSegments(text);
      expect(seg.isUnicode).toBe(false);
      expect(seg.segments).toBe(1);
    });

    it("calculates multi-segment GSM-7 SMS (> 160 chars)", () => {
      const longText = "A".repeat(200);
      const seg = calculateSmsSegments(longText);
      expect(seg.isUnicode).toBe(false);
      expect(seg.segments).toBe(2); // 160 + 40 (using 153 char concatenated limit -> ceil(200/153) = 2)
    });

    it("detects Unicode characters and applies 70-char segment limit", () => {
      const unicodeText = "बकाया राशि का भुगतान करें (Invoice INV-001)";
      expect(isUnicodeText(unicodeText)).toBe(true);
      const seg = calculateSmsSegments(unicodeText);
      expect(seg.isUnicode).toBe(true);
      expect(seg.segments).toBe(1);

      const longUnicode = "नमस्ते ".repeat(25); // ~175 chars
      const longSeg = calculateSmsSegments(longUnicode);
      expect(longSeg.segments).toBe(Math.ceil(longUnicode.length / 67));
    });
  });

  describe("verifyDltCompliance", () => {
    it("validates compliant DLT configuration", () => {
      const res = verifyDltCompliance(
        DLT_TEMPLATES["sms-payment-reminder"].templateId,
        "Sample message",
        "1101568900000045231",
        "DUESPL"
      );
      expect(res.compliant).toBe(true);
      expect(res.reasons).toHaveLength(0);
      expect(res.header).toBe("DUESPL");
    });

    it("flags invalid entity ID or header", () => {
      const res = verifyDltCompliance(
        "123", // Too short
        "Sample",
        "invalid_entity",
        "TOOLONGHEADER"
      );
      expect(res.compliant).toBe(false);
      expect(res.reasons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("sendSms", () => {
    it("successfully dispatches in deterministic mock mode", async () => {
      const res = await sendSms({
        to: "+91 98765 43210",
        message: "Dear Rajesh, reminder that invoice INV-101 for Rs.45,000 is due on 15 Sep 2026. - DuesPilot",
        dltTemplateId: DLT_TEMPLATES["sms-payment-reminder"].templateId,
      });

      expect(res.success).toBe(true);
      expect(res.recipient).toBe("+919876543210");
      expect(res.messageId).toContain("sms_dlt_");
      expect(res.dltCompliant).toBe(true);
      expect(res.smsSegments).toBe(1);
    });

    it("fails with informative error on invalid mobile number", async () => {
      const res = await sendSms({
        to: "000000",
        message: "Test message",
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Invalid Indian mobile number");
    });
  });
});
