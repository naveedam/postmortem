import { cookies } from "next/headers";
import { oauthAccess } from "@/lib/slack";
import { appUrl, db } from "@/lib/db";

/** Slack redirects here after the user approves the install. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("slack_oauth_state")?.value;
  jar.delete("slack_oauth_state");

  if (url.searchParams.get("error")) return Response.redirect(`${appUrl()}/installed?status=cancelled`, 302);
  if (!code || !state || state !== expected) return Response.redirect(`${appUrl()}/installed?status=invalid`, 302);

  try {
    const r = await oauthAccess(code, `${appUrl()}/api/slack/oauth`);
    const d = db();
    if (!d) throw new Error("Database not configured");
    const { error } = await d.from("workspaces").upsert(
      {
        team_id: r.team.id,
        team_name: r.team.name,
        bot_token: r.access_token,
        bot_user_id: r.bot_user_id,
        installed_by: r.authed_user?.id ?? null,
      },
      { onConflict: "team_id" },
    );
    if (error) throw error;
    return Response.redirect(`${appUrl()}/installed?status=ok&team=${encodeURIComponent(r.team.name)}`, 302);
  } catch (e) {
    console.error("oauth failed", e);
    return Response.redirect(`${appUrl()}/installed?status=error`, 302);
  }
}
