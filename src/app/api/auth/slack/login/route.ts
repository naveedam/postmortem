import crypto from "node:crypto";
import { cookies } from "next/headers";
import { appUrl } from "@/lib/db";
import { safeNext } from "@/lib/session";

/** Sign in with Slack (OpenID Connect). */
export async function GET(req: Request) {
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  const state = crypto.randomBytes(16).toString("hex");
  const nonce = crypto.randomBytes(16).toString("hex");
  const jar = await cookies();
  const opts = { httpOnly: true, secure: true, sameSite: "lax" as const, maxAge: 600, path: "/" };
  jar.set("aw_oidc_state", state, opts);
  jar.set("aw_oidc_nonce", nonce, opts);
  jar.set("aw_oidc_next", next, opts);

  const url = new URL("https://slack.com/openid/connect/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("client_id", process.env.SLACK_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", `${appUrl()}/api/auth/slack/callback`);
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  return Response.redirect(url.toString(), 302);
}
