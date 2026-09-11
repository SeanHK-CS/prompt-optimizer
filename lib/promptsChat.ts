/*
  prompts.chat client. Server-side only (called from a route handler) so we avoid
  browser CORS surprises and keep any future API key off the client.

  Primary path: the documented MCP endpoint, `tools/call` -> `search_prompts`.
    https://prompts.chat/docs/api
  Fallback: the REST endpoint `GET /api/prompts?q=`. Its response shape is not
  documented, so the normalizer below is tolerant. If MCP works, REST never runs.
*/

export type CommunityPrompt = {
  id: string;
  title: string;
  description: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  votes: number;
  url: string;
};

const MCP_URL = "https://prompts.chat/api/mcp";
const REST_URL = "https://prompts.chat/api/prompts";

type JsonRpcResponse = {
  jsonrpc?: string;
  id?: number | string;
  result?: unknown;
  error?: { code?: number; message?: string };
};

// MCP servers over streamable HTTP may answer a plain POST with an SSE body.
// Pull every `data:` line and return the last parseable JSON-RPC message.
function parseSse(raw: string): JsonRpcResponse | null {
  let last: JsonRpcResponse | null = null;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const body = line.slice(5).trim();
    if (!body || body === "[DONE]") continue;
    try {
      const msg = JSON.parse(body) as JsonRpcResponse;
      if (msg && (msg.result !== undefined || msg.error)) last = msg;
    } catch {
      /* partial chunk; keep scanning */
    }
  }
  return last;
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v == null ? fallback : String(v);
}

function normalizePrompt(p: Record<string, unknown>): CommunityPrompt | null {
  const id = asString(p.id ?? p.slug);
  const title = asString(p.title ?? p.name);
  const content = asString(p.content ?? p.prompt ?? p.text);
  if (!id || !title || !content) return null;
  const authorRaw = p.author;
  const author =
    typeof authorRaw === "string"
      ? authorRaw
      : authorRaw && typeof authorRaw === "object"
        ? asString((authorRaw as Record<string, unknown>).username ?? (authorRaw as Record<string, unknown>).name)
        : "";
  const categoryRaw = p.category;
  const category =
    typeof categoryRaw === "string"
      ? categoryRaw
      : categoryRaw && typeof categoryRaw === "object"
        ? asString((categoryRaw as Record<string, unknown>).name ?? (categoryRaw as Record<string, unknown>).slug)
        : "";
  const tags = Array.isArray(p.tags)
    ? p.tags.map((t) => (typeof t === "string" ? t : asString((t as Record<string, unknown>)?.name ?? (t as Record<string, unknown>)?.slug))).filter(Boolean)
    : [];
  const votesRaw = p.votes ?? p.voteCount ?? p._count;
  const votes =
    typeof votesRaw === "number"
      ? votesRaw
      : votesRaw && typeof votesRaw === "object"
        ? Number((votesRaw as Record<string, unknown>).votes ?? 0)
        : Number(votesRaw ?? 0) || 0;
  return {
    id,
    title,
    description: asString(p.description),
    content,
    author,
    category,
    tags,
    votes,
    url: `https://prompts.chat/prompts/${encodeURIComponent(id)}`,
  };
}

function extractPromptList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    for (const key of ["prompts", "data", "items", "results"]) {
      if (Array.isArray(o[key])) return o[key] as Record<string, unknown>[];
    }
  }
  return [];
}

async function searchViaMcp(query: string, limit: number, signal?: AbortSignal): Promise<CommunityPrompt[]> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  const key = process.env.PROMPTS_CHAT_API_KEY;
  if (key) headers["PROMPTS_API_KEY"] = key;

  const res = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: "search_prompts", arguments: { query, limit } },
    }),
    signal,
    cache: "no-store",
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`prompts.chat MCP responded ${res.status}: ${raw.slice(0, 200)}`);

  const contentType = res.headers.get("content-type") ?? "";
  let rpc: JsonRpcResponse | null = null;
  if (contentType.includes("text/event-stream") || raw.trimStart().startsWith("event:") || raw.trimStart().startsWith("data:")) {
    rpc = parseSse(raw);
  } else {
    rpc = JSON.parse(raw) as JsonRpcResponse;
  }
  if (!rpc) throw new Error("prompts.chat MCP returned no JSON-RPC message");
  if (rpc.error) throw new Error(`prompts.chat MCP error: ${rpc.error.message ?? rpc.error.code}`);

  // tools/call result: { content: [{ type: "text", text: "<json>" }], structuredContent?, isError? }
  const result = (rpc.result ?? {}) as Record<string, unknown>;
  if (result.isError) {
    const msg = Array.isArray(result.content) ? asString((result.content[0] as Record<string, unknown>)?.text) : "";
    throw new Error(`search_prompts failed: ${msg || "unknown error"}`);
  }
  let payload: unknown = result.structuredContent;
  if (!payload && Array.isArray(result.content)) {
    const textBlock = (result.content as Record<string, unknown>[]).find((b) => b.type === "text");
    const text = asString(textBlock?.text);
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error("search_prompts returned non-JSON text");
    }
  }
  if (!payload) payload = result;
  return extractPromptList(payload).map(normalizePrompt).filter((p): p is CommunityPrompt => p !== null);
}

async function searchViaRest(query: string, limit: number, signal?: AbortSignal): Promise<CommunityPrompt[]> {
  const url = `${REST_URL}?q=${encodeURIComponent(query)}&perPage=${limit}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal, cache: "no-store" });
  if (!res.ok) throw new Error(`prompts.chat REST responded ${res.status}`);
  const payload = await res.json();
  return extractPromptList(payload).map(normalizePrompt).filter((p): p is CommunityPrompt => p !== null);
}

export async function searchCommunityPrompts(
  query: string,
  limit = 6,
  signal?: AbortSignal,
): Promise<{ prompts: CommunityPrompt[]; source: "mcp" | "rest" }> {
  try {
    const prompts = await searchViaMcp(query, limit, signal);
    return { prompts, source: "mcp" };
  } catch (mcpErr) {
    // Surface both failures if REST also dies; never swallow silently.
    try {
      const prompts = await searchViaRest(query, limit, signal);
      return { prompts, source: "rest" };
    } catch (restErr) {
      const m1 = mcpErr instanceof Error ? mcpErr.message : String(mcpErr);
      const m2 = restErr instanceof Error ? restErr.message : String(restErr);
      throw new Error(`${m1} | REST fallback: ${m2}`);
    }
  }
}
