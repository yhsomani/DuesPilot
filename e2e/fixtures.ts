import { test as base, expect, type Page } from "@playwright/test";

export const MOCK_USER = {
  id: "usr_test_123",
  name: "Yash Somani",
  email: "admin@duespilot.com",
  role: "OWNER",
  organizationId: "org_test_123",
};

export const MOCK_ORGANIZATION = {
  id: "org_test_123",
  name: "Acme Industrial Technologies Pvt Ltd",
  gstin: "27AABCU9603R1ZM",
  pan: "AABCU9603R",
  msmeUdyamNumber: "UDYAM-MH-12-0012345",
  businessHoursStart: "09:00",
  businessHoursEnd: "18:00",
  workingDays: [1, 2, 3, 4, 5],
};

export const MOCK_CUSTOMERS = [
  {
    id: "cust_1",
    name: "Raj Steel & Forgings Pvt Ltd",
    gstin: "27AABCU9603R1ZM",
    pan: "AABCU9603R",
    email: "accounts@rajsteel.com",
    phone: "+919876543210",
    city: "Pune",
    state: "Maharashtra",
    creditLimit: 1000000,
    paymentTerms: 30,
    totalOutstanding: 480000,
    totalOverdue: 480000,
    riskScore: 85,
    status: "ACTIVE",
    invoicesCount: 2,
    createdAt: "2026-01-15T00:00:00.000Z",
  },
  {
    id: "cust_2",
    name: "ABC Engineering Works",
    gstin: "29AABCU9603R1ZN",
    pan: "AABCU9603P",
    email: "finance@abceng.in",
    phone: "+919812345678",
    city: "Bengaluru",
    state: "Karnataka",
    creditLimit: 500000,
    paymentTerms: 15,
    totalOutstanding: 220000,
    totalOverdue: 110000,
    riskScore: 62,
    status: "ACTIVE",
    invoicesCount: 1,
    createdAt: "2026-02-10T00:00:00.000Z",
  },
];

export const MOCK_INVOICES = [
  {
    id: "inv_1",
    number: "INV-2026-089",
    customerId: "cust_1",
    customerName: "Raj Steel & Forgings Pvt Ltd",
    amount: 480000,
    outstanding: 480000,
    date: "2026-08-01",
    dueDate: "2026-08-15",
    status: "OVERDUE",
    notes: "PO #PO-9912 / Net 15 days payment terms",
    items: [
      {
        id: "item_1",
        description: "Forged High-Tensile Steel Rods (Grade 8.8)",
        quantity: 10,
        unitPrice: 40000,
        taxRate: 18,
        amount: 472000,
      },
      {
        id: "item_2",
        description: "Precision CNC Chamfering Service",
        quantity: 1,
        unitPrice: 8000,
        taxRate: 0,
        amount: 8000,
      },
    ],
    allocations: [],
    timeline: [
      {
        id: "tl_1",
        type: "event",
        summary: "Invoice Generated and Dispatched via Email",
        detail: "Sent to accounts@rajsteel.com",
        date: "2026-08-01T10:00:00.000Z",
      },
      {
        id: "tl_2",
        type: "event",
        summary: "WhatsApp Dunning Reminder Dispatched",
        detail: "Delivered to +919876543210",
        date: "2026-08-20T14:30:00.000Z",
      },
    ],
  },
  {
    id: "inv_2",
    number: "INV-2026-094",
    customerId: "cust_2",
    customerName: "ABC Engineering Works",
    amount: 220000,
    outstanding: 110000,
    date: "2026-08-10",
    dueDate: "2026-08-25",
    status: "PARTIALLY_PAID",
    notes: "Supply of Industrial Bearings",
    items: [
      {
        id: "item_3",
        description: "Deep Groove Ball Bearings 6205-2RS",
        quantity: 100,
        unitPrice: 2200,
        taxRate: 18,
        amount: 220000,
      },
    ],
    allocations: [
      {
        id: "alloc_1",
        paymentId: "pay_1",
        amount: 110000,
        date: "2026-08-28",
      },
    ],
    timeline: [],
  },
];

export const MOCK_QUEUE = [
  {
    id: "queue_1",
    customerId: "cust_1",
    customer: "Raj Steel & Forgings Pvt Ltd",
    initials: "RS",
    amount: 480000,
    daysOverdue: 21,
    priority: "high" as const,
    status: "overdue",
    why: "21 days overdue with broken promise",
    lastAction: "WhatsApp Reminder on 20 Aug",
    nextAction: "Send Statutory MSME Notice",
    promiseBroken: true,
    promiseId: "prom_1",
  },
  {
    id: "queue_2",
    customerId: "cust_2",
    customer: "ABC Engineering Works",
    initials: "AE",
    amount: 110000,
    daysOverdue: 9,
    priority: "medium" as const,
    status: "partially_paid",
    why: "Partially paid balance remaining",
    lastAction: "Payment of ₹1,10,000 received on 28 Aug",
    nextAction: "Send Friendly Balance Reminder",
    promiseBroken: false,
  },
];

export const MOCK_PROMISES = [
  {
    id: "prom_1",
    customerId: "cust_1",
    customerName: "Raj Steel & Forgings Pvt Ltd",
    invoiceId: "inv_1",
    invoiceNumber: "INV-2026-089",
    amount: 200000,
    promisedDate: "2026-09-15",
    status: "PENDING",
    notes: "Spoke with MD Rajesh Sharma; promised RTGS transfer by 15th",
    createdAt: "2026-09-01T10:00:00.000Z",
  },
];

export const MOCK_PAYMENTS = [
  {
    id: "pay_1",
    customerId: "cust_2",
    customerName: "ABC Engineering Works",
    amount: 110000,
    date: "2026-08-28",
    method: "RTGS",
    reference: "UTR994827110",
    notes: "Part payment against INV-2026-094",
    status: "completed",
    allocations: [
      {
        id: "alloc_1",
        invoiceId: "inv_2",
        invoiceNumber: "INV-2026-094",
        amount: 110000,
      },
    ],
  },
  {
    id: "pay_2",
    customerId: "cust_1",
    customerName: "Raj Steel & Forgings Pvt Ltd",
    amount: 50000,
    date: "2026-09-02",
    method: "UPI",
    reference: "UPI/39912048",
    notes: "Advance on account",
    status: "completed",
    allocations: [],
  },
];

export const MOCK_DISPUTES = [
  {
    id: "disp_1",
    customerId: "cust_1",
    customerName: "Raj Steel & Forgings Pvt Ltd",
    invoiceId: "inv_1",
    invoiceNumber: "INV-2026-089",
    category: "quality",
    disputedAmount: 48000,
    reason: "Dimensional tolerance defect in batch #B-902",
    status: "open",
    createdAt: "2026-08-22T00:00:00.000Z",
  },
];

export const MOCK_MESSAGES = [
  {
    id: "msg_1",
    customerId: "cust_1",
    customerName: "Raj Steel & Forgings Pvt Ltd",
    invoiceId: "inv_1",
    invoiceNumber: "INV-2026-089",
    channel: "WHATSAPP",
    recipient: "+919876543210",
    subject: "Urgent Payment Reminder",
    body: "Your invoice #INV-2026-089 is overdue. Settle via https://pay.duespilot.com/plink_123",
    status: "DELIVERED",
    sentAt: "2026-09-04T12:00:00.000Z",
    paymentLink: "https://pay.duespilot.com/plink_123",
  },
  {
    id: "msg_2",
    customerId: "cust_2",
    customerName: "ABC Engineering Works",
    invoiceId: "inv_2",
    invoiceNumber: "INV-2026-094",
    channel: "EMAIL",
    recipient: "finance@abceng.in",
    subject: "Statement of Account & Due Invoices",
    body: "Dear Customer, please find attached your monthly statement of account.",
    status: "OPENED",
    sentAt: "2026-09-03T10:15:00.000Z",
  },
];

export const MOCK_WORKFLOWS = [
  {
    id: "wf_1",
    name: "Standard MSME 45-Day Dunning Cadence",
    description: "Automated multi-channel escalation aligned with MSMED Act 2006",
    enabled: true,
    isSystemDefault: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    rules: [
      {
        id: "r_1",
        name: "Pre-due Courtesy Reminder",
        triggerType: "DUE_SOON",
        daysRelative: -3,
        channel: "EMAIL",
        enabled: true,
        includePaymentLink: true,
      },
      {
        id: "r_2",
        name: "Grace Period WhatsApp Notice",
        triggerType: "OVERDUE",
        daysRelative: 1,
        channel: "WHATSAPP",
        enabled: true,
        includePaymentLink: true,
      },
      {
        id: "r_3",
        name: "First Formal Overdue Follow-up",
        triggerType: "OVERDUE",
        daysRelative: 7,
        channel: "WHATSAPP",
        enabled: true,
        includePaymentLink: true,
      },
      {
        id: "r_4",
        name: "Section 15 MSME Statutory Notice",
        triggerType: "OVERDUE",
        daysRelative: 45,
        channel: "EMAIL",
        enabled: true,
        includePaymentLink: true,
      },
    ],
  },
];

export const MOCK_TEAM = [
  {
    id: "usr_1",
    name: "Yash Somani",
    email: "admin@duespilot.com",
    role: "OWNER",
    emailVerified: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "usr_2",
    name: "Pooja Mehta",
    email: "pooja@duespilot.com",
    role: "COLLECTOR",
    emailVerified: "2026-02-01T00:00:00.000Z",
    createdAt: "2026-02-01T00:00:00.000Z",
  },
];

export const MOCK_ANALYTICS = {
  dso: 38.5,
  dsoChange: -4.2,
  cei: 84.8,
  totalReceivables: 700000,
  totalOverdue: 590000,
  collectedThisMonth: 1250000,
  forecastRecovery30Days: 450000,
  series: [
    { period: "May", billed: 1200000, collected: 950000 },
    { period: "Jun", billed: 1450000, collected: 1100000 },
    { period: "Jul", billed: 1300000, collected: 1280000 },
    { period: "Aug", billed: 1600000, collected: 1420000 },
    { period: "Sep", billed: 1100000, collected: 890000 },
  ],
  agingBuckets: [
    { label: "Current", amount: 110000, count: 2 },
    { label: "1-30 days", amount: 220000, count: 1 },
    { label: "31-60 days", amount: 480000, count: 1 },
    { label: "61-90 days", amount: 0, count: 0 },
    { label: "90+ days", amount: 0, count: 0 },
  ],
  channelStats: [
    { channel: "WhatsApp", sent: 84, delivered: 82, collected: 680000, rate: 81 },
    { channel: "Email", sent: 120, delivered: 118, collected: 420000, rate: 64 },
    { channel: "Phone Call", sent: 32, delivered: 30, collected: 350000, rate: 75 },
  ],
};

/**
 * Setup simulated authenticated session cookies & mock API interceptors
 * so Playwright tests run fast, isolated, and with zero external database flakiness.
 */
export async function setupAuthenticatedState(page: Page) {
  // Set auth cookie
  await page.context().addCookies([
    {
      name: "authjs.session-token",
      value: "mock_authenticated_jwt_token_for_e2e_testing",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  // Global search API
  await page.route("**/api/search?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        query: "Raj",
        total: 2,
        results: [
          {
            type: "customer",
            id: "cust_1",
            title: "Raj Steel & Forgings Pvt Ltd",
            subtitle: "GSTIN: 27AABCU9603R1ZM · Pune, MH",
            amount: 480000,
            badge: "High Risk (85)",
            url: "/dashboard/customers/cust_1",
          },
          {
            type: "invoice",
            id: "inv_1",
            title: "Invoice #INV-2026-089",
            subtitle: "Raj Steel · Due 21d ago",
            amount: 480000,
            badge: "OVERDUE",
            url: "/dashboard/invoices/inv_1",
          },
        ],
      }),
    });
  });

  // Notifications API
  await page.route("**/api/notifications*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "notif_1",
          title: "Payment Received",
          message: "₹1,10,000 received from ABC Engineering Works",
          read: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: "notif_2",
          title: "Promise Broken",
          message: "Raj Steel & Forgings payment promise was broken",
          read: false,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ]),
    });
  });
}

export const test = base.extend<{
  authenticatedPage: Page;
}>({
  authenticatedPage: async ({ page }, use) => {
    await setupAuthenticatedState(page);
    await use(page);
  },
});

export { expect };
