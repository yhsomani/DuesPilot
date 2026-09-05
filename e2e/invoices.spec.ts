import { test, expect, MOCK_INVOICES, MOCK_CUSTOMERS } from "./fixtures";

test.describe("Invoices Register & Detail 360", () => {
  test("renders invoice register with status filters and search", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/invoices*", async (route) => {
      const list = [
        {
          id: "inv_1",
          number: "INV-2026-089",
          customerId: "cust_1",
          customer: "Raj Steel & Forgings Pvt Ltd",
          amount: 480000,
          outstanding: 480000,
          date: "2026-08-01",
          dueDate: "2026-08-15",
          daysOverdue: 21,
          status: "OVERDUE",
        },
        {
          id: "inv_2",
          number: "INV-2026-094",
          customerId: "cust_2",
          customer: "ABC Engineering Works",
          amount: 220000,
          outstanding: 110000,
          date: "2026-08-10",
          dueDate: "2026-08-25",
          daysOverdue: 11,
          status: "PARTIALLY_PAID",
        },
      ];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          items: list,
          invoices: list,
          total: 2,
          page: 1,
          pageSize: 50,
          hasMore: false,
        }),
      });
    });

    await page.goto("/dashboard/invoices");

    await expect(page.getByRole("heading", { name: "Invoices Register" })).toBeVisible();
    await expect(page.getByText("INV-2026-089")).toBeVisible();
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
    await expect(page.getByText("INV-2026-094")).toBeVisible();
    await expect(page.getByText("ABC Engineering Works")).toBeVisible();

    // Filter by Overdue status tab
    await page.getByRole("button", { name: /Overdue/i }).click();
    await expect(page.getByText("INV-2026-089")).toBeVisible();

    // Search filter
    const searchInput = page.getByPlaceholder(/Search invoice # or debtor/i);
    await searchInput.fill("INV-2026-089");
    await expect(page.getByText("INV-2026-089")).toBeVisible();
  });

  test("Add Invoice modal allows recording a new invoice", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/invoices*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ invoices: [], total: 0, page: 1, pageSize: 50, hasMore: false }),
      });
    });

    await page.route("**/api/customers*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CUSTOMERS),
      });
    });

    let createdInvoice: Record<string, unknown> | null = null;
    await page.route("**/api/invoices", async (route) => {
      if (route.request().method() === "POST") {
        createdInvoice = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: "inv_new_999", invoiceNumber: "INV-2026-999" }),
        });
      }
    });

    await page.goto("/dashboard/invoices");

    // Click Add Invoice button
    await page.getByRole("button", { name: /Add Invoice/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Record New Invoice")).toBeVisible();

    // Fill form
    await dialog.getByLabel(/Customer \/ Debtor/i).selectOption("cust_1");
    await dialog.getByPlaceholder(/e.g. INV-2026-0891/i).fill("INV-2026-999");
    await dialog.getByPlaceholder("50000").fill("150000");

    // Submit form
    await dialog.getByRole("button", { name: /Record Invoice/i }).click();

    expect(createdInvoice).toMatchObject({
      customerId: "cust_1",
      invoiceNumber: "INV-2026-999",
      amount: 150000,
    });
  });

  test("renders invoice detail page with line items, allocations and timeline", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/invoices/inv_1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_INVOICES[0]),
      });
    });

    await page.route("**/api/legal/notice*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          referenceNumber: "DP/LEGAL/2026/09/001",
          title: "FORMAL STATUTORY DEMAND NOTICE UNDER SECTIONS 15 & 16 OF MSMED ACT, 2006",
          subject: "DEMAND FOR PAYMENT OF OVERDUE OPERATIONAL DEBT ALONG WITH COMPOUND INTEREST",
          body: "Pursuant to Section 15 & 16 of the MSMED Act 2006...",
          claimSummary: {
            totalOutstanding: 480000,
            totalPenalInterest: 24500,
            totalStatutoryClaim: 504500,
            statutoryAnnualRate: 20.25,
            invoices: [],
          },
        }),
      });
    });

    await page.goto("/dashboard/invoices/inv_1");

    await expect(page.getByRole("heading", { name: "Invoice #INV-2026-089" })).toBeVisible();
    await expect(page.getByText("Forged High-Tensile Steel Rods (Grade 8.8)")).toBeVisible();
    await expect(page.getByText("Precision CNC Chamfering Service")).toBeVisible();
    await expect(page.getByText("Invoice Audit & Collection Trail")).toBeVisible();
    await expect(page.getByText("WhatsApp Dunning Reminder Dispatched")).toBeVisible();

    // Open Legal Notice modal from invoice detail
    await page.getByRole("button", { name: /Legal Notice/i }).click();
    const legalModal = page.getByRole("dialog");
    await expect(legalModal).toBeVisible();
    await expect(legalModal.getByText(/Statutory Legal Notice/i)).toBeVisible();
    await legalModal.getByRole("button", { name: /Close|Cancel/i }).first().click();
    await expect(legalModal).not.toBeVisible();

    // Open Send Reminder modal from invoice detail
    await page.getByRole("button", { name: /Send Reminder/i }).click();
    const reminderModal = page.getByRole("dialog");
    await expect(reminderModal).toBeVisible();
    await reminderModal.getByRole("button", { name: /Cancel|Close/i }).first().click();
    await expect(reminderModal).not.toBeVisible();
  });
});
