import { appUrl, db } from "./db";
import { decrypt, encrypt } from "./crypto";
import { slack } from "./slack";
import { createIssue, isClosed, type TrackerConfig } from "./trackers";

export type ActionItem = {
  id: string; team_id: string; postmortem_id: string; priority: string; action: string; owner: string | null;
  status: "open" | "done"; tracker: string | null; external_key: string | null; external_url: string | null;
  created_at: string; done_at: string | null;
};

// ── Settings ────────────────────────────────────────────────────────────────
export type Settings = { reminderChannel: string | null; remindersEnabled: boolean; tracker: TrackerConfig | null };

export async function getSettings(teamId: string): Promise<Settings> {
  const d = db();
  const { data } = d ? await d.from("workspace_settings").select("*").eq("team_id", teamId).maybeSingle() : { data: null };
  let tracker: TrackerConfig | null = null;
  if (data?.tracker_config) {
    try { tracker = JSON.parse(decrypt(data.tracker_config)); } catch (e) { console.error("tracker config unreadable", e); }
  }
  return { reminderChannel: data?.reminder_channel ?? null, remindersEnabled: data?.reminders_enabled ?? true, tracker };
}

export async function saveSettings(teamId: string, patch: Partial<Settings>) {
  const d = db();
  if (!d) throw new Error("Database not configured");
  const row: Record<string, unknown> = { team_id: teamId, updated_at: new Date().toISOString() };
  if ("reminderChannel" in patch) row.reminder_channel = patch.reminderChannel;
  if ("remindersEnabled" in patch) row.reminders_enabled = patch.remindersEnabled;
  if ("tracker" in patch) {
    row.tracker = patch.tracker?.kind ?? null;
    row.tracker_config = patch.tracker ? encrypt(JSON.stringify(patch.tracker)) : null;
  }
  const { error } = await d.from("workspace_settings").upsert(row, { onConflict: "team_id" });
  if (error) throw error;
}

// ── Items ───────────────────────────────────────────────────────────────────
export async function saveItems(teamId: string, postmortemId: string, items: { priority: string; action: string; owner: string }[]) {
  const d = db();
  if (!d || !items?.length) return;
  const rows = items.filter((a) => a.action?.trim()).map((a) => ({
    team_id: teamId, postmortem_id: postmortemId,
    priority: /^P[0-2]$/.test(a.priority) ? a.priority : "P1",
    action: a.action.trim().slice(0, 500),
    owner: a.owner && !/^unassigned$/i.test(a.owner) ? a.owner.slice(0, 100) : null,
  }));
  const { error } = await d.from("action_items").insert(rows);
  if (error) console.error("action items save failed", error);
}

/** Push one item to the workspace's tracker. Idempotent: returns the existing link if already pushed. */
export async function pushItem(teamId: string, id: string): Promise<{ key: string; url: string }> {
  const d = db();
  if (!d) throw new Error("Database not configured");
  const { data: item } = await d
    .from("action_items")
    .select("*, postmortems(title, slug)")
    .eq("id", id).eq("team_id", teamId).maybeSingle();
  if (!item) throw new Error("Not found");
  if (item.external_url) return { key: item.external_key, url: item.external_url };
  const { tracker } = await getSettings(teamId);
  if (!tracker) throw new Error("No tracker connected. Set one up in Settings.");
  const pm = item.postmortems as { title: string; slug: string } | null;
  const created = await createIssue(tracker, {
    title: item.action,
    priority: item.priority,
    body: [
      `Follow-up action from the incident postmortem "${pm?.title ?? "Postmortem"}".`,
      item.owner ? `Suggested owner (from the incident thread): ${item.owner}` : "",
      pm ? `Postmortem: ${appUrl()}/p/${pm.slug}` : "",
      "Created by Afterwatch.",
    ].filter(Boolean).join("\n\n"),
  });
  await d.from("action_items").update({ tracker: tracker.kind, external_key: created.key, external_url: created.url }).eq("id", id);
  return created;
}

export async function setStatus(teamId: string, id: string, status: "open" | "done") {
  const d = db();
  if (!d) throw new Error("Database not configured");
  const { error } = await d.from("action_items")
    .update({ status, done_at: status === "done" ? new Date().toISOString() : null })
    .eq("id", id).eq("team_id", teamId);
  if (error) throw error;
}

/** Close items whose tracker issue was closed. */
async function syncFromTracker(teamId: string, tracker: TrackerConfig) {
  const d = db()!;
  const { data } = await d.from("action_items").select("id, external_key")
    .eq("team_id", teamId).eq("status", "open").eq("tracker", tracker.kind).not("external_key", "is", null).limit(100);
  for (const it of data ?? []) {
    try {
      if (await isClosed(tracker, it.external_key!)) await setStatus(teamId, it.id, "done");
    } catch (e) { console.error("sync failed", it.id, e); }
  }
}

// ── Weekly reminders ────────────────────────────────────────────────────────
const PRI_ORDER: Record<string, number> = { P0: 0, P1: 1, P2: 2 };

export async function sendReminders(): Promise<{ workspaces: number; sent: number }> {
  const d = db();
  if (!d) throw new Error("Database not configured");
  const { data: wss } = await d.from("workspaces").select("team_id");
  let sent = 0;
  const cutoff = new Date(Date.now() - 3 * 86400_000).toISOString();
  for (const { team_id } of wss ?? []) {
    try {
      const settings = await getSettings(team_id);
      if (!settings.remindersEnabled) continue;
      if (settings.tracker) await syncFromTracker(team_id, settings.tracker);

      const { data: items } = await d.from("action_items")
        .select("id, priority, action, owner, external_key, external_url, created_at, postmortems(title, slug, channel_id)")
        .eq("team_id", team_id).eq("status", "open").lte("created_at", cutoff).limit(200);
      if (!items?.length) continue;

      type Row = (typeof items)[number] & { postmortems: { title: string; slug: string; channel_id: string | null } | null };
      const rows = (items as Row[]).sort((a, b) => (PRI_ORDER[a.priority] ?? 9) - (PRI_ORDER[b.priority] ?? 9) || a.created_at.localeCompare(b.created_at));
      const channel = settings.reminderChannel ?? rows.find((r) => r.postmortems?.channel_id)?.postmortems?.channel_id;
      if (!channel) continue;

      const counts = ["P0", "P1", "P2"].map((p) => [p, rows.filter((r) => r.priority === p).length] as const).filter(([, n]) => n);
      const summary = counts.map(([p, n]) => `${n} ${p}`).join(" · ");
      const days = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);
      const blocks: unknown[] = [
        { type: "header", text: { type: "plain_text", text: `📋 ${rows.length} open postmortem action item${rows.length > 1 ? "s" : ""}` } },
        { type: "context", elements: [{ type: "mrkdwn", text: `${summary} · weekly reminder from Afterwatch` }] },
      ];
      for (const r of rows.slice(0, 8)) {
        const link = r.external_url ? ` · <${r.external_url}|${r.external_key}>` : "";
        blocks.push({
          type: "section",
          text: { type: "mrkdwn", text: `*${r.priority}* ${r.action}\n_${r.owner ?? "Unassigned"} · ${days(r.created_at)}d old · from <${appUrl()}/p/${r.postmortems?.slug}|${(r.postmortems?.title ?? "postmortem").slice(0, 60)}>${link}_` },
          accessory: { type: "button", text: { type: "plain_text", text: "Mark done" }, action_id: "mark_done", value: r.id },
        });
      }
      blocks.push({
        type: "actions",
        elements: [{ type: "button", text: { type: "plain_text", text: rows.length > 8 ? `View all ${rows.length}` : "Open action items" }, url: `${appUrl()}/app/actions` }],
      });
      await slack(team_id).postMessage(channel, `${rows.length} open postmortem action items (${summary})`, undefined, blocks);
      sent++;
    } catch (e) {
      console.error("reminder failed", team_id, e);
    }
  }
  return { workspaces: wss?.length ?? 0, sent };
}

// ── Slack button clicks ─────────────────────────────────────────────────────
type BlockPayload = {
  team: { id: string }; user: { id: string }; response_url?: string;
  actions?: { action_id: string; value?: string }[];
};

export async function handleBlockAction(p: BlockPayload) {
  for (const a of p.actions ?? []) {
    if (a.action_id !== "mark_done" || !a.value) continue;
    let text = `✅ Marked done by <@${p.user.id}>.`;
    try { await setStatus(p.team.id, a.value, "done"); } catch { text = "Couldn't update that item. Try again from the Afterwatch dashboard."; }
    if (p.response_url) {
      await fetch(p.response_url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response_type: "ephemeral", replace_original: false, text }),
      }).catch(() => {});
    }
  }
}
