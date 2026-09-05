import { test, expect, MOCK_CUSTOMERS } from "./fixtures";

test.describe("Debtor Directory & Customer 360", () => {
  test("renders customer directory with sorting and search filtering", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/customers*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_CUSTOMERS),
      });
    });

    await page.route("**/api/customers/duplicates", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/dashboard/customers");

    await expect(page.getByRole("heading", { name: "Debtor Accounts" })).toBeVisible();
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
    await expect(page.getByText("ABC Engineering Works")).toBeVisible();

    // Search filter
    const searchInput = page.getByPlaceholder(/Search by name, GSTIN/i);
    await searchInput.fill("Raj");
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();

    // Sort select
    const sortSelect = page.getByRole("combobox");
    await sortSelect.selectOption("name");
  });

  test("Add Customer modal enables creating new debtor profile", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/customers*", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: "cust_new_123", ...body }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_CUSTOMERS),
        });
      }
    });

    await page.goto("/dashboard/customers");

    // Click Add Customer button
    await page.getByRole("button", { name: /Add Customer/i }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Add New Debtor Account")).toBeVisible();

    // Fill form
    await dialog.getByPlaceholder(/e.g. Acme Industrial Technologies/i).fill("Zenith Auto Components");
    await dialog.getByPlaceholder(/billing@company.com/i).fill("accounts@zenithauto.in");
    await dialog.getByPlaceholder(/\+91 98765 43210/i).fill("+919988776655");
    await dialog.getByPlaceholder(/27AABCU9603R1ZM/i).fill("27AABCU9603R1ZZ");

    // Submit form
    await dialog.getByRole("button", { name: /Save Debtor Account/i }).click();
  });

  test("renders Customer 360 detail page with invoices, contacts, and timeline", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/customers/cust_1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "cust_1",
          name: "Raj Steel & Forgings Pvt Ltd",
          initials: "RS",
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
          status: "active",
          notes: "Key automotive supplier with historical delays during quarter-end.",
          invoices: [
            {
              id: "inv_1",
              number: "INV-2026-089",
              amount: 480000,
              outstanding: 480000,
              dueDate: "2026-08-15",
              status: "OVERDUE",
              daysOverdue: 21,
            },
          ],
          contacts: [
            {
              id: "cnt_1",
              name: "Rajesh Sharma",
              designation: "Managing Director",
              email: "rajesh@rajsteel.com",
              phone: "+919876543210",
              isPrimary: true,
            },
            {
              id: "cnt_2",
              name: "Pooja Deshmukh",
              designation: "Senior Accounts Manager",
              email: "accounts@rajsteel.com",
              phone: "+919876543211",
              isPrimary: false,
            },
          ],
          timeline: [
            {
              id: "tl_1",
              type: "call",
              text: "Outbound call to MD Rajesh Sharma regarding overdue balance",
              date: "2026-09-01T10:00:00.000Z",
              status: "completed",
            },
          ],
        }),
      });
    });

    await page.goto("/dashboard/customers/cust_1");

    // Header & 360 KPIs
    await expect(page.getByRole("heading", { name: "Raj Steel & Forgings Pvt Ltd" })).toBeVisible();
    await expect(page.getByText("Risk Score: 85/100")).toBeVisible();
    await expect(page.getByText("GSTIN: 27AABCU9603R1ZM")).toBeVisible();

    // Invoices list & Timeline
    await expect(page.getByText("INV-2026-089")).toBeVisible();
    await expect(page.getByText("Key Decision Makers (2)")).toBeVisible();
    await expect(page.getByText("Rajesh Sharma")).toBeVisible();
    await expect(page.getByText("Managing Director")).toBeVisible();
    await expect(page.getByText("Collection Activity & Audit Trail")).toBeVisible();

    // Test Payment Plan modal trigger
    await page.getByRole("button", { name: /Payment Plan/i }).click();
    const planModal = page.getByRole("dialog");
    await expect(planModal).toBeVisible();
    await expect(planModal.getByText(/Create Multi-Installment Payment Plan/i)).toBeVisible();
    await planModal.getByRole("button", { name: /Cancel|Close/i }).click();
    await expect(planModal).not.toBeVisible();

    // Test Legal Notice modal trigger
    await page.getByRole("button", { name: /Legal Notice/i }).click();
    const legalModal = page.getByRole("dialog");
    await expect(legalModal).toBeVisible();
    await legalModal.getByRole("button", { name: /Cancel|Close/i }).click();
    await expect(legalModal).not.toBeVisible();
  });
});
