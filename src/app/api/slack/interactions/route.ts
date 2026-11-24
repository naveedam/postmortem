import { after } from "next/server";
import { slack, verifySlack } from "@/lib/slack";
import { runPostmortem } from "@/lib/run";
import { runCatchUp, runStatusUpdate } from "@/lib/live";
import { handleBlockAction } from "@/lib/actions";

const WORKING: Record<string, string> = {
  write_postmortem: ":hourglass_flowing_sand: Writing the postmortem for this thread…",
  catch_me_up: ":hourglass_flowing_sand: Reading the thread to catch you up…",
  draft_status_update: ":hourglass_flowing_sand: Drafting status updates…",
};

/** Message shortcuts + button clicks from Afterwatch messages. */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySlack(raw, req.headers.get("x-slack-request-timestamp"), req.headers.get("x-slack-signature"))) {
    return new Response("invalid signature", { status: 401 });
  }
  const payload = JSON.parse(new URLSearchParams(raw).get("payload") ?? "{}");

  if (payload.type === "message_action" && WORKING[payload.callback_id]) {
    const teamId = payload.team.id as string;
    const channel = payload.channel.id as string;
    const user = payload.user.id as string;
    const threadTs = (payload.message.thread_ts ?? payload.message.ts) as string;
    const ctx = { teamId, channel, user, threadTs };
    after(async () => {
      await slack(teamId).postEphemeral(channel, user, WORKING[payload.callback_id], threadTs).catch(() => {});
      if (payload.callback_id === "write_postmortem") await runPostmortem(ctx);
      else if (payload.callback_id === "catch_me_up") await runCatchUp(ctx);
      else await runStatusUpdate(ctx);
    });
  } else if (payload.type === "block_actions") {
    after(() => handleBlockAction(payload));
  }
  return new Response(null, { status: 200 });
}
