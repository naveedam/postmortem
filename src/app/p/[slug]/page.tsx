"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ActionList from "@/components/ActionList";
import UpdatePanel from "@/components/UpdatePanel";

type Doc = { title: string; severity: string; markdown: string; created_at: string; updated_at: string };

export default function Page() {
  return (
    <Suspense fallback={<Shell><p className="text-zinc-500">Loading…</p></Shell>}>
      <PostmortemPage />
    </Suspense>
  );
}

function PostmortemPage() {
  const { slug } = useParams<{ slug: string }>();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [md, setMd] = useState("");
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "saving" | "saved" | "error">("loading");

  useEffect(() => {
    fetch(`/api/p/${slug}`)
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = `/api/auth/slack/login?next=${encodeURIComponent(`/p/${slug}`)}`;
          return;
        }
        if (!r.ok) throw new Error();
        const d: Doc = await r.json();
        setDoc(d);
        setMd(d.markdown);
        setStatus("ready");
      })
      .catch(() => setStatus("missing"));
  }, [slug]);

  async function save() {
    setStatus("saving");
    const r = await fetch(`/api/p/${slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: md }),
    });
    setStatus(r.ok ? "saved" : "error");
    if (r.ok) setMode("view");
  }

  function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    a.download = `${(doc?.title ?? "postmortem").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`;
    a.click();
  }

  if (status === "loading") return <Shell><p className="text-zinc-500">Loading…</p></Shell>;
  if (status === "missing") return <Shell><p className="text-zinc-400">This postmortem doesn't exist, or it belongs to a different Slack workspace than the one you're signed in to.</p></Shell>;

  const dirty = md !== doc?.markdown && status !== "saved";

  return (
    <Shell
      actions={
        <div className="flex items-center gap-3 text-sm">
          {status === "saving" && <span className="text-zinc-500">Saving…</span>}
          {status === "saved" && <span className="text-emerald-400">Saved</span>}
          {status === "error" && <span className="text-red-400">Save failed</span>}
          <button onClick={() => navigator.clipboard.writeText(md)} className="text-zinc-300 hover:text-white">Copy Markdown</button>
          <button onClick={download} className="text-zinc-300 hover:text-white">Download</button>
          {mode === "view" ? (
            <button onClick={() => setMode("edit")} className="rounded-md bg-zinc-800 px-3 py-1.5 hover:bg-zinc-700">Edit</button>
          ) : (
            <button onClick={save} disabled={!dirty} className="rounded-md bg-emerald-500 text-zinc-950 font-medium px-3 py-1.5 disabled:opacity-40">Save</button>
          )}
        </div>
      }
    >
      <p className="text-xs text-zinc-500 mb-6">
        AI-drafted {new Date(doc!.created_at).toLocaleString()} · visible to your Slack workspace only
      </p>
      {mode === "edit" ? (
        <textarea
          value={md}
          onChange={(e) => { setMd(e.target.value); if (status === "saved") setStatus("ready"); }}
          className="w-full min-h-[70vh] rounded-lg bg-zinc-900 border border-zinc-800 p-4 font-mono text-sm focus:outline-none focus:border-emerald-500"
        />
      ) : (
        <article className="pm-prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
        </article>
      )}
      {mode === "view" && (
        <div className="mt-12 space-y-8">
          <section>
            <h2 className="font-medium mb-1">Track action items</h2>
            <p className="text-sm text-zinc-500 mb-4">Tick them off here, or send them to your issue tracker.</p>
            <ActionList slug={slug} status="all" showSource={false} />
          </section>
          <UpdatePanel slug={slug} />
        </div>
      )}
    </Shell>
  );
}

function Shell({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <a href="/app" className="font-semibold tracking-tight">after<span className="text-emerald-400">watch</span></a>
          <a href="/app" className="text-sm text-zinc-400 hover:text-white">← All postmortems</a>
        </div>
        {actions}
      </header>
      <div className="max-w-3xl mx-auto px-6 py-10">{children}</div>
    </main>
  );
}
