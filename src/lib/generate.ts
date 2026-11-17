import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, type Postmortem } from "./prompt";

/** Provider is picked by env: GEMINI_API_KEY → Gemini, else ANTHROPIC_API_KEY → Claude. Force with LLM_PROVIDER=gemini|anthropic. */
export function provider(): "gemini" | "anthropic" | null {
  const forced = process.env.LLM_PROVIDER;
  if (forced === "gemini" || forced === "anthropic") return forced;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

function userContent(thread: string, context: string) {
  return `<context>\n${context || "None provided"}\n</context>\n\n<incident_thread>\n${thread}\n</incident_thread>`;
}

async function viaAnthropic(thread: string, context: string): Promise<string> {
  const msg = await new Anthropic().messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent(thread, context) }],
  });
  return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

async function viaGemini(thread: string, context: string): Promise<string> {
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userContent(thread, context) }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8000, temperature: 0.2 },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${data?.error?.message ?? "request failed"}`);
  return (data.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
}

export async function generatePostmortem(thread: string, context = ""): Promise<Postmortem> {
  const p = provider();
  if (!p) throw new Error("No LLM key configured (set GEMINI_API_KEY or ANTHROPIC_API_KEY)");
  const text = p === "gemini" ? await viaGemini(thread, context) : await viaAnthropic(thread, context);
  return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
}
