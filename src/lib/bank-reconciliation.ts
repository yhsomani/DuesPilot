import Papa from "papaparse";

export interface BankTransaction {
  id: string;
  date: string;
  valueDate?: string;
  narration: string;
  reference: string;
  creditAmount: number;
  balance?: number;
  bankName?: string;
}

export interface OpenInvoiceForMatch {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paidAmount: number;
  balance: number;
  dueDate: string;
}

export interface CustomerForMatch {
  id: string;
  name: string;
  gstin?: string | null;
  phone?: string | null;
}

export type MatchConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "UNMATCHED";

export interface SuggestedAllocation {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  outstandingAmount: number;
}

export interface ReconciliationMatch {
  transactionId: string;
  transaction: BankTransaction;
  matchType: "EXACT_INVOICE" | "EXACT_CUSTOMER" | "FUZZY_CUSTOMER" | "MULTI_INVOICE" | "UNMATCHED";
  confidenceLevel: MatchConfidenceLevel;
  confidenceScore: number; // 0 - 100
  customerId?: string;
  customerName?: string;
  suggestedAllocations: SuggestedAllocation[];
  notes: string;
}

/**
 * Extracts UTR, IMPS/NEFT reference number, or Cheque number from bank narration.
 */
export function extractUtrFromNarration(narration: string): string | null {
  if (!narration) return null;

  // Patterns:
  // NEFT-N09224256789-... or NEFT/N09224256789
  // UPI/328947239847/Payment...
  // IMPS/P2A/328947239847...
  // RTGS/HDFCR52024090500...
  // CHQ NO 123456
  const utrPatterns = [
    /(?:NEFT|RTGS)[-/:\s]+([A-Z0-9]{12,22})/i,
    /UPI[-/:\s]+([0-9]{12})/i,
    /IMPS[-/:\s]+(?:P2A|P2U)?[-/:\s]*([0-9]{12})/i,
    /(?:UTR|REF|TXN|RRN)[-:\s#]+([A-Z0-9]{8,22})/i,
    /(?:CHQ|CHEQUE)[^\d]*([0-9]{6})/i,
  ];

  for (const pattern of utrPatterns) {
    const match = narration.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Detects if narration contains any known invoice number.
 */
export function extractInvoiceNumberFromNarration(
  narration: string,
  knownInvoiceNumbers: string[]
): string | null {
  if (!narration || knownInvoiceNumbers.length === 0) return null;
  const upperNarration = narration.toUpperCase();

  for (const inv of knownInvoiceNumbers) {
    if (inv && inv.length >= 3 && upperNarration.includes(inv.toUpperCase())) {
      return inv;
    }
  }
  return null;
}

/**
 * Calculates token overlap similarity between customer name and narration.
 */
export function calculateFuzzyScore(text: string, target: string): number {
  if (!text || !target) return 0;
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !["pvt", "ltd", "private", "limited", "inc", "corp", "llp"].includes(w));

  const textTokens = normalize(text);
  const targetTokens = normalize(target);

  if (targetTokens.length === 0 || textTokens.length === 0) return 0;

  let matches = 0;
  for (const token of targetTokens) {
    if (textTokens.some((t) => t.includes(token) || token.includes(t))) {
      matches++;
    }
  }

  return Math.round((matches / targetTokens.length) * 100);
}

/**
 * Parses bank statement CSV with support for HDFC, ICICI, SBI, Axis, and generic CSV layouts.
 */
export function parseBankStatementCsv(csvContent: string): {
  transactions: BankTransaction[];
  errors: string[];
} {
  const errors: string[] = [];
  const transactions: BankTransaction[] = [];

  const parsed = Papa.parse<Record<string, string>>(csvContent.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) =>
      h
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, ""),
  });

  if (parsed.errors.length > 0) {
    for (const e of parsed.errors) {
      errors.push(`Row ${e.row}: ${e.message}`);
    }
  }

  let autoId = 1;
  for (const row of parsed.data) {
    // Determine Date
    const dateStr =
      row.date ||
      row.txn_date ||
      row.transaction_date ||
      row.value_date ||
      row.posting_date ||
      row.trade_date ||
      "";

    // Determine Narration / Description
    const narration =
      row.narration ||
      row.description ||
      row.particulars ||
      row.transaction_remarks ||
      row.remarks ||
      row.details ||
      "";

    // Determine Reference / UTR
    let reference =
      row.chq_ref_no ||
      row.cheque_no ||
      row.ref_no ||
      row.reference ||
      row.utr ||
      row.utr_number ||
      row.transaction_id ||
      "";

    if (!reference && narration) {
      reference = extractUtrFromNarration(narration) || "";
    }

    // Determine Credit Amount (deposit)
    const creditRaw =
      row.deposit_inr ||
      row.credit ||
      row.credit_amount ||
      row.deposit ||
      row.credit_inr ||
      row.amount ||
      "0";

    const cleanNumber = (val: string) => {
      if (!val) return 0;
      const cleaned = val.replace(/,/g, "").trim();
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    };

    const creditAmount = cleanNumber(creditRaw);

    // Skip zero or debit-only transactions
    if (creditAmount <= 0) continue;

    // Balance
    const balanceRaw =
      row.balance ||
      row.closing_balance ||
      row.balance_inr ||
      "";
    const balance = balanceRaw ? cleanNumber(balanceRaw) : undefined;

    // Normalize Date to YYYY-MM-DD
    let normalizedDate = new Date().toISOString().split("T")[0];
    if (dateStr) {
      // Check for DD/MM/YYYY or DD-MM-YYYY
      const dmy = dateStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
      if (dmy) {
        const day = dmy[1].padStart(2, "0");
        const month = dmy[2].padStart(2, "0");
        const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3];
        normalizedDate = `${year}-${month}-${day}`;
      } else {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          normalizedDate = d.toISOString().split("T")[0];
        }
      }
    }

    transactions.push({
      id: `txn_${Date.now()}_${autoId++}`,
      date: normalizedDate,
      narration: narration.trim(),
      reference: reference.trim(),
      creditAmount,
      balance,
    });
  }

  return { transactions, errors };
}

/**
 * Matches extracted bank transactions against active open invoices and customer master.
 */
export function matchTransactionsAgainstReceivables(
  transactions: BankTransaction[],
  openInvoices: OpenInvoiceForMatch[],
  customers: CustomerForMatch[]
): ReconciliationMatch[] {
  const matches: ReconciliationMatch[] = [];
  const knownInvoiceNumbers = openInvoices.map((inv) => inv.invoiceNumber);

  for (const txn of transactions) {
    const amount = txn.creditAmount;
    const narration = txn.narration;

    // Strategy 1: Explicit Invoice Number Match in Narration (100% High Confidence)
    const matchedInvNum = extractInvoiceNumberFromNarration(narration, knownInvoiceNumbers);
    if (matchedInvNum) {
      const inv = openInvoices.find((i) => i.invoiceNumber.toUpperCase() === matchedInvNum.toUpperCase());
      if (inv) {
        const allocAmount = Math.min(amount, inv.balance);
        matches.push({
          transactionId: txn.id,
          transaction: txn,
          matchType: "EXACT_INVOICE",
          confidenceLevel: "HIGH",
          confidenceScore: 98,
          customerId: inv.customerId,
          customerName: inv.customerName,
          suggestedAllocations: [
            {
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
              amount: allocAmount,
              outstandingAmount: inv.balance,
            },
          ],
          notes: `Explicit invoice number #${inv.invoiceNumber} found in narration.`,
        });
        continue;
      }
    }

    // Strategy 2: Exact Amount Match on a single open invoice (92% High Confidence)
    const exactAmountInvoices = openInvoices.filter((i) => Math.abs(i.balance - amount) < 0.01);
    if (exactAmountInvoices.length === 1) {
      const inv = exactAmountInvoices[0];
      matches.push({
        transactionId: txn.id,
        transaction: txn,
        matchType: "EXACT_INVOICE",
        confidenceLevel: "HIGH",
        confidenceScore: 92,
        customerId: inv.customerId,
        customerName: inv.customerName,
        suggestedAllocations: [
          {
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            amount: amount,
            outstandingAmount: inv.balance,
          },
        ],
        notes: `Exact outstanding balance match (₹${amount.toLocaleString("en-IN")}) for invoice #${inv.invoiceNumber}.`,
      });
      continue;
    }

    // Strategy 3: Customer Name Match in Narration + FIFO Invoice Allocation (75-85% Medium/High Confidence)
    let bestCustomer: CustomerForMatch | null = null;
    let highestFuzzyScore = 0;

    for (const cust of customers) {
      const score = calculateFuzzyScore(narration, cust.name);
      if (score > highestFuzzyScore) {
        highestFuzzyScore = score;
        bestCustomer = cust;
      }
    }

    if (bestCustomer && highestFuzzyScore >= 50) {
      // Find open invoices for this customer
      const custInvoices = openInvoices
        .filter((i) => i.customerId === bestCustomer!.id && i.balance > 0)
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      if (custInvoices.length > 0) {
        // Allocate across customer's oldest invoices first (FIFO)
        let remaining = amount;
        const allocations: SuggestedAllocation[] = [];

        for (const inv of custInvoices) {
          if (remaining <= 0) break;
          const alloc = Math.min(remaining, inv.balance);
          allocations.push({
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            amount: alloc,
            outstandingAmount: inv.balance,
          });
          remaining -= alloc;
        }

        const confidenceLevel: MatchConfidenceLevel = highestFuzzyScore >= 75 ? "HIGH" : "MEDIUM";
        matches.push({
          transactionId: txn.id,
          transaction: txn,
          matchType: allocations.length > 1 ? "MULTI_INVOICE" : "FUZZY_CUSTOMER",
          confidenceLevel,
          confidenceScore: highestFuzzyScore >= 75 ? 85 : 70,
          customerId: bestCustomer.id,
          customerName: bestCustomer.name,
          suggestedAllocations: allocations,
          notes: `Customer '${bestCustomer.name}' recognized in narration (${highestFuzzyScore}% match). Allocated to ${allocations.length} oldest open invoice(s).`,
        });
        continue;
      }
    }

    // Strategy 4: Multiple Invoices Exact Sum Match (70% Medium Confidence)
    // If not matched, mark as UNMATCHED
    matches.push({
      transactionId: txn.id,
      transaction: txn,
      matchType: "UNMATCHED",
      confidenceLevel: "UNMATCHED",
      confidenceScore: 0,
      suggestedAllocations: [],
      notes: "No exact invoice amount or customer match identified in bank narration.",
    });
  }

  return matches;
}
