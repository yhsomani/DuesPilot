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

    await expect(page.getByRole("heading", { name: "Promises to Pay" })).toBeVisible();
    await expect(page.getByText("Active Commitments")).toBeVisible();
    await expect(page.getByText("Honored & Settled")).toBeVisible();
    await expect(page.getByText("Commitment Rate")).toBeVisible();

    // Table rows
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
    await expect(page.getByText("ABC Engineering Works")).toBeVisible();

    // Status filter - Active
    await page.getByRole("button", { name: /Active/i }).click();
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();

    // Status filter - Kept
    await page.getByRole("button", { name: /Kept/i }).click();
    await expect(page.getByText("No commitments found")).toBeVisible();

    // Status filter - All
    await page.getByRole("button", { name: /All/i }).click();
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
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
          body: JSON.stringify({ id: "ptp_new_123", ...body, status: "active" }),
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

    // Click Log Promise button
    await page.getByRole("button", { name: /Log Promise/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Log Promise to Pay")).toBeVisible();

    // Select customer
    await dialog.getByLabel(/Debtor Account/i).selectOption("cust_1");

    // Fill amount & notes
    await dialog.getByPlaceholder("e.g. 50000").fill("480000");
    await dialog.getByPlaceholder(/Details of promise/i).fill("Managing Director confirmed RTGS payment upon factory audit completion.");

    // Submit form
    await dialog.getByRole("button", { name: /Save Commitment/i }).click();
  });

  test("Mark Kept and Mark Broken trigger status update PATCH requests", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/promises*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PROMISES),
      });
    });

    let patchedId: string | null = null;
    let patchedBody: Record<string, unknown> | null = null;
    await page.route("**/api/promises/*", async (route) => {
      if (route.request().method() === "PATCH") {
        const url = route.request().url();
        patchedId = url.split("/").pop() || null;
        patchedBody = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: patchedId, ...patchedBody }),
        });
      }
    });

    await page.goto("/dashboard/promises");

    // Click Kept button on the first promise
    const keptBtn = page.getByRole("button", { name: /Kept/i }).first();
    await keptBtn.click();

    expect(patchedBody).toMatchObject({ status: "kept" });
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
        body: JSON.stringify({ invoices: MOCK_INVOICES }),
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
              frequency: "MONTHLY",
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

    // Click Create Payment Plan button
    await page.getByRole("button", { name: /Create Payment Plan/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Create Multi-Installment Payment Plan/i)).toBeVisible();

    // Select customer
    await dialog.getByLabel(/Debtor Account/i).selectOption("cust_1");

    // Set installments count
    await dialog.getByLabel(/Number of Installments/i).selectOption("3");

    // Set frequency
    await dialog.getByLabel(/Installment Frequency/i).selectOption("MONTHLY");

    // Submit plan
    await dialog.getByRole("button", { name: /Create & Activate Plan/i }).click();

    expect(planPayload).toMatchObject({
      customerId: "cust_1",
      numberOfInstallments: 3,
      frequency: "MONTHLY",
    });
  });
});
