import { sendReminders } from "@/lib/actions";

/** Vercel Cron (see vercel.json). Vercel sends Authorization: Bearer $CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }
  return Response.json(await sendReminders());
}
