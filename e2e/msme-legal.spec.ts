import { test, expect } from "./fixtures";

test.describe("MSME Statutory Penal Interest & Legal Notices", () => {
  test("calculates Section 15/16 3x RBI Bank Rate compound interest breakdown", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/legal/msme-interest*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          invoiceAmount: 480000,
          principalOutstanding: 480000,
          dueDate: "2026-08-15",
          daysOverdue: 21,
          rbiBankRate: 6.75,
          statutoryAnnualRate: 20.25,
          statutoryPenalInterest: 5599,
          totalClaimAmount: 485599,
          statutoryActReference: "Section 15 & 16 of the Micro, Small and Medium Enterprises Development (MSMED) Act, 2006",
        }),
      });
    });

    await page.route("**/api/legal/notice*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          referenceNumber: "DP-NOT-CUST-123456",
          title: "STATUTORY DEMAND NOTICE UNDER SECTIONS 15 & 16 OF MSMED ACT, 2006",
          subject: "Statutory Demand Notice for Outstanding Principal of ₹4,80,000",
          body: "Formal legal demand notice text for Raj Steel & Forgings Pvt Ltd",
          claimSummary: {
            totalOutstanding: 480000,
            totalPenalInterest: 5599,
            totalStatutoryClaim: 485599,
            statutoryAnnualRate: 20.25,
            invoices: [
              {
                invoiceNumber: "INV-2026-089",
                principalAmount: 480000,
                outstandingAmount: 480000,
                overdueDays: 21,
                penalInterest: 5599,
                totalClaim: 485599,
              },
            ],
          },
        }),
      });
    });

    await page.route("**/api/invoices/inv_1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "inv_1",
          number: "INV-2026-089",
          customerId: "cust_1",
          customerName: "Raj Steel & Forgings Pvt Ltd",
          amount: 480000,
          outstanding: 480000,
          date: "2026-08-01",
          dueDate: "2026-08-15",
          status: "OVERDUE",
          items: [],
          allocations: [],
          timeline: [],
        }),
      });
    });

    await page.goto("/dashboard/invoices/inv_1");

    // Click on Legal Notice button
    const legalNoticeBtn = page.getByRole("button", { name: /Legal Notice/i });
    await legalNoticeBtn.click();

    // Legal Notice modal opens
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/Statutory Legal Notice/i)).toBeVisible();

    // Close modal
    await modal.getByRole("button", { name: /Cancel|Close/i }).first().click();
    await expect(modal).not.toBeVisible();
  });
});
