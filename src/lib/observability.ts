/**
 * Observability & Error Monitoring Service for DuesPilot.
 *
 * Provides structured logging, contextual error capture, and
 * integration hooks for APM / Sentry when configured in environment.
 */

export interface ErrorContext {
  organizationId?: string;
  userId?: string;
  action?: string;
  path?: string;
  metadata?: Record<string, unknown>;
}

export function captureException(error: unknown, context?: ErrorContext): string {
  const errorId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const errObj =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : { message: String(error) };

  const logPayload = {
    errorId,
    timestamp,
    level: "ERROR",
    error: errObj,
    context: {
      organizationId: context?.organizationId || "anonymous",
      userId: context?.userId || "system",
      action: context?.action,
      path: context?.path,
      ...context?.metadata,
    },
  };

  // Structured stderr output for cloud log aggregators (Datadog, CloudWatch, Axiom)
  console.error(`[DuesPilot Error ${errorId}]`, JSON.stringify(logPayload));

  // If SENTRY_DSN or Sentry global is configured, forward error
  if (typeof globalThis !== "undefined" && (globalThis as unknown as { Sentry?: { captureException: (err: unknown, opts: unknown) => void } }).Sentry) {
    try {
      (globalThis as unknown as { Sentry: { captureException: (err: unknown, opts: unknown) => void } }).Sentry.captureException(error, {
        extra: logPayload.context,
        tags: {
          organizationId: context?.organizationId,
          errorId,
        },
      });
    } catch {
      // Swallow sentry capture errors in dev/mock
    }
  }

  return errorId;
}

export function logInfo(message: string, metadata?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.log(
    JSON.stringify({
      timestamp,
      level: "INFO",
      message,
      metadata: metadata || {},
    })
  );
}

export function logWarn(message: string, metadata?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  console.warn(
    JSON.stringify({
      timestamp,
      level: "WARN",
      message,
      metadata: metadata || {},
    })
  );
}
