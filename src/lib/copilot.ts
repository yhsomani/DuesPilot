export type CopilotIntent =
  | "COMMITMENT_TO_PAY"
  | "DISPUTE_RAISED"
  | "REQUEST_EXTENSION"
  | "GENERAL_INQUIRY"
  | "UNKNOWN";

export interface ExtractedPromiseResult {
  intent: CopilotIntent;
  amount: number | null;
  promiseDate: string | null; // YYYY-MM-DD
  paymentMode: string | null;
  confidenceScore: number; // 0 - 100
  disputeReason?: string | null;
  extractedSummary: string;
  source: "CLAUDE_AI" | "HEURISTIC_NLP";
}

export type DunningTone =
  | "FRIENDLY"
  | "PROFESSIONAL"
  | "FIRM"
  | "MSME_STATUTORY_DEMAND";

export interface DunningDraftInput {
  customerName: string;
  contactName?: string;
  totalOverdue: number;
  oldestInvoiceDaysOverdue: number;
  invoicesCount: number;
  isMsmeCreditor?: boolean;
  msmePenalInterest?: number;
  tone: DunningTone;
  channel: "EMAIL" | "WHATSAPP" | "SMS";
  paymentLink?: string;
  senderOrgName: string;
}

export interface DunningDraftResult {
  subject?: string;
  body: string;
  channel: "EMAIL" | "WHATSAPP" | "SMS";
  tone: DunningTone;
  characterCount: number;
  source: "CLAUDE_AI" | "HEURISTIC_NLP";
}

/**
 * Extracts date patterns like "next Friday", "15th Sept", "by 2026-09-20", "tomorrow", etc.
 */
export function extractDateFromText(text: string, baseDate: Date = new Date()): string | null {
  const lower = text.toLowerCase();

  // Pattern 1: ISO date YYYY-MM-DD
  const isoMatch = text.match(/\b(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2})\b/);
  if (isoMatch) {
    const d = new Date(isoMatch[1].replace(/[/.]/g, "-"));
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }

  // Pattern 2: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Pattern 3: "15th September", "20 Sept", "10 Oct 2026"
  const monthNames: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  const monthRegex = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s+(20\d{2}))?\b/i;
  const monthMatch = text.match(monthRegex);
  if (monthMatch) {
    const day = parseInt(monthMatch[1], 10);
    const mStr = monthMatch[2].toLowerCase();
    const monthIdx = monthNames[mStr];
    const year = monthMatch[3] ? parseInt(monthMatch[3], 10) : baseDate.getFullYear();
    if (monthIdx !== undefined && !isNaN(day)) {
      const d = new Date(year, monthIdx, day);
      return d.toISOString().split("T")[0];
    }
  }

  // Pattern 4: Relative dates ("tomorrow", "next week", "in 3 days", "end of month")
  if (lower.includes("tomorrow")) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }
  if (lower.includes("next monday")) {
    const d = new Date(baseDate);
    const day = d.getDay();
    const diff = (1 + 7 - day) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split("T")[0];
  }
  if (lower.includes("next friday") || lower.includes("this friday")) {
    const d = new Date(baseDate);
    const day = d.getDay();
    const diff = (5 + 7 - day) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split("T")[0];
  }
  if (lower.includes("end of this week") || lower.includes("by this weekend")) {
    const d = new Date(baseDate);
    const day = d.getDay();
    const diff = (6 - day + 7) % 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split("T")[0];
  }
  if (lower.includes("end of month") || lower.includes("month end")) {
    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    return d.toISOString().split("T")[0];
  }

  const inDaysMatch = lower.match(/in\s+(\d+)\s+days/);
  if (inDaysMatch) {
    const days = parseInt(inDaysMatch[1], 10);
    const d = new Date(baseDate);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  }

  return null;
}

/**
 * Extracts monetary amounts like "₹45,000", "Rs 50000", "INR 25,000", "45k".
 */
export function extractAmountFromText(text: string): number | null {
  // Pattern: "₹45,000", "Rs. 25,000", "INR 1,50,000", "45000"
  const patterns = [
    /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{2})?)/i,
    /\b([\d,]+(?:\.\d{2})?)\s*(?:rupees|inr|rs)/i,
    /\b(\d+(?:\.\d+)?)\s*k\b/i, // 45k -> 45000
    /\b(\d+(?:\.\d+)?)\s*lakhs?\b/i, // 1.5 lakhs -> 150000
  ];

  for (const p of patterns) {
    const match = text.match(p);
    if (match && match[1]) {
      const valStr = match[1].replace(/,/g, "").trim();
      const num = parseFloat(valStr);
      if (!isNaN(num)) {
        if (p.source.includes("k\\b")) return num * 1000;
        if (p.source.includes("lakhs?")) return num * 100000;
        return num;
      }
    }
  }

  return null;
}

/**
 * Extracts payment mode from text.
 */
export function extractPaymentMode(text: string): string | null {
  const upper = text.toUpperCase();
  if (upper.includes("UPI") || upper.includes("GPAY") || upper.includes("PHONEPE")) return "UPI";
  if (upper.includes("RTGS")) return "RTGS";
  if (upper.includes("NEFT")) return "NEFT";
  if (upper.includes("IMPS")) return "IMPS";
  if (upper.includes("CHEQUE") || upper.includes("CHQ")) return "CHEQUE";
  if (upper.includes("NET BANKING") || upper.includes("BANK TRANSFER")) return "BANK_TRANSFER";
  return null;
}

/**
 * Analyzes communication text using Claude API (if ANTHROPIC_API_KEY is present)
 * or deterministic NLP heuristics.
 */
export async function extractPromiseFromCommunication(
  communicationText: string
): Promise<ExtractedPromiseResult> {
  const trimmed = communicationText.trim();
  if (!trimmed) {
    return {
      intent: "UNKNOWN",
      amount: null,
      promiseDate: null,
      paymentMode: null,
      confidenceScore: 0,
      extractedSummary: "Empty communication content",
      source: "HEURISTIC_NLP",
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Try Claude API if key is present
  if (apiKey) {
    try {
      const prompt = `You are a B2B Accounts Receivable Collections AI.
Analyze the following customer message and extract payment commitment details in strict JSON format.
JSON schema:
{
  "intent": "COMMITMENT_TO_PAY" | "DISPUTE_RAISED" | "REQUEST_EXTENSION" | "GENERAL_INQUIRY" | "UNKNOWN",
  "amount": number | null,
  "promiseDate": "YYYY-MM-DD" | null,
  "paymentMode": "UPI" | "NEFT" | "RTGS" | "CHEQUE" | "BANK_TRANSFER" | null,
  "confidenceScore": number (0-100),
  "disputeReason": string | null,
  "extractedSummary": string
}

Customer Message:
"""
${trimmed}
"""`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawContent = data.content?.[0]?.text || "";
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            intent: parsed.intent || "COMMITMENT_TO_PAY",
            amount: typeof parsed.amount === "number" ? parsed.amount : null,
            promiseDate: parsed.promiseDate || null,
            paymentMode: parsed.paymentMode || null,
            confidenceScore: parsed.confidenceScore || 90,
            disputeReason: parsed.disputeReason || null,
            extractedSummary: parsed.extractedSummary || "Extracted via Claude AI",
            source: "CLAUDE_AI",
          };
        }
      }
    } catch {
      // Fall through to heuristic parser
    }
  }

  // Deterministic Heuristic NLP fallback
  const lower = trimmed.toLowerCase();
  let intent: CopilotIntent = "UNKNOWN";
  let disputeReason: string | null = null;

  if (
    lower.includes("dispute") ||
    lower.includes("wrong amount") ||
    lower.includes("not delivered") ||
    lower.includes("defect") ||
    lower.includes("rate mismatch")
  ) {
    intent = "DISPUTE_RAISED";
    disputeReason = "Customer reported invoice discrepancy or service defect in communication.";
  } else if (
    lower.includes("will pay") ||
    lower.includes("clearing") ||
    lower.includes("releasing payment") ||
    lower.includes("processed") ||
    lower.includes("transfer") ||
    lower.includes("sending cheque") ||
    lower.includes("by next")
  ) {
    intent = "COMMITMENT_TO_PAY";
  } else if (
    lower.includes("extension") ||
    lower.includes("cash crunch") ||
    lower.includes("give us time") ||
    lower.includes("next month")
  ) {
    intent = "REQUEST_EXTENSION";
  } else {
    intent = "GENERAL_INQUIRY";
  }

  const amount = extractAmountFromText(trimmed);
  const promiseDate = extractDateFromText(trimmed);
  const paymentMode = extractPaymentMode(trimmed);

  let confidenceScore = 50;
  if (promiseDate && amount) confidenceScore = 90;
  else if (promiseDate || amount) confidenceScore = 75;
  else if (intent !== "GENERAL_INQUIRY") confidenceScore = 60;

  const summaryParts: string[] = [];
  if (intent === "COMMITMENT_TO_PAY") {
    summaryParts.push("Customer committed to pay");
    if (amount) summaryParts.push(`₹${amount.toLocaleString("en-IN")}`);
    if (promiseDate) summaryParts.push(`by ${promiseDate}`);
    if (paymentMode) summaryParts.push(`via ${paymentMode}`);
  } else if (intent === "DISPUTE_RAISED") {
    summaryParts.push("Customer raised a dispute regarding invoice details");
  } else if (intent === "REQUEST_EXTENSION") {
    summaryParts.push(`Customer requested payment extension${promiseDate ? ` until ${promiseDate}` : ""}`);
  } else {
    summaryParts.push("General communication inquiry parsed");
  }

  return {
    intent,
    amount,
    promiseDate,
    paymentMode,
    confidenceScore,
    disputeReason,
    extractedSummary: summaryParts.join(" "),
    source: "HEURISTIC_NLP",
  };
}

/**
 * Generates an optimized, tone-calibrated dunning outreach draft.
 */
export async function generateDunningDraft(input: DunningDraftInput): Promise<DunningDraftResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const prompt = `You are a professional B2B credit controller & dunning communication copilot for ${input.senderOrgName}.
Draft a ${input.tone} message for ${input.channel} channel to collect overdue accounts receivable.

Details:
- Customer: ${input.customerName}
- Contact Person: ${input.contactName || "Accounts Team"}
- Total Overdue: ₹${input.totalOverdue.toLocaleString("en-IN")}
- Oldest Invoice DPD: ${input.oldestInvoiceDaysOverdue} days
- Open Invoices Count: ${input.invoicesCount}
- MSME Statutory Protection: ${input.isMsmeCreditor ? `Yes (Penal interest: ₹${(input.msmePenalInterest || 0).toLocaleString("en-IN")})` : "No"}
- Payment Link: ${input.paymentLink || "None provided"}

Format:
Return JSON:
{
  "subject": string (for email, omit for SMS/WhatsApp),
  "body": string
}`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 600,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const rawContent = data.content?.[0]?.text || "";
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const body = parsed.body || "";
          return {
            subject: parsed.subject,
            body,
            channel: input.channel,
            tone: input.tone,
            characterCount: body.length,
            source: "CLAUDE_AI",
          };
        }
      }
    } catch {
      // Fall through to deterministic template engine
    }
  }

  // Deterministic Tone-Calibrated Draft Engine
  const recipient = input.contactName ? `Hi ${input.contactName}` : `Dear Accounts Team at ${input.customerName}`;
  const amountFormatted = `₹${input.totalOverdue.toLocaleString("en-IN")}`;
  const payLinkStr = input.paymentLink ? `\n\nInstant Payment Link: ${input.paymentLink}` : "";

  let subject = "";
  let body = "";

  if (input.tone === "FRIENDLY") {
    subject = `Gentle Reminder: Pending Statement for ${input.customerName} - ${input.senderOrgName}`;
    if (input.channel === "SMS") {
      body = `Hi ${input.customerName}, gentle reminder for pending dues of ${amountFormatted} to ${input.senderOrgName}. Please clear at the earliest: ${input.paymentLink || "duespilot.com"}`;
    } else if (input.channel === "WHATSAPP") {
      body = `*Gentle Payment Reminder*\n\n${recipient},\n\nHope you are well! We are following up regarding your outstanding balance of *${amountFormatted}* (${input.invoicesCount} open invoice(s)).\n\nPlease let us know once the transfer is scheduled.${payLinkStr}\n\nWarm regards,\n*${input.senderOrgName}*`;
    } else {
      body = `${recipient},\n\nWe hope this email finds you well.\n\nThis is a friendly reminder regarding your outstanding balance of ${amountFormatted} across ${input.invoicesCount} open invoice(s) with ${input.senderOrgName}.\n\nIf you have already processed this payment, please share the UTR/transaction details. Otherwise, we would appreciate it if you could schedule this settlement.${payLinkStr}\n\nBest regards,\nAccounts Receivable Team\n${input.senderOrgName}`;
    }
  } else if (input.tone === "PROFESSIONAL") {
    subject = `Payment Follow-up: Overdue Statement (${amountFormatted}) - ${input.customerName}`;
    if (input.channel === "SMS") {
      body = `Urgent: ${input.customerName}, payment of ${amountFormatted} is overdue by ${input.oldestInvoiceDaysOverdue} days with ${input.senderOrgName}. Settle now: ${input.paymentLink || "duespilot.com"}`;
    } else if (input.channel === "WHATSAPP") {
      body = `*Account Statement Overdue Follow-up*\n\n${recipient},\n\nYour account has an overdue balance of *${amountFormatted}* which is currently *${input.oldestInvoiceDaysOverdue} days overdue*.\n\nPlease arrange for an immediate settlement to maintain uninterrupted service.${payLinkStr}\n\nRegards,\n*${input.senderOrgName} Finance Team*`;
    } else {
      body = `${recipient},\n\nWe are writing to follow up on your account balance of ${amountFormatted}, with your oldest invoice currently ${input.oldestInvoiceDaysOverdue} days past due.\n\nMaintaining timely settlements ensures smooth credit terms and uninterrupted operational support. Kindly process the pending balance today.${payLinkStr}\n\nSincerely,\nFinance & Credit Control\n${input.senderOrgName}`;
    }
  } else if (input.tone === "FIRM") {
    subject = `URGENT: Overdue Account Escalation (${amountFormatted}) - ${input.customerName}`;
    if (input.channel === "SMS") {
      body = `FINAL NOTICE: ${input.customerName}, balance of ${amountFormatted} is critically overdue (${input.oldestInvoiceDaysOverdue} days). Settle immediately: ${input.paymentLink || "duespilot.com"}`;
    } else if (input.channel === "WHATSAPP") {
      body = `⚠️ *URGENT PAYMENT ESCALATION*\n\n${recipient},\n\nDespite multiple reminders, the overdue balance of *${amountFormatted}* remains unsettled (${input.oldestInvoiceDaysOverdue} days overdue).\n\nFailure to settle within 48 hours will lead to account suspension and escalation.${payLinkStr}\n\n*${input.senderOrgName} Management*`;
    } else {
      body = `${recipient},\n\nYour account balance of ${amountFormatted} is now critically overdue at ${input.oldestInvoiceDaysOverdue} days past due.\n\nDespite previous reminders, we have not received confirmation of payment. Please be advised that continued delay may result in credit facility suspension and formal escalation.\n\nPlease remit the full amount immediately.${payLinkStr}\n\nRegards,\nCredit Control Management\n${input.senderOrgName}`;
    }
  } else {
    // MSME_STATUTORY_DEMAND
    const interestStr = input.msmePenalInterest ? ` + Statutory Penal Interest of ₹${input.msmePenalInterest.toLocaleString("en-IN")}` : "";
    subject = `LEGAL DEMAND: Statutory Notice under Section 15 & 16 MSMED Act 2006 - ${input.customerName}`;
    if (input.channel === "SMS") {
      body = `DEMAND NOTICE: ${input.customerName}, statutory dues of ${amountFormatted} under MSMED Act 2006. Settle immediately to avoid legal proceedings. ${input.paymentLink || ""}`;
    } else if (input.channel === "WHATSAPP") {
      body = `⚖️ *STATUTORY DEMAND NOTICE (MSMED ACT 2006)*\n\nTo: *${input.customerName}*\n\nTake notice that principal dues of *${amountFormatted}*${interestStr} remain unpaid beyond the 45-day statutory limit.\n\nUnder Section 16 of the MSMED Act 2006, compound interest at 3x RBI Bank Rate is applicable on delayed payments.\n\nKindly clear immediately:${payLinkStr}\n\n*${input.senderOrgName}* (MSME Registered)`;
    } else {
      body = `FORMAL STATUTORY DEMAND NOTICE\nUnder Sections 15 & 16 of the Micro, Small and Medium Enterprises Development (MSMED) Act, 2006\n\nTo:\nThe Directors / Management\n${input.customerName}\n\nDear Sir/Madam,\n\nWe refer to the outstanding dues of ${amountFormatted} across ${input.invoicesCount} unpaid invoices, which are overdue by ${input.oldestInvoiceDaysOverdue} days.\n\nAs a registered MSME enterprise, we hereby demand the immediate settlement of the principal amount together with compound penal interest at three times the RBI Bank Rate under Section 16 of the MSMED Act 2006.\n\nPlease settle within 7 business days from receipt of this notice.${payLinkStr}\n\nFor ${input.senderOrgName},\nAuthorized Signatory`;
    }
  }

  return {
    subject: input.channel === "EMAIL" ? subject : undefined,
    body,
    channel: input.channel,
    tone: input.tone,
    characterCount: body.length,
    source: "HEURISTIC_NLP",
  };
}
