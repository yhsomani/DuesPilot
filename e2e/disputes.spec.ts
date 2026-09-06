import { test, expect, MOCK_DISPUTES, MOCK_INVOICES } from "./fixtures";

test.describe("Invoice Disputes Ledger & Resolution Management", () => {
  test("renders disputes list, KPI cards, and status filter switching", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/disputes", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DISPUTES),
      });
    });

    await page.goto("/dashboard/disputes");

    await expect(page.getByRole("heading", { name: "Invoice Disputes" })).toBeVisible();
    await expect(page.getByText("Active Disputed Cases")).toBeVisible();
    await expect(page.getByText("Successfully Resolved")).toBeVisible();

    // Table rows
    await expect(page.getByText("INV-2026-089")).toBeVisible();
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
    await expect(page.getByText("Quality / Defect Issue")).toBeVisible();

    // Filter by Open
    await page.getByRole("button", { name: /Open Cases/i }).click();
    await expect(page.getByText("INV-2026-089")).toBeVisible();

    // Filter by Resolved (should show empty state since mock dispute is open)
    await page.getByRole("button", { name: /Resolved/i }).click();
    await expect(page.getByText("No disputes found")).toBeVisible();

    // Reset to All
    await page.getByRole("button", { name: /All Disputes/i }).click();
    await expect(page.getByText("INV-2026-089")).toBeVisible();
  });

  test("Log Dispute modal enables creating a new dispute claim against an invoice", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/disputes", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: "disp_new_123", ...body, status: "open", createdAt: new Date().toISOString() }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_DISPUTES),
        });
      }
    });

    await page.route("**/api/invoices", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_INVOICES),
      });
    });

    await page.goto("/dashboard/disputes");

    // Click Log Dispute button
    await page.getByRole("button", { name: /Log Dispute/i }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Log Invoice Dispute")).toBeVisible();

    // Select invoice
    await dialog.getByRole("combobox").first().selectOption("inv_1");

    // Select Category
    await dialog.getByRole("combobox").nth(1).selectOption("quality");

    // Fill Reason & Notes
    await dialog.getByPlaceholder(/What specifically is the customer disputing/i).fill("Damaged shipment reported by factory receiver.");
    await dialog.getByPlaceholder(/Sales representative checking/i).fill("Awaiting replacement delivery before settlement.");

    // Submit
    await dialog.getByRole("button", { name: /Log Dispute/i }).last().click();
  });

  test("Resolve and Withdraw buttons trigger status update API calls", async ({
    authenticatedPage: page,
  }) => {
    let patchedStatus: string | null = null;
    await page.route("**/api/disputes**", async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      if (url.includes("/api/disputes/disp_1") && method === "PATCH") {
        const body = route.request().postDataJSON();
        patchedStatus = body?.status ?? null;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "disp_1", status: patchedStatus }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_DISPUTES),
      });
    });

    await page.goto("/dashboard/disputes");

    // Click Resolve button on open dispute (use exact name to avoid matching "Resolved (0)" tab)
    const resolveBtn = page.getByRole("button", { name: "Resolve", exact: true });
    await expect(resolveBtn).toBeVisible();
    await resolveBtn.click();

    await expect.poll(() => patchedStatus).toBe("resolved");
  });
});
