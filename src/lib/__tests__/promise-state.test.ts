import { describe, expect, it } from "vitest";
import {
  PROMISE_LIFECYCLE_STATUSES,
  promiseRenegotiationError,
} from "@/lib/promise-state";

describe("promiseRenegotiationError", () => {
  it("allows renegotiation from ACTIVE", () => {
    expect(promiseRenegotiationError("ACTIVE")).toBeNull();
  });

  it("allows renegotiation from BROKEN", () => {
    expect(promiseRenegotiationError("BROKEN")).toBeNull();
  });

  it("allows another renegotiation of an already RENEGOTIATED promise", () => {
    expect(promiseRenegotiationError("RENEGOTIATED")).toBeNull();
  });

  it("rejects renegotiation of a KEPT promise", () => {
    expect(promiseRenegotiationError("KEPT")).toBe(
      "A kept promise cannot be renegotiated."
    );
  });

  it("handles unknown/undefined current status leniently", () => {
    expect(promiseRenegotiationError(undefined)).toBeNull();
    expect(promiseRenegotiationError(null)).toBeNull();
  });

  it("exposes the full lifecycle status set", () => {
    expect(PROMISE_LIFECYCLE_STATUSES).toEqual([
      "ACTIVE",
      "KEPT",
      "BROKEN",
      "RENEGOTIATED",
    ]);
  });
});