"use client";

import { useState } from "react";
import { toMarkdown, type Postmortem } from "@/lib/prompt";

const SAMPLE = `[02:41] PagerDuty: CRITICAL checkout-api p99 latency > 3s
[02:43] priya: ack, looking. error rate on checkout up to 18%
[02:47] priya: db connections maxed on orders-db primary (500/500)
[02:52] arjun: deploy #4821 went out at 02:30 — added order history join in checkout path
[02:55] priya: confirmed slow query from new join, no index on orders.customer_id
[02:58] arjun: rolling back #4821
[03:06] priya: latency back to normal, errors < 0.5%
[03:10] arjun: will add index + load test before re-shipping
[03:12] priya: resolving incident. ~25 min customer impact on checkout`;

export default function Home() {
  const [thread, setThread] = useState("");
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [md, setMd] = useState("");
  const [pm, setPm] = useState<Postmortem | null>(null);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread, context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPm(data.postmortem);
      setMd(toMarkdown(data.postmortem));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function download() {
    const blob = new Blob([md], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(pm?.title ?? "postmortem").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    a.click();
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <span className="font-semibold tracking-tight">Postmortem<span className="text-emerald-400">.</span></span>
        <div className="flex items-center gap-4">
          <span className="hidden md:inline text-xs text-zinc-500">Incident thread → blameless postmortem in under a minute</span>
          <a href="/api/slack/install" className="rounded-md bg-white text-zinc-900 text-sm font-medium px-3 py-1.5 hover:bg-zinc-200">Add to Slack</a>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-6 p-6">
        <section className="space-y-4">
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-sm font-medium">Incident thread</label>
              <button onClick={() => setThread(SAMPLE)} className="text-xs text-emerald-400 hover:underline">
                Load sample
              </button>
            </div>
            <textarea
              value={thread}
              onChange={(e) => setThread(e.target.value)}
              placeholder="Paste the Slack/Teams incident thread, alert messages, chat log…"
              className="w-full h-80 rounded-lg bg-zinc-900 border border-zinc-800 p-3 font-mono text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-2">Extra context (optional)</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="PR links, affected services, severity, customer reports…"
              className="w-full h-24 rounded-lg bg-zinc-900 border border-zinc-800 p-3 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            onClick={generate}
            disabled={loading || thread.length < 50}
            className="w-full rounded-lg bg-emerald-500 text-zinc-950 font-medium py-2.5 disabled:opacity-40"
          >
            {loading ? "Writing postmortem…" : "Generate postmortem"}
          </button>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <p className="text-xs text-zinc-500">Remove secrets and customer data before pasting. Threads are not stored.</p>
        </section>

        <section className="flex flex-col">
          <div className="flex justify-between items-end mb-2">
            <label className="text-sm font-medium">Postmortem (editable Markdown)</label>
            {md && (
              <div className="flex gap-3 text-xs">
                <button onClick={() => navigator.clipboard.writeText(md)} className="text-emerald-400 hover:underline">Copy</button>
                <button onClick={download} className="text-emerald-400 hover:underline">Download .md</button>
              </div>
            )}
          </div>
          <textarea
            value={md}
            onChange={(e) => setMd(e.target.value)}
            placeholder="Your postmortem appears here."
            className="flex-1 min-h-[30rem] rounded-lg bg-zinc-900 border border-zinc-800 p-3 font-mono text-sm focus:outline-none"
          />
        </section>
      </div>
    </main>
  );
}
