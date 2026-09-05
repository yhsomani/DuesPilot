import { test, expect } from "./fixtures";

test.describe("Omnichannel Communications Hub & WhatsApp Messaging", () => {
  test("renders communications log with channel filters, KPI cards, and inspects message payload", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/messages*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              messages: [
                {
                  id: "msg_1",
                  customerId: "cust_1",
                  customerName: "Raj Steel & Forgings Pvt Ltd",
                  invoiceId: "inv_1",
                  invoiceNumber: "INV-2026-089",
                  channel: "WHATSAPP",
                  recipient: "+919876543210",
                  subject: "Urgent Payment Reminder",
                  body: "Your invoice #INV-2026-089 is overdue. Please settle via https://pay.duespilot.com/plink_123",
                  status: "DELIVERED",
                  sentAt: "2026-09-04T12:00:00.000Z",
                  createdAt: "2026-09-04T12:00:00.000Z",
                  externalId: "wamid.HBgLMjkxOTg3NjU0MzIxMA==",
                  paymentLink: "https://pay.duespilot.com/plink_123",
                },
                {
                  id: "msg_2",
                  customerId: "cust_2",
                  customerName: "ABC Engineering Works",
                  invoiceId: "inv_2",
                  invoiceNumber: "INV-2026-094",
                  channel: "EMAIL",
                  recipient: "finance@abceng.in",
                  subject: "Statement of Account & Due Invoices",
                  body: "Dear Customer, please find attached your monthly statement of account.",
                  status: "READ",
                  sentAt: "2026-09-03T10:15:00.000Z",
                  createdAt: "2026-09-03T10:15:00.000Z",
                  externalId: "email_msg_994812",
                },
                {
                  id: "msg_3",
                  customerId: "cust_1",
                  customerName: "Raj Steel & Forgings Pvt Ltd",
                  channel: "SMS",
                  recipient: "+919876543210",
                  subject: null,
                  body: "Reminder: ₹4,80,000 due for INV-2026-089. Pay now.",
                  status: "FAILED",
                  sentAt: "2026-09-02T09:00:00.000Z",
                  createdAt: "2026-09-02T09:00:00.000Z",
                },
              ],
              total: 3,
            },
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/dashboard/communications");

    await expect(
      page.getByRole("heading", { name: "Communications & Dispatch Outbox" })
    ).toBeVisible();

    // Verify KPI cards
    await expect(page.getByText("Total Dispatched")).toBeVisible();
    await expect(page.getByText("Email Reminders")).toBeVisible();
    await expect(page.getByText("WhatsApp Sent")).toBeVisible();
    await expect(page.getByText("SMS Dispatched")).toBeVisible();

    // Verify messages table
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd").first()).toBeVisible();
    await expect(page.getByText("ABC Engineering Works")).toBeVisible();

    // Inspect message detail modal
    const inspectButtons = page.getByRole("button", { name: "Inspect" });
    await inspectButtons.first().click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Message Dispatch Audit")).toBeVisible();
    await expect(page.getByText("wamid.HBgLMjkxOTg3NjU0MzIxMA==")).toBeVisible();

    // Dismiss modal
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("Compose Reminder modal enables multi-channel message dispatch", async ({
    authenticatedPage: page,
  }) => {
    let postPayload: any = null;

    await page.route("**/api/messages*", async (route) => {
      if (route.request().method() === "POST") {
        postPayload = JSON.parse(route.request().postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            message: {
              id: "msg_new_123",
              ...postPayload,
              status: "SENT",
              createdAt: new Date().toISOString(),
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              messages: [],
              total: 0,
            },
          }),
        });
      }
    });

    await page.goto("/dashboard/communications");

    // Open Compose modal
    await page.getByRole("button", { name: "Compose Reminder" }).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(modal.getByText("Compose & Dispatch Collection Reminder")).toBeVisible();

    // Select customer inside modal
    await modal.locator("select").first().selectOption("cust_1");

    // Switch to WhatsApp channel
    await modal.getByRole("button", { name: "💬 WhatsApp" }).click();

    // Check payment link toggle is checked
    const paymentLinkCheckbox = modal.locator("#includePaymentLinkCompose");
    await expect(paymentLinkCheckbox).toBeChecked();

    // Dispatch message
    await modal.getByRole("button", { name: "Send Reminder" }).click();

    // Confirmation message shown
    await expect(page.getByText("Reminder Dispatched!")).toBeVisible();

    // Validate payload
    expect(postPayload).toBeTruthy();
    expect(postPayload.channel).toBe("WHATSAPP");
    expect(postPayload.recipient).toBe("+919876543210");
    expect(postPayload.includePaymentLink).toBe(true);
  });
});
