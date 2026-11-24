import { getSession } from "@/lib/session";
import { getSettings, saveSettings } from "@/lib/actions";
import { parseTracker } from "@/lib/trackers";

const mask = (v?: string) => (v ? `••••${v.slice(-4)}` : "");

/** Never returns secrets: only which tracker, its non-secret fields and masked tails. */
export async function GET() {
  const s = await getSession();
  if (!s) return Response.json({ error: "Sign in required" }, { status: 401 });
  const st = await getSettings(s.teamId);
  const t = st.tracker;
  const tracker = !t ? null
    : t.kind === "linear" ? { kind: t.kind, teamKey: t.teamKey, secret: mask(t.apiKey) }
    : t.kind === "github" ? { kind: t.kind, repo: t.repo, secret: mask(t.token) }
    : { kind: t.kind, site: t.site, email: t.email, projectKey: t.projectKey, secret: mask(t.apiToken) };
  return Response.json({ reminderChannel: st.reminderChannel, remindersEnabled: st.remindersEnabled, tracker }, { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(req: Request) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json().catch(() => null);
  try {
    const patch: Parameters<typeof saveSettings>[1] = {};
    if (typeof body?.remindersEnabled === "boolean") patch.remindersEnabled = body.remindersEnabled;
    if (body && "tracker" in body) {
      const cur = (await getSettings(s.teamId)).tracker;
      const t = body.tracker ? parseTracker(body.tracker, cur) : null;
      if (body.tracker && (!t || Object.values(t).some((v) => !v))) return Response.json({ error: "Fill in every field" }, { status: 400 });
      patch.tracker = t;
    }
    await saveSettings(s.teamId, patch);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Save failed" }, { status: 500 });
  }
}
