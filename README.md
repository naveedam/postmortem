# Afterwatch

Incident thread → blameless postmortem in under a minute. Web app + Slack app.

## Setup
1. `npm install`, copy `env.example` to `.env.local`, fill in keys.
2. `npm run dev` → http://localhost:3000 (paste-a-thread web app).

## Slack app
1. Deploy to Vercel and add env vars: `ANTHROPIC_API_KEY`, `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`.
2. api.slack.com/apps → Create New App → From a manifest → paste `slack-manifest.yml` (replace YOUR-DOMAIN).
3. Install to workspace → copy **Bot User OAuth Token** (`xoxb-…`) and **Signing Secret** into Vercel → redeploy.
4. In Slack: `/invite @Afterwatch` in the incident channel.

Usage:
- Thread: hover any message → ⋮ → **Write postmortem**
- Channel: `/postmortem` (last 24h) or `/postmortem 6 checkout outage SEV2`
- `/postmortem help`

Current scope: single workspace (bot token in env). Multi-workspace OAuth comes with accounts.
