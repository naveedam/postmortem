import { getSession } from "@/lib/session";
import { pushItem } from "@/lib/actions";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) return Response.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await params;
  try {
    return Response.json(await pushItem(s.teamId, id));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Push failed" }, { status: 400 });
  }
}
