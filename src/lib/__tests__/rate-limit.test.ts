import { describe, expect, it } from "vitest";
import { clientKey, rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    for (let i = 0; i < 5; i++) {
      const r = rateLimit("k1", { limit: 5, windowMs: 60_000 });
      expect(r.allowed).toBe(true);
      expect(r.retryAfterMs).toBe(0);
    }
  });

  it("blocks once the limit is reached and reports a retryAfter", () => {
    for (let i = 0; i < 5; i++) rateLimit("k2", { limit: 5, windowMs: 60_000 });
    const blocked = rateLimit("k2", { limit: 5, windowMs: 60_000 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });
});

describe("clientKey", () => {
  it("combines ip and id with a colon", () => {
    expect(clientKey("1.2.3.4", "user-1")).toBe("1.2.3.4:user-1");
  });

  it("falls back for a missing ip", () => {
    expect(clientKey(null, "user-1")).toBe("unknown:user-1");
  });
});