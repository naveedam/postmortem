import { getSession, type Session } from "./session";

/** Admins = Slack user IDs listed in ADMIN_SLACK_USER_IDS (comma-separated). */
export async function requireAdmin(): Promise<{ s: Session } | { error: Response }> {
  const s = await getSession();
  if (!s) return { error: Response.json({ error: "Sign in required" }, { status: 401 }) };
  const admins = (process.env.ADMIN_SLACK_USER_IDS ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  if (!admins.includes(s.userId)) {
    return { error: Response.json({ error: "Not an admin", userId: s.userId }, { status: 403 }) };
  }
  return { s };
}
