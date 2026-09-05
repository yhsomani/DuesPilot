import crypto from "crypto";

const DEFAULT_DEV_KEY = "duespilot-default-development-encryption-key-32b!";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits authentication tag

/**
 * Derives a 32-byte (256-bit) cryptographic key from a provided master key or environment secret.
 */
function deriveKey(masterKey?: string): Buffer {
  const secret =
    masterKey ||
    process.env.ENCRYPTION_SECRET_KEY ||
    process.env.NEXTAUTH_SECRET ||
    DEFAULT_DEV_KEY;

  return crypto.createHash("sha256").update(secret).digest();
}

export interface EncryptedPayload {
  version: "v1";
  iv: string; // hex
  tag: string; // hex
  data: string; // hex
}

/**
 * Encrypts a plaintext string using authenticated AES-256-GCM encryption.
 * Returns a serialized string format: `v1:iv:tag:ciphertext`
 */
export function encryptSecret(plaintext: string, masterKey?: string): string {
  if (!plaintext) {
    return "";
  }

  const key = deriveKey(masterKey);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts a serialized ciphertext string using AES-256-GCM authenticated decryption.
 * Throws an error if the authentication tag fails or the ciphertext has been altered.
 */
export function decryptSecret(payload: string, masterKey?: string): string {
  if (!payload) {
    return "";
  }

  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted payload format. Expected v1:iv:tag:data");
  }

  const [, ivHex, tagHex, dataHex] = parts;
  const key = deriveKey(masterKey);
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(dataHex, "hex");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid IV length in encrypted payload");
  }
  if (tag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid authentication tag length in encrypted payload");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    throw new Error("Decryption failed: corrupted ciphertext or invalid authentication tag");
  }
}

/**
 * Masks a secret string (e.g. API keys, credentials) for secure UI presentation.
 * Example: `rzp_live_abc123456789` -> `rzp_••••••••6789`
 */
export function maskSecret(
  secret: string,
  visiblePrefix = 4,
  visibleSuffix = 4
): string {
  if (!secret) return "";
  if (secret.length <= visiblePrefix + visibleSuffix) {
    return "•".repeat(secret.length);
  }

  const prefix = secret.slice(0, visiblePrefix);
  const suffix = secret.slice(-visibleSuffix);
  const maskedLength = Math.min(Math.max(secret.length - (visiblePrefix + visibleSuffix), 4), 16);
  return `${prefix}${"•".repeat(maskedLength)}${suffix}`;
}

/**
 * Generates a cryptographically random token string.
 */
export function generateSecureToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString("hex");
}

/**
 * Computes an HMAC-SHA256 signature for webhook validation or checksums.
 */
export function hashHmac(data: string, secretKey: string): string {
  return crypto.createHmac("sha256", secretKey).update(data).digest("hex");
}
