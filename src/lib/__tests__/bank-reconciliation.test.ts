import { describe, it, expect } from "vitest";
import {
  extractUtrFromNarration,
  extractInvoiceNumberFromNarration,
  calculateFuzzyScore,
  parseBankStatementCsv,
  matchTransactionsAgainstReceivables,
  type OpenInvoiceForMatch,
  type CustomerForMatch,
} from "../bank-reconciliation";

describe("Bank Reconciliation Engine", () => {
  describe("extractUtrFromNarration", () => {
    it("extracts NEFT reference numbers", () => {
      const narration = "NEFT-N0922425678912-ACME CORP-PAYMENT";
      expect(extractUtrFromNarration(narration)).toBe("N0922425678912");
    });

    it("extracts UPI 12-digit transaction references", () => {
      const narration = "UPI/328947239847/Payment from PhonePe/Acme";
      expect(extractUtrFromNarration(narration)).toBe("328947239847");
    });

    it("extracts IMPS references", () => {
      const narration = "IMPS/P2A/402819284918/Settlement";
      expect(extractUtrFromNarration(narration)).toBe("402819284918");
    });

    it("extracts RTGS references", () => {
      const narration = "RTGS/HDFCR5202409050012/SUPPLIER";
      expect(extractUtrFromNarration(narration)).toBe("HDFCR5202409050012");
    });

    it("extracts Cheque numbers", () => {
      const narration = "CLEARING CHQ NO 847291 INWARD";
      expect(extractUtrFromNarration(narration)).toBe("847291");
    });

    it("returns null when no transaction pattern matches", () => {
      expect(extractUtrFromNarration("INTEREST CREDITED")).toBeNull();
      expect(extractUtrFromNarration("")).toBeNull();
    });
  });

  describe("extractInvoiceNumberFromNarration", () => {
    const knownInvoices = ["INV-2024-001", "INV-2024-002", "DPL-8891"];

    it("detects exact and case-insensitive invoice numbers in narration", () => {
      expect(extractInvoiceNumberFromNarration("Payment for inv-2024-001 by RTGS", knownInvoices)).toBe("INV-2024-001");
      expect(extractInvoiceNumberFromNarration("NEFT-DPL-8891-FULL-SETTLE", knownInvoices)).toBe("DPL-8891");
    });

    it("returns null when narration doesn't mention known invoices", () => {
      expect(extractInvoiceNumberFromNarration("NEFT PAYMENT FROM TECH CORP", knownInvoices)).toBeNull();
      expect(extractInvoiceNumberFromNarration("", knownInvoices)).toBeNull();
    });
  });

  describe("calculateFuzzyScore", () => {
    it("computes high token similarity score for matching corporate names", () => {
      const score = calculateFuzzyScore("NEFT-RELIANCE INDUSTRIES LTD-MUMBAI", "Reliance Industries");
      expect(score).toBeGreaterThanOrEqual(50);
    });

    it("ignores common legal entity suffixes like pvt, ltd, llp", () => {
      const score = calculateFuzzyScore("TRANSFER FROM ACME PRIVATE LIMITED", "Acme Industries Limited");
      expect(score).toBeGreaterThanOrEqual(50);
    });

    it("returns 0 for completely unrelated strings", () => {
      expect(calculateFuzzyScore("TATA CONSULTANCY SERVICES", "Zomato Logistics")).toBe(0);
      expect(calculateFuzzyScore("", "Tata")).toBe(0);
    });
  });

  describe("parseBankStatementCsv", () => {
    it("correctly parses standard HDFC/ICICI bank statement format", () => {
      const csv = `Date,Narration,Chq/Ref No,Deposit (INR),Balance (INR)
05/09/2026,NEFT-N09224256789-ACME CORP,N09224256789,"45,000.00","1,50,000.00"
06/09/2026,UPI/328947239847/INV-2024-002,328947239847,"15,500.00","1,65,500.00"
07/09/2026,MONTHLY MAINTENANCE CHARGES,,0.00,"1,65,500.00"`;

      const result = parseBankStatementCsv(csv);
      expect(result.errors).toHaveLength(0);
      expect(result.transactions).toHaveLength(2); // Skips 0 amount row

      expect(result.transactions[0].date).toBe("2026-09-05");
      expect(result.transactions[0].creditAmount).toBe(45000);
      expect(result.transactions[0].reference).toBe("N09224256789");
      expect(result.transactions[0].balance).toBe(150000);

      expect(result.transactions[1].date).toBe("2026-09-06");
      expect(result.transactions[1].creditAmount).toBe(15500);
    });
  });

  describe("matchTransactionsAgainstReceivables", () => {
    const openInvoices: OpenInvoiceForMatch[] = [
      {
        id: "inv_1",
        invoiceNumber: "INV-2024-001",
        customerId: "cust_1",
        customerName: "Acme Corp Ltd",
        amount: 50000,
        paidAmount: 5000,
        balance: 45000,
        dueDate: "2026-08-15",
      },
      {
        id: "inv_2",
        invoiceNumber: "INV-2024-002",
        customerId: "cust_2",
        customerName: "Apex Logistics",
        amount: 25000,
        paidAmount: 0,
        balance: 25000,
        dueDate: "2026-08-20",
      },
      {
        id: "inv_3",
        invoiceNumber: "INV-2024-003",
        customerId: "cust_2",
        customerName: "Apex Logistics",
        amount: 15000,
        paidAmount: 0,
        balance: 15000,
        dueDate: "2026-08-25",
      },
    ];

    const customers: CustomerForMatch[] = [
      { id: "cust_1", name: "Acme Corp Ltd" },
      { id: "cust_2", name: "Apex Logistics" },
      { id: "cust_3", name: "Zenith Enterprises" },
    ];

    it("matches exact invoice number mentioned in bank narration (Strategy 1)", () => {
      const txns = [
        {
          id: "txn_1",
          date: "2026-09-05",
          narration: "NEFT-SETTLEMENT-INV-2024-001-PAY",
          reference: "NEFT12345",
          creditAmount: 45000,
        },
      ];

      const matches = matchTransactionsAgainstReceivables(txns, openInvoices, customers);
      expect(matches).toHaveLength(1);
      expect(matches[0].matchType).toBe("EXACT_INVOICE");
      expect(matches[0].confidenceLevel).toBe("HIGH");
      expect(matches[0].suggestedAllocations[0].invoiceId).toBe("inv_1");
      expect(matches[0].suggestedAllocations[0].amount).toBe(45000);
    });

    it("matches single invoice by exact balance amount (Strategy 2)", () => {
      const txns = [
        {
          id: "txn_2",
          date: "2026-09-05",
          narration: "DIRECT BANK TRANSFER REF 99281",
          reference: "REF99281",
          creditAmount: 45000, // Matches unique balance of inv_1
        },
      ];

      const matches = matchTransactionsAgainstReceivables(txns, openInvoices, customers);
      expect(matches).toHaveLength(1);
      expect(matches[0].matchType).toBe("EXACT_INVOICE");
      expect(matches[0].confidenceLevel).toBe("HIGH");
      expect(matches[0].suggestedAllocations[0].invoiceNumber).toBe("INV-2024-001");
    });

    it("allocates multi-invoice settlement chronologically when customer name matches (Strategy 3)", () => {
      const txns = [
        {
          id: "txn_3",
          date: "2026-09-05",
          narration: "TRANSFER FROM APEX LOGISTICS PVT LTD",
          reference: "TXN88392",
          creditAmount: 30000, // Covers 25k of inv_2 and 5k of inv_3
        },
      ];

      const matches = matchTransactionsAgainstReceivables(txns, openInvoices, customers);
      expect(matches).toHaveLength(1);
      expect(matches[0].matchType).toBe("MULTI_INVOICE");
      expect(matches[0].suggestedAllocations).toHaveLength(2);
      expect(matches[0].suggestedAllocations[0].invoiceId).toBe("inv_2");
      expect(matches[0].suggestedAllocations[0].amount).toBe(25000);
      expect(matches[0].suggestedAllocations[1].invoiceId).toBe("inv_3");
      expect(matches[0].suggestedAllocations[1].amount).toBe(5000);
    });

    it("marks unknown transactions as UNMATCHED with zero confidence (Strategy 4)", () => {
      const txns = [
        {
          id: "txn_4",
          date: "2026-09-05",
          narration: "DIVIDEND PAYOUT FROM UNRELATED ENTITY",
          reference: "DIV9910",
          creditAmount: 999999,
        },
      ];

      const matches = matchTransactionsAgainstReceivables(txns, openInvoices, customers);
      expect(matches).toHaveLength(1);
      expect(matches[0].matchType).toBe("UNMATCHED");
      expect(matches[0].confidenceLevel).toBe("UNMATCHED");
      expect(matches[0].suggestedAllocations).toHaveLength(0);
    });
  });
});
