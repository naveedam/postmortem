import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

type Ctx = { params: Promise<{ slug: string }> };

/** Only signed-in members of the owning Slack workspace can read or edit a postmortem. */
async function authorize(slug: string) {
  const s = await getSession();
  if (!s) return { error: Response.json({ error: "Sign in required" }, { status: 401 }) };
  const d = db();
  if (!d) return { error: Response.json({ error: "Database not configured" }, { status: 500 }) };
  const { data } = await d.from("postmortems").select("team_id").eq("slug", slug).maybeSingle();
  // Same 404 for "missing" and "other workspace" so slugs can't be probed.
  if (!data || data.team_id !== s.teamId) return { error: Response.json({ error: "Not found" }, { status: 404 }) };
  return { d, s };
}

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const a = await authorize(slug);
  if (a.error) return a.error;
  const { data } = await a.d
    .from("postmortems")
    .select("title, severity, markdown, created_at, updated_at, channel_id, created_by")
    .eq("slug", slug)
    .single();
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const a = await authorize(slug);
  if (a.error) return a.error;
  const body = await req.json().catch(() => null);
  const markdown = typeof body?.markdown === "string" ? body.markdown : null;
  if (!markdown || markdown.length > 200_000) return Response.json({ error: "Invalid content" }, { status: 400 });
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim().slice(0, 200);
  const severity = markdown.match(/\*\*Severity:\*\*\s*(\S+)/)?.[1];
  const { data, error } = await a.d
    .from("postmortems")
    .update({ markdown, ...(title ? { title } : {}), ...(severity ? { severity } : {}), updated_at: new Date().toISOString() })
    .eq("slug", slug)
    .select("updated_at")
    .single();
  if (error) return Response.json({ error: "Save failed" }, { status: 500 });
  return Response.json(data);
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const a = await authorize(slug);
  if (a.error) return a.error;
  await a.d.from("postmortems").delete().eq("slug", slug);
  return new Response(null, { status: 204 });
}
