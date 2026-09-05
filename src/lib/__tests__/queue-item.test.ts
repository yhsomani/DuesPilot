import { describe, expect, it } from "vitest";
import { computeQueueItem, statusView } from "@/lib/queue-item";

const base = {
  promiseBroken: false,
  mostOverdueDueDate: new Date(Date.now() - 5 * 864e5), // 5 days
  totalOverdue: 10000,
  riskScore: 0,
  lastEventType: null,
  lastEventDescription: null,
  customerName: "Acme",
};

describe("statusView", () => {
  it("title-cases snake_case", () => {
    expect(statusView("PHONE_CALL_MADE")).toBe("Phone Call Made");
    expect(statusView("EMAIL_SENT")).toBe("Email Sent");
  });
});

describe("computeQueueItem", () => {
  it("defaults to low priority for a mild overdue", () => {
    const r = computeQueueItem(base);
    expect(r.priority).toBe("low");
    expect(r.nextAction).toBe("Send due date notice");
    expect(r.daysOverdue).toBe(5);
    expect(r.why).toBe("Overdue balance");
  });

  it("escalates to high with a broken promise", () => {
    const r = computeQueueItem({
      ...base,
      promiseBroken: true,
      mostOverdueDueDate: new Date(Date.now() - 2 * 864e5),
    });
    expect(r.priority).toBe("high");
    expect(r.status).toBe("Promise broken");
    expect(r.nextAction).toBe("Call now — promise overdue");
    expect(r.why).toBe("Promise was broken");
  });

  it("escalates to medium past 7 days and high past 30", () => {
    expect(
      computeQueueItem({ ...base, mostOverdueDueDate: new Date(Date.now() - 10 * 864e5) }).priority
    ).toBe("medium");
    expect(
      computeQueueItem({ ...base, mostOverdueDueDate: new Date(Date.now() - 40 * 864e5) }).priority
    ).toBe("high");
  });

  it("escalates to high/medium by outstanding amount and risk score", () => {
    expect(
      computeQueueItem({ ...base, totalOverdue: 500000 }).priority
    ).toBe("high");
    expect(
      computeQueueItem({ ...base, totalOverdue: 20000, riskScore: 85 }).priority
    ).toBe("medium");
  });

  it("reflects the last event type in status", () => {
    const r = computeQueueItem({ ...base, lastEventType: "WHATSAPP" });
    expect(r.status).toBe("Whatsapp");
  });

  it("builds a why string honouring the 7-day cutoff", () => {
    const r = computeQueueItem({
      ...base,
      mostOverdueDueDate: new Date(Date.now() - 10 * 864e5),
      totalOverdue: 500000,
    });
    expect(r.why).toContain("Overdue 10 days");
    expect(r.why).toContain("Large outstanding amount");
  });
});