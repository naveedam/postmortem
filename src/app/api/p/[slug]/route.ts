import { db } from "@/lib/db";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { slug } = await params;
  const d = db();
  if (!d) return Response.json({ error: "Database not configured" }, { status: 500 });
  const { data } = await d
    .from("postmortems")
    .select("title, severity, markdown, created_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const d = db();
  if (!d) return Response.json({ error: "Database not configured" }, { status: 500 });
  const body = await req.json().catch(() => null);
  const markdown = typeof body?.markdown === "string" ? body.markdown : null;
  if (!markdown || markdown.length > 200_000) return Response.json({ error: "Invalid content" }, { status: 400 });
  const title = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim().slice(0, 200);
  const { data, error } = await d
    .from("postmortems")
    .update({ markdown, ...(title ? { title } : {}), updated_at: new Date().toISOString() })
    .eq("slug", slug)
    .select("updated_at")
    .maybeSingle();
  if (error || !data) return Response.json({ error: "Save failed" }, { status: 404 });
  return Response.json(data);
}
