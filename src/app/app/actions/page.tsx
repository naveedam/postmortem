"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import ActionList from "@/components/ActionList";

export default function ActionsPage() {
  const [status, setStatus] = useState<"open" | "done">("open");
  return (
    <AppShell active="actions">
      {() => (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Action items</h1>
              <p className="text-sm text-zinc-500 mt-1">Follow-ups from every postmortem, in one place. Closed tickets are synced back weekly.</p>
            </div>
            <div className="flex gap-1 text-sm">
              {(["open", "done"] as const).map((s) => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`rounded-md px-3 py-1.5 ${status === s ? "bg-zinc-200 text-zinc-900" : "bg-zinc-900 text-zinc-400 hover:text-white"}`}>
                  {s === "open" ? "Open" : "Done"}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8"><ActionList key={status} status={status} /></div>
        </>
      )}
    </AppShell>
  );
}
