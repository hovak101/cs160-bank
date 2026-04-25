import crypto from "node:crypto";

type EncryptedValue = {
  ciphertext: string;
  iv: string;
  authTag: string;
};

function getEncryptionKey() {
  const rawKey = process.env.PLAID_TOKEN_ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error("PLAID_TOKEN_ENCRYPTION_KEY is not configured.");
  }

  return crypto.createHash("sha256").update(rawKey).digest();
}

export function encryptText(plaintext: string): EncryptedValue {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptText(payload: EncryptedValue) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(payload.iv, "base64")
  );

  decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
