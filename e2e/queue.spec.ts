import { test, expect, MOCK_QUEUE } from "./fixtures";

test.describe("Smart Collections Queue & Quick Dunning Actions", () => {
  test("renders prioritized dunning queue items and launches reminder modal", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/queue", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_QUEUE),
      });
    });

    await page.route("**/api/templates/render*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          renderedSubject: "Urgent Payment Reminder: Invoice #INV-2026-089 Overdue",
          renderedBody: "Dear Rajesh Sharma, your invoice INV-2026-089 for ₹4,80,000 is 21 days overdue. Please pay immediately using the link: https://pay.duespilot.com/plink_123",
          channel: "WHATSAPP",
        }),
      });
    });

    await page.goto("/dashboard/queue");

    await expect(page.getByRole("heading", { name: "Collection Queue" })).toBeVisible();
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
    await expect(page.getByText("ABC Engineering Works")).toBeVisible();

    // Click on Send Reminder button for the first item
    const sendReminderBtn = page.getByRole("button", { name: /Send Reminder/i }).first();
    await sendReminderBtn.click();

    // Modal opens
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(modal.getByText("Send Payment Reminder")).toBeVisible();

    // Channels are selectable
    await expect(modal.getByRole("button", { name: "WhatsApp" })).toBeVisible();
    await expect(modal.getByRole("button", { name: "Email" })).toBeVisible();

    // Close modal
    await modal.getByRole("button", { name: /Cancel/i }).click();
    await expect(modal).not.toBeVisible();
  });

  test("filtering by priority tab updates visible queue items", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/queue", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_QUEUE),
      });
    });

    await page.goto("/dashboard/queue");

    // Click High priority tab
    await page.getByRole("button", { name: /High/i }).click();
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
    await expect(page.getByText("ABC Engineering Works")).not.toBeVisible();

    // Click Medium priority tab
    await page.getByRole("button", { name: /Medium/i }).click();
    await expect(page.getByText("ABC Engineering Works")).toBeVisible();
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).not.toBeVisible();

    // Click All Items tab
    await page.getByRole("button", { name: /All Items/i }).click();
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
    await expect(page.getByText("ABC Engineering Works")).toBeVisible();
  });

  test("search filter narrows list by debtor name or recommendation", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/queue", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_QUEUE),
      });
    });

    await page.goto("/dashboard/queue");

    const searchInput = page.getByPlaceholder(/Search debtor name/i);
    await searchInput.fill("Raj");

    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
    await expect(page.getByText("ABC Engineering Works")).not.toBeVisible();

    // Clear search
    await searchInput.fill("");
    await expect(page.getByText("ABC Engineering Works")).toBeVisible();
  });

  test("Take Action modal enables call, WhatsApp, email, and note logging", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/queue", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_QUEUE),
      });
    });

    let loggedEvent: Record<string, unknown> | null = null;
    await page.route("**/api/collection-events", async (route) => {
      loggedEvent = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, id: "event_123" }),
      });
    });

    await page.goto("/dashboard/queue");

    // Click Take Action on Raj Steel
    const takeActionBtn = page.getByRole("button", { name: /Take Action/i }).first();
    await takeActionBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();

    // Test Call logging
    await dialog.getByRole("button", { name: /Log Phone Call/i }).click();
    expect(loggedEvent).toMatchObject({
      customerId: "cust_1",
      type: "CALL",
    });

    // Reset loggedEvent before testing the second action
    loggedEvent = null;

    // Reopen and switch to Note tab
    await takeActionBtn.click();
    await dialog.getByRole("button", { name: /Internal Activity Note/i }).click();
    const textarea = dialog.getByPlaceholder(/Record notes/i);
    await textarea.fill("Customer requested copy of original delivery challan before payment.");
    await dialog.getByRole("button", { name: /Save Customer Note/i }).click();
    expect(loggedEvent).toMatchObject({
      customerId: "cust_1",
      type: "NOTE",
      description: "Customer requested copy of original delivery challan before payment.",
    });
  });

  test("bulk selection allows multi-account reminder dispatch", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/queue", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_QUEUE),
      });
    });

    let messageDispatched = 0;
    await page.route("**/api/messages", async (route) => {
      messageDispatched++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, id: `msg_${messageDispatched}` }),
      });
    });

    // Accept window.confirm
    page.on("dialog", (dialog) => dialog.accept());

    await page.goto("/dashboard/queue");

    // Select all accounts
    const selectAllCheckbox = page.getByRole("checkbox").first();
    await selectAllCheckbox.check();

    // Verify bulk toolbar appears
    await expect(page.getByText(/2 debtor accounts selected/i)).toBeVisible();

    // Click Bulk Send Reminders
    await page.getByRole("button", { name: /Bulk Send Reminders/i }).click();

    // Success banner appears
    await expect(page.getByText(/Dispatched 2 reminder\(s\) successfully/i)).toBeVisible();
    expect(messageDispatched).toBe(2);
  });
});
