"use client";

import { useEffect, useState } from "react";

type Me = { user: { name: string; email?: string; avatar?: string; teamName: string }; usage: { used: number; limit: number | null } };
type Item = { slug: string; title: string; severity: string | null; created_at: string; updated_at: string };

const sevColor = (s?: string | null) =>
  s === "SEV1" ? "bg-red-500/15 text-red-300"
  : s === "SEV2" ? "bg-orange-500/15 text-orange-300"
  : s === "SEV3" ? "bg-amber-500/15 text-amber-300"
  : s === "SEV4" ? "bg-sky-500/15 text-sky-300"
  : "bg-zinc-800 text-zinc-400";

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Dashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/me").then(async (r) => {
      if (r.status === 401) {
        window.location.href = "/api/auth/slack/login?next=/app";
        return;
      }
      setMe(await r.json());
    });
  }, []);

  useEffect(() => {
    if (!me) return;
    const t = setTimeout(() => {
      fetch(`/api/postmortems${q ? `?q=${encodeURIComponent(q)}` : ""}`)
        .then((r) => r.json())
        .then((d) => setItems(d.items ?? []));
    }, 200);
    return () => clearTimeout(t);
  }, [me, q]);

  if (!me) return <main className="min-h-screen bg-zinc-950" />;

  const { used, limit } = me.usage;
  const pct = limit ? Math.min(100, (used / limit) * 100) : 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-900">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="font-semibold tracking-tight text-lg">after<span className="text-emerald-400">watch</span></a>
            <span className="text-zinc-700">/</span>
            <span className="text-sm text-zinc-300">{me.user.teamName}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="/try" className="text-zinc-400 hover:text-white">Paste a thread</a>
            <div className="flex items-center gap-2">
              {me.user.avatar && <img src={me.user.avatar} alt="" className="h-7 w-7 rounded-full" />}
              <span className="hidden sm:inline text-zinc-300">{me.user.name}</span>
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="text-zinc-500 hover:text-white">Sign out</button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Postmortems</h1>
            <p className="text-sm text-zinc-500 mt-1">Every draft Afterwatch has written for {me.user.teamName}.</p>
          </div>
          <div className="w-64">
            {limit ? (
              <>
                <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                  <span>Free plan this month</span>
                  <span className={used >= limit ? "text-amber-300" : ""}>{used} of {limit}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className={`h-full ${used >= limit ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                </div>
                {used >= limit && (
                  <a href="/#pricing" className="mt-2 inline-block text-xs text-emerald-400 hover:underline">Upgrade for unlimited →</a>
                )}
              </>
            ) : (
              <p className="text-xs text-zinc-400 text-right">Unlimited plan</p>
            )}
          </div>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title…"
          className="mt-8 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
        />

        <div className="mt-4 rounded-xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
          {items === null && <p className="p-6 text-sm text-zinc-500">Loading…</p>}
          {items?.length === 0 && (
            <div className="p-10 text-center">
              <p className="text-zinc-300">{q ? "No postmortems match that search." : "No postmortems yet."}</p>
              {!q && (
                <p className="mt-2 text-sm text-zinc-500">
                  In Slack, hover any incident message → ⋮ More actions → <b>Write postmortem</b>.
                </p>
              )}
            </div>
          )}
          {items?.map((p) => (
            <a key={p.slug} href={`/p/${p.slug}`} className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-900/60 transition">
              <span className={`shrink-0 text-[11px] font-medium rounded px-2 py-0.5 ${sevColor(p.severity)}`}>
                {p.severity ?? "Unknown"}
              </span>
              <span className="flex-1 truncate">{p.title}</span>
              <span className="shrink-0 text-xs text-zinc-500">{ago(p.created_at)}</span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
