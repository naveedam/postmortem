import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

/** List the signed-in workspace's postmortems. ?q= searches title. */
export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Sign in required" }, { status: 401 });
  const d = db();
  if (!d) return Response.json({ error: "Database not configured" }, { status: 500 });
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 100);
  let query = d
    .from("postmortems")
    .select("slug, title, severity, created_at, updated_at, channel_id")
    .eq("team_id", s.teamId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (q) query = query.ilike("title", `%${q.replace(/[%_\\]/g, (c) => "\\" + c)}%`);
  const { data, error } = await query;
  if (error) return Response.json({ error: "Query failed" }, { status: 500 });
  return Response.json({ items: data }, { headers: { "Cache-Control": "no-store" } });
}
