import { test, expect } from "./fixtures";

test.describe("Navigation, Responsive Layout & Global Search", () => {
  test("desktop sidebar displays all core navigation items and active states", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/dashboard", async (route) => {
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
          agingBuckets: [],
          actionQueue: [],
          recentEvents: [],
        }),
      });
    });

    await page.goto("/dashboard");

    // Check sidebar navigation links
    await expect(page.getByRole("link", { name: "Dashboard" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Collection Queue" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Invoices", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Customers" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Promises" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Payments" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Disputes" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Communications" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Workflows" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Analytics" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" }).first()).toBeVisible();
  });

  test("responsive mobile header and slide-over navigation drawer open on mobile viewports", async ({
    authenticatedPage: page,
  }) => {
    // Set viewport to mobile dimensions
    await page.setViewportSize({ width: 375, height: 667 });

    await page.route("**/api/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ stats: {}, agingBuckets: [], actionQueue: [], recentEvents: [] }),
      });
    });

    await page.goto("/dashboard");

    // Mobile header is visible with hamburger button
    const menuBtn = page.getByRole("button", { name: /Open navigation menu/i });
    await expect(menuBtn).toBeVisible();

    // Click menu button to open slide-over drawer
    await menuBtn.click();

    // Drawer should show navigation links
    await expect(page.getByRole("link", { name: "Collection Queue", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Invoices", exact: true })).toBeVisible();

    // Close drawer by clicking close button
    const closeBtn = page.getByRole("button", { name: "Close menu" });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(closeBtn).not.toBeVisible();
  });

  test("global command palette search modal opens via shortcut and displays instant results", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ stats: {}, agingBuckets: [], actionQueue: [], recentEvents: [] }),
      });
    });

    await page.goto("/dashboard");

    // Open search modal via shortcut
    await page.keyboard.press("Control+k");

    const searchModal = page.getByRole("dialog");
    await expect(searchModal).toBeVisible();

    const searchInput = page.getByPlaceholder(/Search customers, GSTIN, invoice #/i);
    await expect(searchInput).toBeVisible();

    await searchInput.fill("Raj");

    // Verified results appear
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
    await expect(page.getByText("Invoice #INV-2026-089")).toBeVisible();

    // Press Escape to dismiss
    await page.keyboard.press("Escape");
    await expect(searchModal).not.toBeVisible();
  });

  test("notification bell opens dropdown with recent unread notifications", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/dashboard", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ stats: {}, agingBuckets: [], actionQueue: [], recentEvents: [] }),
      });
    });

    await page.goto("/dashboard");

    const bellBtn = page.getByRole("button", { name: /Notifications/i }).first();
    await expect(bellBtn).toBeVisible();
    await bellBtn.click();

    // Notification dropdown opens
    await expect(page.getByText(/Payment Received/i)).toBeVisible();
    await expect(page.getByText(/Promise Broken/i)).toBeVisible();
  });
});
