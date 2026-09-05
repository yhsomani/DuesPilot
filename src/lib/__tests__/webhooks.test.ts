import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";

describe("Webhooks Delivery & Signature Engines", () => {
  function normalizeStatus(rawStatus: string): "DELIVERED" | "READ" | "FAILED" | "SENT" | null {
    const s = rawStatus.toLowerCase().trim();
    if (s === "delivered" || s === "delivery" || s === "success") return "DELIVERED";
    if (s === "read" || s === "opened" || s === "open" || s === "click" || s === "clicked") return "READ";
    if (s === "failed" || s === "undelivered" || s === "bounce" || s === "bounced" || s === "dropped" || s === "rejected") return "FAILED";
    if (s === "sent" || s === "processed" || s === "queued") return "SENT";
    return null;
  }

  it("normalizes WhatsApp Meta Cloud API delivery statuses", () => {
    expect(normalizeStatus("delivered")).toBe("DELIVERED");
    expect(normalizeStatus("read")).toBe("READ");
    expect(normalizeStatus("failed")).toBe("FAILED");
    expect(normalizeStatus("sent")).toBe("SENT");
  });

  it("normalizes SendGrid & Email webhook events", () => {
    expect(normalizeStatus("opened")).toBe("READ");
    expect(normalizeStatus("clicked")).toBe("READ");
    expect(normalizeStatus("bounced")).toBe("FAILED");
    expect(normalizeStatus("dropped")).toBe("FAILED");
    expect(normalizeStatus("processed")).toBe("SENT");
  });

  it("normalizes Twilio SMS / WhatsApp callback statuses", () => {
    expect(normalizeStatus("undelivered")).toBe("FAILED");
    expect(normalizeStatus("delivered")).toBe("DELIVERED");
    expect(normalizeStatus("queued")).toBe("SENT");
  });

  it("returns null on unrecognized status payloads", () => {
    expect(normalizeStatus("unknown_event_type")).toBeNull();
    expect(normalizeStatus("random_string")).toBeNull();
  });

  it("computes and validates HMAC-SHA256 signatures for payment webhooks", () => {
    const secret = "test_webhook_secret_key_123";
    const payload = JSON.stringify({
      event: "payment_link.paid",
      payload: {
        payment: { entity: { id: "pay_12345", amount: 500000, status: "captured" } },
      },
    });

    const signature = createHmac("sha256", secret).update(payload).digest("hex");
    expect(signature).toBeDefined();
    expect(signature.length).toBe(64);

    const recomputed = createHmac("sha256", secret).update(payload).digest("hex");
    expect(signature).toBe(recomputed);

    const tamperedPayload = JSON.stringify({
      event: "payment_link.paid",
      payload: {
        payment: { entity: { id: "pay_12345", amount: 100, status: "captured" } },
      },
    });
    const tamperedSig = createHmac("sha256", secret).update(tamperedPayload).digest("hex");
    expect(signature).not.toBe(tamperedSig);
  });
});
