import { describe, expect, it } from "vitest";
import { PLAN_DEFINITIONS, PlanTier } from "@/lib/billing";

describe("PLAN_DEFINITIONS", () => {
  const tiers: PlanTier[] = ["FREE", "STARTER", "GROWTH", "PRO"];

  it("defines all 4 subscription tiers", () => {
    for (const tier of tiers) {
      expect(PLAN_DEFINITIONS[tier]).toBeDefined();
      expect(PLAN_DEFINITIONS[tier].tier).toBe(tier);
      expect(PLAN_DEFINITIONS[tier].name).toBeTruthy();
      expect(PLAN_DEFINITIONS[tier].tagline).toBeTruthy();
      expect(PLAN_DEFINITIONS[tier].features.length).toBeGreaterThan(0);
    }
  });

  it("enforces monotonically increasing limits across tiers", () => {
    const free = PLAN_DEFINITIONS.FREE.limits;
    const starter = PLAN_DEFINITIONS.STARTER.limits;
    const growth = PLAN_DEFINITIONS.GROWTH.limits;
    const pro = PLAN_DEFINITIONS.PRO.limits;

    expect(starter.maxActiveInvoices).toBeGreaterThan(free.maxActiveInvoices);
    expect(growth.maxActiveInvoices).toBeGreaterThan(starter.maxActiveInvoices);
    expect(pro.maxActiveInvoices).toBeGreaterThan(growth.maxActiveInvoices);

    expect(starter.maxSeats).toBeGreaterThan(free.maxSeats);
    expect(growth.maxSeats).toBeGreaterThan(starter.maxSeats);
    expect(pro.maxSeats).toBeGreaterThan(growth.maxSeats);

    expect(starter.auditRetentionDays).toBeGreaterThan(free.auditRetentionDays);
    expect(growth.auditRetentionDays).toBeGreaterThan(starter.auditRetentionDays);
    expect(pro.auditRetentionDays).toBeGreaterThan(growth.auditRetentionDays);
  });

  it("gates channels and capabilities correctly", () => {
    expect(PLAN_DEFINITIONS.FREE.limits.allowedChannels).toEqual(["EMAIL"]);
    expect(PLAN_DEFINITIONS.FREE.limits.hasAutomatedReminders).toBe(false);

    expect(PLAN_DEFINITIONS.STARTER.limits.allowedChannels).toContain("WHATSAPP");
    expect(PLAN_DEFINITIONS.STARTER.limits.hasAutomatedReminders).toBe(true);

    expect(PLAN_DEFINITIONS.GROWTH.limits.allowedChannels).toContain("SMS");
    expect(PLAN_DEFINITIONS.GROWTH.limits.hasAdvancedAnalytics).toBe(true);
    expect(PLAN_DEFINITIONS.GROWTH.limits.hasApiAccess).toBe(true);

    expect(PLAN_DEFINITIONS.PRO.limits.allowedChannels).toContain("CALL");
  });

  it("calculates annual pricing with appropriate discounts", () => {
    for (const tier of ["STARTER", "GROWTH", "PRO"] as const) {
      const p = PLAN_DEFINITIONS[tier];
      // Yearly price should be less than 12 * monthly price (at least 1-2 months free)
      expect(p.yearlyPriceINR).toBeLessThan(p.monthlyPriceINR * 12);
    }
  });
});
