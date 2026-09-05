import { test, expect, MOCK_WORKFLOWS } from "./fixtures";

test.describe("Automated Dunning Cadences & Workflow Execution Engine", () => {
  test("renders active cadences, rule milestones, and configuration badges", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/workflows*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ workflows: MOCK_WORKFLOWS }),
      });
    });

    await page.goto("/dashboard/workflows");

    await expect(page.getByRole("heading", { name: "Automated Dunning Cadences" })).toBeVisible();
    await expect(page.getByText("Active Engine")).toBeVisible();
    await expect(page.getByText("Dispute & Promise Guard")).toBeVisible();
    await expect(page.getByText("100% Guarded")).toBeVisible();

    // Workflow rule items
    await expect(page.getByText("Pre-Due Courtesy Reminder")).toBeVisible();
    await expect(page.getByText("1-Day Overdue Soft Reminder")).toBeVisible();
    await expect(page.getByText("7-Day Overdue Urgency Escalation")).toBeVisible();
    await expect(page.getByText("15-Day Overdue WhatsApp Direct")).toBeVisible();
    await expect(page.getByText("30-Day MSME Statutory Legal Notice")).toBeVisible();
  });

  test("Dry Run simulation executes dry run endpoint and renders matched invoices table", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/workflows*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ workflows: MOCK_WORKFLOWS }),
      });
    });

    await page.route("**/api/jobs/workflows-runner?dry_run=1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          dryRun: true,
          evaluatedCount: 14,
          matchedCount: 2,
          sentCount: 0,
          matches: [
            {
              invoiceId: "inv_1",
              invoiceNumber: "INV-2026-089",
              customerId: "cust_1",
              customerName: "Raj Steel & Forgings Pvt Ltd",
              outstandingAmount: 480000,
              dueDate: "2026-08-15",
              ruleId: "rule_4",
              ruleName: "15-Day Overdue WhatsApp Direct",
              channel: "WHATSAPP",
              daysRelative: 15,
              recipient: "+919876543210",
            },
          ],
        }),
      });
    });

    await page.goto("/dashboard/workflows");

    // Click Test Run (Dry Run)
    await page.getByRole("button", { name: /Test Run \(Dry Run\)/i }).click();

    // Verification banner appears
    await expect(page.getByText("Simulation Complete (Dry Run)")).toBeVisible();
    await expect(page.getByText(/Evaluated 14 candidate invoices/i)).toBeVisible();
    await expect(page.getByText("INV-2026-089")).toBeVisible();
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
    await expect(page.getByRole("cell", { name: "15-Day Overdue WhatsApp Direct" })).toBeVisible();
  });

  test("Execute Cadence Batch confirms and dispatches live multi-channel dunning messages", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/workflows*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ workflows: MOCK_WORKFLOWS }),
      });
    });

    let liveRunExecuted = false;
    await page.route("**/api/jobs/workflows-runner", async (route) => {
      if (route.request().method() === "POST") {
        liveRunExecuted = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            dryRun: false,
            evaluatedCount: 14,
            matchedCount: 2,
            sentCount: 2,
            failedCount: 0,
            results: [],
          }),
        });
      }
    });

    await page.goto("/dashboard/workflows");

    // Click Execute Cadence Batch
    await page.getByRole("button", { name: /Execute Cadence Batch/i }).click();

    // Confirmation modal appears
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(modal.getByText("Execute Live Cadence Batch")).toBeVisible();

    // Confirm execution
    await modal.getByRole("button", { name: /Confirm & Dispatch/i }).click();

    // Completion banner appears
    await expect(page.getByText("Cadence Execution Complete")).toBeVisible();
    await expect(page.getByText(/Dispatched 2 automated outreach messages/i)).toBeVisible();
    expect(liveRunExecuted).toBe(true);
  });

  test("Add Rule modal allows creating a new escalation rule", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/workflows*", async (route) => {
      if (route.request().method() === "POST") {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ workflow: { id: "wf_custom_1", ...body } }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ workflows: MOCK_WORKFLOWS }),
        });
      }
    });

    await page.goto("/dashboard/workflows");

    // Click Add Rule button
    await page.getByRole("button", { name: /Add Rule/i }).click();

    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(modal.getByText("Add Cadence Escalation Rule")).toBeVisible();

    // Fill form
    await modal.getByPlaceholder(/3-Day Overdue Courtesy Ping/i).fill("45-Day Legal Pre-Action Notice");
    await modal.getByRole("combobox").first().selectOption("OVERDUE");
    await modal.getByRole("combobox").nth(1).selectOption("WHATSAPP");

    // Submit rule
    await modal.getByRole("button", { name: /Save Rule/i }).click();
  });
});
