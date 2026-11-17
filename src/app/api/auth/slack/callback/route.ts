import { cookies } from "next/headers";
import { appUrl, db } from "@/lib/db";
import { setSession } from "@/lib/session";

type Claims = {
  sub: string;
  nonce?: string;
  name?: string;
  email?: string;
  picture?: string;
  "https://slack.com/user_id": string;
  "https://slack.com/team_id": string;
  "https://slack.com/team_name"?: string;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jar = await cookies();
  const state = jar.get("aw_oidc_state")?.value;
  const nonce = jar.get("aw_oidc_nonce")?.value;
  const next = jar.get("aw_oidc_next")?.value ?? "/app";
  for (const c of ["aw_oidc_state", "aw_oidc_nonce", "aw_oidc_next"]) jar.delete(c);

  const fail = (reason: string) => Response.redirect(`${appUrl()}/signin?error=${reason}`, 302);
  if (url.searchParams.get("error")) return fail("cancelled");
  const code = url.searchParams.get("code");
  if (!code || !state || url.searchParams.get("state") !== state) return fail("invalid");

  try {
    // Exchange code → id_token (server-to-server over TLS with our client secret, so the token is trusted).
    const res = await fetch("https://slack.com/api/openid.connect.token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        redirect_uri: `${appUrl()}/api/auth/slack/callback`,
      }),
    });
    const tok = await res.json();
    if (!tok.ok || !tok.id_token) throw new Error(`openid.connect.token: ${tok.error}`);
    const claims = JSON.parse(Buffer.from(tok.id_token.split(".")[1], "base64url").toString()) as Claims;
    if (nonce && claims.nonce && claims.nonce !== nonce) return fail("invalid");

    const teamId = claims["https://slack.com/team_id"];
    // Only workspaces that installed Afterwatch can sign in.
    const d = db();
    const { data: ws } = d
      ? await d.from("workspaces").select("team_name").eq("team_id", teamId).maybeSingle()
      : { data: null };
    if (!ws) return fail("not_installed");

    await setSession({
      userId: claims["https://slack.com/user_id"],
      teamId,
      teamName: claims["https://slack.com/team_name"] ?? ws.team_name ?? "",
      name: claims.name ?? "",
      email: claims.email,
      avatar: claims.picture,
    });
    return Response.redirect(`${appUrl()}${next}`, 302);
  } catch (e) {
    console.error("signin failed", e);
    return fail("error");
  }
}
