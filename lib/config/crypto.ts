import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function normalizeKey(raw: string): Buffer {
  if (!raw) throw new Error("SYSTEM_CONFIG_AES_KEY is required");

  let key: Buffer;
  if (/^[A-Za-z0-9+/=]+$/.test(raw)) {
    try {
      key = Buffer.from(raw, "base64");
    } catch {
      key = Buffer.from(raw, "utf8");
    }
  } else {
    key = Buffer.from(raw, "utf8");
  }

  if (key.length < 32) {
    const padded = Buffer.alloc(32);
    key.copy(padded);
    return padded;
  }

  if (key.length > 32) {
    return key.subarray(0, 32);
  }

  return key;
}

function getKey() {
  return normalizeKey(process.env.SYSTEM_CONFIG_AES_KEY || "");
}

export function encryptText(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${encrypted.toString("base64")}:${tag.toString("base64")}`;
}

export function decryptText(ciphertext: string): string {
  const [ver, ivB64, dataB64, tagB64] = ciphertext.split(":");
  if (ver !== "v1" || !ivB64 || !dataB64 || !tagB64) {
    throw new Error("Invalid encrypted value");
  }

  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}
