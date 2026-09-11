import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prompt Optimizer",
  description:
    "Paste a rough prompt. Get a rewritten version, a plain-language list of what changed, a before/after rubric score, and related prompts from the prompts.chat community.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="grain" aria-hidden="true" />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
