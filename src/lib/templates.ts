// Pure template rendering engine and default collection templates for DuesPilot.

export interface TemplateVariable {
  key: string;
  label: string;
  description: string;
  example: string;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  category: "reminder" | "overdue" | "demand" | "promise" | "receipt" | "dispute";
  channel: "EMAIL" | "WHATSAPP" | "SMS";
  subject: string;
  body: string;
  description: string;
  dltTemplateId?: string;
  dltEntityId?: string;
  dltHeader?: string;
}

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: "customerName", label: "Customer Name", description: "Name of the customer company", example: "Acme Enterprises" },
  { key: "contactName", label: "Contact Name", description: "Primary contact person's name", example: "Rajesh Kumar" },
  { key: "invoiceNumber", label: "Invoice Number", description: "Invoice reference number", example: "INV-2026-089" },
  { key: "amount", label: "Amount", description: "Formatted invoice or total due amount", example: "₹45,000" },
  { key: "outstandingAmount", label: "Outstanding Amount", description: "Remaining balance amount", example: "₹25,000" },
  { key: "dueDate", label: "Due Date", description: "Invoice due date", example: "15 Sep 2026" },
  { key: "daysOverdue", label: "Days Overdue", description: "Number of days invoice is overdue", example: "14" },
  { key: "companyName", label: "Your Company", description: "Your organization name", example: "DuesPilot Logistics" },
  { key: "promiseDate", label: "Promise Date", description: "Agreed payment commitment date", example: "20 Sep 2026" },
  { key: "paymentReference", label: "Payment Reference", description: "Payment transaction reference", example: "UPI/UTR12345678" },
  { key: "paymentLink", label: "Instant Payment Link", description: "Dynamic Razorpay/UPI settlement link", example: "https://pay.duespilot.com/plink_123" },
  { key: "upiQrString", label: "UPI Deep Link", description: "Direct app-to-app UPI payment URI", example: "upi://pay?pa=dues@icici&am=45000" },
  { key: "installmentSummary", label: "Installment Summary", description: "Scheduled installment milestones breakdown", example: "3 monthly installments of ₹15,000" },
];

export const DEFAULT_TEMPLATES: TemplateDefinition[] = [
  {
    id: "payment-reminder",
    name: "Upcoming Payment Reminder",
    category: "reminder",
    channel: "EMAIL",
    subject: "Reminder: Invoice {{invoiceNumber}} due on {{dueDate}} - {{companyName}}",
    body: `Dear {{contactName}},

This is a gentle reminder that invoice {{invoiceNumber}} for {{amount}} is scheduled for payment on {{dueDate}}.

Please ensure the remittance is processed on or before the due date.

If you have already processed this payment, please disregard this note or share the payment reference.

Warm regards,
Accounts Team
{{companyName}}`,
    description: "Polite reminder sent 3-5 days before due date",
  },
  {
    id: "overdue-notice",
    name: "Overdue Invoice Notice",
    category: "overdue",
    channel: "EMAIL",
    subject: "Overdue Notice: Invoice {{invoiceNumber}} ({{daysOverdue}} days overdue) - {{companyName}}",
    body: `Dear {{contactName}},

Our records indicate that invoice {{invoiceNumber}} for {{outstandingAmount}} was due on {{dueDate}} and is currently {{daysOverdue}} days overdue.

We kindly request you to prioritize this payment and confirm the transaction details at your earliest convenience.

Bank Details for Transfer:
Organization: {{companyName}}

Thank you for your prompt attention to this matter.

Sincerely,
Finance & Collections
{{companyName}}`,
    description: "Standard overdue notice sent after due date",
  },
  {
    id: "final-demand",
    name: "Final Demand Before Escalation",
    category: "demand",
    channel: "EMAIL",
    subject: "URGENT: Final Notice for Pending Invoice {{invoiceNumber}} - {{companyName}}",
    body: `Dear {{contactName}},

Despite multiple previous reminders, invoice {{invoiceNumber}} for {{outstandingAmount}} remains unpaid and is now {{daysOverdue}} days past due.

Please be advised that unless this outstanding balance is settled within 3 business days, we will be forced to suspend further credit services and initiate formal recovery proceedings, including filing on the MSME Samadhaan delayed payments portal.

Please contact us immediately if there is any dispute regarding this invoice.

Yours urgently,
Credit Control & Legal
{{companyName}}`,
    description: "Strict demand notice before formal escalation",
  },
  {
    id: "broken-promise-alert",
    name: "Broken Payment Promise Follow-up",
    category: "promise",
    channel: "EMAIL",
    subject: "Follow-up: Unfulfilled Payment Commitment for {{invoiceNumber}} - {{companyName}}",
    body: `Dear {{contactName}},

We refer to your commitment to settle the pending balance of {{outstandingAmount}} for invoice {{invoiceNumber}} by {{promiseDate}}.

Our accounts department has not yet received confirmation of this payment. Please provide the transaction UTR number or contact us today to resolve this matter.

Best regards,
Collections Department
{{companyName}}`,
    description: "Sent when an agreed promise-to-pay date passes without payment",
  },
  {
    id: "payment-receipt",
    name: "Payment Receipt Confirmation",
    category: "receipt",
    channel: "EMAIL",
    subject: "Payment Received: Thank you for settling {{invoiceNumber}} - {{companyName}}",
    body: `Dear {{contactName}},

Thank you for your payment of {{amount}} (Ref: {{paymentReference}}). We have successfully reconciled this against invoice {{invoiceNumber}}.

We appreciate your timely business and partnership.

Warm regards,
Finance Department
{{companyName}}`,
    description: "Sent upon successful payment allocation",
  },
  {
    id: "dispute-acknowledgment",
    name: "Dispute Acknowledgment",
    category: "dispute",
    channel: "EMAIL",
    subject: "Under Review: Dispute logged for Invoice {{invoiceNumber}} - {{companyName}}",
    body: `Dear {{contactName}},

We acknowledge receipt of your query/dispute regarding invoice {{invoiceNumber}}.

Our operations team is actively reviewing your concerns. While this invoice is under review, automated collection reminders for this specific balance have been paused.

We will reach out with an update shortly.

Sincerely,
Customer Relations
{{companyName}}`,
    description: "Sent when an invoice dispute is recorded",
  },
  {
    id: "whatsapp-payment-reminder",
    name: "WhatsApp: Friendly Payment Reminder",
    category: "reminder",
    channel: "WHATSAPP",
    subject: "Payment Reminder for Invoice {{invoiceNumber}}",
    body: `Hi {{contactName}}, gentle reminder from *{{companyName}}* that invoice *{{invoiceNumber}}* for *{{amount}}* is due on *{{dueDate}}*.

👉 Pay instantly via UPI / Card: {{paymentLink}}

Thank you for your timely partnership!`,
    description: "Short friendly WhatsApp reminder with dynamic payment link",
  },
  {
    id: "whatsapp-overdue-alert",
    name: "WhatsApp: Urgent Overdue Notice",
    category: "overdue",
    channel: "WHATSAPP",
    subject: "Overdue Notice: {{invoiceNumber}}",
    body: `*URGENT NOTICE* from *{{companyName}}*:

Invoice *{{invoiceNumber}}* for *{{outstandingAmount}}* is now *{{daysOverdue}} days overdue* (Due: {{dueDate}}).

Please clear the balance today to avoid disruption of credit terms.

📲 Settle Now: {{paymentLink}}
UPI ID: duespilot@icici

Please reply with the UTR / transaction screenshot once paid.`,
    description: "High-priority overdue notification with 1-click settlement link",
  },
  {
    id: "whatsapp-installment-schedule",
    name: "WhatsApp: Payment Plan Confirmation",
    category: "promise",
    channel: "WHATSAPP",
    subject: "Settlement Plan: {{companyName}}",
    body: `Dear {{contactName}},

As agreed, your structured installment payment plan with *{{companyName}}* is confirmed:

Total Amount: *{{amount}}*
Schedule: {{installmentSummary}}

First milestone due: *{{dueDate}}*
Pay Milestone: {{paymentLink}}

Thank you,
Accounts Team`,
    description: "Formal schedule breakdown for multi-installment settlements",
  },
  {
    id: "sms-payment-reminder",
    name: "SMS: Payment Due Reminder (DLT)",
    category: "reminder",
    channel: "SMS",
    subject: "SMS Reminder",
    body: "Dear {{contactName}}, gentle reminder that invoice {{invoiceNumber}} for Rs.{{amount}} is due on {{dueDate}}. Pay via {{paymentLink}} - {{companyName}}",
    description: "TRAI DLT-approved transactional reminder",
    dltTemplateId: "1107168900000001001",
    dltHeader: "DUESPL",
  },
  {
    id: "sms-overdue-alert",
    name: "SMS: Urgent Overdue Alert (DLT)",
    category: "overdue",
    channel: "SMS",
    subject: "SMS Overdue Notice",
    body: "URGENT: {{contactName}}, invoice {{invoiceNumber}} for Rs.{{outstandingAmount}} is {{daysOverdue}} days overdue. Pay immediately: {{paymentLink}} - {{companyName}}",
    description: "TRAI DLT-approved overdue notification",
    dltTemplateId: "1107168900000001002",
    dltHeader: "DUESPL",
  },
  {
    id: "sms-payment-receipt",
    name: "SMS: Payment Receipt (DLT)",
    category: "receipt",
    channel: "SMS",
    subject: "SMS Receipt",
    body: "Payment received! Rs.{{amount}} credited towards invoice {{invoiceNumber}}. Ref: {{paymentReference}}. Thank you - {{companyName}}",
    description: "TRAI DLT-approved payment allocation receipt",
    dltTemplateId: "1107168900000001003",
    dltHeader: "DUESPL",
  },
  {
    id: "sms-msme-statutory-notice",
    name: "SMS: MSME Statutory Notice (DLT)",
    category: "demand",
    channel: "SMS",
    subject: "SMS MSME Demand",
    body: "DEMAND NOTICE: {{contactName}}, statutory dues of Rs.{{outstandingAmount}} under MSMED Act 2006. Settle immediately: {{paymentLink}} - {{companyName}}",
    description: "TRAI DLT-approved formal statutory MSME demand notice",
    dltTemplateId: "1107168900000001005",
    dltHeader: "DUESPL",
  },
];

/**
 * Pure template interpolation function.
 * Replaces {{variable}} placeholders with provided values or fallback.
 */
export function interpolateTemplate(
  text: string,
  variables: Record<string, string | number | null | undefined>
): string {
  if (!text) return "";
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => {
    const val = variables[key];
    if (val === null || val === undefined) {
      return `[${key}]`;
    }
    return String(val);
  });
}

/**
 * Find a template by ID or return null.
 */
export function getTemplateById(id: string): TemplateDefinition | null {
  return DEFAULT_TEMPLATES.find((t) => t.id === id) ?? null;
}
