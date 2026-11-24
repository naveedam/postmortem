import { generateCatchUp, generateUpdate } from "./generate";
import { slack } from "./slack";
import { appUrl } from "./db";

type Ctx = { teamId: string; channel: string; user: string; threadTs?: string; hours?: number };

const STATUS: Record<string, string> = { ongoing: "🔴 Ongoing", mitigated: "🟡 Mitigated", resolved: "🟢 Resolved", unclear: "⚪ Status unclear" };
const bullets = (xs: string[]) => (xs?.length ? xs.map((x) => `• ${x}`).join("\n") : "_None mentioned_");
const sec = (text: string) => ({ type: "section", text: { type: "mrkdwn", text: text.slice(0, 2900) } });

async function transcript(ctx: Ctx) {
  const s = slack(ctx.teamId);
  return ctx.threadTs ? s.fetchThread(ctx.channel, ctx.threadTs) : s.fetchChannel(ctx.channel, ctx.hours ?? 6);
}

/** "Catch me up": private briefing for whoever asked. Doesn't count toward the postmortem quota. */
export async function runCatchUp(ctx: Ctx) {
  const s = slack(ctx.teamId);
  try {
    const t = await transcript(ctx);
    if (t.length < 50) return void (await s.postEphemeral(ctx.channel, ctx.user, "Not enough conversation to summarise yet.", ctx.threadTs));
    const c = await generateCatchUp(t);
    const people = c.people?.length ? c.people.map((p) => `• *${p.name}*: ${p.role}`).join("\n") : "_Not clear from the thread_";
    await s.postEphemeral(ctx.channel, ctx.user, `Catch-up: ${c.headline}`, ctx.threadTs, [
      { type: "header", text: { type: "plain_text", text: "🧭 Catch-up (only visible to you)" } },
      sec(`*${STATUS[c.status] ?? STATUS.unclear}*: ${c.headline}`),
      sec(`*What happened*\n${bullets(c.whatHappened)}`),
      sec(`*Tried so far*\n${bullets(c.tried)}`),
      sec(`*Who's on it*\n${people}`),
      sec(`*Next steps*\n${bullets(c.nextSteps)}`),
      ...(c.openQuestions?.length ? [sec(`*Open questions*\n${bullets(c.openQuestions)}`)] : []),
      { type: "context", elements: [{ type: "mrkdwn", text: "AI summary of the conversation so far. Check details in the thread." }] },
    ]);
  } catch (e) {
    console.error("catchup failed", e);
    const msg = e instanceof Error && e.message.includes("not_in_channel")
      ? "I'm not in this channel yet. Invite me with `/invite @Afterwatch` and try again."
      : "Sorry, I couldn't summarise this. Please try again.";
    await s.postEphemeral(ctx.channel, ctx.user, msg, ctx.threadTs).catch(() => {});
  }
}

/** "Draft status update": private drafts for leadership and customers, ready to copy. */
export async function runStatusUpdate(ctx: Ctx) {
  const s = slack(ctx.teamId);
  try {
    const t = await transcript(ctx);
    if (t.length < 50) return void (await s.postEphemeral(ctx.channel, ctx.user, "Not enough conversation to draft an update yet.", ctx.threadTs));
    const [exec, cust] = await Promise.all([generateUpdate(t, "executive", "live"), generateUpdate(t, "customer", "live")]);
    await s.postEphemeral(ctx.channel, ctx.user, "Status update drafts", ctx.threadTs, [
      { type: "header", text: { type: "plain_text", text: "📣 Status update drafts (only visible to you)" } },
      sec(`*For leadership*\n\`\`\`${exec.replace(/```/g, "'''")}\`\`\``),
      sec(`*For customers / status page*\n\`\`\`${cust.replace(/```/g, "'''")}\`\`\``),
      { type: "context", elements: [{ type: "mrkdwn", text: `Fill in any [confirm: …] gaps before sending. More audiences on the postmortem page at ${appUrl()}` }] },
    ]);
  } catch (e) {
    console.error("status update failed", e);
    await s.postEphemeral(ctx.channel, ctx.user, "Sorry, I couldn't draft an update. Please try again.", ctx.threadTs).catch(() => {});
  }
}
