// Security utilities: CSV formula injection mitigation and input hardening.

/**
 * Sanitizes a field value to prevent CSV Formula Injection (CWE-1236).
 * Spreadsheet tools like MS Excel, LibreOffice, and Google Sheets can interpret
 * cells starting with '=', '+', '-', '@', '\t', or '\r' as formulas/macros.
 */
export function sanitizeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const str = String(value);

  // If the string begins with any known formula trigger character, escape it with a leading single quote
  const formulaTriggers = ["=", "+", "-", "@", "\t", "\r"];
  let safeStr = str;
  if (formulaTriggers.some((char) => str.startsWith(char))) {
    safeStr = `'${str}`;
  }

  // If string contains quotes, commas, or newlines, wrap in quotes and escape internal quotes
  if (safeStr.includes('"') || safeStr.includes(",") || safeStr.includes("\n") || safeStr.includes("\r")) {
    return `"${safeStr.replace(/"/g, '""')}"`;
  }

  return safeStr;
}

/**
 * Generates a full sanitized CSV file string from headers and rows of objects.
 */
export function generateSanitizedCsv<T extends Record<string, unknown>>(
  columns: { key: keyof T | string; label: string }[],
  data: T[]
): string {
  const headerLine = columns.map((col) => sanitizeCsvValue(col.label)).join(",");
  const dataLines = data.map((row) =>
    columns.map((col) => sanitizeCsvValue(row[col.key as keyof T])).join(",")
  );

  return [headerLine, ...dataLines].join("\r\n");
}

/**
 * Validates password complexity:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function validatePasswordComplexity(password: string): {
  valid: boolean;
  message?: string;
} {
  if (!password || password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one numeric digit." };
  }

  return { valid: true };
}
