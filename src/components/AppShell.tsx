"use client";

import { useEffect, useState } from "react";

export type Me = { user: { id: string; name: string; avatar?: string; teamName: string }; usage: { used: number; limit: number | null } };

const TABS = [
  ["postmortems", "/app", "Postmortems"],
  ["actions", "/app/actions", "Action items"],
  ["settings", "/app/settings", "Settings"],
] as const;

/** Signed-in layout: header, tabs, sign-in redirect. Children get the current user. */
export default function AppShell({ active, children }: { active: (typeof TABS)[number][0]; children: (me: Me) => React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    fetch("/api/me").then(async (r) => {
      if (r.status === 401) { window.location.href = `/api/auth/slack/login?next=${encodeURIComponent(location.pathname)}`; return; }
      setMe(await r.json());
    });
  }, []);
  if (!me) return <main className="min-h-screen bg-zinc-950" />;
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
            <a href="/try" className="hidden sm:inline text-zinc-400 hover:text-white">Paste a thread</a>
            <div className="flex items-center gap-2">
              {me.user.avatar && <img src={me.user.avatar} alt="" className="h-7 w-7 rounded-full" />}
              <span className="hidden sm:inline text-zinc-300">{me.user.name}</span>
            </div>
            <form action="/api/auth/logout" method="post"><button className="text-zinc-500 hover:text-white">Sign out</button></form>
          </div>
        </div>
        <nav className="max-w-5xl mx-auto px-6 flex gap-6 text-sm">
          {TABS.map(([key, href, label]) => (
            <a key={key} href={href}
              className={`pb-3 -mb-px border-b-2 ${active === key ? "border-emerald-400 text-white" : "border-transparent text-zinc-400 hover:text-white"}`}>
              {label}
            </a>
          ))}
        </nav>
      </header>
      <div className="max-w-5xl mx-auto px-6 py-10">{children(me)}</div>
    </main>
  );
}
