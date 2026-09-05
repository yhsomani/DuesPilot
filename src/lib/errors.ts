export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHORIZATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "BUSINESS_RULE_ERROR";

export class DomainError extends Error {
  code: ErrorCode;
  status: number;
  constructor(code: ErrorCode, message: string, status: number) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.status = status;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message, 400);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "Not found") {
    super("NOT_FOUND", message, 404);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
    this.name = "ConflictError";
  }
}

export class BusinessRuleError extends DomainError {
  constructor(message: string, status = 422) {
    super("BUSINESS_RULE_ERROR", message, status);
    this.name = "BusinessRuleError";
  }
}

/** Return the first human-readable message from a zod error for API responses. */
export function firstZodIssue(error: {
  issues: { message: string }[];
}): string {
  return error.issues[0]?.message ?? "Invalid input";
}