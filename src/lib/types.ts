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
  promiseBroken: boolean;
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

export interface CustomerContact {
  id?: string;
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

export interface OrganizationSettings {
  name: string;
  gstin: string | null;
  industry: string | null;
  city: string | null;
  usersCount: number;
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

export interface ImportResult {
  customersCreated: number;
  invoicesCreated: number;
  totalAmount: number;
}
