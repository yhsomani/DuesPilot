// Shared domain DTOs used by both API route handlers and client pages.
// The API layer returns these shapes; client components consume them.

export interface DashboardStats {
  totalReceivables: number;
  totalOverdue: number;
  totalDueSoon: number;
  highRisk: number;
  promiseBroken: number;
  customersOverdue: number;
}

export interface AgingBucket {
  label: string;
  amount: number;
  count: number;
}

export type QueuePriority = "high" | "medium" | "low";

export interface QueueItem {
  id: string;
  customerId: string;
  customer: string;
  initials: string;
  amount: number;
  daysOverdue: number;
  status: string;
  lastAction: string;
  nextAction: string;
  priority: QueuePriority;
  why: string;
  promiseBroken: boolean;
  promiseId: string | null;
}

export interface DashboardData {
  stats: DashboardStats;
  aging: AgingBucket[];
  queue: QueueItem[];
}

export interface CustomerSummary {
  id: string;
  name: string;
  initials: string;
  email: string | null;
  phone: string | null;
  totalOutstanding: number;
  totalOverdue: number;
  invoicesCount: number;
  riskScore: number;
  lastPaymentAt: string | null;
  status: string;
}

export interface DuplicateGroup {
  key: string;
  members: {
    id: string;
    name: string;
    invoicesCount: number;
    totalOutstanding: number;
  }[];
}

export interface CustomerContact {
  id: string;
  name: string;
  designation: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
}

export interface CustomerInvoice {
  id: string;
  number: string;
  date: string;
  dueDate: string;
  amount: number;
  outstanding: number;
  status: string;
  daysOverdue: number;
}

export interface CustomerTimelineEvent {
  id: string;
  date: string;
  type: string;
  text: string;
  status?: string;
}

export interface CustomerDetailData {
  id: string;
  name: string;
  initials: string;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  totalOutstanding: number;
  totalOverdue: number;
  riskScore: number;
  status: string;
  notes: string | null;
  contacts: CustomerContact[];
  invoices: CustomerInvoice[];
  timeline: CustomerTimelineEvent[];
}

export interface InvoiceRow {
  id: string;
  number: string;
  customer: string;
  date: string;
  dueDate: string;
  amount: number;
  outstanding: number;
  status: string;
  daysOverdue: number;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  taxRate: number | null;
  amount: number;
}

export interface InvoiceTimelineEvent {
  id: string;
  date: string;
  type: "payment" | "event" | "promise" | "dispute";
  summary: string;
  detail?: string;
}

export interface InvoiceAllocationView {
  id: string;
  paymentRef: string | null;
  paymentDate: string;
  mode: string | null;
  amount: number;
}

export interface InvoiceDetail {
  id: string;
  number: string;
  customerId: string;
  customerName: string;
  date: string;
  dueDate: string;
  amount: number;
  outstanding: number;
  status: string;
  currency: string;
  notes: string | null;
  items: InvoiceLineItem[];
  allocations: InvoiceAllocationView[];
  timeline: InvoiceTimelineEvent[];
}

export type PromiseStatusView = "ACTIVE" | "KEPT" | "BROKEN" | "RENEGOTIATED";

export interface PromiseRow {
  id: string;
  customer: string;
  initials: string;
  amount: number;
  promiseDate: string;
  source: string;
  confidence: number;
  status: PromiseStatusView;
  invoiceNumber: string | null;
}

export interface CreatePromiseInput {
  customerId: string;
  amount: number;
  promiseDate: string;
  invoiceId?: string | null;
  note?: string | null;
  source?: string;
  confidence?: number;
  idempotencyKey?: string | null;
}

export interface PaymentAllocationView {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
}

export interface PaymentRow {
  id: string;
  customerId: string;
  customer: string;
  reference: string | null;
  amount: number;
  paymentDate: string;
  mode: string | null;
  status: string;
  allocations: PaymentAllocationView[];
}

export interface CreatePaymentInput {
  customerId: string;
  amount: number;
  paymentDate: string;
  mode?: string | null;
  reference?: string | null;
  allocations?: { invoiceId: string; amount: number }[];
  idempotencyKey?: string | null;
}

export interface CollectionEventInput {
  customerId: string;
  invoiceId?: string | null;
  type: string;
  description: string;
  metadata?: Record<string, unknown> | null;
}

export interface DisputeRow {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customer: string;
  reason: string;
  category: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

export interface OrganizationSettings {
  name: string;
  gstin: string | null;
  industry: string | null;
  city: string | null;
  usersCount: number;
  businessHoursStart: number | null;
  businessHoursEnd: number | null;
  workingDays: number[] | null;
  holidays: string[] | null;
  automationsPaused: boolean;
}

export interface ImportColumnMapping {
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: string;
  outstanding: string;
  email: string;
  phone: string;
}

export interface ImportRowIssue {
  /** 1-based original row number in the uploaded file. */
  row: number;
  reason: string;
}

export interface ImportResult {
  customersCreated: number;
  invoicesCreated: number;
  totalAmount: number;
  /** Total non-empty rows supplied by the user. */
  processedRows: number;
  /** Rows that passed validation and were imported. */
  validRows: number;
  /** Rows skipped because they failed validation or already exist. */
  skippedRows: number;
  /** Human-readable reasons per skipped row (capped to prevent huge payloads). */
  issues: ImportRowIssue[];
}
