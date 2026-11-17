import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { SYSTEM_PROMPT } from "@/lib/prompt";


const Body = z.object({
  thread: z.string().min(50, "Paste at least a few lines of the incident thread").max(200_000),
  context: z.string().max(10_000).optional().default(""),
});

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "Server is missing ANTHROPIC_API_KEY" }, { status: 500 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { thread, context } = parsed.data;

  const client = new Anthropic();
  try {
    const msg = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `<context>\n${context || "None provided"}\n</context>\n\n<incident_thread>\n${thread}\n</incident_thread>`,
        },
      ],
    });
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    return Response.json({ postmortem: JSON.parse(json) });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Generation failed. Try again." }, { status: 502 });
  }
}
