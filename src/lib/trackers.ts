/** Create issues in, and read status from, Linear / GitHub / Jira Cloud. */
export type TrackerKind = "linear" | "github" | "jira";
export type TrackerConfig =
  | { kind: "linear"; apiKey: string; teamKey: string }
  | { kind: "github"; token: string; repo: string } // "owner/name"
  | { kind: "jira"; site: string; email: string; apiToken: string; projectKey: string };

export type NewIssue = { title: string; body: string; priority: string };
export type Created = { key: string; url: string };

const LINEAR_PRI: Record<string, number> = { P0: 1, P1: 2, P2: 3 };

async function linear(cfg: Extract<TrackerConfig, { kind: "linear" }>, query: string, variables: object) {
  const r = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: cfg.apiKey },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (!r.ok || j.errors) throw new Error(`Linear: ${j.errors?.[0]?.message ?? r.status}`);
  return j.data;
}

const jiraAuth = (c: Extract<TrackerConfig, { kind: "jira" }>) =>
  "Basic " + Buffer.from(`${c.email}:${c.apiToken}`).toString("base64");
const jiraBase = (c: Extract<TrackerConfig, { kind: "jira" }>) =>
  `https://${c.site.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;

export async function createIssue(cfg: TrackerConfig, issue: NewIssue): Promise<Created> {
  if (cfg.kind === "linear") {
    const t = await linear(cfg, `query($k:String!){teams(filter:{key:{eq:$k}}){nodes{id}}}`, { k: cfg.teamKey });
    const teamId = t.teams.nodes[0]?.id;
    if (!teamId) throw new Error(`Linear team "${cfg.teamKey}" not found`);
    const d = await linear(
      cfg,
      `mutation($i:IssueCreateInput!){issueCreate(input:$i){success issue{identifier url}}}`,
      { i: { teamId, title: issue.title, description: issue.body, priority: LINEAR_PRI[issue.priority] ?? 3 } },
    );
    return { key: d.issueCreate.issue.identifier, url: d.issueCreate.issue.url };
  }
  if (cfg.kind === "github") {
    const r = await fetch(`https://api.github.com/repos/${cfg.repo}/issues`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json", "User-Agent": "afterwatch" },
      body: JSON.stringify({ title: `[${issue.priority}] ${issue.title}`, body: issue.body }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(`GitHub: ${j.message ?? r.status}`);
    return { key: `#${j.number}`, url: j.html_url };
  }
  const r = await fetch(`${jiraBase(cfg)}/rest/api/3/issue`, {
    method: "POST",
    headers: { Authorization: jiraAuth(cfg), "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      fields: {
        project: { key: cfg.projectKey },
        summary: `[${issue.priority}] ${issue.title}`.slice(0, 250),
        issuetype: { name: "Task" },
        description: { type: "doc", version: 1, content: issue.body.split("\n\n").map((p) => ({ type: "paragraph", content: [{ type: "text", text: p || " " }] })) },
      },
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`Jira: ${Object.values(j.errors ?? {})[0] ?? j.errorMessages?.[0] ?? r.status}`);
  return { key: j.key, url: `${jiraBase(cfg)}/browse/${j.key}` };
}

/** true = closed/done in the tracker. */
export async function isClosed(cfg: TrackerConfig, key: string): Promise<boolean> {
  if (cfg.kind === "linear") {
    const d = await linear(cfg, `query($id:String!){issue(id:$id){state{type}}}`, { id: key });
    return ["completed", "canceled"].includes(d.issue?.state?.type);
  }
  if (cfg.kind === "github") {
    const r = await fetch(`https://api.github.com/repos/${cfg.repo}/issues/${key.replace("#", "")}`, {
      headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json", "User-Agent": "afterwatch" },
    });
    return r.ok && (await r.json()).state === "closed";
  }
  const r = await fetch(`${jiraBase(cfg)}/rest/api/3/issue/${key}?fields=status`, { headers: { Authorization: jiraAuth(cfg), Accept: "application/json" } });
  return r.ok && (await r.json()).fields?.status?.statusCategory?.key === "done";
}

/** Cheap credential check used by the settings page. */
export async function testTracker(cfg: TrackerConfig): Promise<string> {
  if (cfg.kind === "linear") {
    const d = await linear(cfg, `query($k:String!){teams(filter:{key:{eq:$k}}){nodes{name}}}`, { k: cfg.teamKey });
    if (!d.teams.nodes[0]) throw new Error(`Linear team "${cfg.teamKey}" not found`);
    return `Connected to Linear team ${d.teams.nodes[0].name}`;
  }
  if (cfg.kind === "github") {
    const r = await fetch(`https://api.github.com/repos/${cfg.repo}`, {
      headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json", "User-Agent": "afterwatch" },
    });
    if (!r.ok) throw new Error(`GitHub: can't access ${cfg.repo} (${r.status})`);
    return `Connected to GitHub repo ${cfg.repo}`;
  }
  const r = await fetch(`${jiraBase(cfg)}/rest/api/3/project/${cfg.projectKey}`, { headers: { Authorization: jiraAuth(cfg), Accept: "application/json" } });
  if (!r.ok) throw new Error(`Jira: can't access project ${cfg.projectKey} (${r.status})`);
  return `Connected to Jira project ${(await r.json()).name}`;
}

/** Build a config from form input; blank secrets keep the saved value. */
export function parseTracker(b: Record<string, string> | null | undefined, existing: TrackerConfig | null): TrackerConfig | null {
  if (!b?.kind) return null;
  const keep = (field: string, v?: string) => (v && v.trim() ? v.trim() : existing && existing.kind === b.kind ? (existing as Record<string, string>)[field] : "");
  if (b.kind === "linear") return { kind: "linear", apiKey: keep("apiKey", b.apiKey), teamKey: (b.teamKey ?? "").trim().toUpperCase() };
  if (b.kind === "github") return { kind: "github", token: keep("token", b.token), repo: (b.repo ?? "").trim().replace(/^https:\/\/github.com\//, "").replace(/\/$/, "") };
  if (b.kind === "jira") return { kind: "jira", site: (b.site ?? "").trim(), email: (b.email ?? "").trim(), apiToken: keep("apiToken", b.apiToken), projectKey: (b.projectKey ?? "").trim().toUpperCase() };
  return null;
}

