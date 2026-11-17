export const metadata = { title: "Privacy — Afterwatch" };

const sections: [string, string][] = [
  ["What we access", "When you install Afterwatch in Slack, it can read messages only in channels it has been invited to, post messages, and look up user display names. It reads a conversation only when someone in your workspace runs Write postmortem or /postmortem."],
  ["What we store", "Your workspace ID and name, an encrypted bot token, and each finished postmortem (title, severity, content, channel and requesting user IDs). We do not store the raw Slack thread."],
  ["AI processing", "To write a postmortem, the conversation text is sent to our AI model provider for that single request. We use API terms under which your data is not used to train models."],
  ["Sharing", "We do not sell your data or share it with anyone except the infrastructure providers needed to run the service (hosting, database, AI model)."],
  ["Deletion", "Uninstalling the Slack app stops all access. Email us to delete your workspace and all its postmortems; we do so within 30 days."],
  ["Contact", "hello@afterwatch.dev"],
];

export default function Privacy() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <a href="/" className="text-sm text-zinc-400 hover:text-white">← Afterwatch</a>
        <h1 className="mt-6 text-3xl font-semibold">Privacy</h1>
        <p className="mt-2 text-sm text-zinc-500">Plain-language summary. Last updated November 2026.</p>
        <div className="mt-10 space-y-8">
          {sections.map(([h, b]) => (
            <section key={h}>
              <h2 className="font-medium">{h}</h2>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{b}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
