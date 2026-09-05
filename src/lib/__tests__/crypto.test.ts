import { describe, it, expect } from "vitest";
import {
  encryptSecret,
  decryptSecret,
  maskSecret,
  generateSecureToken,
  hashHmac,
} from "../crypto";

describe("Cryptographic Envelope & Secret Management", () => {
  const testKey = "custom-test-encryption-key-32bytes!";

  describe("encryptSecret and decryptSecret", () => {
    it("successfully encrypts and decrypts with AES-256-GCM authenticated payload", () => {
      const plaintext = "rzp_live_secret_key_9988776655";
      const encrypted = encryptSecret(plaintext, testKey);

      expect(encrypted).toMatch(/^v1:[a-f0-9]{24}:[a-f0-9]{32}:[a-f0-9]+$/);
      expect(encrypted).not.toContain(plaintext);

      const decrypted = decryptSecret(encrypted, testKey);
      expect(decrypted).toBe(plaintext);
    });

    it("returns empty string when encrypting or decrypting empty value", () => {
      expect(encryptSecret("")).toBe("");
      expect(decryptSecret("")).toBe("");
    });

    it("throws error when ciphertext format is corrupted or wrong version", () => {
      expect(() => decryptSecret("invalid:payload:format", testKey)).toThrow(
        "Invalid encrypted payload format"
      );
    });

    it("fails authenticated decryption if payload is tampered with", () => {
      const encrypted = encryptSecret("confidential_api_token", testKey);
      const parts = encrypted.split(":");
      // Alter ciphertext data deterministically
      parts[3] = parts[3].slice(0, -1) + (parts[3].slice(-1) === "a" ? "b" : "a");
      const tampered = parts.join(":");

      expect(() => decryptSecret(tampered, testKey)).toThrow(
        "Decryption failed: corrupted ciphertext or invalid authentication tag"
      );
    });

    it("fails decryption when provided with a different master key", () => {
      const encrypted = encryptSecret("confidential_api_token", "key-one-alpha-bravo-12345678");
      expect(() =>
        decryptSecret(encrypted, "key-two-charlie-delta-87654321")
      ).toThrow();
    });
  });

  describe("maskSecret", () => {
    it("masks mid-characters of sensitive tokens leaving prefix and suffix intact", () => {
      const secret = "rzp_live_1234567890abcdef";
      const masked = maskSecret(secret, 4, 4);

      expect(masked.startsWith("rzp_")).toBe(true);
      expect(masked.endsWith("cdef")).toBe(true);
      expect(masked).toContain("••••");
    });

    it("returns all bullets if secret is very short", () => {
      expect(maskSecret("short", 4, 4)).toBe("•••••");
      expect(maskSecret("")).toBe("");
    });
  });

  describe("generateSecureToken & hashHmac", () => {
    it("generates random hex tokens of correct length", () => {
      const token = generateSecureToken(16);
      expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
    });

    it("computes reproducible HMAC-SHA256 digests", () => {
      const hmac1 = hashHmac("message-data", "secret-key");
      const hmac2 = hashHmac("message-data", "secret-key");
      const hmacDiff = hashHmac("different-data", "secret-key");

      expect(hmac1).toBe(hmac2);
      expect(hmac1).not.toBe(hmacDiff);
      expect(hmac1).toHaveLength(64); // SHA-256 hex length
    });
  });
});
