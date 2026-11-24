import { db } from "@/lib/db";
import { getSession } from "@/lib/session";
import { generateUpdate, type Audience } from "@/lib/generate";

const AUDIENCES: Audience[] = ["executive", "customer", "support"];

/** Draft a stakeholder update from a saved postmortem. Doesn't count toward the quota. */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const audience = AUDIENCES.includes(body?.audience) ? (body.audience as Audience) : null;
  if (!audience || typeof body?.slug !== "string") return Response.json({ error: "slug and audience required" }, { status: 400 });
  const d = db();
  if (!d) return Response.json({ error: "Database not configured" }, { status: 500 });
  const { data } = await d.from("postmortems").select("team_id, markdown").eq("slug", body.slug).maybeSingle();
  if (!data || data.team_id !== s.teamId) return Response.json({ error: "Not found" }, { status: 404 });
  try {
    return Response.json({ text: await generateUpdate(data.markdown, audience, "post") });
  } catch (e) {
    console.error("update failed", e);
    return Response.json({ error: "Generation failed. Try again." }, { status: 502 });
  }
}
