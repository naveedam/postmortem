import { generatePostmortem } from "./generate";
import { toMarkdown } from "./prompt";
import { slack } from "./slack";
import { appUrl, db, newSlug, usage } from "./db";
import { saveItems } from "./actions";

type Job = { teamId: string; channel: string; user: string; threadTs?: string; hours?: number; context?: string };

/** Fetch Slack conversation → generate → save → post summary with a link back to the full postmortem. */
export async function runPostmortem({ teamId, channel, user, threadTs, hours = 24, context = "" }: Job) {
  const s = slack(teamId);
  try {
    const quota = await usage(teamId);
    if (!quota.ok) {
      await s.postEphemeral(
        channel, user,
        `You've used all ${quota.limit} free postmortems this month. Upgrade for unlimited: ${appUrl()}/#pricing`,
        threadTs,
      );
      return;
    }

    const transcript = threadTs ? await s.fetchThread(channel, threadTs) : await s.fetchChannel(channel, hours);
    if (transcript.length < 50) {
      await s.postEphemeral(channel, user, "Not enough conversation to write a postmortem from.", threadTs);
      return;
    }

    const pm = await generatePostmortem(transcript, context);
    const markdown = toMarkdown(pm);
    const slug = newSlug();
    const d = db();
    if (d) {
      const { data: saved, error } = await d.from("postmortems").insert({
        slug, team_id: teamId, channel_id: channel, thread_ts: threadTs ?? null, created_by: user,
        title: pm.title, severity: pm.severity, data: pm, markdown,
      }).select("id").single();
      if (error) console.error("save failed", error);
      else await saveItems(teamId, saved.id, pm.actionItems);
    }
    const link = `${appUrl()}/p/${slug}`;

    const actions = pm.actionItems.slice(0, 5).map((a) => `• *${a.priority}* ${a.action} — _${a.owner}_`).join("\n");
    const fallback = `Postmortem draft: ${pm.title}`;
    await s.postMessage(channel, fallback, threadTs, [
      { type: "header", text: { type: "plain_text", text: `📝 ${pm.title}`.slice(0, 150) } },
      { type: "context", elements: [{ type: "mrkdwn", text: `*Severity:* ${pm.severity}  ·  Requested by <@${user}>  ·  AI draft — review before sharing` }] },
      { type: "section", text: { type: "mrkdwn", text: pm.summary.slice(0, 2900) } },
      { type: "section", text: { type: "mrkdwn", text: `*Root cause*\n${pm.rootCause}`.slice(0, 2900) } },
      ...(actions ? [{ type: "section", text: { type: "mrkdwn", text: `*Action items*\n${actions}`.slice(0, 2900) } }] : []),
      ...(d
        ? [{
            type: "actions",
            elements: [{ type: "button", style: "primary", text: { type: "plain_text", text: "Open full postmortem" }, url: link }],
          }]
        : []),
    ]);
  } catch (e) {
    console.error("postmortem job failed", e);
    const msg = e instanceof Error && e.message.includes("not_in_channel")
      ? "I'm not in this channel yet. Invite me with `/invite @Afterwatch` and try again."
      : "Sorry — I couldn't generate the postmortem. Please try again.";
    await s.postEphemeral(channel, user, msg, threadTs).catch(() => {});
  }
}
