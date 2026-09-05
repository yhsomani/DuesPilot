import { describe, it, expect } from "vitest";
import { generateLegalNoticeText } from "../legal-notices";

describe("Legal Notices Generator Engine", () => {
  const mockData = {
    referenceNumber: "DP/LN/2026/001",
    date: "2026-09-01",
    creditor: {
      name: "DuesPilot Logistics Pvt Ltd",
      udyamNumber: "UDYAM-MH-01-0089124",
      gstin: "27AAACD1234A1Z5",
      address: "101 Nariman Point",
      city: "Mumbai",
      state: "Maharashtra",
      email: "billing@duespilot.com",
      phone: "+919876543210",
    },
    debtor: {
      name: "Global Freight Corp",
      contactPerson: "Mr. Rajesh Sharma",
      address: "45 Industrial Area Phase II",
      city: "Gurugram",
      state: "Haryana",
      pincode: "122002",
      gstin: "06AABCG5678B1Z2",
      email: "finance@globalfreight.in",
    },
    invoices: [
      {
        invoiceNumber: "INV-2026-089",
        invoiceDate: "2026-06-01",
        dueDate: "2026-07-01",
        amount: 250000,
        outstandingAmount: 250000,
        overdueDays: 62,
        penalInterest: 8450,
        totalClaim: 258450,
      },
    ],
    totalPrincipal: 250000,
    totalPenalInterest: 8450,
    totalStatutoryClaim: 258450,
    rbiBankRate: 6.75,
    statutoryAnnualRate: 20.25,
    cureDays: 15,
    bankDetails: {
      accountName: "DuesPilot Logistics Pvt Ltd",
      accountNumber: "50200089123456",
      bankName: "HDFC Bank, Fort",
      ifscCode: "HDFC0000060",
      upiId: "duespilot@hdfcbank",
    },
  };

  it("generates MSME Section 15 & 16 demand notice with statutory citations and Samadhaan escalation", () => {
    const notice = generateLegalNoticeText("MSME_SECTION_15_16", mockData);

    expect(notice.title).toContain("SECTIONS 15 & 16 OF THE MSMED ACT");
    expect(notice.subject).toContain("DEMAND NOTICE: Outstanding dues of ₹2,58,450");
    expect(notice.body).toContain("UDYAM REGISTRATION NO: UDYAM-MH-01-0089124");
    expect(notice.body).toContain("THREE TIMES THE BANK RATE");
    expect(notice.body).toContain("20.25% p.a.");
    expect(notice.body).toContain("Micro and Small Enterprises Facilitation Council (MSEFC)");
    expect(notice.body).toContain("MSME Samadhaan Portal");
    expect(notice.body).toContain("HDFC0000060");
  });

  it("generates Section 138 NI Act Cheque Dishonour notice with penal warnings", () => {
    const notice = generateLegalNoticeText("CHEQUE_DISHONOUR_138", {
      ...mockData,
      chequeDetails: {
        chequeNumber: "CHQ-981240",
        chequeDate: "2026-08-15",
        drawnBank: "State Bank of India",
        dishonourDate: "2026-08-20",
        dishonourReason: "Funds Insufficient",
      },
    });

    expect(notice.title).toContain("SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT");
    expect(notice.subject).toContain("Dishonour of Cheque No. CHQ-981240");
    expect(notice.body).toContain("Cheque No. CHQ-981240");
    expect(notice.body).toContain("Funds Insufficient");
    expect(notice.body).toContain("imprisonment for up to two years");
  });

  it("generates default formal legal demand notice", () => {
    const notice = generateLegalNoticeText("LEGAL_DEMAND_FINAL", mockData);

    expect(notice.title).toContain("FORMAL FINAL LEGAL DEMAND NOTICE");
    expect(notice.subject).toContain("LEGAL NOTICE: Final Demand for Payment");
    expect(notice.body).toContain("7 (SEVEN) DAYS");
    expect(notice.body).toContain("INV-2026-089");
  });
});
