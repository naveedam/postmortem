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

/** One LLM call. json=true asks for a JSON object and parses it. */
export async function complete(system: string, user: string, json: true, maxTokens?: number): Promise<Record<string, unknown>>;
export async function complete(system: string, user: string, json?: false, maxTokens?: number): Promise<string>;
export async function complete(system: string, user: string, json = false, maxTokens = 4000) {
  const p = provider();
  if (!p) throw new Error("No LLM key configured (set GEMINI_API_KEY or ANTHROPIC_API_KEY)");
  let text: string;
  if (p === "anthropic") {
    const msg = await new Anthropic().messages.create({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  } else {
    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    const req = () => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          ...(json ? { responseMimeType: "application/json" } : {}),
          maxOutputTokens: maxTokens * 2 + 2048, // headroom: 2.5 models spend output tokens on "thinking"
          temperature: 0.2,
        },
      }),
    });
    // Retry rate limits / overloads (free tier is strict) with backoff.
    let res = await req();
    for (let i = 0; i < 3 && (res.status === 429 || res.status >= 500); i++) {
      await new Promise((r) => setTimeout(r, 1500 * 2 ** i));
      res = await req();
    }
    const data = await res.json();
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${data?.error?.message ?? "request failed"}`);
    text = (data.candidates?.[0]?.content?.parts ?? []).map((x: { text?: string }) => x.text ?? "").join("");
    if (!text.trim()) throw new Error(`Gemini returned no text (finishReason: ${data.candidates?.[0]?.finishReason ?? "unknown"})`);
  }
  if (!json) return text.trim();
  return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
}

const wrap = (thread: string, context: string) =>
  `<context>\n${context || "None provided"}\n</context>\n\n<incident_thread>\n${thread}\n</incident_thread>`;

export async function generatePostmortem(thread: string, context = ""): Promise<Postmortem> {
  return (await complete(SYSTEM_PROMPT, wrap(thread, context), true)) as unknown as Postmortem;
}

// ── Catch me up ──────────────────────────────────────────────────────────────
export type CatchUp = {
  status: "ongoing" | "mitigated" | "resolved" | "unclear";
  headline: string;
  whatHappened: string[];
  tried: string[];
  people: { name: string; role: string }[];
  nextSteps: string[];
  openQuestions: string[];
};

const CATCHUP_PROMPT = `You brief an engineer who just joined an incident channel or thread.
Read the conversation and return ONLY JSON:
{"status":"ongoing"|"mitigated"|"resolved"|"unclear","headline":string,"whatHappened":string[],"tried":string[],"people":[{"name":string,"role":string}],"nextSteps":string[],"openQuestions":string[]}
Rules:
- headline: one sentence describing the current state, WITHOUT repeating the status word (it is shown separately). E.g. "Checkout errors at 18% since 02:41 UTC; rollback in progress."
- whatHappened: 2-5 short bullets, chronological, with times when given.
- tried: what has been attempted and its result.
- people: who is actively working on it and what they are doing (only names in the thread).
- nextSteps: only steps someone in the thread said will happen. Empty if none.
- Never invent facts, causes, owners or numbers. If unclear, say so in openQuestions.
- Keep every bullet under 20 words.`;

export async function generateCatchUp(thread: string): Promise<CatchUp> {
  return (await complete(CATCHUP_PROMPT, wrap(thread, ""), true, 1500)) as unknown as CatchUp;
}

// ── Stakeholder / status updates ─────────────────────────────────────────────
export type Audience = "executive" | "customer" | "support";

const AUDIENCE_RULES: Record<Audience, string> = {
  executive:
    "Audience: company leadership. 4-6 sentences. Business impact first (who/what was affected, for how long), current status, root cause in one plain sentence, what is being done to prevent recurrence. No jargon, no blame.",
  customer:
    "Audience: customers, for a status page or email. Calm, plain English, 3-5 sentences. What customers experienced, when, current status, an apology if impact occurred. NO internal names, hostnames, deploy numbers, database names or root-cause internals. Do not promise anything the source does not state.",
  support:
    "Audience: the customer support team. Short bullets: what customers may report, affected time window, current status, what to tell customers, whether any action is needed from customers. No internal blame.",
};

export async function generateUpdate(source: string, audience: Audience, kind: "live" | "post"): Promise<string> {
  const system = `You write incident communication drafts. ${AUDIENCE_RULES[audience]}
${kind === "live" ? "The incident may still be ongoing: describe the current state as of the latest message, and say when the next update will come only if the source says so." : "The incident is over: write a resolution update."}
Rules: only facts present in the source. If impact, times or status are unclear, write [confirm: ...] placeholders instead of guessing. Return only the update text, no preamble.`;
  return complete(system, `<source>\n${source}\n</source>`, false, 900);
}
