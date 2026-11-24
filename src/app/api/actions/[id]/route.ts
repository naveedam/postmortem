import { getSession } from "@/lib/session";
import { setStatus } from "@/lib/actions";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (body?.status !== "open" && body?.status !== "done") return Response.json({ error: "status must be open or done" }, { status: 400 });
  try {
    await setStatus(s.teamId, id, body.status);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Update failed" }, { status: 500 });
  }
}
