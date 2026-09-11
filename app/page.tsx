"use client";

import { useMemo, useState } from "react";
import { scorePrompt } from "@/lib/rubric";
import { useRelatedPrompts } from "@/lib/useRelatedPrompts";
import { RelatedPrompts } from "@/components/RelatedPrompts";
import { LiftBanner, PromptCard, RubricBreakdown, ScorePill } from "@/components/ScoreParts";
import { scaffoldRewrite } from "@/lib/scaffold";
import type { Change, Engine } from "@/app/api/optimize/route";

// Default is the free rules engine: no key, no network, no cost. Set
// NEXT_PUBLIC_OPTIMIZE_ENGINE=claude or prompts-chat (plus the matching key) to opt in.
const CONFIGURED_ENGINE: Engine =
  process.env.NEXT_PUBLIC_OPTIMIZE_ENGINE === "claude" || process.env.NEXT_PUBLIC_OPTIMIZE_ENGINE === "prompts-chat"
    ? process.env.NEXT_PUBLIC_OPTIMIZE_ENGINE
    : "rules";

const ENGINE_LABEL: Record<Engine, string> = {
  rules: "Rules engine (free, instant, runs in your browser)",
  claude: "Claude",
  "prompts-chat": "prompts.chat AI (free with their key)",
};

const EXAMPLES = [
  "Write me a blog post about coffee.",
  "Look at this sales data and tell me what's going on.",
  "Summarize this article for me.",
  "Help me write an email to my boss.",
];

export default function Page() {
  const [input, setInput] = useState("");
  const [optimized, setOptimized] = useState("");
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [engineUsed, setEngineUsed] = useState<Engine>("rules");
  const [note, setNote] = useState("");

  const before = useMemo(() => scorePrompt(input), [input]);
  const after = useMemo(() => scorePrompt(optimized), [optimized]);
  const related = useRelatedPrompts(input);
  const hasResult = optimized.trim().length > 0;
  const canOptimize = input.trim().length > 0 && !loading;

  function resetResult() {
    setOptimized("");
    setChanges([]);
    setError("");
    setCopied(false);
    setNote("");
  }

  function runRules() {
    const r = scaffoldRewrite(input);
    setOptimized(r.optimized);
    setChanges(r.changes);
    setEngineUsed("rules");
  }

  async function optimize() {
    if (!canOptimize) return;
    setLoading(true);
    resetResult();
    if (CONFIGURED_ENGINE === "rules") {
      runRules();
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, engine: CONFIGURED_ENGINE }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Never leave the user with nothing: fall back to the free engine and say so.
        runRules();
        setNote(`${ENGINE_LABEL[CONFIGURED_ENGINE]} was unavailable (${data.error || res.status}). Used the rules engine instead.`);
        return;
      }
      setOptimized(data.optimized || "");
      setChanges(Array.isArray(data.changes) ? data.changes : []);
      setEngineUsed(data.engine || CONFIGURED_ENGINE);
    } catch (e) {
      runRules();
      setNote(`Network error (${e instanceof Error ? e.message : "unknown"}). Used the rules engine instead.`);
    } finally {
      setLoading(false);
    }
  }

  async function copyOut() {
    if (!optimized) return;
    try {
      await navigator.clipboard.writeText(optimized);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <main className="mx-auto max-w-[1240px] px-6 pb-20 pt-12">
      <header className="mb-9">
        <div className="mb-2.5 flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber shadow-[0_0_14px_#e8a13a]" />
          <span className="text-xs tracking-[3px] text-muted">PROMPT ENGINEERING INSTRUMENT</span>
        </div>
        <h1 className="mb-2.5 font-serif text-[46px] font-semibold leading-none tracking-tight">Prompt Optimizer</h1>
        <p className="max-w-[620px] text-sm leading-relaxed text-muted">
          Paste a rough prompt. Get a rewritten version, a plain-language list of what changed, a before/after score
          across a seven-dimension rubric, and prompts other people have already written for the same job.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <section className="mb-5 rounded-2xl border border-line bg-panel p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <label htmlFor="raw-prompt" className="text-xs text-muted">
                Your raw prompt
              </label>
              <ScorePill label="Live score" value={before.total} />
            </div>
            <textarea
              id="raw-prompt"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (hasResult) resetResult();
              }}
              placeholder="e.g. Write me a blog post about coffee."
              rows={5}
              className="w-full resize-y rounded-lg border border-line bg-bg px-4 py-3.5 font-mono text-sm leading-relaxed text-ink"
            />
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => {
                    setInput(ex);
                    resetResult();
                  }}
                  className="rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:border-amber hover:text-ink"
                >
                  {ex.length > 32 ? ex.slice(0, 30) + "…" : ex}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={optimize}
                disabled={!canOptimize}
                className={`rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors ${
                  canOptimize ? "bg-amber text-bg hover:bg-ink" : "cursor-not-allowed bg-panel2 text-faint"
                }`}
              >
                {loading ? "Optimizing…" : "Optimize"}
              </button>
            </div>
            {error && (
              <p role="alert" className="mt-3.5 text-[13px] text-rust">
                {error}
              </p>
            )}
          </section>

          {hasResult && (
            <div>
              <p className="mb-3 text-[11px] text-faint">
                Rewritten by {ENGINE_LABEL[engineUsed]}.
                {engineUsed === "rules" && " Scores assume you fill in the [bracketed] blanks."}
              </p>
              {note && (
                <p role="status" className="mb-3 text-[12px] text-amber">
                  {note}
                </p>
              )}
              <LiftBanner before={before} after={after} />
              <div className="mb-5 grid gap-4 md:grid-cols-2">
                <PromptCard title="Before" text={input} accent="muted" />
                <PromptCard title="After" text={optimized} accent="sage" onCopy={copyOut} copied={copied} />
              </div>
              <RubricBreakdown before={before} after={after} />
              {changes.length > 0 && (
                <section className="rounded-2xl border border-line bg-panel p-5">
                  <h2 className="mb-4 text-sm text-ink">What changed and why</h2>
                  <ol>
                    {changes.map((c, i) => (
                      <li key={i} className={`flex gap-3.5 py-3 ${i ? "border-t border-line" : ""}`}>
                        <span className="min-w-[22px] text-[13px] text-amber">{String(i + 1).padStart(2, "0")}</span>
                        <div className="flex-1">
                          <div className="mb-1.5 text-sm leading-relaxed text-ink">{c.text}</div>
                          {c.dimension && (
                            <span className="rounded-md border border-line px-2 py-0.5 text-[11px] text-sage">{c.dimension}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </div>
          )}
        </div>

        <RelatedPrompts
          state={related}
          onUse={(content) => {
            setInput(content);
            resetResult();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>

      <footer className="mt-10 border-t border-line pt-5 text-xs leading-relaxed text-faint">
        Scoring is deterministic and computed locally using a seven-dimension rubric shared with the prompt-optimizer
        Claude Skill. The rewrite comes from a free rules engine by default; Claude or prompts.chat AI can be switched on with a key. Community prompts come from the
        prompts.chat public API and are CC0.
      </footer>
    </main>
  );
}
