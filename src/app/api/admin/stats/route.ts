import { db, FREE_MONTHLY_LIMIT } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";

type WS = { team_id: string; team_name: string | null; plan: string; installed_at: string };
type PM = { team_id: string | null; title: string; severity: string | null; created_at: string; slug: string };

/** Everything the admin dashboard needs in one call. Never returns tokens or postmortem bodies. */
export async function GET() {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const d = db();
  if (!d) return Response.json({ error: "Database not configured" }, { status: 500 });

  const [{ data: wsRows, error: e1 }, { data: pmRows, error: e2 }] = await Promise.all([
    d.from("workspaces").select("team_id, team_name, plan, installed_at").order("installed_at", { ascending: false }),
    d.from("postmortems").select("team_id, title, severity, created_at, slug").order("created_at", { ascending: false }).limit(5000),
  ]);
  if (e1 || e2) return Response.json({ error: "Query failed" }, { status: 500 });
  const workspaces = (wsRows ?? []) as WS[];
  const pms = (pmRows ?? []) as PM[];

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const dayKey = (iso: string) => iso.slice(0, 10);
  const since30 = new Date(now.getTime() - 29 * 86400_000);

  const perTeam = new Map<string, { total: number; month: number; last: string | null }>();
  for (const p of pms) {
    if (!p.team_id) continue;
    const t = perTeam.get(p.team_id) ?? { total: 0, month: 0, last: null };
    t.total++;
    if (p.created_at >= monthStart) t.month++;
    if (!t.last || p.created_at > t.last) t.last = p.created_at;
    perTeam.set(p.team_id, t);
  }

  const days: { day: string; installs: number; postmortems: number }[] = [];
  for (let i = 0; i < 30; i++) {
    const dt = new Date(since30.getTime() + i * 86400_000);
    days.push({ day: dt.toISOString().slice(0, 10), installs: 0, postmortems: 0 });
  }
  const idx = new Map(days.map((x, i) => [x.day, i]));
  for (const w of workspaces) { const i = idx.get(dayKey(w.installed_at)); if (i !== undefined) days[i].installs++; }
  for (const p of pms) { const i = idx.get(dayKey(p.created_at)); if (i !== undefined) days[i].postmortems++; }

  const names = new Map(workspaces.map((w) => [w.team_id, w.team_name ?? w.team_id]));
  const rows = workspaces.map((w) => {
    const t = perTeam.get(w.team_id) ?? { total: 0, month: 0, last: null };
    return {
      teamId: w.team_id, name: w.team_name ?? w.team_id, plan: w.plan, installedAt: w.installed_at,
      total: t.total, thisMonth: t.month, lastUsed: t.last,
      atLimit: w.plan === "free" && t.month >= FREE_MONTHLY_LIMIT,
    };
  });

  const weekAgo = new Date(now.getTime() - 7 * 86400_000).toISOString();
  return Response.json({
    totals: {
      workspaces: workspaces.length,
      activeWorkspaces: rows.filter((r) => r.total > 0).length,
      paid: rows.filter((r) => r.plan !== "free").length,
      atLimit: rows.filter((r) => r.atLimit).length,
      postmortems: pms.length,
      postmortemsThisMonth: pms.filter((p) => p.created_at >= monthStart).length,
      installsLast7: workspaces.filter((w) => w.installed_at >= weekAgo).length,
    },
    freeLimit: FREE_MONTHLY_LIMIT,
    days,
    workspaces: rows,
    recent: pms.slice(0, 25).map((p) => ({
      workspace: p.team_id ? names.get(p.team_id) ?? p.team_id : "—",
      title: p.title, severity: p.severity, createdAt: p.created_at,
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}
