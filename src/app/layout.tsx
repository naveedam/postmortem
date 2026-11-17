import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Afterwatch — blameless postmortems from your Slack incident threads",
  description: "Afterwatch reads your Slack incident thread and writes a structured, blameless postmortem in under a minute. Timeline, root cause, action items with owners.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
