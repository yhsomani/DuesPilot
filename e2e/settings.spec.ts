import { test, expect, MOCK_ORGANIZATION, MOCK_TEAM } from "./fixtures";
import { PLAN_DEFINITIONS, type SubscriptionInfo } from "../src/lib/billing";

const MOCK_SUBSCRIPTION_DATA: SubscriptionInfo = {
  organizationId: "org_test_123",
  tier: "STARTER",
  status: "ACTIVE",
  billingCycle: "monthly",
  currentPeriodStart: "2026-09-01T00:00:00.000Z",
  currentPeriodEnd: "2026-10-01T00:00:00.000Z",
  plan: PLAN_DEFINITIONS.STARTER,
  usage: {
    activeInvoices: 3,
    seats: 2,
    messagesSentThisMonth: 14,
  },
  quotas: {
    invoicesPercent: 6,
    seatsPercent: 67,
  },
  isTrial: false,
  canUpgrade: true,
};

const MOCK_AUDIT_DATA = {
  logs: [
    {
      id: "aud_1",
      action: "MESSAGE_SEND",
      entityType: "message",
      entityId: "msg_1",
      ipAddress: "103.21.14.88",
      createdAt: "2026-09-04T12:00:00.000Z",
      metadata: {
        channel: "WHATSAPP",
        recipient: "+919876543210",
        template: "overdue_escalation",
      },
      user: {
        id: "usr_1",
        name: "Yash Somani",
        email: "admin@duespilot.com",
        role: "OWNER",
      },
    },
    {
      id: "aud_2",
      action: "PAYMENT_RECORD",
      entityType: "payment",
      entityId: "pay_1",
      ipAddress: "103.21.14.88",
      createdAt: "2026-09-02T15:30:00.000Z",
      metadata: {
        amount: 110000,
        method: "RTGS",
        reference: "UTR994827110",
      },
      user: {
        id: "usr_2",
        name: "Pooja Mehta",
        email: "pooja@duespilot.com",
        role: "COLLECTOR",
      },
    },
  ],
  total: 2,
  limit: 25,
  offset: 0,
};

test.describe("Settings & Workspace Administration", () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route("**/api/settings", async (route) => {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...MOCK_ORGANIZATION, ...body }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_ORGANIZATION),
        });
      }
    });

    await page.route("**/api/team*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TEAM),
      });
    });

    await page.route("**/api/notifications/preferences", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          showBrokenPromiseBanner: true,
          showQueueWhy: true,
          emailDailyDigest: false,
          available: true,
        }),
      });
    });

    await page.route("**/api/billing/subscription", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          subscription: MOCK_SUBSCRIPTION_DATA,
          plans: Object.values(PLAN_DEFINITIONS),
        }),
      });
    });

    await page.route("**/api/audit*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_AUDIT_DATA),
      });
    });
  });

  test("General Tab: updates organization profile, schedule, and collector preferences", async ({
    authenticatedPage: page,
  }) => {
    let savedSettings: Record<string, unknown> | null = null;
    await page.route("**/api/settings", async (route) => {
      if (route.request().method() === "PATCH") {
        savedSettings = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ...MOCK_ORGANIZATION, ...savedSettings }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_ORGANIZATION),
        });
      }
    });

    await page.goto("/dashboard/settings");

    await expect(page.getByRole("heading", { name: "Settings & Workspace Administration" })).toBeVisible();
    await expect(page.getByText("Tenant Control Plane")).toBeVisible();

    // Verify Organization profile fields
    const companyInput = page.getByRole("textbox", { name: "Company Name *" });
    await expect(companyInput).toHaveValue("Acme Industrial Technologies Pvt Ltd");
    await companyInput.fill("Acme Global Heavy Industries Ltd");

    const gstinInput = page.getByPlaceholder("27AABCU9603R1ZM");
    await expect(gstinInput).toHaveValue("27AABCU9603R1ZM");

    // Change Operating city
    const cityInput = page.getByPlaceholder(/Mumbai, Bangalore, Delhi/i);
    await cityInput.fill("Pune");

    // Toggle pause dunning switch
    const pauseSwitch = page.getByRole("switch");
    await pauseSwitch.click();

    // Click Save Workspace Settings
    await page.getByRole("button", { name: /Save Workspace Settings/i }).click();

    await expect(page.getByText("Saved successfully!")).toBeVisible();
    expect(savedSettings).toMatchObject({
      name: "Acme Global Heavy Industries Ltd",
      city: "Pune",
      automationsPaused: true,
    });
  });

  test("Team Tab: lists members, invites new team member, and displays temp password", async ({
    authenticatedPage: page,
  }) => {
    let invitePayload: Record<string, unknown> | null = null;
    await page.route("**/api/team", async (route) => {
      if (route.request().method() === "POST") {
        invitePayload = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "usr_3",
            name: invitePayload?.name,
            email: invitePayload?.email,
            role: invitePayload?.role,
            tempPassword: "TempPass9988!#",
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_TEAM),
        });
      }
    });

    await page.goto("/dashboard/settings");

    // Switch to Team & Access tab
    await page.getByRole("button", { name: /Team & Access/i }).click();

    await expect(page.getByRole("heading", { name: "Active Workspace Team Members" })).toBeVisible();
    await expect(page.getByText("Yash Somani")).toBeVisible();
    await expect(page.getByText("Pooja Mehta")).toBeVisible();

    // Fill Invite form
    await page.getByPlaceholder(/Full Name/i).fill("Arjun Patel");
    await page.getByPlaceholder(/Work Email \*/i).fill("arjun.patel@duespilot.com");
    await page.getByRole("combobox").first().selectOption("FINANCE_MANAGER");

    // Submit invite
    await page.getByRole("button", { name: /Send Invite/i }).click();

    // Temporary password banner appears
    await expect(page.getByText("Temporary Credentials Generated")).toBeVisible();
    await expect(page.getByText("TempPass9988!#")).toBeVisible();
    await expect(page.getByText(/Copy Credentials/i)).toBeVisible();

    expect(invitePayload).toMatchObject({
      name: "Arjun Patel",
      email: "arjun.patel@duespilot.com",
      role: "FINANCE_MANAGER",
    });
  });

  test("Billing Tab: displays active subscription, usage meters, and supports tier upgrade", async ({
    authenticatedPage: page,
  }) => {
    let checkoutPayload: Record<string, unknown> | null = null;
    await page.route("**/api/billing/checkout", async (route) => {
      if (route.request().method() === "POST") {
        checkoutPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            message: "Successfully upgraded to Growth Plan",
          }),
        });
      }
    });

    await page.goto("/dashboard/settings");

    // Switch to Billing & Plans tab
    await page.getByRole("button", { name: /Billing & Plans/i }).click();

    // Current Plan Header
    await expect(page.getByRole("heading", { name: "Starter Plan" })).toBeVisible();
    await expect(page.getByText("ACTIVE")).toBeVisible();

    // Usage Quotas
    await expect(page.getByText("Resource Usage & Quotas")).toBeVisible();
    await expect(page.getByText("Active Invoices")).toBeVisible();
    await expect(page.getByText("Team Seats")).toBeVisible();
    await expect(page.getByText("Messages Sent (Month)")).toBeVisible();

    // Available Plans Grid
    await expect(page.getByRole("heading", { name: "Available Plans" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Growth" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Enterprise Pro" })).toBeVisible();

    // Toggle Annual Billing Cycle
    await page.getByRole("button", { name: /Annual/i }).click();
    await expect(page.getByText("Save 17%")).toBeVisible();

    // Upgrade to Growth Plan
    const upgradeGrowthBtn = page.getByRole("button", { name: /Upgrade to Growth/i });
    await expect(upgradeGrowthBtn).toBeVisible();
    await upgradeGrowthBtn.click();

    await expect(page.getByText("Successfully upgraded to Growth Plan")).toBeVisible();
    expect(checkoutPayload).toMatchObject({
      planTier: "GROWTH",
      billingCycle: "yearly",
    });
  });

  test("Audit Tab: filters event log by action and entity, opens JSON metadata inspector", async ({
    authenticatedPage: page,
  }) => {
    await page.goto("/dashboard/settings");

    // Switch to Audit & Compliance tab
    await page.getByRole("button", { name: /Audit & Compliance Log/i }).click();

    await expect(page.getByRole("heading", { name: "Audit & Compliance Log" })).toBeVisible();

    // Table rows
    await expect(page.getByText("MESSAGE_SEND")).toBeVisible();
    await expect(page.getByText("PAYMENT_RECORD")).toBeVisible();
    await expect(page.getByText("103.21.14.88")).toHaveCount(2);

    // Filter by action
    const actionSelect = page.getByRole("combobox").first();
    await actionSelect.selectOption("MESSAGE_SEND");

    // Click View JSON on first log
    const viewJsonBtn = page.getByRole("button", { name: /View JSON/i }).first();
    await viewJsonBtn.click();

    // Modal opens
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Audit Event: MESSAGE_SEND")).toBeVisible();
    await expect(dialog.getByText("overdue_escalation")).toBeVisible();

    // Close modal
    await dialog.getByRole("button", { name: "✕" }).click();
    await expect(dialog).not.toBeVisible();
  });
});
