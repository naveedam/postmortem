import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, type Postmortem } from "./prompt";

export async function generatePostmortem(thread: string, context = ""): Promise<Postmortem> {
  const client = new Anthropic();
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
  return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
}
