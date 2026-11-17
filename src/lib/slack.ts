import crypto from "node:crypto";
import { botToken } from "./db";

const API = "https://slack.com/api";

/** Verify a request really came from Slack (signing secret, 5-minute replay window). */
export function verifySlack(rawBody: string, timestamp: string | null, signature: string | null): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret || !timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = "v0=" + crypto.createHmac("sha256", secret).update(`v0:${timestamp}:${rawBody}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Slack Web API client bound to one workspace. */
export function slack(teamId: string) {
  async function call<T = Record<string, unknown>>(method: string, params: Record<string, unknown>, json = true): Promise<T> {
    const token = await botToken(teamId);
    const res = json
      ? await fetch(`${API}/${method}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(params),
        })
      : await fetch(`${API}/${method}?${new URLSearchParams(params as Record<string, string>)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
    const data = await res.json();
    if (!data.ok) throw new Error(`Slack ${method}: ${data.error}`);
    return data as T;
  }

  type Msg = { ts: string; user?: string; bot_id?: string; username?: string; text?: string };
  const names = new Map<string, string>();

  async function userName(id?: string): Promise<string> {
    if (!id) return "bot";
    if (names.has(id)) return names.get(id)!;
    try {
      const r = await call<{ user: { profile?: { display_name?: string; real_name?: string }; name: string } }>(
        "users.info", { user: id }, false,
      );
      const n = r.user.profile?.display_name || r.user.profile?.real_name || r.user.name;
      names.set(id, n);
      return n;
    } catch {
      return id;
    }
  }

  async function format(messages: Msg[]): Promise<string> {
    const lines: string[] = [];
    for (const m of messages) {
      const t = new Date(Number(m.ts) * 1000).toISOString().replace("T", " ").slice(0, 19) + "Z";
      const who = m.user ? await userName(m.user) : m.username || "bot";
      let text = m.text ?? "";
      for (const tag of text.match(/<@([A-Z0-9]+)>/g) ?? []) {
        text = text.replace(tag, "@" + (await userName(tag.slice(2, -1))));
      }
      lines.push(`[${t}] ${who}: ${text}`);
    }
    return lines.join("\n");
  }

  // Keep alert bots (PagerDuty etc.) but drop everything our own bot posted, so old drafts never feed the next one.
  let self: { userId: string; botId: string } | null = null;
  async function whoAmI() {
    if (!self) {
      const r = await call<{ user_id: string; bot_id: string }>("auth.test", {});
      self = { userId: r.user_id, botId: r.bot_id };
    }
    return self;
  }
  async function dropOwn(messages: (Msg & { app_id?: string })[]) {
    const me = await whoAmI();
    return messages.filter(
      (m) =>
        m.user !== me.userId &&
        m.bot_id !== me.botId &&
        !(m.app_id && m.app_id === process.env.SLACK_APP_ID),
    );
  }

  return {
    async fetchThread(channel: string, threadTs: string): Promise<string> {
      const all: Msg[] = [];
      let cursor: string | undefined;
      do {
        const r = await call<{ messages: Msg[]; response_metadata?: { next_cursor?: string } }>(
          "conversations.replies",
          { channel, ts: threadTs, limit: "200", ...(cursor ? { cursor } : {}) },
          false,
        );
        all.push(...r.messages);
        cursor = r.response_metadata?.next_cursor || undefined;
      } while (cursor && all.length < 2000);
      return format(await dropOwn(all));
    },

    async fetchChannel(channel: string, hours: number): Promise<string> {
      const oldest = String(Date.now() / 1000 - hours * 3600);
      const r = await call<{ messages: Msg[] }>("conversations.history", { channel, oldest, limit: "500" }, false);
      return format((await dropOwn(r.messages)).reverse());
    },

    postMessage: (channel: string, text: string, thread_ts?: string, blocks?: unknown[]) =>
      call("chat.postMessage", { channel, text, thread_ts, blocks, unfurl_links: false }),

    postEphemeral: (channel: string, user: string, text: string, thread_ts?: string) =>
      call("chat.postEphemeral", { channel, user, text, thread_ts }),
  };
}

/** Exchange an OAuth code for a bot token (Add to Slack flow). */
export async function oauthAccess(code: string, redirectUri: string) {
  const res = await fetch(`${API}/oauth.v2.access`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      redirect_uri: redirectUri,
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
    }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`oauth.v2.access: ${data.error}`);
  return data as {
    access_token: string;
    bot_user_id: string;
    app_id: string;
    team: { id: string; name: string };
    authed_user?: { id: string };
  };
}

export const BOT_SCOPES = ["commands", "chat:write", "channels:history", "groups:history", "users:read"];
