import crypto from "node:crypto";

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

async function call<T = Record<string, unknown>>(method: string, params: Record<string, unknown>, json = true): Promise<T> {
  const token = process.env.SLACK_BOT_TOKEN!;
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

const userCache = new Map<string, string>();
async function userName(id?: string): Promise<string> {
  if (!id) return "bot";
  if (userCache.has(id)) return userCache.get(id)!;
  try {
    const r = await call<{ user: { profile?: { display_name?: string; real_name?: string }; name: string } }>(
      "users.info", { user: id }, false,
    );
    const n = r.user.profile?.display_name || r.user.profile?.real_name || r.user.name;
    userCache.set(id, n);
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
    // Replace <@U123> mentions with names
    let text = m.text ?? "";
    for (const id of text.match(/<@([A-Z0-9]+)>/g) ?? []) {
      text = text.replace(id, "@" + (await userName(id.slice(2, -1))));
    }
    lines.push(`[${t}] ${who}: ${text}`);
  }
  return lines.join("\n");
}

/** All messages in a thread (parent + replies). */
export async function fetchThread(channel: string, threadTs: string): Promise<string> {
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
  return format(all);
}

/** Channel messages from the last `hours` hours, oldest first. */
export async function fetchChannel(channel: string, hours: number): Promise<string> {
  const oldest = String(Date.now() / 1000 - hours * 3600);
  const r = await call<{ messages: Msg[] }>("conversations.history", { channel, oldest, limit: "500" }, false);
  return format(r.messages.reverse());
}

export const postMessage = (channel: string, text: string, thread_ts?: string, blocks?: unknown[]) =>
  call("chat.postMessage", { channel, text, thread_ts, blocks, unfurl_links: false });

export const postEphemeral = (channel: string, user: string, text: string, thread_ts?: string) =>
  call("chat.postEphemeral", { channel, user, text, thread_ts });

/** Upload a text file into a channel/thread (files.getUploadURLExternal flow). */
export async function uploadFile(channel: string, filename: string, content: string, title: string, thread_ts?: string, comment?: string) {
  const bytes = Buffer.from(content, "utf8");
  const { upload_url, file_id } = await call<{ upload_url: string; file_id: string }>(
    "files.getUploadURLExternal", { filename, length: String(bytes.length) }, false,
  );
  const up = await fetch(upload_url, { method: "POST", body: bytes });
  if (!up.ok) throw new Error(`Upload failed: ${up.status}`);
  await call("files.completeUploadExternal", {
    files: [{ id: file_id, title }],
    channel_id: channel,
    ...(thread_ts ? { thread_ts } : {}),
    ...(comment ? { initial_comment: comment } : {}),
  });
}
