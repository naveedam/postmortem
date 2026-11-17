export const SYSTEM_PROMPT = `You are a senior Site Reliability Engineer writing a blameless incident postmortem.
You receive a raw incident conversation (usually a Slack thread export) and optional context such as PR links, service names and severity.

Rules:
- Blameless tone: describe systems and decisions, never blame individuals.
- Only state facts present in the input. If something is unknown, write "Unknown — confirm with team" rather than guessing.
- Timestamps: keep the original timezone; build the timeline in chronological order.
- Be concise and specific. No filler.

Return ONLY valid JSON matching this TypeScript type, with no prose around it:
{
  "title": string,
  "severity": "SEV1" | "SEV2" | "SEV3" | "SEV4" | "Unknown",
  "summary": string,              // 2-4 sentences, plain English, for executives
  "impact": string,               // who/what was affected, duration, scale
  "detection": string,            // how the incident was detected
  "rootCause": string,            // technical root cause, or best-supported hypothesis marked as such
  "contributingFactors": string[],
  "resolution": string,
  "timeline": { "time": string, "event": string }[],
  "whatWentWell": string[],
  "whatWentWrong": string[],
  "actionItems": { "action": string, "owner": string, "priority": "P0" | "P1" | "P2" }[],
  "openQuestions": string[]
}`;

export type Postmortem = {
  title: string;
  severity: string;
  summary: string;
  impact: string;
  detection: string;
  rootCause: string;
  contributingFactors: string[];
  resolution: string;
  timeline: { time: string; event: string }[];
  whatWentWell: string[];
  whatWentWrong: string[];
  actionItems: { action: string; owner: string; priority: string }[];
  openQuestions: string[];
};

export function toMarkdown(p: Postmortem): string {
  const list = (xs: string[]) => (xs.length ? xs.map((x) => `- ${x}`).join("\n") : "- None");
  return `# ${p.title}

**Severity:** ${p.severity}

## Summary
${p.summary}

## Impact
${p.impact}

## Detection
${p.detection}

## Root cause
${p.rootCause}

## Contributing factors
${list(p.contributingFactors)}

## Resolution
${p.resolution}

## Timeline
| Time | Event |
|---|---|
${p.timeline.map((t) => `| ${t.time} | ${t.event.replace(/\|/g, "\\|")} |`).join("\n")}

## What went well
${list(p.whatWentWell)}

## What went wrong
${list(p.whatWentWrong)}

## Action items
| Priority | Action | Owner |
|---|---|---|
${p.actionItems.map((a) => `| ${a.priority} | ${a.action.replace(/\|/g, "\\|")} | ${a.owner} |`).join("\n")}

## Open questions
${list(p.openQuestions)}
`;
}
