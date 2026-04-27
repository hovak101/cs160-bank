import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { isValidSecurityCodeFormat } from "@/lib/banking/security-code";

const HASH_PREFIX = "scrypt";
const LEGACY_HASH_PREFIX = "sha256";
const SCRYPT_KEY_LENGTH = 64;

export function hashSecurityCode(securityCode: string) {
  if (!isValidSecurityCodeFormat(securityCode)) {
    throw new Error("Security code must be exactly 3 digits.");
  }

  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(securityCode, salt, SCRYPT_KEY_LENGTH).toString("hex");

  return `${HASH_PREFIX}:${salt}:${derivedKey}`;
}

export function verifySecurityCode(
  securityCode: string,
  storedHash: string | null | undefined
) {
  if (!isValidSecurityCodeFormat(securityCode) || !storedHash) {
    return false;
  }

  if (storedHash.startsWith(`${HASH_PREFIX}:`)) {
    const [, salt, expectedHash] = storedHash.split(":");

    if (!salt || !expectedHash) {
      return false;
    }

    const derivedKey = scryptSync(securityCode, salt, SCRYPT_KEY_LENGTH);
    const expectedBuffer = Buffer.from(expectedHash, "hex");

    if (derivedKey.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(derivedKey, expectedBuffer);
  }

  if (storedHash.startsWith(`${LEGACY_HASH_PREFIX}:`)) {
    const expectedHash = storedHash.slice(LEGACY_HASH_PREFIX.length + 1);
    const actualHash = createHash("sha256").update(securityCode).digest("hex");

    return timingSafeEqual(Buffer.from(actualHash, "hex"), Buffer.from(expectedHash, "hex"));
  }

  return false;
}
