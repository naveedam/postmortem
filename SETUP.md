# Morning setup — v0.5 (sign-in + dashboard)

About 10 minutes.

## 1. Upload the code
Unzip and upload everything over the `naveedam/postmortem` repo (GitHub → Add file → Upload files → drag the folder contents → Commit). Vercel deploys automatically.

## 2. Add one Vercel environment variable
Settings → Environment Variables → Add:

| Key | Value |
|---|---|
| `SESSION_SECRET` | output of `openssl rand -base64 32` (run it again — must be different from `TOKEN_ENC_KEY`) |

Save it in your password manager too. Changing it later just signs everyone out (harmless).

Then **Deployments → ⋯ → Redeploy**.

## 3. Update the Slack app manifest
api.slack.com/apps → Afterwatch → **App Manifest** → JSON → paste `slack-manifest.json` → Save.
(Adds the sign-in return URL `/api/auth/slack/callback`.)

## 4. Test
1. Open `https://postmortem-gilt.vercel.app/app` → you're sent to Slack → **Allow** → you land on the dashboard showing RizQ Labs, your name, "0 of 5 free this month" (or the real count) and your existing postmortems.
2. Click a postmortem → it opens. Edit → Save works.
3. Open the same postmortem link in a private/incognito window → it asks you to sign in (no longer public).
4. In Slack, run **Write postmortem** on a new thread → the "Open full postmortem" button → opens after sign-in.
5. Sign out (top right) → visiting `/app` asks you to sign in again.

If sign-in shows "Something went wrong": Vercel → Logs, look for `signin failed`, send me the line.

## What changed
- **Sign in with Slack** (OpenID Connect) — no passwords. Only workspaces that installed Afterwatch can sign in.
- **Postmortems are private to their workspace.** The old "anyone with the link" access is gone; someone from another workspace gets "not found".
- **Dashboard at `/app`** — all postmortems, search by title, severity badges, free-plan usage meter.
- Landing page has a **Sign in** link; the install success page now goes to the dashboard.

## Still yours to decide before launch
- Buy **afterwatch.dev** (or .app). Then update `APP_URL`, both Slack redirect URLs, slash-command URL and interactivity URL in the manifest, and the `hello@afterwatch.dev` contact address.
- Switch Gemini to the **paid tier** (or use Claude) — the privacy page promises no training on customer data.
- Payments (Stripe/Paddle) — when you're ready; the plan field and usage meter are already in place.
- Slack app → **Manage Distribution → Activate Public Distribution** so other companies can install.
