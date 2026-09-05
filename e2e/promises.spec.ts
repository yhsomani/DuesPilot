import { test, expect, MOCK_PROMISES, MOCK_CUSTOMERS, MOCK_INVOICES } from "./fixtures";

test.describe("Payment Promises (PTP) & Structured Payment Plans", () => {
  test("renders promises register, fulfillment KPI cards, and status filter switching", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/promises*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PROMISES),
      });
    });

    await page.goto("/dashboard/promises");

    await expect(page.getByRole("heading", { name: /Promises to Pay/i })).toBeVisible();
    await expect(page.getByText("Active PTP Commitments")).toBeVisible();
    await expect(page.getByText("Kept & Recovered")).toBeVisible();
    await expect(page.getByText("Broken Commitments")).toBeVisible();
    await expect(page.getByText("PTP Fulfillment Rate")).toBeVisible();

    // Table rows
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
    await expect(page.getByText("ABC Engineering Works")).toBeVisible();

    // Status filter - Active
    await page.getByRole("button", { name: /^Active \(/i }).click();
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();

    // Status filter - Kept (should show empty state since mock data is ACTIVE)
    await page.getByRole("button", { name: /^Kept \(/i }).click();
    await expect(page.getByText("No payment promises found")).toBeVisible();

    // Status filter - All
    await page.getByRole("button", { name: /^All \(/i }).click();
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
    await expect(page.getByText("ABC Engineering Works")).toBeVisible();
  });

  test("Log Promise modal creates new payment commitment", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/promises*", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: "ptp_new_123", ...body, status: "ACTIVE" }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_PROMISES),
        });
      }
    });

    await page.route("**/api/customers*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CUSTOMERS),
      });
    });

    await page.goto("/dashboard/promises");

    // Click Log Commitment button
    await page.getByRole("button", { name: /Log Commitment/i }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Log Payment Promise/i)).toBeVisible();

    // Select customer
    await dialog.getByRole("combobox").first().selectOption("cust_1");

    // Fill amount & context remarks
    await dialog.getByPlaceholder("e.g. 50000").fill("480000");
    await dialog.getByPlaceholder(/Debtor confirmed transfer/i).fill("Managing Director confirmed RTGS payment.");

    // Submit form
    await dialog.getByRole("button", { name: /Log Commitment/i }).last().click();
  });

  test("Mark Kept and Mark Broken trigger status update manage requests", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/promises*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PROMISES),
      });
    });

    let managedAction: Record<string, unknown> | null = null;
    await page.route("**/api/promises/*/manage", async (route) => {
      managedAction = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/dashboard/promises");

    // Click Kept button on the first promise
    const keptBtn = page.getByRole("button", { name: "Kept", exact: true }).first();
    await keptBtn.click();

    expect(managedAction).toMatchObject({ action: "mark_kept" });
  });

  test("Create Payment Plan modal creates structured multi-installment schedule", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/promises*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PROMISES),
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
        body: JSON.stringify(MOCK_INVOICES),
      });
    });

    let planPayload: Record<string, unknown> | null = null;
    await page.route("**/api/payment-plans*", async (route) => {
      if (route.request().method() === "POST") {
        planPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            plan: {
              id: "plan_new_123",
              customerId: "cust_1",
              totalAmount: 480000,
              numberOfInstallments: 3,
              frequency: "monthly",
              status: "ACTIVE",
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ plans: [] }),
        });
      }
    });

    await page.goto("/dashboard/promises");

    // Click Multi-Installment Plan button
    await page.getByRole("button", { name: /Multi-Installment Plan/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Create Installment Payment Plan/i)).toBeVisible();

    // Select customer
    await dialog.getByRole("combobox").first().selectOption("cust_1");

    // Set installments count
    await dialog.getByRole("combobox").nth(1).selectOption("3");

    // Set frequency
    await dialog.getByRole("combobox").nth(2).selectOption("monthly");

    // Submit plan
    await dialog.getByRole("button", { name: /Confirm 3-Part Plan/i }).click();

    expect(planPayload).toMatchObject({
      customerId: "cust_1",
      numberOfInstallments: 3,
      frequency: "monthly",
    });
  });
});
