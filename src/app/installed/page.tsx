"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Body() {
  const q = useSearchParams();
  const status = q.get("status");
  const team = q.get("team");
  const ok = status === "ok";
  return (
    <div className="max-w-lg text-center space-y-4">
      <h1 className="text-2xl font-semibold">{ok ? `Installed in ${team ?? "your workspace"} 🎉` : "Install didn't complete"}</h1>
      {ok ? (
        <div className="text-zinc-400 space-y-2 text-sm">
          <p>1. In your incident channel, type <code className="text-emerald-400">/invite @Afterwatch</code></p>
          <p>2. On any incident thread: hover a message → ⋮ More actions → <b>Write postmortem</b></p>
          <p>3. Or type <code className="text-emerald-400">/postmortem</code> to draft from the last 24h</p>
        </div>
      ) : (
        <p className="text-zinc-400 text-sm">
          {status === "cancelled" ? "You cancelled the install." : "Something went wrong. Please try again."}
        </p>
      )}
      <a href={ok ? "/" : "/api/slack/install"} className="inline-block rounded-lg bg-emerald-500 text-zinc-950 font-medium px-4 py-2">
        {ok ? "Back to home" : "Try again"}
      </a>
    </div>
  );
}

export default function Installed() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <Suspense><Body /></Suspense>
    </main>
  );
}
