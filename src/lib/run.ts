import { generatePostmortem } from "./generate";
import { toMarkdown } from "./prompt";
import { fetchChannel, fetchThread, postEphemeral, postMessage, uploadFile } from "./slack";

type Job = { channel: string; user: string; threadTs?: string; hours?: number; context?: string };

/** Fetch Slack conversation → generate postmortem → post summary + .md file back. */
export async function runPostmortem({ channel, user, threadTs, hours = 24, context = "" }: Job) {
  try {
    const transcript = threadTs ? await fetchThread(channel, threadTs) : await fetchChannel(channel, hours);
    if (transcript.length < 50) {
      await postEphemeral(channel, user, "Not enough conversation to write a postmortem from.", threadTs);
      return;
    }
    const pm = await generatePostmortem(transcript, context);
    const md = toMarkdown(pm);
    const actions = pm.actionItems.slice(0, 5).map((a) => `• *${a.priority}* ${a.action} — _${a.owner}_`).join("\n");
    const summary =
      `*:memo: Postmortem draft: ${pm.title}* (${pm.severity})\n\n${pm.summary}\n\n` +
      `*Root cause:* ${pm.rootCause}\n\n` +
      (actions ? `*Action items:*\n${actions}\n\n` : "") +
      `_Full postmortem attached. Requested by <@${user}>. Review before sharing — AI draft._`;
    const slug = pm.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60) || "postmortem";
    await uploadFile(channel, `${slug}.md`, md, `Postmortem: ${pm.title}`, threadTs, summary);
  } catch (e) {
    console.error("postmortem job failed", e);
    const msg = e instanceof Error && e.message.includes("not_in_channel")
      ? "I'm not in this channel yet. Invite me with `/invite @Postmortem` and try again."
      : "Sorry — I couldn't generate the postmortem. Please try again.";
    await postEphemeral(channel, user, msg, threadTs).catch(() => postMessage(channel, msg, threadTs).catch(() => {}));
  }
}
