"use client";

import { useEffect, useRef, useState } from "react";
import type { CommunityPrompt } from "@/lib/promptsChat";

export type RelatedState = {
  status: "idle" | "loading" | "ready" | "error";
  query: string | null;
  prompts: CommunityPrompt[];
  error: string | null;
};

const DEBOUNCE_MS = 600;
const MIN_CHARS = 8;

export function useRelatedPrompts(input: string): RelatedState {
  const [state, setState] = useState<RelatedState>({ status: "idle", query: null, prompts: [], error: null });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = input.trim();
    if (trimmed.length < MIN_CHARS) {
      abortRef.current?.abort();
      setState({ status: "idle", query: null, prompts: [], error: null });
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setState((s) => ({ ...s, status: "loading", error: null }));
      try {
        const res = await fetch("/api/related-prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmed, limit: 6 }),
          signal: controller.signal,
        });
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (!res.ok) {
          setState({ status: "error", query: data.query ?? null, prompts: [], error: data.error || `Search failed (${res.status})` });
          return;
        }
        setState({ status: "ready", query: data.query ?? null, prompts: data.prompts ?? [], error: null });
      } catch (err) {
        if (controller.signal.aborted) return;
        setState({ status: "error", query: null, prompts: [], error: err instanceof Error ? err.message : "Search failed" });
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [input]);

  return state;
}
