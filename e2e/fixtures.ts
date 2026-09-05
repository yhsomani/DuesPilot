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
    customer: "Raj Steel & Forgings Pvt Ltd",
    customerName: "Raj Steel & Forgings Pvt Ltd",
    initials: "RS",
    invoiceId: "inv_1",
    invoiceNumber: "INV-2026-089",
    amount: 200000,
    promiseDate: "2026-09-15",
    promisedDate: "2026-09-15",
    confidence: 80,
    source: "phone",
    status: "ACTIVE" as const,
    notes: "Spoke with MD Rajesh Sharma; promised RTGS transfer by 15th",
    createdAt: "2026-09-01T10:00:00.000Z",
  },
  {
    id: "prom_2",
    customerId: "cust_2",
    customer: "ABC Engineering Works",
    customerName: "ABC Engineering Works",
    initials: "AE",
    invoiceId: "inv_2",
    invoiceNumber: "INV-2026-094",
    amount: 110000,
    promiseDate: "2026-09-20",
    promisedDate: "2026-09-20",
    confidence: 65,
    source: "whatsapp",
    status: "ACTIVE" as const,
    notes: "Follow-up on partial balance settlement",
    createdAt: "2026-09-02T10:00:00.000Z",
  },
];

export const MOCK_PAYMENTS = [
  {
    id: "pay_1",
    customerId: "cust_2",
    customer: "ABC Engineering Works",
    customerName: "ABC Engineering Works",
    amount: 110000,
    date: "2026-08-28",
    paymentDate: "2026-08-28",
    method: "RTGS",
    mode: "RTGS",
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
    customer: "Raj Steel & Forgings Pvt Ltd",
    customerName: "Raj Steel & Forgings Pvt Ltd",
    amount: 50000,
    date: "2026-09-02",
    paymentDate: "2026-09-02",
    method: "UPI",
    mode: "UPI",
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
    customer: "Raj Steel & Forgings Pvt Ltd",
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
        id: "rule_1",
        name: "Pre-Due Courtesy Reminder",
        triggerType: "DUE_SOON",
        daysRelative: -3,
        channel: "EMAIL",
        templateName: "Pre-Due Courtesy Notice",
        includePaymentLink: true,
        enabled: true,
      },
      {
        id: "rule_2",
        name: "1-Day Overdue Soft Reminder",
        triggerType: "OVERDUE",
        daysRelative: 1,
        channel: "WHATSAPP",
        templateName: "First Overdue WhatsApp Ping",
        includePaymentLink: true,
        enabled: true,
      },
      {
        id: "rule_3",
        name: "7-Day Overdue Urgency Escalation",
        triggerType: "OVERDUE",
        daysRelative: 7,
        channel: "EMAIL",
        templateName: "Urgent Escalation & UPI Link",
        includePaymentLink: true,
        enabled: true,
      },
      {
        id: "rule_4",
        name: "15-Day Overdue WhatsApp Direct",
        triggerType: "OVERDUE",
        daysRelative: 15,
        channel: "WHATSAPP",
        templateName: "Demand Note & UPI Intent",
        includePaymentLink: true,
        enabled: true,
      },
      {
        id: "rule_5",
        name: "30-Day MSME Statutory Legal Notice",
        triggerType: "OVERDUE",
        daysRelative: 30,
        channel: "EMAIL",
        templateName: "Section 15 & 16 MSME Notice",
        includePaymentLink: true,
        enabled: true,
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
  kpis: [
    {
      label: "Days Sales Outstanding",
      value: 38.5,
      suffix: " days",
      hint: "Approximated as current outstanding ÷ average daily collections (trailing 30 days).",
    },
    {
      label: "Collection Effectiveness Index",
      value: 84.8,
      suffix: "%",
      hint: "Share of this month's receivable flow captured as cash.",
    },
    {
      label: "Promise Adherence",
      value: 75.0,
      suffix: "%",
      hint: "Promises kept ÷ promises resolved.",
    },
    {
      label: "Overdue Ratio",
      value: 22.4,
      suffix: "%",
      hint: "Overdue balance as a share of total outstanding.",
    },
  ],
  series: [
    { month: "Apr 26", collected: 950000 },
    { month: "May 26", collected: 1100000 },
    { month: "Jun 26", collected: 1280000 },
    { month: "Jul 26", collected: 1420000 },
    { month: "Aug 26", collected: 1600000 },
    { month: "Sep 26", collected: 890000 },
  ],
  activePromises: 4,
  openDisputes: 2,
};

/**
 * Setup simulated authenticated session cookies & mock API interceptors
 * so Playwright tests run fast, isolated, and with zero external database flakiness.
 */
export async function setupAuthenticatedState(page: Page) {
  // Set auth cookies for NextAuth/AuthJS formats on localhost and 127.0.0.1
  await page.context().addCookies([
    {
      name: "authjs.session-token",
      value: "mock_authenticated_jwt_token_for_e2e_testing",
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "next-auth.session-token",
      value: "mock_authenticated_jwt_token_for_e2e_testing",
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "authjs.session-token",
      value: "mock_authenticated_jwt_token_for_e2e_testing",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "next-auth.session-token",
      value: "mock_authenticated_jwt_token_for_e2e_testing",
      domain: "localhost",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "authjs.session-token",
      value: "mock_authenticated_jwt_token_for_e2e_testing",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
    {
      name: "next-auth.session-token",
      value: "mock_authenticated_jwt_token_for_e2e_testing",
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  // Auth session API
  await page.route("**/api/auth/session*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: MOCK_USER,
        expires: "2099-01-01T00:00:00.000Z",
      }),
    });
  });

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

  // Default baseline API route fallbacks for authenticated pages
  await page.route("**/api/dashboard*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        stats: {
          totalReceivables: 4500000,
          totalOverdue: 2100000,
          totalDueSoon: 850000,
          highRisk: 1200000,
          promiseBroken: 350000,
          customersOverdue: 14,
        },
        aging: [
          { bucket: "1-30 days", amount: 1200000, count: 5 },
          { bucket: "31-60 days", amount: 900000, count: 4 },
          { bucket: "61-90 days", amount: 800000, count: 3 },
          { bucket: "90+ days", amount: 1600000, count: 2 },
        ],
        actionQueue: MOCK_QUEUE,
        recentEvents: [],
      }),
    });
  });

  await page.route("**/api/queue*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_QUEUE),
    });
  });

  await page.route("**/api/customers*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_CUSTOMERS),
    });
  });

  await page.route("**/api/invoices*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        items: MOCK_INVOICES,
        invoices: MOCK_INVOICES,
        total: MOCK_INVOICES.length,
        page: 1,
        pageSize: 50,
        hasMore: false,
      }),
    });
  });

  await page.route("**/api/promises*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_PROMISES),
    });
  });

  await page.route("**/api/payments*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_PAYMENTS),
    });
  });

  await page.route("**/api/disputes*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_DISPUTES),
    });
  });

  await page.route("**/api/messages*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ messages: MOCK_MESSAGES, items: MOCK_MESSAGES }),
    });
  });

  await page.route("**/api/analytics*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ANALYTICS),
    });
  });

  await page.route("**/api/settings*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ORGANIZATION),
    });
  });

  await page.route("**/api/team*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ team: MOCK_TEAM, members: MOCK_TEAM }),
    });
  });

  await page.route("**/api/workflows*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ workflows: MOCK_WORKFLOWS, rules: MOCK_WORKFLOWS[0].rules }),
    });
  });

  await page.route("**/api/billing/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        subscription: { plan: "starter", status: "active", currentPeriodEnd: "2027-01-01T00:00:00.000Z" },
        usage: { invoices: 12, maxInvoices: 50, reminders: 34, maxReminders: 100 },
      }),
    });
  });

  await page.route("**/api/account*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: MOCK_USER,
        organization: MOCK_ORGANIZATION,
      }),
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
