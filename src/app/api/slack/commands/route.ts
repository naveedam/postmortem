import { after } from "next/server";
import { verifySlack } from "@/lib/slack";
import { runPostmortem } from "@/lib/run";

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
      text: "*Afterwatch*\n• `/postmortem` — draft from this channel's last 24h\n• `/postmortem 6 checkout outage, SEV2` — last 6h plus context\n• For one thread: hover a message → ⋮ More actions → *Write postmortem*",
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
