/**
 * Automated Dunning Cadences & Workflow Rule Execution Engine.
 * Supports rule-based follow-ups across aging buckets (T-3 to T+45+),
 * customer risk tiers, dispute/promise skip guards, and delivery frequency throttles.
 */

export type TriggerType = "DUE_SOON" | "OVERDUE" | "PROMISE_BROKEN" | "HIGH_RISK";
export type ActionChannel = "EMAIL" | "WHATSAPP" | "SMS" | "TASK";

export interface WorkflowRule {
  id: string;
  name: string;
  triggerType: TriggerType;
  /** Days relative to due date: negative means prior to due date (e.g. -3), positive means overdue days (e.g. 1, 15, 30, 45) */
  daysRelative: number;
  minAmount?: number;
  maxAmount?: number;
  minRiskScore?: number;
  channel: ActionChannel;
  templateId?: string;
  templateName?: string;
  includePaymentLink?: boolean;
  enabled: boolean;
  /** Minimum hours between outbound automated actions for the same customer (default 24h) */
  cooldownHours?: number;
}

export interface CadenceContextInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  outstandingAmount: number;
  dueDate: Date | string;
  status: string;
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerRiskScore?: number | null;
  hasActiveDispute?: boolean;
  hasActivePromise?: boolean;
  lastContactedAt?: Date | string | null;
}

/**
 * Standard industry-proven B2B collection cadences pre-configured for DuesPilot tenants.
 */
export const DEFAULT_CADENCE_RULES: WorkflowRule[] = [
  {
    id: "cadence_pre_due_3",
    name: "Pre-Due Courtesy Notice (T-3 Days)",
    triggerType: "DUE_SOON",
    daysRelative: -3,
    minAmount: 500,
    channel: "EMAIL",
    templateId: "tpl_pre_due_reminder",
    templateName: "Pre-Due Courtesy Notice",
    includePaymentLink: true,
    enabled: true,
    cooldownHours: 24,
  },
  {
    id: "cadence_overdue_1",
    name: "First Day Overdue Soft Reminder (T+1 Day)",
    triggerType: "OVERDUE",
    daysRelative: 1,
    minAmount: 500,
    channel: "WHATSAPP",
    templateId: "tpl_first_overdue_wa",
    templateName: "First Overdue WhatsApp Ping",
    includePaymentLink: true,
    enabled: true,
    cooldownHours: 24,
  },
  {
    id: "cadence_overdue_7",
    name: "One Week Overdue Follow-up (T+7 Days)",
    triggerType: "OVERDUE",
    daysRelative: 7,
    minAmount: 1000,
    channel: "EMAIL",
    templateId: "tpl_overdue_warning",
    templateName: "1-Week Overdue Statement",
    includePaymentLink: true,
    enabled: true,
    cooldownHours: 48,
  },
  {
    id: "cadence_overdue_15",
    name: "Mid-Aging Escalation & Settlement Offer (T+15 Days)",
    triggerType: "OVERDUE",
    daysRelative: 15,
    minAmount: 2500,
    channel: "WHATSAPP",
    templateId: "tpl_installment_offer_wa",
    templateName: "Installment Settlement Offer",
    includePaymentLink: true,
    enabled: true,
    cooldownHours: 48,
  },
  {
    id: "cadence_overdue_30",
    name: "Statutory MSME Penal Interest Notice (T+30 Days)",
    triggerType: "OVERDUE",
    daysRelative: 30,
    minAmount: 5000,
    channel: "EMAIL",
    templateId: "tpl_msme_statutory_notice",
    templateName: "Section 15 & 16 MSME Notice",
    includePaymentLink: true,
    enabled: true,
    cooldownHours: 72,
  },
  {
    id: "cadence_overdue_45",
    name: "Pre-Litigation Samadhaan Warning (T+45 Days)",
    triggerType: "OVERDUE",
    daysRelative: 45,
    minAmount: 10000,
    channel: "EMAIL",
    templateId: "tpl_final_legal_demand",
    templateName: "MSEFC Samadhaan Final Demand",
    includePaymentLink: true,
    enabled: true,
    cooldownHours: 96,
  },
];

/**
 * Calculates days relative from reference date to due date.
 * Positive return value means overdue days (e.g., +5 = 5 days overdue).
 * Negative return value means days until due (e.g., -3 = due in 3 days).
 */
export function calculateDaysRelative(
  dueDate: Date | string,
  referenceDate: Date = new Date()
): number {
  const dDate = new Date(dueDate);
  // Normalize both dates to midnight UTC to compare calendar days cleanly
  const dueUtc = Date.UTC(dDate.getFullYear(), dDate.getMonth(), dDate.getDate());
  const refUtc = Date.UTC(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((refUtc - dueUtc) / msPerDay);
}

/**
 * Evaluates whether an invoice qualifies for an automated cadence workflow rule.
 * Guard criteria:
 * - Rule must be enabled.
 * - Outstanding balance must be > 0.
 * - Invoice must not be under active dispute.
 * - Invoice must not have an active, unexpired promise to pay.
 * - Relative days must match exactly or fall within the rule window.
 * - Amount bounds must be respected.
 * - Risk score minimums (if configured) must be met.
 * - Cooldown period since last contact must be respected.
 */
export function evaluateInvoiceRuleMatch(
  invoice: CadenceContextInvoice,
  rule: WorkflowRule,
  referenceDate: Date = new Date()
): { matches: boolean; reason?: string } {
  if (!rule.enabled) {
    return { matches: false, reason: "Rule is disabled" };
  }

  // Check outstanding balance
  if (invoice.outstandingAmount <= 0) {
    return { matches: false, reason: "Invoice is fully settled" };
  }

  // Active dispute guard
  if (invoice.hasActiveDispute) {
    return { matches: false, reason: "Invoice has an active dispute under investigation" };
  }

  // Active promise guard
  if (invoice.hasActivePromise) {
    return { matches: false, reason: "Customer has an active promise to pay commitment" };
  }

  // Amount boundaries
  if (rule.minAmount !== undefined && invoice.outstandingAmount < rule.minAmount) {
    return { matches: false, reason: `Amount below minimum threshold (₹${rule.minAmount})` };
  }
  if (rule.maxAmount !== undefined && invoice.outstandingAmount > rule.maxAmount) {
    return { matches: false, reason: `Amount above maximum threshold (₹${rule.maxAmount})` };
  }

  // Risk Score filter
  if (rule.minRiskScore !== undefined) {
    const risk = invoice.customerRiskScore ?? 0;
    if (risk < rule.minRiskScore) {
      return { matches: false, reason: `Risk score (${risk}) is below minimum (${rule.minRiskScore})` };
    }
  }

  // Days relative evaluation
  const daysDiff = calculateDaysRelative(invoice.dueDate, referenceDate);

  if (rule.triggerType === "DUE_SOON") {
    // For DUE_SOON, daysDiff is negative (e.g. -3)
    if (daysDiff !== rule.daysRelative) {
      return {
        matches: false,
        reason: `Due in ${Math.abs(daysDiff)} days, does not match trigger (due in ${Math.abs(rule.daysRelative)} days)`,
      };
    }
  } else if (rule.triggerType === "OVERDUE") {
    // For OVERDUE, daysDiff is positive (e.g. 1, 7, 15, 30, 45)
    if (daysDiff !== rule.daysRelative) {
      return {
        matches: false,
        reason: `Overdue by ${daysDiff} days, does not match trigger (${rule.daysRelative} days overdue)`,
      };
    }
  }

  // Cooldown throttle check
  if (invoice.lastContactedAt && rule.cooldownHours && rule.cooldownHours > 0) {
    const lastContact = new Date(invoice.lastContactedAt).getTime();
    const now = referenceDate.getTime();
    const hoursSinceContact = (now - lastContact) / (1000 * 60 * 60);
    if (hoursSinceContact < rule.cooldownHours) {
      return {
        matches: false,
        reason: `Customer was contacted ${Math.round(hoursSinceContact)}h ago (cooldown is ${rule.cooldownHours}h)`,
      };
    }
  }

  // Channel availability check
  if (rule.channel === "EMAIL" && !invoice.customerEmail) {
    return { matches: false, reason: "Customer does not have an email address" };
  }
  if (rule.channel === "WHATSAPP" && !invoice.customerPhone) {
    return { matches: false, reason: "Customer does not have a phone number" };
  }

  return { matches: true };
}

/**
 * Evaluates all candidate invoices against an active set of workflow rules.
 * Deduplicates multiple rules triggering on the same invoice by picking the highest relative milestone.
 */
export function evaluateAllCadenceRules(
  invoices: CadenceContextInvoice[],
  rules: WorkflowRule[],
  referenceDate: Date = new Date()
): Array<{ invoice: CadenceContextInvoice; rule: WorkflowRule }> {
  const matches: Array<{ invoice: CadenceContextInvoice; rule: WorkflowRule }> = [];
  const processedInvoiceIds = new Set<string>();

  for (const invoice of invoices) {
    if (processedInvoiceIds.has(invoice.id)) continue;

    for (const rule of rules) {
      const evaluation = evaluateInvoiceRuleMatch(invoice, rule, referenceDate);
      if (evaluation.matches) {
        matches.push({ invoice, rule });
        processedInvoiceIds.add(invoice.id);
        break; // Only one automated action per invoice per evaluation run
      }
    }
  }

  return matches;
}
