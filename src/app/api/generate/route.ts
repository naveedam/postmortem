import { z } from "zod";
import { generatePostmortem, provider } from "@/lib/generate";

const Body = z.object({
  thread: z.string().min(50, "Paste at least a few lines of the incident thread").max(200_000),
  context: z.string().max(10_000).optional().default(""),
});

export async function POST(req: Request) {
  if (!provider()) {
    return Response.json({ error: "Server has no AI key configured (GEMINI_API_KEY or ANTHROPIC_API_KEY)" }, { status: 500 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  try {
    return Response.json({ postmortem: await generatePostmortem(parsed.data.thread, parsed.data.context) });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Generation failed. Try again." }, { status: 502 });
  }
}
