"use client";

import { useState } from "react";

const AUDIENCES = [
  ["executive", "Leadership", "Business impact, status, prevention. No jargon."],
  ["customer", "Customers / status page", "Plain English. No internal names or systems."],
  ["support", "Support team", "What customers may report and what to tell them."],
] as const;

/** Drafts a stakeholder update from this postmortem for the chosen audience. */
export default function UpdatePanel({ slug }: { slug: string }) {
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number][0]>("executive");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function draft() {
    setBusy(true); setErr(null); setCopied(false);
    const r = await fetch("/api/updates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug, audience }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setText(j.text); else setErr(j.error ?? "Couldn't draft the update");
    setBusy(false);
  }

  return (
    <section className="rounded-xl border border-zinc-800 p-5">
      <h2 className="font-medium">Stakeholder update</h2>
      <p className="text-sm text-zinc-500 mt-1">Draft a resolution update from this postmortem. Review and fill any [confirm: …] gaps before sending.</p>
      <div className="grid sm:grid-cols-3 gap-2 mt-4">
        {AUDIENCES.map(([key, label, hint]) => (
          <button key={key} onClick={() => setAudience(key)}
            className={`text-left rounded-lg border px-3 py-2.5 ${audience === key ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-800 hover:border-zinc-600"}`}>
            <span className="block text-sm font-medium">{label}</span>
            <span className="block text-xs text-zinc-500 mt-0.5">{hint}</span>
          </button>
        ))}
      </div>
      <button onClick={draft} disabled={busy}
        className="mt-4 rounded-lg bg-emerald-500 text-zinc-950 font-medium px-4 py-2 text-sm hover:bg-emerald-400 disabled:opacity-50">
        {busy ? "Drafting…" : text ? "Redraft" : "Draft update"}
      </button>
      {err && <p className="mt-3 text-sm text-red-300">{err}</p>}
      {text && (
        <div className="mt-4">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8}
            className="w-full rounded-lg bg-zinc-900 border border-zinc-800 p-3 text-sm leading-relaxed focus:outline-none focus:border-emerald-500" />
          <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); }}
            className="mt-2 text-sm text-zinc-300 hover:text-white">{copied ? "Copied ✓" : "Copy"}</button>
        </div>
      )}
    </section>
  );
}
