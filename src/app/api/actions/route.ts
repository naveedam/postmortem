import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

/** ?status=open|done|all  &postmortem=<slug> */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Sign in required" }, { status: 401 });
  const d = db();
  if (!d) return Response.json({ error: "Database not configured" }, { status: 500 });
  const u = new URL(req.url).searchParams;
  const status = u.get("status") ?? "open";
  const slug = u.get("postmortem");
  let q = d.from("action_items")
    .select("id, priority, action, owner, status, tracker, external_key, external_url, created_at, done_at, postmortems!inner(slug, title)")
    .eq("team_id", s.teamId)
    .order("created_at", { ascending: false })
    .limit(500);
  if (status !== "all") q = q.eq("status", status);
  if (slug) q = q.eq("postmortems.slug", slug);
  const { data, error } = await q;
  if (error) return Response.json({ error: "Query failed" }, { status: 500 });
  return Response.json({ items: data }, { headers: { "Cache-Control": "no-store" } });
}
