# Build Log

> Chats in a project don't share memory with each other — only this file and the
> instructions do. Update this at the end of any meaningful session, and read it at the
> start of a new chat. Newest entry on top.

## Current state (what runs today)
**The Skill (`skill/`) is the product.** v2 runs a six-stage coaching loop (score with reasons, five community templates from prompts.chat, structured prompt, run it, recurrence check with a reusable `${slot}` version and a three-line lesson, save as `prompts/<slug>.md`). Verified end to end on a real run in Claude.ai on 2026-09-11: all four stops held, scorer ran via script, prompts.chat connector fired with retry and honest fallback, file saved and corrected its own invented "(live)" tags. Week-two test: one message using the saved file from project knowledge produced the finished email with no re-trigger. The web app below is the secondary surface.
Zero-cost by default: the Optimize button uses a rules engine (`lib/scaffold.ts`) that runs in the browser and builds a rewrite from the rubric gaps (1 -> 12 on the sample prompts, 10 -> 14 on a strong one with only two additions). Claude and prompts.chat's `improve-prompt` are opt-in engines via `NEXT_PUBLIC_OPTIMIZE_ENGINE` plus a key; if either fails the UI falls back to rules and says so.
Prompt Optimizer is a Next.js 14 (App Router, TypeScript, Tailwind) repo. The core journey works end to end: paste a prompt, see a live rubric score, click Optimize, get a Claude rewrite with a change list and before/after breakdown. As the user types, a side rail fills with related prompts from prompts.chat (MCP `search_prompts`, no auth). Both external calls go through server routes. `pnpm build` and `pnpm typecheck` pass; TS scorer is parity-tested against the Python scorer (14 prompts x 7 dims). Live calls with real keys and a live prompts.chat hit are the only unverified pieces.

## Architecture / key pieces
- `app/page.tsx`: client page, all state in hooks, no state library.
- `app/api/optimize/route.ts`: Anthropic Messages API via fetch, key from env, naive per-IP limiter, tolerant JSON parse with raw-text fallback.
- `app/api/related-prompts/route.ts`: keyword extraction -> prompts.chat client -> 10-min TTL cache (max 300 keys).
- `lib/promptsChat.ts`: JSON-RPC `tools/call` to `https://prompts.chat/api/mcp`, handles JSON or SSE bodies, falls back to `GET /api/prompts?q=` (undocumented shape, tolerant normalizer).
- `lib/rubric.ts`: scorer port; `skill/` holds the original Skill unchanged.
- `tailwind.config.ts`: theme tokens (dark amber "instrument" look carried over from the artifact).

## Key decisions & why
- Rules engine as default — because the goal is no extra cost; the rubric already knows what's missing, so a placeholder scaffold is honest and free. Scores on the scaffold assume placeholders get filled; UI says so.
- prompts.chat improve-prompt as a middle engine — free with their key, documented, but it's their compute and unpublished rate limits; not a business foundation.
- Next.js repo instead of single JSX artifact — because keyless Claude calls only work inside claude.ai; a private repo + Vercel needs a server-side key anyway (recurring constraint across the studio).
- MCP endpoint as primary — because its response shape is documented; the REST endpoint's isn't and the site blocks automated fetches so it couldn't be verified.
- Keyword extraction before search — because prompts.chat search is keyword-based; sending a full prompt sentence matches poorly.
- Related prompts are retrieval-only in this slice — inspirations are not yet fed into the Claude rewrite (kept on the Later list to avoid changing the rewrite's behavior silently).
- Kept the existing dark amber theme — tokens are isolated in tailwind config so a swap to the studio palette is one block.

## Known issues / rough edges
- Skill: prompts.chat library is thin for some task types (weekly email returned one hit). Deferred fix: search three ways at once (keywords, two nouns, task-type synonym). Not changing a verified build before the demo.
- Skill: auto-triggering from plain "make this prompt better" is untested; the verified run used the `/prompt-optimizer` slash command.
- Skill: returning-user path (saved file + notes) works without any special instruction; no change needed.
- Live prompts.chat response not yet observed; normalizer is tolerant but may need a field tweak. Run `pnpm test:promptschat` first thing.
- Rate limiter and search cache are in-memory; reset on every cold start on Vercel.
- `first.*then` and `break ... down` regexes are approximate ports of Python `.`; parity holds on tested prompts but could diverge on multi-line inputs.
- No screenshot review of the UI was possible in the build sandbox.

## Next step
Run the live smoke test with network, fix any field mismatch in `normalizePrompt`, then decide whether the top 2-3 community matches get passed into the `/api/optimize` system prompt as inspiration (prompts.chat's own `improve_prompt` does this with embeddings).

---

### Session log
**2026-09-11 (evening)** — Skill v2 built and verified end to end in Claude.ai (two chats in the "hallow demo" project). Replaced `skill/` in this repo with v2. Web app unchanged. Deferred: three-way search, auto-trigger test.
**2026-09-11 (later)** — Goal changed to zero cost. Added rules engine (browser-side), engine switch (rules | claude | prompts-chat), prompts.chat improve-prompt route path, graceful fallback to rules with a visible note. Typecheck + build pass; route error paths for missing keys verified.
**2026-09-11** — Revamped the single-file PromptOptimizer.jsx into a Next.js repo. Added prompts.chat integration (MCP search, debounced, cached, SSE-tolerant, REST fallback). Ported scorer to TS with a parity script. Moved Claude call server-side with a rate limiter. Verified: typecheck, prod build, parity, route error paths (missing key, short input, upstream down, bad JSON). Skill folder shipped inside the repo under `skill/`.
