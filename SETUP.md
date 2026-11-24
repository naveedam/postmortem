# Setup: v0.7 (Catch me up · Status updates · Action items)

About 10 minutes.

## 1. Upload the code
Unzip and upload everything over the `naveedam/postmortem` repo. Vercel deploys automatically.
New files include `vercel.json` (the weekly reminder schedule). Make sure it's uploaded.

## 2. Run the database migration
Supabase → SQL Editor → New query → paste `supabase/migration-002-actions.sql` → Run.
This adds `action_items` and `workspace_settings`, and backfills action items from your existing postmortems.

## 3. Add one Vercel environment variable
| Key | Value |
|---|---|
| `CRON_SECRET` | output of `openssl rand -base64 32` |

Then **Deployments → ⋯ → Redeploy**.
Check **Settings → Cron Jobs** in Vercel: you should see `/api/cron/reminders`, Mondays 14:00 UTC (9 AM US Eastern).

## 4. Update the Slack app manifest
api.slack.com/apps → Afterwatch → **App Manifest** → JSON → paste `slack-manifest.json` → Save.
This adds two message shortcuts: **Catch me up** and **Draft status update**. No new permissions, so no reinstall needed.

## 5. Test
In Slack (on your incident test thread):
1. ⋮ More actions → **Catch me up** → a private briefing appears (only you see it).
2. ⋮ More actions → **Draft status update** → private drafts for leadership and customers.
3. In a channel: `/postmortem catchup` and `/postmortem update` work channel-wide (last 6h by default; `/postmortem catchup 12` for 12h).
4. In the channel where you want reminders: `/postmortem reminders here`.

On afterwatch.dev:
5. **/app → Action items** tab: existing items appear (from the backfill). Tick one done.
6. **Settings** tab: connect Linear, GitHub or Jira → **Test connection** → **Save**.
7. Back on Action items → **Create Linear issue** (or GitHub/Jira) → link appears; check the ticket exists.
8. Open any postmortem → bottom: **Track action items** + **Stakeholder update** → pick an audience → Draft update.

To test the reminder without waiting for Monday, run from your Mac's Terminal:
```
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://afterwatch.dev/api/cron/reminders
```
It posts to the reminder channel only for items **older than 3 days**, and replies with `{"workspaces":N,"sent":N}`.

## Notes
- Catch-ups and status updates **don't count** toward the 5 free postmortems/month.
- Tracker credentials are encrypted with the same `TOKEN_ENC_KEY` as Slack tokens.
- Ticket status syncs back (closed ticket → action item done) each Monday before reminders go out.
