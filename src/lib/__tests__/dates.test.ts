import { describe, expect, it } from "vitest";
import { daysOverdue, daysUntilDue } from "@/lib/dates";

describe("daysOverdue", () => {
  it("returns 0 when due date is in the future", () => {
    const ref = new Date("2026-01-10T12:00:00Z");
    expect(daysOverdue(new Date("2026-01-15T12:00:00Z"), ref)).toBe(0);
  });

  it("returns 0 on the due date itself", () => {
    const ref = new Date("2026-01-10T12:00:00Z");
    expect(daysOverdue(new Date("2026-01-10T10:00:00Z"), ref)).toBe(0);
  });

  it("counts whole days overdue (floors)", () => {
    const ref = new Date("2026-01-10T12:00:00Z");
    expect(daysOverdue(new Date("2026-01-04T12:00:00Z"), ref)).toBe(6);
    expect(daysOverdue(new Date("2026-01-04T12:00:01Z"), ref)).toBe(5);
  });

  it("never returns a negative value", () => {
    const ref = new Date("2026-01-10T12:00:00Z");
    expect(daysOverdue(new Date("2026-03-01T00:00:00Z"), ref)).toBe(0);
  });
});

describe("daysUntilDue", () => {
  it("returns 0 when due date already passed", () => {
    const ref = new Date("2026-01-10T12:00:00Z");
    expect(daysUntilDue(new Date("2026-01-05T12:00:00Z"), ref)).toBe(0);
  });

  it("ceils partial days", () => {
    const ref = new Date("2026-01-10T12:00:00Z");
    expect(daysUntilDue(new Date("2026-01-11T12:00:00Z"), ref)).toBe(1);
    expect(daysUntilDue(new Date("2026-01-11T13:00:00Z"), ref)).toBe(2);
    expect(daysUntilDue(new Date("2026-01-11T11:00:00Z"), ref)).toBe(1);
  });
});