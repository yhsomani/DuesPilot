import { describe, expect, it } from "vitest";
import {
  cn,
  formatCompactINR,
  formatINR,
  getAgingBucket,
  getPriorityColor,
} from "@/lib/utils";

describe("cn", () => {
  it("merges tailwind classes, later wins", () => {
    expect(cn("px-2 px-4")).toBe("px-4");
    expect(cn("p-2", { "text-red-500": true }, false, null, undefined)).toBe(
      "p-2 text-red-500"
    );
  });
});

describe("formatINR", () => {
  it("formats 0", () => {
    expect(formatINR(0)).toBe("₹0");
  });

  it("uses Indian digit grouping", () => {
    expect(formatINR(1234567)).toBe("₹12,34,567");
  });

  it("formats small values", () => {
    expect(formatINR(999)).toBe("₹999");
    expect(formatINR(1500)).toBe("₹1,500");
  });
});

describe("formatCompactINR", () => {
  it("compacts thousands", () => {
    expect(formatCompactINR(2500)).toBe("₹2.5K");
  });
  it("compacts lakhs", () => {
    expect(formatCompactINR(250000)).toBe("₹2.5L");
  });
  it("compacts crores", () => {
    expect(formatCompactINR(25000000)).toBe("₹2.5Cr");
  });
  it("downshifts to rupees below 1000", () => {
    expect(formatCompactINR(520)).toBe("₹520");
  });
});

// Deterministic aging bucket checks: pass dates far in the past/future and
// assert the bucket, independent of the wall clock.
describe("getAgingBucket", () => {
  it("buckets by age", () => {
    expect(getAgingBucket(new Date(Date.now() + 1e9))).toBe("Current");
    expect(getAgingBucket(new Date(Date.now() - 5 * 864e5))).toBe("1-30 days");
    expect(getAgingBucket(new Date(Date.now() - 45 * 864e5))).toBe("31-60 days");
    expect(getAgingBucket(new Date(Date.now() - 75 * 864e5))).toBe("61-90 days");
    expect(getAgingBucket(new Date(Date.now() - 200 * 864e5))).toBe("90+ days");
  });
});

describe("getPriorityColor", () => {
  it("maps buckets to tailwind classes", () => {
    expect(getPriorityColor(0, 0)).toContain("text-green-600");
    expect(getPriorityColor(10, 5000)).toContain("text-yellow-600");
    expect(getPriorityColor(20, 5000)).toContain("text-orange-600");
    expect(getPriorityColor(40, 5000)).toContain("text-orange-600");
    expect(getPriorityColor(45, 200000)).toContain("text-red-600");
  });
});