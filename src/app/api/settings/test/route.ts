import { getSession } from "@/lib/session";
import { getSettings } from "@/lib/actions";
import { parseTracker, testTracker } from "@/lib/trackers";

/** Test tracker credentials before saving (blank secret = use the saved one). */
export async function POST(req: Request) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Sign in required" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const t = parseTracker(body?.tracker, (await getSettings(s.teamId)).tracker);
  if (!t || Object.values(t).some((v) => !v)) return Response.json({ error: "Fill in every field" }, { status: 400 });
  try {
    return Response.json({ ok: true, message: await testTracker(t) });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Connection failed" }, { status: 400 });
  }
}
