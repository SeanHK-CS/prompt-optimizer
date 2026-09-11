"use client";

import { DIMENSIONS, MAX_SCORE, band, type ScoreResult } from "@/lib/rubric";

export function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <span className="text-xs text-muted">
      {label}: <span className="font-semibold text-amber">{value}</span>
      <span className="text-faint">/{MAX_SCORE}</span>
    </span>
  );
}

export function LiftBanner({ before, after }: { before: ScoreResult; after: ScoreResult }) {
  const delta = after.total - before.total;
  return (
    <section className="mb-5 flex flex-wrap items-center justify-center gap-7 rounded-2xl border border-line bg-panel px-5 py-6">
      <BigScore label="Before" value={before.total} className="text-muted" />
      <div className="text-center text-sage">
        <div className="text-2xl">→</div>
        <div className="mt-0.5 text-[13px] font-semibold">{delta >= 0 ? `+${delta}` : delta}</div>
      </div>
      <BigScore label="After" value={after.total} className="text-sage" />
      <div className="max-w-[220px] border-l border-line pl-6">
        <div className="mb-1.5 text-[11px] text-muted">Verdict</div>
        <div className="text-[13px] leading-relaxed text-ink">{band(after.total)}</div>
      </div>
    </section>
  );
}

function BigScore({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="text-center">
      <div className="mb-1 text-[11px] text-muted">{label}</div>
      <div className={`font-serif text-5xl leading-none ${className}`}>
        {value}
        <span className="text-xl text-faint">/{MAX_SCORE}</span>
      </div>
    </div>
  );
}

export function RubricBreakdown({ before, after }: { before: ScoreResult; after: ScoreResult }) {
  return (
    <section className="mb-5 rounded-2xl border border-line bg-panel p-5">
      <h2 className="mb-4 text-sm text-ink">Rubric breakdown</h2>
      {DIMENSIONS.map((d) => {
        const b = before.scores[d];
        const a = after.scores[d];
        const delta = a - b;
        return (
          <div key={d} className="grid items-center gap-3.5 py-2 md:grid-cols-[150px_1fr_1fr_40px]">
            <span className="text-xs text-ink">{d}</span>
            <Track value={b} color="bg-muted" />
            <Track value={a} color={delta > 0 ? "bg-sage" : "bg-muted"} />
            <span className={`text-right text-xs ${delta > 0 ? "text-sage" : "text-faint"}`}>
              {delta > 0 ? `+${delta}` : delta < 0 ? delta : "–"}
            </span>
          </div>
        );
      })}
    </section>
  );
}

function Track({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="h-[7px] flex-1 overflow-hidden rounded-full border border-line bg-bg">
        <div className={`bar h-full rounded-full ${color}`} style={{ width: `${(value / 2) * 100}%` }} />
      </div>
      <span className="min-w-[14px] text-[11px] text-faint">{value}</span>
    </div>
  );
}

export function PromptCard({
  title,
  text,
  accent,
  onCopy,
  copied,
}: {
  title: string;
  text: string;
  accent: "muted" | "sage";
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-panel p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className={`text-xs ${accent === "sage" ? "text-sage" : "text-muted"}`}>{title}</span>
        {onCopy && (
          <button
            onClick={onCopy}
            className={`rounded-md border border-line px-2.5 py-1 text-[11px] ${copied ? "text-sage" : "text-muted"} hover:border-amber hover:text-ink`}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
      <div className="min-h-[80px] flex-1 whitespace-pre-wrap rounded-lg border border-line bg-bg px-4 py-3 text-[13px] leading-relaxed text-ink">
        {text}
      </div>
    </div>
  );
}
