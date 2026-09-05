import { test, expect } from "./fixtures";

test.describe("Omnichannel Communications Hub & WhatsApp Messaging", () => {
  test("renders communications log with channel filters and template manager", async ({
    authenticatedPage: page,
  }) => {
    await page.route("**/api/messages*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
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
            status: "OPENED",
            sentAt: "2026-09-03T10:15:00.000Z",
          },
        ]),
      });
    });

    await page.goto("/dashboard/communications");

    await expect(page.getByRole("heading", { name: "Communications Hub" })).toBeVisible();
    await expect(page.getByText("Raj Steel & Forgings Pvt Ltd")).toBeVisible();
    await expect(page.getByText("ABC Engineering Works")).toBeVisible();
  });
});
