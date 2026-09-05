export const PROMISE_LIFECYCLE_STATUSES = [
  "ACTIVE",
  "KEPT",
  "BROKEN",
  "RENEGOTIATED",
] as const;

export type PromiseStatusValue = (typeof PROMISE_LIFECYCLE_STATUSES)[number];

/**
 * Validate a promise renegotiation request against the documented lifecycle
 * (DOMAIN_MODEL): renegotiation updates date/amount on the same record and is
 * only legal while the promise is not already settled. A KEPT promise is
 * terminal — it is transitioned only by the payment flow, so it can never be
 * renegotiated afterwards.
 *
 * Returns a human-readable error message, or null when the transition is allowed.
 */
export function promiseRenegotiationError(
  current: string | null | undefined
): string | null {
  if (current === "KEPT") {
    return "A kept promise cannot be renegotiated.";
  }
  return null;
}