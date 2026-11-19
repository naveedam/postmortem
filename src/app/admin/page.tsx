"use client";

import { useCallback, useEffect, useState } from "react";

type Row = { teamId: string; name: string; plan: string; installedAt: string; total: number; thisMonth: number; lastUsed: string | null; atLimit: boolean };
type Stats = {
  totals: { workspaces: number; activeWorkspaces: number; paid: number; atLimit: number; postmortems: number; postmortemsThisMonth: number; installsLast7: number };
  freeLimit: number;
  days: { day: string; installs: number; postmortems: number }[];
  workspaces: Row[];
  recent: { workspace: string; title: string; severity: string | null; createdAt: string }[];
};

function ago(iso: string | null) {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

const planStyle = (p: string) =>
  p === "free" ? "bg-zinc-800 text-zinc-300" : p === "team" ? "bg-emerald-500/15 text-emerald-300" : "bg-sky-500/15 text-sky-300";

export default function Admin() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [denied, setDenied] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "limit" | "unused">("all");
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/stats");
    if (r.status === 401) { window.location.href = "/api/auth/slack/login?next=/admin"; return; }
    if (r.status === 403) { setDenied((await r.json()).userId ?? "unknown"); return; }
    setStats(await r.json());
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);

  async function setPlan(teamId: string, plan: string) {
    setSaving(teamId);
    await fetch("/api/admin/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId, plan }) });
    await load();
    setSaving(null);
  }

  if (denied)
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 grid place-items-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">Admins only</h1>
          <p className="text-sm text-zinc-400">Your Slack user ID is</p>
          <code className="block text-emerald-300 text-lg">{denied}</code>
          <p className="text-sm text-zinc-400">
            To get access, add it to <code className="text-zinc-200">ADMIN_SLACK_USER_IDS</code> in Vercel and redeploy.
          </p>
        </div>
      </main>
    );
  if (!stats) return <main className="min-h-screen bg-zinc-950" />;

  const t = stats.totals;
  const max = Math.max(1, ...stats.days.map((d) => d.postmortems), ...stats.days.map((d) => d.installs));
  const rows = stats.workspaces.filter((w) =>
    filter === "active" ? w.total > 0 : filter === "limit" ? w.atLimit : filter === "unused" ? w.total === 0 : true,
  );

  const kpis: [string, number | string, string?][] = [
    ["Workspaces", t.workspaces, `+${t.installsLast7} last 7 days`],
    ["Active", t.activeWorkspaces, "wrote ≥1 postmortem"],
    ["Postmortems", t.postmortems, `${t.postmortemsThisMonth} this month`],
    ["At free limit", t.atLimit, `≥${stats.freeLimit} this month`],
    ["Paid / comped", t.paid],
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-900">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="font-semibold tracking-tight">after<span className="text-emerald-400">watch</span></a>
            <span className="text-[11px] rounded bg-amber-500/15 text-amber-300 px-2 py-0.5 font-medium">ADMIN</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <button onClick={load} className="hover:text-white">Refresh</button>
            <a href="/app" className="hover:text-white">My dashboard</a>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {kpis.map(([label, val, sub]) => (
            <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="text-3xl font-semibold mt-1">{val}</p>
              {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
            </div>
          ))}
        </section>

        <section className="rounded-xl border border-zinc-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium">Last 30 days</h2>
            <div className="flex gap-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-emerald-500 inline-block" />Postmortems</span>
              <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-sky-400 inline-block" />Installs</span>
            </div>
          </div>
          <div className="flex items-end gap-1 h-36">
            {stats.days.map((d) => (
              <div key={d.day} className="flex-1 flex items-end gap-[2px] h-full group relative" title={`${d.day}: ${d.postmortems} postmortems, ${d.installs} installs`}>
                <div className="flex-1 bg-emerald-500/80 rounded-t-sm" style={{ height: `${(d.postmortems / max) * 100}%`, minHeight: d.postmortems ? 3 : 0 }} />
                <div className="flex-1 bg-sky-400/80 rounded-t-sm" style={{ height: `${(d.installs / max) * 100}%`, minHeight: d.installs ? 3 : 0 }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-zinc-500 mt-2">
            <span>{stats.days[0].day}</span><span>today</span>
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="font-medium">Workspaces</h2>
            <div className="flex gap-1 text-xs">
              {(["all", "active", "limit", "unused"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`rounded-md px-2.5 py-1 ${filter === f ? "bg-zinc-200 text-zinc-900" : "bg-zinc-900 text-zinc-400 hover:text-white"}`}>
                  {f === "all" ? "All" : f === "active" ? "Active" : f === "limit" ? "At limit" : "Installed, unused"}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-zinc-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-zinc-400 text-xs">
                <tr>
                  {["Workspace", "Installed", "Postmortems", "This month", "Last used", "Plan"].map((h) => (
                    <th key={h} className="text-left font-medium px-4 py-2.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-zinc-500 text-center">Nothing here yet.</td></tr>}
                {rows.map((w) => (
                  <tr key={w.teamId} className="hover:bg-zinc-900/40">
                    <td className="px-4 py-3">
                      <div className="font-medium">{w.name}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">{w.teamId}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{ago(w.installedAt)}</td>
                    <td className="px-4 py-3">{w.total}</td>
                    <td className="px-4 py-3">
                      <span className={w.atLimit ? "text-amber-300 font-medium" : ""}>{w.thisMonth}</span>
                      {w.atLimit && <span className="ml-2 text-[10px] rounded bg-amber-500/15 text-amber-300 px-1.5 py-0.5">LIMIT</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">{ago(w.lastUsed)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={w.plan}
                        disabled={saving === w.teamId}
                        onChange={(e) => {
                          if (confirm(`Change ${w.name} to the ${e.target.value} plan?`)) setPlan(w.teamId, e.target.value);
                        }}
                        className={`rounded-md px-2 py-1 text-xs border-0 ${planStyle(w.plan)}`}
                      >
                        <option value="free">free</option>
                        <option value="team">team</option>
                        <option value="business">business</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="font-medium mb-3">Recent postmortems</h2>
          <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800">
            {stats.recent.length === 0 && <p className="px-4 py-6 text-zinc-500 text-center text-sm">None yet.</p>}
            {stats.recent.map((p, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 text-sm">
                <span className="w-40 shrink-0 truncate text-zinc-400">{p.workspace}</span>
                <span className="w-16 shrink-0 text-xs text-zinc-500">{p.severity ?? "—"}</span>
                <span className="flex-1 truncate">{p.title}</span>
                <span className="shrink-0 text-xs text-zinc-500">{ago(p.createdAt)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-2">Titles only. Postmortem content stays private to each workspace.</p>
        </section>
      </div>
    </main>
  );
}
