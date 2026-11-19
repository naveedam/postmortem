import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

const PLANS = ["free", "team", "business"];

/** Change a workspace's plan (e.g. comp a design partner with Team). */
export async function POST(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const d = db();
  if (!d) return Response.json({ error: "Database not configured" }, { status: 500 });
  const body = await req.json().catch(() => null);
  const teamId = typeof body?.teamId === "string" ? body.teamId : null;
  const plan = typeof body?.plan === "string" && PLANS.includes(body.plan) ? body.plan : null;
  if (!teamId || !plan) return Response.json({ error: "teamId and plan required" }, { status: 400 });
  const { error } = await d.from("workspaces").update({ plan }).eq("team_id", teamId);
  if (error) return Response.json({ error: "Update failed" }, { status: 500 });
  return Response.json({ ok: true });
}
