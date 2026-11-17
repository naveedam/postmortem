const SLACK_INSTALL = "/api/slack/install";

const steps = [
  {
    n: "01",
    title: "Run it on the incident thread",
    body: "Hover any message → More actions → Write postmortem. Or type /postmortem to cover the channel's last 24 hours.",
  },
  {
    n: "02",
    title: "Afterwatch reads the whole thread",
    body: "Alerts, hand-offs, commands, the rollback. It builds a timeline and separates root cause from contributing factors.",
  },
  {
    n: "03",
    title: "Review, edit, share",
    body: "A summary lands in the thread with a link to the full postmortem. Edit it in the browser, copy as Markdown, done.",
  },
];

const features = [
  ["Blameless by default", "Describes systems and decisions, never people. The tone your SRE handbook asks for, every time."],
  ["Doesn't invent facts", "Severity, owners and causes come only from what the thread says. Anything missing is marked “Unknown — confirm with team”."],
  ["Action items with owners", "P0/P1/P2 follow-ups, assigned to whoever committed to them in the thread."],
  ["Works with your alerts", "PagerDuty, Opsgenie, Datadog and Grafana alert messages in the thread are read as part of the timeline."],
  ["Nothing to install", "A Slack app plus a web editor. No agents, no access to your infrastructure, no production credentials."],
  ["Private by design", "Read-only access to channels you invite it to. Tokens encrypted at rest. No training on your data."],
];

const plans = [
  {
    name: "Free",
    price: "$0",
    per: "",
    blurb: "For trying it on real incidents.",
    items: ["5 postmortems / month", "Slack app + web editor", "Markdown export"],
    cta: "Add to Slack",
    href: SLACK_INSTALL,
    featured: false,
  },
  {
    name: "Team",
    price: "$29",
    per: "/ month per workspace",
    blurb: "For teams that run postmortems every week.",
    items: ["Unlimited postmortems", "Postmortem history", "Team sign-in for shared pages", "Priority model for long threads"],
    cta: "Start free",
    href: SLACK_INSTALL,
    featured: true,
  },
  {
    name: "Business",
    price: "$99",
    per: "/ month per workspace",
    blurb: "For orgs with a postmortem process to follow.",
    items: ["Everything in Team", "Your postmortem template", "Confluence & Notion export", "GitHub PR context"],
    cta: "Talk to us",
    href: "mailto:hello@afterwatch.dev?subject=Afterwatch%20Business",
    featured: false,
  },
];

const faqs = [
  ["What does Afterwatch need access to?", "Read access to the channels you invite it to, permission to post its summary, and user names so the timeline shows people instead of IDs. It never touches your infrastructure."],
  ["Is my incident data used to train AI models?", "No. Threads are sent to our AI model provider only to generate your postmortem, on API terms that exclude training. We store the finished postmortem, not the raw thread."],
  ["How accurate is it?", "It writes only what the thread supports and flags gaps instead of guessing. Every draft is labelled AI-generated and is meant to be reviewed by the incident lead before sharing."],
  ["Does it work with Microsoft Teams?", "Not yet. You can paste any chat log into the web version today. Teams support is on the roadmap — tell us if you need it."],
  ["Can it follow our postmortem template?", "Business plans can upload a template; Afterwatch fills your sections in your order."],
];

function SlackButton({ className = "" }: { className?: string }) {
  return (
    <a
      href={SLACK_INSTALL}
      className={`inline-flex items-center gap-2.5 rounded-lg bg-white text-zinc-900 font-medium px-5 py-3 hover:bg-zinc-200 transition ${className}`}
    >
      <svg width="18" height="18" viewBox="0 0 122.8 122.8" aria-hidden>
        <path d="M25.8 77.6a12.9 12.9 0 1 1-12.9-12.9h12.9zm6.5 0a12.9 12.9 0 0 1 25.8 0v32.3a12.9 12.9 0 1 1-25.8 0z" fill="#e01e5a" />
        <path d="M45.2 25.8a12.9 12.9 0 1 1 12.9-12.9v12.9zm0 6.5a12.9 12.9 0 0 1 0 25.8H12.9a12.9 12.9 0 1 1 0-25.8z" fill="#36c5f0" />
        <path d="M97 45.2a12.9 12.9 0 1 1 12.9 12.9H97zm-6.5 0a12.9 12.9 0 0 1-25.8 0V12.9a12.9 12.9 0 1 1 25.8 0z" fill="#2eb67d" />
        <path d="M77.6 97a12.9 12.9 0 1 1-12.9 12.9V97zm0-6.5a12.9 12.9 0 0 1 0-25.8h32.3a12.9 12.9 0 1 1 0 25.8z" fill="#ecb22e" />
      </svg>
      Add to Slack — free
    </a>
  );
}

export default function Landing() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <header className="sticky top-0 z-10 backdrop-blur bg-zinc-950/80 border-b border-zinc-900">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="font-semibold tracking-tight text-lg">
            after<span className="text-emerald-400">watch</span>
          </a>
          <nav className="flex items-center gap-6 text-sm text-zinc-400">
            <a href="#how" className="hidden sm:inline hover:text-white">How it works</a>
            <a href="#pricing" className="hidden sm:inline hover:text-white">Pricing</a>
            <a href="/try" className="hover:text-white">Try without Slack</a>
            <a href={SLACK_INSTALL} className="rounded-md bg-white text-zinc-900 font-medium px-3 py-1.5 hover:bg-zinc-200">Add to Slack</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 grid lg:grid-cols-[1.05fr_1fr] gap-14 items-center">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> For on-call, SRE and platform teams
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
            The incident is over.<br />
            <span className="text-zinc-400">The postmortem takes a minute.</span>
          </h1>
          <p className="mt-6 text-lg text-zinc-400 max-w-xl leading-relaxed">
            Afterwatch reads your Slack incident thread and writes a blameless postmortem — timeline, root cause,
            impact and action items with owners — before anyone has to schedule a meeting about it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <SlackButton />
            <a href="/try" className="text-sm text-zinc-300 hover:text-white underline underline-offset-4 decoration-zinc-700">
              or paste a thread and try it →
            </a>
          </div>
          <p className="mt-4 text-xs text-zinc-500">Free for 5 postmortems a month. No card needed. Read-only access.</p>
        </div>

        {/* Product preview */}
        <div className="relative">
          <div className="absolute -inset-6 bg-emerald-500/10 blur-3xl rounded-full" aria-hidden />
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-2xl overflow-hidden text-sm">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 text-zinc-500 text-xs">
              <span className="font-medium text-zinc-300"># inc-checkout-latency</span> · thread
            </div>
            <div className="p-4 space-y-2 font-mono text-[12.5px] text-zinc-400 border-b border-zinc-800">
              <p><span className="text-red-400">PagerDuty</span> CRITICAL checkout-api p99 latency &gt; 3s</p>
              <p><span className="text-zinc-200">priya</span> db connections maxed on orders-db (500/500)</p>
              <p><span className="text-zinc-200">arjun</span> deploy #4821 added order history join</p>
              <p><span className="text-zinc-200">arjun</span> rolling back #4821</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded bg-emerald-500 text-zinc-950 grid place-items-center text-xs font-bold">A</span>
                <span className="font-medium text-zinc-100">Afterwatch</span>
                <span className="text-[10px] rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-400">APP</span>
              </div>
              <p className="font-semibold text-zinc-100">Checkout latency from unindexed join in deploy #4821</p>
              <p className="text-zinc-400 leading-relaxed">
                <span className="text-zinc-200">Root cause:</span> new join on <code className="text-emerald-300">orders.customer_id</code> had no
                index, saturating orders-db connections. Resolved by rollback after ~25 min of checkout impact.
              </p>
              <ul className="text-zinc-400 space-y-1">
                <li><span className="text-red-300 font-medium">P0</span> Add index on orders.customer_id — arjun</li>
                <li><span className="text-amber-300 font-medium">P1</span> Load-test checkout path before re-ship — arjun</li>
              </ul>
              <span className="inline-block rounded-md bg-emerald-500 text-zinc-950 font-medium px-3 py-1.5 text-xs">Open full postmortem</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pain */}
      <section className="border-y border-zinc-900 bg-zinc-900/30">
        <div className="max-w-6xl mx-auto px-6 py-12 grid sm:grid-cols-3 gap-8 text-center">
          {[
            ["Hours", "lost scrolling back through Slack to rebuild the timeline"],
            ["Days later", "is when postmortems usually get written — after the details fade"],
            ["< 1 min", "for Afterwatch to draft it while the thread is still fresh"],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-3xl font-semibold text-white">{k}</p>
              <p className="mt-2 text-sm text-zinc-400">{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-10 grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="rounded-xl border border-zinc-800 p-6">
              <p className="font-mono text-emerald-400 text-sm">{s.n}</p>
              <h3 className="mt-3 font-medium text-lg">{s.title}</h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-semibold tracking-tight">Written the way good postmortems are</h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
          {features.map(([t, b]) => (
            <div key={t}>
              <h3 className="font-medium">{t}</h3>
              <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-zinc-900">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight">Simple pricing</h2>
          <p className="mt-2 text-zinc-400">Per Slack workspace. Start free, upgrade when it earns its keep.</p>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl p-7 flex flex-col ${p.featured ? "border-2 border-emerald-500/70 bg-emerald-500/[0.04]" : "border border-zinc-800"}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{p.name}</h3>
                  {p.featured && <span className="text-[11px] rounded-full bg-emerald-500/15 text-emerald-300 px-2 py-0.5">Most popular</span>}
                </div>
                <p className="mt-4"><span className="text-4xl font-semibold">{p.price}</span> <span className="text-sm text-zinc-500">{p.per}</span></p>
                <p className="mt-2 text-sm text-zinc-400">{p.blurb}</p>
                <ul className="mt-6 space-y-2 text-sm text-zinc-300 flex-1">
                  {p.items.map((i) => (
                    <li key={i} className="flex gap-2"><span className="text-emerald-400">✓</span>{i}</li>
                  ))}
                </ul>
                <a
                  href={p.href}
                  className={`mt-8 text-center rounded-lg py-2.5 font-medium ${p.featured ? "bg-emerald-500 text-zinc-950 hover:bg-emerald-400" : "bg-zinc-800 hover:bg-zinc-700"}`}
                >
                  {p.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <h2 className="text-3xl font-semibold tracking-tight">Questions</h2>
        <div className="mt-8 divide-y divide-zinc-800 border-y border-zinc-800">
          {faqs.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex justify-between items-center cursor-pointer list-none font-medium">
                {q}
                <span className="text-zinc-500 group-open:rotate-45 transition text-xl leading-none">+</span>
              </summary>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 px-8 py-14 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Write your next postmortem in a minute.</h2>
          <p className="mt-3 text-zinc-400">Install in Slack, invite @Afterwatch to your incident channel, run it on a thread.</p>
          <div className="mt-8"><SlackButton /></div>
        </div>
      </section>

      <footer className="border-t border-zinc-900">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-wrap gap-4 justify-between text-xs text-zinc-500">
          <span>© 2026 Afterwatch</span>
          <div className="flex gap-5">
            <a href="/privacy" className="hover:text-zinc-300">Privacy</a>
            <a href="/try" className="hover:text-zinc-300">Web version</a>
            <a href="mailto:hello@afterwatch.dev" className="hover:text-zinc-300">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
