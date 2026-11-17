import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { decrypt } from "./crypto";

let client: SupabaseClient | null = null;
export function db(): SupabaseClient | null {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  client ??= createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  return client;
}

export const newSlug = () => crypto.randomBytes(9).toString("base64url"); // 12 chars, unguessable

export const FREE_MONTHLY_LIMIT = Number(process.env.FREE_MONTHLY_LIMIT ?? 5);

export const appUrl = () =>
  process.env.APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

/** Bot token for a Slack workspace (DB first, env fallback for the original single-workspace setup). */
export async function botToken(teamId?: string): Promise<string> {
  const d = db();
  if (d && teamId) {
    const { data } = await d.from("workspaces").select("bot_token").eq("team_id", teamId).maybeSingle();
    if (data?.bot_token) return decrypt(data.bot_token);
  }
  if (process.env.SLACK_BOT_TOKEN) return process.env.SLACK_BOT_TOKEN;
  throw new Error("No Slack token for this workspace — reinstall the app");
}

/** Returns {used, limit, ok} for this calendar month. Paid plans are unlimited. */
export async function usage(teamId: string) {
  const d = db();
  if (!d) return { used: 0, limit: Infinity, ok: true };
  const { data: ws } = await d.from("workspaces").select("plan").eq("team_id", teamId).maybeSingle();
  if (ws && ws.plan !== "free") return { used: 0, limit: Infinity, ok: true };
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { count } = await d
    .from("postmortems")
    .select("id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .gte("created_at", start.toISOString());
  const used = count ?? 0;
  return { used, limit: FREE_MONTHLY_LIMIT, ok: used < FREE_MONTHLY_LIMIT };
}
