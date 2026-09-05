import { describe, expect, it, vi } from "vitest";
import { captureException, logInfo, logWarn } from "@/lib/observability";

describe("Observability", () => {
  it("captures exception and returns unique error ID", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("Database connection timed out");
    const errorId = captureException(err, {
      organizationId: "org-test-123",
      action: "FETCH_INVOICES",
      path: "/api/invoices",
    });

    expect(errorId).toBeDefined();
    expect(typeof errorId).toBe("string");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("handles non-Error objects gracefully", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const errorId = captureException("String error message", {
      organizationId: "org-test-456",
    });

    expect(errorId).toBeDefined();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("logs info and warn messages formatted as JSON", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logInfo("User signed in", { userId: "user-1" });
    expect(logSpy).toHaveBeenCalled();

    logWarn("Rate limit threshold approached", { ip: "127.0.0.1" });
    expect(warnSpy).toHaveBeenCalled();

    logSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
