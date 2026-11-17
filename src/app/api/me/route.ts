import { getSession } from "@/lib/session";
import { usage } from "@/lib/db";

export async function GET() {
  const s = await getSession();
  if (!s) return Response.json({ user: null }, { status: 401 });
  const u = await usage(s.teamId);
  return Response.json(
    { user: { name: s.name, email: s.email, avatar: s.avatar, teamName: s.teamName }, usage: { used: u.used, limit: Number.isFinite(u.limit) ? u.limit : null } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
