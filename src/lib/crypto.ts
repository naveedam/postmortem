import crypto from "node:crypto";

/**
 * AES-256-GCM for secrets at rest (Slack bot tokens).
 * TOKEN_ENC_KEY = 32 random bytes, base64. Generate: `openssl rand -base64 32`
 * Stored format: enc:v1:<iv>:<tag>:<ciphertext> (all base64url). Plain values still read for backward compatibility.
 */
function key(): Buffer | null {
  const k = process.env.TOKEN_ENC_KEY;
  if (!k) return null;
  const buf = Buffer.from(k, "base64");
  if (buf.length !== 32) throw new Error("TOKEN_ENC_KEY must be 32 bytes (base64)");
  return buf;
}

export function encrypt(plain: string): string {
  const k = key();
  if (!k) return plain;
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["enc", "v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(":");
}

export function decrypt(stored: string): string {
  if (!stored.startsWith("enc:v1:")) return stored;
  const k = key();
  if (!k) throw new Error("TOKEN_ENC_KEY missing — cannot decrypt stored token");
  const [, , iv, tag, ct] = stored.split(":");
  const d = crypto.createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
}
