import { test, expect } from "./fixtures";

test.describe("Receivables CSV Ingestion & Mapping Wizard", () => {
  test("full 4-step CSV import workflow from file drop to ingestion results", async ({
    authenticatedPage: page,
  }) => {
    let importPayload: Record<string, unknown> | null = null;
    await page.route("**/api/import", async (route) => {
      if (route.request().method() === "POST") {
        importPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            totalRows: 2,
            validRows: 2,
            skippedRows: 0,
            customersCreated: 2,
            invoicesCreated: 2,
            totalAmount: 700000,
            issues: [],
          }),
        });
      }
    });

    await page.goto("/dashboard/import");

    await expect(page.getByRole("heading", { name: "Import Receivables" })).toBeVisible();
    await expect(page.getByText("Batch Ingestion")).toBeVisible();
    await expect(page.getByText("Download Sample CSV")).toBeVisible();

    // Prepare a mock CSV file buffer
    const mockCsvContent = [
      "Customer Name,Invoice Number,Invoice Date,Due Date,Amount,Outstanding,Email,Phone,GSTIN",
      "Zenith Auto Components,INV-2026-901,2026-08-01,2026-08-30,450000,450000,accounts@zenithauto.in,+919988776655,27AABCU9603R1ZZ",
      "Apex Forgings Ltd,INV-2026-902,2026-08-05,2026-09-05,250000,250000,billing@apexforgings.com,+919876543210,29ABCDE1234F1Z5",
    ].join("\n");

    // Upload CSV via hidden input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "receivables_aug2026.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(mockCsvContent),
    });

    // Step 2: Column Mapping Screen
    await expect(page.getByText("Map File Columns")).toBeVisible();
    await expect(page.getByText(/Data Sample Preview/i)).toBeVisible();
    await expect(page.getByText("Zenith Auto Components")).toBeVisible();

    // Click Review & Validate
    await page.getByRole("button", { name: /Review & Validate/i }).click();

    // Step 3: Review & Execution Plan
    await expect(page.getByText("Execution & Binding Summary")).toBeVisible();
    await expect(page.getByText(/2 records/i)).toBeVisible();

    // Click Confirm & Import
    await page.getByRole("button", { name: /Confirm & Import 2 Invoices/i }).click();

    // Step 4: Results Screen
    await expect(page.getByText("Receivables Ingested Successfully!")).toBeVisible();
    await expect(page.getByText("Invoices Created")).toBeVisible();
    await expect(page.getByText("Customers Added")).toBeVisible();
    await expect(page.getByText("Total Outstanding")).toBeVisible();

    expect(importPayload).not.toBeNull();
  });
});
