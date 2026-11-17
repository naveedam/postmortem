import crypto from "node:crypto";
import { cookies } from "next/headers";

/** Signed (HMAC-SHA256) session cookie. No DB lookup needed per request. */
export type Session = { userId: string; teamId: string; teamName: string; name: string; email?: string; avatar?: string; exp: number };

const COOKIE = "aw_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  const s = process.env.SESSION_SECRET ?? process.env.TOKEN_ENC_KEY;
  if (!s) throw new Error("SESSION_SECRET is not set");
  return s;
}

const sign = (data: string) => crypto.createHmac("sha256", secret()).update(data).digest("base64url");

export async function setSession(s: Omit<Session, "exp">) {
  const payload = Buffer.from(JSON.stringify({ ...s, exp: Math.floor(Date.now() / 1000) + MAX_AGE })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: MAX_AGE,
  });
}

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
    return s.exp > Date.now() / 1000 ? s : null;
  } catch {
    return null;
  }
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

/** Only allow same-site relative redirects after login. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
}
