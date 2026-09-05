import { describe, it, expect } from "vitest";
import {
  extractDateFromText,
  extractAmountFromText,
  extractPaymentMode,
  extractPromiseFromCommunication,
  generateDunningDraft,
} from "@/lib/copilot";

describe("AI Copilot - Promise Extraction & Dunning Engine", () => {
  describe("extractDateFromText", () => {
    const fixedBaseDate = new Date("2026-09-01T00:00:00.000Z");

    it("parses ISO date strings correctly", () => {
      expect(extractDateFromText("Will pay by 2026-09-25", fixedBaseDate)).toBe("2026-09-25");
      expect(extractDateFromText("Invoice settlement scheduled for 2026/10/15", fixedBaseDate)).toBe("2026-10-15");
    });

    it("parses DD/MM/YYYY dates correctly", () => {
      expect(extractDateFromText("Payment on 15-09-2026", fixedBaseDate)).toBe("2026-09-15");
      expect(extractDateFromText("Releasing cheque on 05/11/2026", fixedBaseDate)).toBe("2026-11-05");
    });

    it("parses natural month names correctly", () => {
      expect(extractDateFromText("Will clear by 15th September 2026", fixedBaseDate)).toBe("2026-09-15");
      expect(extractDateFromText("Scheduled for 20 Oct 2026", fixedBaseDate)).toBe("2026-10-20");
    });

    it("handles relative dates correctly", () => {
      const tomorrow = extractDateFromText("will pay tomorrow", fixedBaseDate);
      expect(tomorrow).toBe("2026-09-02");

      const inDays = extractDateFromText("give us in 5 days", fixedBaseDate);
      expect(inDays).toBe("2026-09-06");
    });
  });

  describe("extractAmountFromText", () => {
    it("extracts rupee symbol and INR prefixes", () => {
      expect(extractAmountFromText("Sending ₹45,000 today")).toBe(45000);
      expect(extractAmountFromText("Will pay INR 1,25,000 via RTGS")).toBe(125000);
      expect(extractAmountFromText("Rs. 5000 credited")).toBe(5000);
    });

    it("extracts 'k' and 'lakh' abbreviations", () => {
      expect(extractAmountFromText("Clearing 50k tomorrow")).toBe(50000);
      expect(extractAmountFromText("Releasing 2.5 lakhs this week")).toBe(250000);
    });

    it("returns null when no amount pattern is found", () => {
      expect(extractAmountFromText("We will process the invoice soon")).toBeNull();
    });
  });

  describe("extractPaymentMode", () => {
    it("identifies standard payment rails", () => {
      expect(extractPaymentMode("Will transfer via UPI / GPay")).toBe("UPI");
      expect(extractPaymentMode("Initiating RTGS from HDFC Bank")).toBe("RTGS");
      expect(extractPaymentMode("Settled through NEFT")).toBe("NEFT");
      expect(extractPaymentMode("Sending account payee cheque #44921")).toBe("CHEQUE");
      expect(extractPaymentMode("Paid via Net Banking")).toBe("BANK_TRANSFER");
    });

    it("returns null for unspecified rails", () => {
      expect(extractPaymentMode("Will settle by Friday")).toBeNull();
    });
  });

  describe("extractPromiseFromCommunication", () => {
    it("identifies commitment to pay with amount and date", async () => {
      const text = "Hi team, we will pay ₹75,000 by 2026-09-20 via NEFT. Thanks.";
      const result = await extractPromiseFromCommunication(text);

      expect(result.intent).toBe("COMMITMENT_TO_PAY");
      expect(result.amount).toBe(75000);
      expect(result.promiseDate).toBe("2026-09-20");
      expect(result.paymentMode).toBe("NEFT");
      expect(result.confidenceScore).toBeGreaterThanOrEqual(75);
    });

    it("identifies dispute intent correctly", async () => {
      const text = "We dispute this invoice because of wrong amount and rate mismatch.";
      const result = await extractPromiseFromCommunication(text);

      expect(result.intent).toBe("DISPUTE_RAISED");
      expect(result.disputeReason).toBeDefined();
    });

    it("identifies extension requests", async () => {
      const text = "Facing temporary cash crunch, please give us extension until 2026-10-15.";
      const result = await extractPromiseFromCommunication(text);

      expect(result.intent).toBe("REQUEST_EXTENSION");
      expect(result.promiseDate).toBe("2026-10-15");
    });
  });

  describe("generateDunningDraft", () => {
    it("generates friendly tone draft for early overdue", async () => {
      const draft = await generateDunningDraft({
        customerName: "Acme Corp",
        contactName: "John",
        totalOverdue: 50000,
        oldestInvoiceDaysOverdue: 7,
        invoicesCount: 1,
        tone: "FRIENDLY",
        channel: "EMAIL",
        paymentLink: "https://pay.duespilot.com/123",
        senderOrgName: "TechNova Ltd",
      });

      expect(draft.subject).toContain("Gentle Reminder");
      expect(draft.body).toContain("John");
      expect(draft.body).toContain("₹50,000");
      expect(draft.body).toContain("https://pay.duespilot.com/123");
    });

    it("generates MSME statutory demand notice with penal interest clause", async () => {
      const draft = await generateDunningDraft({
        customerName: "Bharat Enterprises",
        totalOverdue: 200000,
        oldestInvoiceDaysOverdue: 60,
        invoicesCount: 3,
        isMsmeCreditor: true,
        msmePenalInterest: 10125,
        tone: "MSME_STATUTORY_DEMAND",
        channel: "EMAIL",
        senderOrgName: "Precision Tools MSME",
      });

      expect(draft.subject).toContain("MSMED Act 2006");
      expect(draft.body).toContain("Section 16 of the MSMED Act 2006");
      expect(draft.body).toContain("₹2,00,000");
    });

    it("formats WhatsApp and SMS concise templates", async () => {
      const waDraft = await generateDunningDraft({
        customerName: "Zenith Retail",
        totalOverdue: 15000,
        oldestInvoiceDaysOverdue: 35,
        invoicesCount: 1,
        tone: "FIRM",
        channel: "WHATSAPP",
        senderOrgName: "DuesPilot",
      });

      expect(waDraft.subject).toBeUndefined();
      expect(waDraft.body).toContain("URGENT PAYMENT ESCALATION");
      expect(waDraft.body).toContain("₹15,000");
    });
  });
});
