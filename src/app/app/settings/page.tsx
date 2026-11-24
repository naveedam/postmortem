"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";

type Kind = "linear" | "github" | "jira";
type Saved = {
  reminderChannel: string | null; remindersEnabled: boolean;
  tracker: null | { kind: Kind; secret: string; teamKey?: string; repo?: string; site?: string; email?: string; projectKey?: string };
};

const FIELDS: Record<Kind, { key: string; label: string; placeholder: string; secret?: boolean; help?: string }[]> = {
  linear: [
    { key: "apiKey", label: "Personal API key", placeholder: "lin_api_…", secret: true, help: "Linear → Settings → Security & access → Personal API keys" },
    { key: "teamKey", label: "Team key", placeholder: "ENG", help: "The prefix on your issue IDs, e.g. ENG in ENG-142" },
  ],
  github: [
    { key: "token", label: "Fine-grained access token", placeholder: "github_pat_…", secret: true, help: "GitHub → Settings → Developer settings → Fine-grained tokens. Repository access: this repo only. Permission: Issues (read & write)" },
    { key: "repo", label: "Repository", placeholder: "acme/platform" },
  ],
  jira: [
    { key: "site", label: "Jira site", placeholder: "acme.atlassian.net" },
    { key: "email", label: "Your Atlassian email", placeholder: "you@acme.com" },
    { key: "apiToken", label: "API token", placeholder: "ATATT…", secret: true, help: "id.atlassian.com → Security → API tokens" },
    { key: "projectKey", label: "Project key", placeholder: "OPS" },
  ],
};
const NAMES: Record<Kind, string> = { linear: "Linear", github: "GitHub Issues", jira: "Jira Cloud" };

function Settings() {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [kind, setKind] = useState<Kind>("linear");
  const [form, setForm] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const s: Saved = await (await fetch("/api/settings")).json();
    setSaved(s);
    if (s.tracker) {
      setKind(s.tracker.kind);
      setForm({ teamKey: s.tracker.teamKey ?? "", repo: s.tracker.repo ?? "", site: s.tracker.site ?? "", email: s.tracker.email ?? "", projectKey: s.tracker.projectKey ?? "" });
    }
  }
  useEffect(() => { load(); }, []);

  const connectedSame = saved?.tracker?.kind === kind;
  const body = () => ({ tracker: { kind, ...form } });

  async function call(url: string, method: string, payload: unknown, okText?: string) {
    setBusy(true); setMsg(null);
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const j = await r.json().catch(() => ({}));
    setMsg(r.ok ? { ok: true, text: okText ?? j.message ?? "Saved" } : { ok: false, text: j.error ?? "Something went wrong" });
    setBusy(false);
    if (r.ok) await load();
    return r.ok;
  }

  if (!saved) return <p className="text-sm text-zinc-500">Loading…</p>;

  return (
    <div className="space-y-10 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Applies to everyone in your Slack workspace.</p>
      </div>

      <section className="rounded-xl border border-zinc-800 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-medium">Issue tracker</h2>
            <p className="text-sm text-zinc-400 mt-1">Turn postmortem action items into tickets with one click. Closed tickets mark the action item done.</p>
          </div>
          {saved.tracker && <span className="shrink-0 text-xs rounded bg-emerald-500/15 text-emerald-300 px-2 py-1">{NAMES[saved.tracker.kind]} connected</span>}
        </div>

        <div className="flex gap-2 mt-5">
          {(Object.keys(NAMES) as Kind[]).map((k) => (
            <button key={k} onClick={() => { setKind(k); setMsg(null); }}
              className={`rounded-md px-3 py-1.5 text-sm ${kind === k ? "bg-zinc-200 text-zinc-900" : "bg-zinc-900 text-zinc-400 hover:text-white"}`}>
              {NAMES[k]}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          {FIELDS[kind].map((f) => (
            <label key={f.key} className="block">
              <span className="text-sm text-zinc-300">{f.label}</span>
              <input
                type={f.secret ? "password" : "text"}
                autoComplete="off"
                value={form[f.key] ?? ""}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                placeholder={f.secret && connectedSame ? `Saved (${saved.tracker!.secret}). Leave blank to keep` : f.placeholder}
                className="mt-1 w-full rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              />
              {f.help && <span className="block mt-1 text-xs text-zinc-500">{f.help}</span>}
            </label>
          ))}
        </div>

        {msg && <p className={`mt-4 text-sm ${msg.ok ? "text-emerald-300" : "text-red-300"}`}>{msg.text}</p>}

        <div className="mt-5 flex flex-wrap gap-3">
          <button disabled={busy} onClick={() => call("/api/settings/test", "POST", body())}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:border-zinc-500 disabled:opacity-50">Test connection</button>
          <button disabled={busy} onClick={() => call("/api/settings", "PUT", body(), `${NAMES[kind]} saved`)}
            className="rounded-lg bg-emerald-500 text-zinc-950 font-medium px-4 py-2 text-sm hover:bg-emerald-400 disabled:opacity-50">Save</button>
          {saved.tracker && (
            <button disabled={busy}
              onClick={() => confirm("Disconnect the issue tracker? Existing ticket links stay.") && call("/api/settings", "PUT", { tracker: null }, "Disconnected")}
              className="ml-auto text-sm text-zinc-500 hover:text-red-300">Disconnect</button>
          )}
        </div>
        <p className="mt-4 text-xs text-zinc-600">Credentials are encrypted at rest and only used to create and check tickets you ask for.</p>
      </section>

      <section className="rounded-xl border border-zinc-800 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-medium">Weekly reminders in Slack</h2>
            <p className="text-sm text-zinc-400 mt-1">Every Monday, Afterwatch posts open action items older than 3 days, highest priority first, with a Mark done button.</p>
          </div>
          <button
            onClick={() => call("/api/settings", "PUT", { remindersEnabled: !saved.remindersEnabled }, saved.remindersEnabled ? "Reminders off" : "Reminders on")}
            className={`shrink-0 relative h-6 w-11 rounded-full transition ${saved.remindersEnabled ? "bg-emerald-500" : "bg-zinc-700"}`}
            aria-label="Toggle reminders">
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${saved.remindersEnabled ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>
        <div className="mt-4 rounded-lg bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
          {saved.reminderChannel
            ? <>Posting to channel <code className="text-emerald-300">{saved.reminderChannel}</code>.</>
            : <>No channel chosen yet. Reminders go to the channel of your latest postmortem.</>}
          <span className="block mt-1 text-xs text-zinc-500">
            To change it, type <code className="text-zinc-300">/postmortem reminders here</code> in the Slack channel you want.
          </span>
        </div>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return <AppShell active="settings">{() => <Settings />}</AppShell>;
}
