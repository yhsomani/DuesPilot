import { describe, expect, it } from "vitest";
import { sendEmail } from "@/lib/email";

describe("sendEmail", () => {
  it("uses mock provider by default when RESEND_API_KEY is not set", async () => {
    const prevKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    const result = await sendEmail({
      to: "customer@example.com",
      subject: "Payment Reminder",
      text: "Please settle your invoice.",
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe("mock");
    expect(result.messageId).toContain("mock_msg_");

    if (prevKey) process.env.RESEND_API_KEY = prevKey;
  });

  it("handles array of recipients in mock mode", async () => {
    const result = await sendEmail({
      to: ["finance@example.com", "billing@example.com"],
      subject: "Overdue Notice",
      text: "Your account is overdue.",
      replyTo: "collections@duespilot.com",
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe("mock");
    expect(result.messageId).toBeDefined();
  });
});
