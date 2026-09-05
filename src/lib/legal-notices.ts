// Statutory Legal Demand Notices and MSME Samadhaan Filing Generators.

export type LegalNoticeType =
  | "MSME_SECTION_15_16"
  | "LEGAL_DEMAND_FINAL"
  | "CHEQUE_DISHONOUR_138"
  | "CONCILIATION_INTIMATION";

export interface LegalNoticeParty {
  name: string;
  contactPerson?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  udyamNumber?: string; // MSME Udyam Registration Number (e.g., UDYAM-MH-01-0012345)
}

export interface LegalNoticeInvoiceItem {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  outstandingAmount: number;
  overdueDays: number;
  penalInterest: number;
  totalClaim: number;
}

export interface LegalNoticeData {
  referenceNumber: string;
  date: string;
  creditor: LegalNoticeParty;
  debtor: LegalNoticeParty;
  invoices: LegalNoticeInvoiceItem[];
  totalPrincipal: number;
  totalPenalInterest: number;
  totalStatutoryClaim: number;
  rbiBankRate?: number;
  statutoryAnnualRate?: number;
  cureDays?: number; // e.g., 15 days or 7 days
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    ifscCode: string;
    upiId?: string;
  };
  chequeDetails?: {
    chequeNumber: string;
    chequeDate: string;
    drawnBank: string;
    dishonourDate: string;
    dishonourReason: string;
  };
}

/**
 * Generates a formal legal demand notice text with statutory citations and itemized claims.
 */
export function generateLegalNoticeText(
  noticeType: LegalNoticeType,
  data: LegalNoticeData
): {
  subject: string;
  body: string;
  title: string;
} {
  const {
    referenceNumber,
    date,
    creditor,
    debtor,
    invoices,
    totalOutstanding,
    totalPenalInterest,
    totalStatutoryClaim,
    rbiBankRate = 6.75,
    statutoryAnnualRate = 20.25,
    cureDays = 15,
    bankDetails,
  } = {
    ...data,
    totalOutstanding: data.totalPrincipal,
  };

  const invoiceTableStr = invoices
    .map(
      (inv, idx) =>
        `${idx + 1}. Inv #${inv.invoiceNumber} | Dt: ${inv.invoiceDate} | Due: ${inv.dueDate} | Principal: ₹${inv.outstandingAmount.toLocaleString("en-IN")} | Overdue: ${inv.overdueDays} days | Section 16 Interest: ₹${inv.penalInterest.toLocaleString("en-IN")} | Total: ₹${inv.totalClaim.toLocaleString("en-IN")}`
    )
    .join("\n");

  const bankInfoStr = bankDetails
    ? `\nBANK DETAILS FOR REMITTANCE:\nBeneficiary Name: ${bankDetails.accountName}\nAccount Number: ${bankDetails.accountNumber}\nBank & Branch: ${bankDetails.bankName}\nIFSC Code: ${bankDetails.ifscCode}${bankDetails.upiId ? `\nUPI VPA: ${bankDetails.upiId}` : ""}\n`
    : "";

  if (noticeType === "MSME_SECTION_15_16") {
    const title = "STATUTORY DEMAND NOTICE UNDER SECTIONS 15 & 16 OF THE MSMED ACT, 2006";
    const subject = `DEMAND NOTICE: Outstanding dues of ₹${totalStatutoryClaim.toLocaleString("en-IN")} under Section 15 & 16 of MSMED Act, 2006 - Ref: ${referenceNumber}`;
    const body = `Ref No: ${referenceNumber}
Date: ${date}

BY SPEED POST A.D. / REGISTERED EMAIL

TO:
${debtor.name}
${debtor.contactPerson ? `Kind Attn: ${debtor.contactPerson}` : ""}
${debtor.address ? `${debtor.address}, ` : ""}${debtor.city || ""}, ${debtor.state || ""} ${debtor.pincode || ""}
GSTIN: ${debtor.gstin || "N/A"}
Email: ${debtor.email || "N/A"}

FROM:
${creditor.name}
UDYAM REGISTRATION NO: ${creditor.udyamNumber || "UDYAM-REGISTERED-SUPPLIER"}
GSTIN: ${creditor.gstin || "N/A"}
${creditor.address ? `${creditor.address}, ` : ""}${creditor.city || ""}, ${creditor.state || ""}
Email: ${creditor.email || "N/A"} | Contact: ${creditor.phone || "N/A"}

SUBJECT: STATUTORY DEMAND FOR IMMEDIATE PAYMENT OF PRINCIPAL DUES ALONG WITH MANDATORY PENAL COMPOUND INTEREST UNDER SECTIONS 15 & 16 OF THE MICRO, SMALL AND MEDIUM ENTERPRISES DEVELOPMENT (MSMED) ACT, 2006.

Sir/Madam,

Under instructions and on behalf of our client/organization, ${creditor.name}, an enterprise registered under the Micro, Small and Medium Enterprises Development Act, 2006, we hereby serve you with this formal statutory demand notice:

1. STATUTORY STANDING & ACCEPTANCE OF SUPPLIES:
Our client duly supplied goods/services to your company in good order, which were accepted by you without any formal objection or dispute within the statutory 15-day inspection window.

2. DEFAULT IN PAYMENT UNDER SECTION 15:
Under Section 15 of the MSMED Act, 2006, you were statutorily obligated to clear payments within the agreed credit term, not exceeding 45 days from the date of delivery/acceptance. You have committed persistent default in discharging this liability.

3. MANDATORY STATUTORY PENAL INTEREST UNDER SECTION 16:
Section 16 of the MSMED Act, 2006 categorically mandates that where a buyer fails to make payment within the period specified under Section 15, the buyer SHALL be liable to pay compound interest with monthly rests to the supplier on that amount from the appointed day at THREE TIMES THE BANK RATE notified by the Reserve Bank of India (currently ${rbiBankRate}% p.a. * 3 = ${statutoryAnnualRate}% p.a.).

4. STATEMENT OF CLAIM:
${invoiceTableStr}

SUMMARY OF STATUTORY LIABILITIES:
• Total Outstanding Principal: ₹${totalOutstanding.toLocaleString("en-IN")}
• Section 16 Penal Compound Interest (at ${statutoryAnnualRate}% p.a.): ₹${totalPenalInterest.toLocaleString("en-IN")}
• TOTAL RECOVERY CLAIM: ₹${totalStatutoryClaim.toLocaleString("en-IN")}
${bankInfoStr}
5. FINAL STATUTORY DEMAND:
You are hereby called upon to pay and remit the total statutory claim amount of ₹${totalStatutoryClaim.toLocaleString("en-IN")} (Rupees ${totalStatutoryClaim.toLocaleString("en-IN")} only) along with further interest accruing until realization, within ${cureDays} (FIFTEEN) DAYS of receipt of this notice.

6. NOTICE OF MSEFC / LEGAL ESCALATION:
Please take notice that in the event of failure or neglect to settle this demand within the stipulated period of ${cureDays} days, our client shall, without further reference:
a) File a reference under Section 18 of the MSMED Act, 2006 before the Micro and Small Enterprises Facilitation Council (MSEFC) on the MSME Samadhaan Portal for recovery with statutory interest and costs;
b) Report this default on commercial credit bureaus and MSME compliance registers;
c) Institute appropriate civil recovery proceedings under Order XXXVII of the Code of Civil Procedure, 1908.

Yours faithfully,

For ${creditor.name}
Authorized Signatory / Credit Control Team
`;

    return { subject, body, title };
  }

  if (noticeType === "CHEQUE_DISHONOUR_138") {
    const cheque = data.chequeDetails || {
      chequeNumber: "CHQ-PENDING",
      chequeDate: date,
      drawnBank: "Bank",
      dishonourDate: date,
      dishonourReason: "Funds Insufficient",
    };

    const title = "LEGAL NOTICE UNDER SECTION 138 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881";
    const subject = `LEGAL NOTICE: Dishonour of Cheque No. ${cheque.chequeNumber} for ₹${totalOutstanding.toLocaleString("en-IN")} under Section 138 of NI Act, 1881`;
    const body = `Ref No: ${referenceNumber}
Date: ${date}

BY SPEED POST A.D. & EMAIL

TO:
${debtor.name}
${debtor.contactPerson ? `Kind Attn: ${debtor.contactPerson}` : ""}
${debtor.address || ""}
Email: ${debtor.email || "N/A"}

FROM:
${creditor.name}
${creditor.address || ""}
Email: ${creditor.email || "N/A"}

SUBJECT: NOTICE UNDER SECTION 138 READ WITH SECTION 141 OF THE NEGOTIABLE INSTRUMENTS ACT, 1881 FOR DISHONOUR OF CHEQUE NO. ${cheque.chequeNumber} DATED ${cheque.chequeDate}.

Sir/Madam,

Under instructions from our client, ${creditor.name}, we serve upon you this notice:

1. Towards discharge of your legally enforceable debt and liability against supply of goods/services, you issued Cheque No. ${cheque.chequeNumber} dated ${cheque.chequeDate} for an amount of ₹${totalOutstanding.toLocaleString("en-IN")}, drawn on ${cheque.drawnBank}.

2. Our client presented the said cheque for encashment, but the same was returned dishonoured by the bank vide Cheque Return Memo dated ${cheque.dishonourDate} with the remarks "${cheque.dishonourReason}".

3. You are hereby called upon to pay the cheque amount of ₹${totalOutstanding.toLocaleString("en-IN")} within 15 (FIFTEEN) DAYS from the date of receipt of this notice, failing which our client will initiate criminal proceedings against you and your directors under Section 138 and Section 141 of the Negotiable Instruments Act, 1881, which entails imprisonment for up to two years or fine up to twice the cheque amount or both.
${bankInfoStr}
Yours faithfully,

For ${creditor.name}
Authorized Signatory / Legal Counsel
`;

    return { subject, body, title };
  }

  // Default: Formal Legal Demand Notice
  const title = "FORMAL FINAL LEGAL DEMAND NOTICE BEFORE ACTION";
  const subject = `LEGAL NOTICE: Final Demand for Payment of Outstanding Dues ₹${totalStatutoryClaim.toLocaleString("en-IN")} - Ref: ${referenceNumber}`;
  const body = `Ref No: ${referenceNumber}
Date: ${date}

TO: ${debtor.name}
${debtor.address || ""}

FROM: ${creditor.name}
${creditor.address || ""}

SUBJECT: FINAL DEMAND NOTICE PRIOR TO COMMENCEMENT OF LEGAL PROCEEDINGS FOR RECOVERY OF ₹${totalStatutoryClaim.toLocaleString("en-IN")}.

Sir/Madam,

We write to place on record your continuing default in paying the outstanding dues amounting to ₹${totalOutstanding.toLocaleString("en-IN")} along with accrued interest.

STATEMENT OF INVOICES:
${invoiceTableStr}

TOTAL DEMAND: ₹${totalStatutoryClaim.toLocaleString("en-IN")}
${bankInfoStr}
You are given a final opportunity to remit the entire amount within 7 (SEVEN) DAYS from the date of this notice, failing which legal action will be initiated at your sole risk and expense.

Yours faithfully,

For ${creditor.name}
Credit Control & Recovery
`;

  return { subject, body, title };
}
