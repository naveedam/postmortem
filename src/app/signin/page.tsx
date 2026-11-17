"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

const messages: Record<string, string> = {
  cancelled: "Sign-in was cancelled.",
  invalid: "That sign-in link expired. Please try again.",
  not_installed: "Afterwatch isn't installed in that Slack workspace yet. Add it first, then sign in.",
  error: "Something went wrong signing you in. Please try again.",
};

function Body() {
  const error = useSearchParams().get("error");
  return (
    <div className="max-w-sm w-full text-center space-y-5">
      <a href="/" className="font-semibold tracking-tight text-xl">after<span className="text-emerald-400">watch</span></a>
      <h1 className="text-2xl font-semibold">Sign in</h1>
      {error && <p className="text-sm text-amber-300">{messages[error] ?? messages.error}</p>}
      <a href="/api/auth/slack/login?next=/app" className="flex items-center justify-center gap-2 rounded-lg bg-white text-zinc-900 font-medium py-3 hover:bg-zinc-200">
        Sign in with Slack
      </a>
      {error === "not_installed" && (
        <a href="/api/slack/install" className="block text-sm text-emerald-400 hover:underline">Add Afterwatch to Slack →</a>
      )}
      <p className="text-xs text-zinc-500">Postmortems are visible only to members of the Slack workspace that created them.</p>
    </div>
  );
}

export default function SignIn() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
      <Suspense><Body /></Suspense>
    </main>
  );
}
