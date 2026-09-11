"use client";

import { useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronUp, Copy, Check, FileInput } from "lucide-react";
import type { CommunityPrompt } from "@/lib/promptsChat";
import type { RelatedState } from "@/lib/useRelatedPrompts";

type Props = {
  state: RelatedState;
  onUse: (content: string) => void;
};

export function RelatedPrompts({ state, onUse }: Props) {
  return (
    <aside className="rounded-2xl border border-line bg-panel p-5 lg:sticky lg:top-6">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-sm text-ink">From the community</h2>
        <a
          href="https://prompts.chat"
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-faint hover:text-amber"
        >
          prompts.chat
        </a>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-muted">
        {state.status === "idle" && "Start typing and related prompts people have already written will show up here."}
        {state.status === "loading" && (state.query ? `Searching for "${state.query}"…` : "Searching…")}
        {state.status === "ready" && state.query && (
          <>
            Matched on <span className="text-ink">{state.query}</span>
            {state.prompts.length === 0 && ". Nothing close yet; keep typing or try more specific words."}
          </>
        )}
        {state.status === "error" && (
          <span className="text-rust">prompts.chat search failed: {state.error}. The optimizer still works.</span>
        )}
      </p>

      {state.prompts.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {state.prompts.map((p) => (
            <PromptItem key={p.id} prompt={p} onUse={onUse} />
          ))}
        </ul>
      )}
    </aside>
  );
}

function PromptItem({ prompt, onUse }: { prompt: CommunityPrompt; onUse: (content: string) => void }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable in this context */
    }
  }

  return (
    <li className="rounded-xl border border-line bg-bg p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[13px] text-ink">{prompt.title}</div>
          <div className="mt-0.5 text-[11px] text-faint">
            {prompt.author ? `@${prompt.author}` : "anonymous"}
            {prompt.votes ? ` · ${prompt.votes} votes` : ""}
            {prompt.category ? ` · ${prompt.category}` : ""}
          </div>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Collapse prompt" : "Expand prompt"}
          className="shrink-0 rounded-md border border-line p-1 text-muted hover:border-amber hover:text-ink"
        >
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {prompt.description && !open && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{prompt.description}</p>
      )}

      {open && (
        <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-panel2 p-3 text-xs leading-relaxed text-ink">
          {prompt.content}
        </pre>
      )}

      {prompt.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {prompt.tags.slice(0, 5).map((t) => (
            <span key={t} className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-faint">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => onUse(prompt.content)}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[11px] text-muted hover:border-amber hover:text-ink"
        >
          <FileInput size={12} /> Use as starting point
        </button>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[11px] text-muted hover:border-amber hover:text-ink"
        >
          {copied ? <Check size={12} className="text-sage" /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
        </button>
        <a
          href={prompt.url}
          target="_blank"
          rel="noreferrer"
          aria-label="Open on prompts.chat"
          className="ml-auto text-faint hover:text-amber"
        >
          <ArrowUpRight size={14} />
        </a>
      </div>
    </li>
  );
}
