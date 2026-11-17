import crypto from "node:crypto";
import { cookies } from "next/headers";
import { BOT_SCOPES } from "@/lib/slack";
import { appUrl } from "@/lib/db";

/** "Add to Slack" → Slack OAuth consent screen. */
export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");
  (await cookies()).set("slack_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", process.env.SLACK_CLIENT_ID ?? "");
  url.searchParams.set("scope", BOT_SCOPES.join(","));
  url.searchParams.set("redirect_uri", `${appUrl()}/api/slack/oauth`);
  url.searchParams.set("state", state);
  return Response.redirect(url.toString(), 302);
}
