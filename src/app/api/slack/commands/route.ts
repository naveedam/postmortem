import { after } from "next/server";
import { verifySlack } from "@/lib/slack";
import { runPostmortem } from "@/lib/run";
import { runCatchUp, runStatusUpdate } from "@/lib/live";
import { saveSettings } from "@/lib/actions";

/** /postmortem [hours] [extra context]  — drafts from the channel's last N hours (default 24). */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySlack(raw, req.headers.get("x-slack-request-timestamp"), req.headers.get("x-slack-signature"))) {
    return new Response("invalid signature", { status: 401 });
  }
  const p = new URLSearchParams(raw);
  const teamId = p.get("team_id")!;
  const channel = p.get("channel_id")!;
  const user = p.get("user_id")!;
  const text = (p.get("text") ?? "").trim();
  if (text === "help") {
    return Response.json({
      response_type: "ephemeral",
      text: "*Afterwatch*\n• `/postmortem` — draft a postmortem from this channel's last 24h\n• `/postmortem 6 checkout outage, SEV2` — last 6h plus context\n• `/postmortem catchup [hours]` — private catch-up on this channel (default 6h)\n• `/postmortem update [hours]` — private status-update drafts for leadership and customers\n• `/postmortem reminders here` — post weekly open-action-item reminders in this channel (`off` / `on` too)\n• On a thread: hover a message → ⋮ More actions → *Write postmortem*, *Catch me up* or *Draft status update*",
    });
  }
  const rem = text.match(/^reminders\s+(here|off|on)$/i);
  if (rem) {
    const mode = rem[1].toLowerCase();
    try {
      if (mode === "here") await saveSettings(teamId, { reminderChannel: channel, remindersEnabled: true });
      else await saveSettings(teamId, { remindersEnabled: mode === "on" });
    } catch {
      return Response.json({ response_type: "ephemeral", text: "Couldn't save that setting. Please try again." });
    }
    const msg = mode === "here"
      ? ":white_check_mark: Weekly action-item reminders will be posted in this channel (Mondays). Make sure @Afterwatch is in the channel."
      : mode === "off" ? ":no_bell: Weekly action-item reminders are off." : ":bell: Weekly action-item reminders are on.";
    return Response.json({ response_type: "ephemeral", text: msg });
  }
  const sub = text.match(/^(catchup|catch-up|update)\b\s*(\d{1,3})?/i);
  if (sub) {
    const h = Math.min(Number(sub[2] ?? 6), 72);
    const ctx = { teamId, channel, user, hours: h };
    const isCatch = sub[1].toLowerCase() !== "update";
    after(() => (isCatch ? runCatchUp(ctx) : runStatusUpdate(ctx)));
    return Response.json({
      response_type: "ephemeral",
      text: `:hourglass_flowing_sand: ${isCatch ? "Catching you up on" : "Drafting status updates from"} the last ${h}h of this channel…`,
    });
  }
  const m = text.match(/^(\d{1,3})\s*h?\b\s*(.*)$/i);
  const hours = m ? Math.min(Number(m[1]), 168) : 24;
  const context = m ? m[2] : text;

  after(() => runPostmortem({ teamId, channel, user, hours, context }));
  return Response.json({
    response_type: "ephemeral",
    text: `:hourglass_flowing_sand: Writing a postmortem from the last ${hours}h of this channel. I'll post it here in about a minute.`,
  });
}
