# Afterwatch — Product Hunt launch kit

## Listing

**Name:** Afterwatch

**Tagline (≤60 chars) — pick one:**
1. Blameless postmortems from your Slack incident threads ← recommended
2. Your incident is over. Your postmortem takes a minute.
3. Turn any Slack incident thread into a postmortem

**Topics:** Developer Tools · Slack · Artificial Intelligence · SaaS

**Description (≤260 chars):**
> Afterwatch reads your Slack incident thread and writes a blameless postmortem in under a minute — timeline, root cause, impact and action items with owners. It only states what the thread supports and flags gaps instead of guessing. Free for 5 a month.

**Links:** Website (afterwatch.dev) · Add to Slack link · Pricing

**Pricing on PH:** Free options

## Maker's first comment (post at 12:01 AM PT)

> Hey Product Hunt 👋
>
> After every incident there's the same chore: someone scrolls back through 300 Slack messages, rebuilds the timeline, works out who said they'd fix what, and writes it up — usually days later, after the details are gone.
>
> Afterwatch does that first draft for you. Hover any message in the incident thread → **Write postmortem**. A minute later there's a summary in the thread and a full postmortem — timeline, root cause, contributing factors, what went well/badly, and P0/P1/P2 action items with owners — that your team can edit.
>
> Things we were strict about:
> • **No invented facts.** Severity, owners and causes come only from the thread. Gaps are marked "Unknown — confirm with team".
> • **Blameless tone** by default — systems and decisions, never people.
> • **Read-only, minimal access.** It only reads channels you invite it to, never touches your infrastructure, and postmortems are visible only to your workspace.
>
> Free for 5 postmortems a month. No Slack? Paste any chat log at afterwatch.dev/try.
>
> I'd love to know: what does your postmortem template look like, and what would make you trust an AI draft enough to use it?

## Gallery (1270×760 PNGs, in this order)
1. **Hero:** headline "The incident is over. The postmortem takes a minute." + the Slack thread → Afterwatch card (crop of the landing hero).
2. **Before/after:** messy 20-message Slack thread on the left, clean postmortem page on the right.
3. **The full postmortem page:** timeline table + action items visible.
4. **"Doesn't invent facts":** close-up showing "Severity: Unknown" and "Unknown — confirm with team".
5. **Dashboard:** history list with severity badges and the usage meter.
6. **Pricing:** Free / Team / Business.

**Video/GIF (strongly recommended, 30–60 s):** start in Slack on a real-looking thread → More actions → Write postmortem → summary appears → click Open full postmortem → scroll the page → edit one line → save. Record with Screen Studio, Loom or QuickTime; no voice-over needed, add captions.

## Before launch day (checklist)
- [ ] Domain live (afterwatch.dev), all URLs updated, `hello@` email working
- [ ] Slack public distribution activated; test install from a **second** workspace
- [ ] Gemini paid tier / Claude key in place (privacy promise)
- [ ] 3–5 realistic demo threads ready in a demo workspace (no real company data)
- [ ] Gallery images + GIF done
- [ ] PH maker account active, profile filled in, ideally some activity in the weeks before
- [ ] "Coming soon" page on PH to collect followers 1–2 weeks ahead
- [ ] 20–40 people lined up (SRE/DevOps friends, LinkedIn network) who'll genuinely try it and comment — ask for feedback, **not** upvotes (PH penalises vote requests)
- [ ] Launch Tuesday–Thursday, 12:01 AM PT (1:31 PM IST)

## Launch day
- Post the maker comment immediately.
- Reply to every comment within ~15 minutes, all day (PT hours = IST evening/night).
- Share once each: LinkedIn, X, Hacker News "Show HN: Afterwatch – postmortems from Slack incident threads" (only if you can stay to answer), r/sre and r/devops (read each sub's self-promo rules first), dev.to post on "how we draft postmortems from Slack".
- Track: installs (Supabase `workspaces` rows), postmortems generated, sign-ups to paid interest.

## After launch
- Email every installer within 24 h: "What did the first draft get wrong?"
- Fix the top 3 complaints in a week, post a changelog update on PH.
