import { clearSession } from "@/lib/session";
import { appUrl } from "@/lib/db";

export async function POST() {
  await clearSession();
  return Response.redirect(`${appUrl()}/`, 303);
}
