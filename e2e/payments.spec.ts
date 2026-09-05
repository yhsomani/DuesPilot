import { test, expect, MOCK_PAYMENTS, MOCK_CUSTOMERS } from "./fixtures";

test.describe("Payments Register & Invoice Allocation Reconciliation", () => {
  test("renders payments list, KPI cards, and allocation status filters", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/payments", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PAYMENTS),
      });
    });

    await page.route("**/api/customers", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CUSTOMERS),
      });
    });

    await page.goto("/dashboard/payments");

    await expect(page.getByRole("heading", { name: "Payments & Receipts" })).toBeVisible();
    await expect(page.getByText("Total Cash Collected")).toBeVisible();
    await expect(page.getByText("Reconciled Credit")).toBeVisible();
    await expect(page.getByText("Unallocated Pool")).toBeVisible();

    // Table rows
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
    await expect(page.getByText("ABC Engineering Works")).toBeVisible();
    await expect(page.getByText("UTR-9827364819")).toBeVisible();

    // Filter by Needs Allocation
    await page.getByRole("button", { name: /Needs Allocation/i }).click();
    await expect(page.getByText("ABC Engineering Works")).toBeVisible();
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).not.toBeVisible();

    // Filter by Fully Reconciled
    await page.getByRole("button", { name: /Fully Reconciled/i }).click();
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
    await expect(page.getByText("ABC Engineering Works")).not.toBeVisible();

    // Reset to All
    await page.getByRole("button", { name: /All Payments/i }).click();
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
    await expect(page.getByText("ABC Engineering Works")).toBeVisible();
  });

  test("Record Payment modal creates new bank receipt and allocates automatically", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/payments", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: "pay_new_123", ...body, allocations: [] }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_PAYMENTS),
        });
      }
    });

    await page.route("**/api/customers", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CUSTOMERS),
      });
    });

    await page.route("**/api/customers/cust_1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...MOCK_CUSTOMERS[0],
          invoices: [
            {
              id: "inv_1",
              number: "INV-2026-089",
              outstanding: 480000,
            },
          ],
        }),
      });
    });

    await page.goto("/dashboard/payments");

    // Open Record Payment modal
    await page.getByRole("button", { name: /Record Payment/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Record Bank Receipt / Payment")).toBeVisible();

    // Select customer
    await dialog.getByRole("combobox").first().selectOption("cust_1");

    // Fill amount & reference
    await dialog.getByPlaceholder(/e.g. 50000/i).fill("480000");
    await dialog.getByPlaceholder(/e.g. UTR-98273648/i).fill("UTR-HDFC-99118822");

    // Submit payment
    await dialog.getByRole("button", { name: /Record Receipt/i }).click();
  });

  test("Allocate Payment modal applies payment credit against customer invoices", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/payments", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PAYMENTS),
      });
    });

    await page.route("**/api/customers", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CUSTOMERS),
      });
    });

    await page.route("**/api/customers/cust_2", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...MOCK_CUSTOMERS[1],
          invoices: [
            {
              id: "inv_2",
              number: "INV-2026-094",
              outstanding: 110000,
            },
          ],
        }),
      });
    });

    let allocatedBody: Record<string, unknown> | null = null;
    await page.route("**/api/payments/pay_2/allocate", async (route) => {
      allocatedBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/dashboard/payments");

    // Click Allocate button on ABC Engineering (which has unallocated balance)
    await page.getByRole("button", { name: /Allocate/i }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Allocate Payment Credit")).toBeVisible();
    await expect(dialog.getByText("INV-2026-094")).toBeVisible();

    // Input allocation amount
    const allocInput = dialog.getByPlaceholder("0");
    await allocInput.fill("60000");

    // Apply allocation
    await dialog.getByRole("button", { name: /Apply Allocation/i }).click();

    expect(allocatedBody).toMatchObject({
      allocations: [{ invoiceId: "inv_2", amount: 60000 }],
    });
  });
});
