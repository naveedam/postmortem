import { after } from "next/server";
import { slack, verifySlack } from "@/lib/slack";
import { runPostmortem } from "@/lib/run";

/** Message shortcut "Write postmortem": drafts from the whole thread the message belongs to. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySlack(raw, req.headers.get("x-slack-request-timestamp"), req.headers.get("x-slack-signature"))) {
    return new Response("invalid signature", { status: 401 });
  }
  const payload = JSON.parse(new URLSearchParams(raw).get("payload") ?? "{}");
  if (payload.type === "message_action" && payload.callback_id === "write_postmortem") {
    const teamId = payload.team.id as string;
    const channel = payload.channel.id as string;
    const user = payload.user.id as string;
    const threadTs = (payload.message.thread_ts ?? payload.message.ts) as string;
    after(async () => {
      await slack(teamId)
        .postEphemeral(channel, user, ":hourglass_flowing_sand: Writing the postmortem for this thread…", threadTs)
        .catch(() => {});
      await runPostmortem({ teamId, channel, user, threadTs });
    });
  }
  return new Response(null, { status: 200 });
}
