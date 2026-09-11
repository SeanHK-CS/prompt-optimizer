import { NextResponse } from "next/server";
import { DIMENSIONS, scorePrompt, type Dimension } from "@/lib/rubric";

export const runtime = "nodejs";

export type Change = { text: string; dimension: Dimension | "" };
export type Engine = "rules" | "claude" | "prompts-chat";
export type OptimizeResponse = { optimized: string; changes: Change[]; engine: Engine; inspirations?: { title: string; similarity: number }[] };

const SYSTEM = `You are a prompt optimization engine. Rewrite the user's raw prompt into a clearer, well-engineered prompt using prompt-engineering best practices across these seven dimensions: role or persona, task clarity, context, output format, examples, constraints, and reasoning guidance. Do not invent facts the user did not provide; where information is missing, insert a clearly bracketed placeholder such as [your audience] instead of guessing. Keep the rewrite proportionate to the task: a short utility prompt should stay short. If the prompt is already strong, make small refinements and say so in the changes. Respond with ONLY valid JSON and nothing else (no markdown fences, no preamble), in exactly this shape: {"optimized": "the rewritten prompt as a single string", "changes": [{"text": "one plain-language sentence describing a change", "dimension": "one of: ${DIMENSIONS.join(", ")}"}]}. Provide 3 to 6 changes.`;

// Naive per-IP limiter so a public deploy can't be used as a free Claude proxy.
// Resets on cold start; good enough until there's real traffic.
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

function parseModelJson(text: string): OptimizeResponse | null {
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const candidates = [clean];
  const m = text.match(/\{[\s\S]*\}/);
  if (m) candidates.push(m[0]);
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c) as Partial<Pick<OptimizeResponse, "optimized" | "changes">>;
      if (parsed && typeof parsed.optimized === "string") {
        const changes: Change[] = Array.isArray(parsed.changes)
          ? parsed.changes
              .filter((x): x is Change => !!x && typeof (x as Change).text === "string")
              .map((x) => ({
                text: x.text,
                dimension: (DIMENSIONS as readonly string[]).includes(x.dimension) ? (x.dimension as Dimension) : "",
              }))
          : [];
        return { optimized: parsed.optimized.trim(), changes, engine: "claude" };
      }
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

// Derive a "what changed" list from the rubric diff when the engine returns plain
// text (prompts.chat does). Honest: it names dimensions that rose, not the model's intent.
function changesFromScoreDiff(before: string, after: string): Change[] {
  const b = scorePrompt(before).scores;
  const a = scorePrompt(after).scores;
  return DIMENSIONS.filter((d) => a[d] > b[d]).map((d) => ({
    text: `${d} went from ${b[d]} to ${a[d]} on the rubric.`,
    dimension: d,
  }));
}

// prompts.chat improve-prompt: free with a pchat_ key, runs on their model.
// Documented at https://prompts.chat/docs/api ("Improve Prompt API").
async function improveViaPromptsChat(prompt: string): Promise<OptimizeResponse> {
  const key = process.env.PROMPTS_CHAT_API_KEY;
  if (!key) throw new Error("PROMPTS_CHAT_API_KEY is not set. Generate one at prompts.chat/settings.");
  const res = await fetch("https://prompts.chat/api/improve-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-Key": key },
    body: JSON.stringify({ prompt, outputType: "text", outputFormat: "text" }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `prompts.chat improve-prompt responded ${res.status}`);
  const improved = typeof data.improved === "string" ? data.improved.trim() : "";
  if (!improved) throw new Error("prompts.chat returned no improved prompt.");
  return {
    optimized: improved,
    changes: changesFromScoreDiff(prompt, improved),
    engine: "prompts-chat",
    inspirations: Array.isArray(data.inspirations) ? data.inspirations : [],
  };
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Wait a minute and try again." }, { status: 429 });
  }

  let body: { prompt?: unknown; engine?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON with a `prompt` string." }, { status: 400 });
  }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) return NextResponse.json({ error: "Prompt is empty." }, { status: 400 });
  if (prompt.length > 10000) return NextResponse.json({ error: "Prompt is over 10,000 characters." }, { status: 413 });

  const engine: Engine = body.engine === "prompts-chat" ? "prompts-chat" : "claude";

  if (engine === "prompts-chat") {
    try {
      return NextResponse.json(await improveViaPromptsChat(prompt));
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "prompts.chat request failed" }, { status: 502 });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not set. Add it to .env.local, or use the free rules engine." }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
        max_tokens: 1200,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || `Anthropic API responded ${res.status}`;
      return NextResponse.json({ error: msg }, { status: 502 });
    }
    const text: string = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n");
    const parsed = parseModelJson(text);
    if (parsed) return NextResponse.json({ ...parsed, engine: "claude" } satisfies OptimizeResponse);
    if (text.trim()) return NextResponse.json({ optimized: text.trim(), changes: [], engine: "claude" } satisfies OptimizeResponse);
    return NextResponse.json({ error: "Model returned an empty response." }, { status: 502 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Request failed: ${message}` }, { status: 502 });
  }
}
