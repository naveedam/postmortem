"use client";

import { useCallback, useEffect, useState } from "react";

type Item = {
  id: string; priority: string; action: string; owner: string | null; status: "open" | "done";
  tracker: string | null; external_key: string | null; external_url: string | null; created_at: string;
  postmortems: { slug: string; title: string };
};

const TRACKER_NAME: Record<string, string> = { linear: "Linear", github: "GitHub", jira: "Jira" };
const priColor = (p: string) => (p === "P0" ? "text-red-300" : p === "P1" ? "text-amber-300" : "text-sky-300");
const age = (iso: string) => { const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000); return d < 1 ? "today" : `${d}d`; };

/** Action items with done toggles and "create issue" buttons. Pass slug to scope to one postmortem. */
export default function ActionList({ slug, status = "open", showSource = true }: { slug?: string; status?: "open" | "done" | "all"; showSource?: boolean }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [tracker, setTracker] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ status, ...(slug ? { postmortem: slug } : {}) });
    const r = await fetch(`/api/actions?${qs}`);
    setItems(r.ok ? (await r.json()).items : []);
  }, [slug, status]);

  useEffect(() => {
    load();
    fetch("/api/settings").then((r) => (r.ok ? r.json() : null)).then((s) => setTracker(s?.tracker?.kind ?? null));
  }, [load]);

  async function toggle(it: Item) {
    setBusy(it.id);
    await fetch(`/api/actions/${it.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: it.status === "open" ? "done" : "open" }) });
    await load();
    setBusy(null);
  }

  async function push(it: Item) {
    setBusy(it.id); setErr(null);
    const r = await fetch(`/api/actions/${it.id}/push`, { method: "POST" });
    if (!r.ok) setErr((await r.json()).error ?? "Couldn't create the issue");
    await load();
    setBusy(null);
  }

  if (items === null) return <p className="text-sm text-zinc-500 py-4">Loading…</p>;

  return (
    <div>
      {err && <p className="mb-3 text-sm text-red-300">{err}</p>}
      <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
        {items.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-zinc-500">
            {status === "done" ? "Nothing completed yet." : "No open action items. 🎉"}
          </p>
        )}
        {items.map((it) => (
          <div key={it.id} className={`flex items-start gap-4 px-5 py-4 ${it.status === "done" ? "opacity-60" : ""}`}>
            <button onClick={() => toggle(it)} disabled={busy === it.id} aria-label={it.status === "open" ? "Mark done" : "Reopen"}
              className={`mt-0.5 h-5 w-5 shrink-0 rounded border grid place-items-center text-xs ${it.status === "done" ? "bg-emerald-500 border-emerald-500 text-zinc-950" : "border-zinc-600 hover:border-emerald-400"}`}>
              {it.status === "done" ? "✓" : ""}
            </button>
            <div className="flex-1 min-w-0">
              <p className={it.status === "done" ? "line-through text-zinc-400" : ""}>
                <span className={`font-semibold mr-2 ${priColor(it.priority)}`}>{it.priority}</span>{it.action}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {it.owner ?? "Unassigned"} · {age(it.created_at)}
                {showSource && <> · <a href={`/p/${it.postmortems.slug}`} className="hover:text-zinc-300 underline decoration-zinc-700">{it.postmortems.title}</a></>}
              </p>
            </div>
            <div className="shrink-0">
              {it.external_url ? (
                <a href={it.external_url} target="_blank" rel="noreferrer" className="text-xs rounded-md bg-zinc-800 px-2.5 py-1.5 text-zinc-200 hover:bg-zinc-700">
                  {it.external_key} ↗
                </a>
              ) : tracker && it.status === "open" ? (
                <button onClick={() => push(it)} disabled={busy === it.id}
                  className="text-xs rounded-md border border-zinc-700 px-2.5 py-1.5 text-zinc-300 hover:border-emerald-400 hover:text-white disabled:opacity-50">
                  {busy === it.id ? "Creating…" : `Create ${TRACKER_NAME[tracker]} issue`}
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {!tracker && items.some((i) => i.status === "open") && (
        <p className="mt-3 text-xs text-zinc-500">
          Connect Jira, Linear or GitHub in <a href="/app/settings" className="text-emerald-400 hover:underline">Settings</a> to turn these into tickets.
        </p>
      )}
    </div>
  );
}
