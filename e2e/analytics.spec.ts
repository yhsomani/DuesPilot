import { test, expect, MOCK_ANALYTICS, MOCK_QUEUE } from "./fixtures";

test.describe("Collection Analytics & Intelligence Dashboard", () => {
  test("renders financial KPIs, DSO velocity, CEI collection index, and pipeline health", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/analytics", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ANALYTICS),
      });
    });

    await page.route("**/api/queue", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_QUEUE),
      });
    });

    await page.goto("/dashboard/analytics");

    await expect(page.getByRole("heading", { name: "Collection Analytics & Intelligence" })).toBeVisible();
    await expect(page.getByText("Live Real-Time")).toBeVisible();

    // Top financial KPI cards
    await expect(page.getByText("Collection Effectiveness Index (CEI)")).toBeVisible();
    await expect(page.getByText("Days Sales Outstanding (DSO)")).toBeVisible();
    await expect(page.getByText("Overdue Portfolio Ratio")).toBeVisible();
    await expect(page.getByText("Promise Fulfillment Rate")).toBeVisible();

    // Monthly Recovery Velocity Chart
    await expect(page.getByText("Monthly Recovery Velocity")).toBeVisible();
    await expect(page.getByText("Rolling 6M")).toBeVisible();
    await expect(page.getByText("Bank Receipt Allocations")).toBeVisible();

    // Collection Pipeline Health
    await expect(page.getByText("Collection Pipeline Health")).toBeVisible();
    await expect(page.getByText("Debtors in Action Queue")).toBeVisible();
    await expect(page.getByText("Active PTP Commitments")).toBeVisible();
    await expect(page.getByText("Active Invoice Disputes")).toBeVisible();

    // Top Overdue Debtors table
    await expect(page.getByRole("heading", { name: "Top Overdue Debtors" })).toBeVisible();
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
    await expect(page.getByText("ABC Engineering Works")).toBeVisible();
  });

  test("Refresh Analytics button triggers data refetch without crash", async ({
    authenticatedPage: page,
  }) => {
    let analyticsFetchCount = 0;
    await page.route("**/api/analytics", async (route) => {
      analyticsFetchCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ANALYTICS),
      });
    });

    await page.route("**/api/queue", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_QUEUE),
      });
    });

    await page.goto("/dashboard/analytics");

    expect(analyticsFetchCount).toBe(1);

    // Click Refresh Analytics button
    await page.getByRole("button", { name: /Refresh Analytics/i }).click();

    expect(analyticsFetchCount).toBeGreaterThanOrEqual(2);
  });
});
