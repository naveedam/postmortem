import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Postmortem — incident thread to blameless postmortem",
  description: "Paste an incident thread, get a structured blameless postmortem in under a minute.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
