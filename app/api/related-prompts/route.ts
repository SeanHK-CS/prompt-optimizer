import { NextResponse } from "next/server";
import { toSearchQuery } from "@/lib/keywords";
import { searchCommunityPrompts, type CommunityPrompt } from "@/lib/promptsChat";

export const runtime = "nodejs";

// prompts.chat asks callers to be respectful with request frequency. The UI
// debounces, and this cache means retyping the same keywords costs nothing.
const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 300;
const cache = new Map<string, { at: number; value: CommunityPrompt[]; source: "mcp" | "rest" }>();

function getCached(key: string) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit;
}

function setCached(key: string, value: CommunityPrompt[], source: "mcp" | "rest") {
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), value, source });
}

export async function POST(req: Request) {
  let body: { prompt?: unknown; limit?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON with a `prompt` string." }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, 4000) : "";
  const limit = Math.min(Math.max(Number(body.limit) || 6, 1), 20);

  const query = toSearchQuery(prompt);
  if (!query) return NextResponse.json({ query: null, prompts: [], source: null });

  const key = `${query}|${limit}`;
  const hit = getCached(key);
  if (hit) return NextResponse.json({ query, prompts: hit.value, source: hit.source, cached: true });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const { prompts, source } = await searchCommunityPrompts(query, limit, controller.signal);
    clearTimeout(timer);
    setCached(key, prompts, source);
    return NextResponse.json({ query, prompts, source, cached: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ query, prompts: [], error: message }, { status: 502 });
  }
}
