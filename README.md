# Prompt Optimizer

A teaching-first alternative to prompt-rewriting tools. Paste a rough prompt, get a score on a seven-dimension rubric with a plain-language reason for each, the five closest community prompts from prompts.chat to build from, a structured rewrite, the actual result, and at the end a reusable version with fill-in slots and a one-line lesson, saved as a `.md` file for your team.

Two surfaces share one rubric:

| Surface | Folder | Cost to run | Status |
|---|---|---|---|
| **Claude Skill (the product)** | `skill/` | $0, runs on the user's own Claude plan | Verified end to end in Claude.ai |
| Web app | `app/`, `lib/`, `components/` | $0 by default (rules engine); Claude or prompts.chat AI behind a switch | Builds and type-checks; prompts.chat search not yet checked live |

Start with `skill/README.md` for the Skill, or read on for the web app.

## Run it (no keys needed)

```bash
pnpm install
pnpm dev                     # http://localhost:3000
```

Out of the box it costs nothing to run: the rewrite comes from a rules engine in the browser and prompts.chat search is free and unauthenticated.

## Rewrite engines

| Engine | Set `NEXT_PUBLIC_OPTIMIZE_ENGINE` to | Needs | Cost |
|---|---|---|---|
| Rules (default) | `rules` | nothing | $0, runs in the browser |
| prompts.chat AI | `prompts-chat` | `PROMPTS_CHAT_API_KEY` (free) | $0 to you, their model, their rate limits |
| Claude | `claude` | `ANTHROPIC_API_KEY` | fraction of a cent per click, billed to you |

If a paid engine fails, the app falls back to the rules engine and tells the user.

## Layout

```
app/page.tsx                    UI: input, live score, optimize flow, results
app/api/optimize/route.ts       Claude call (server-side key), returns {optimized, changes}
app/api/related-prompts/route.ts  prompts.chat search proxy, 10-min in-memory cache
lib/rubric.ts                   TS port of the rubric scorer (parity-tested)
lib/scaffold.ts                 free rules engine: rewrites from rubric gaps
lib/keywords.ts                 raw prompt -> short keyword query
lib/promptsChat.ts              MCP search_prompts client, SSE-tolerant, REST fallback
lib/useRelatedPrompts.ts        debounced + abortable fetch hook
components/RelatedPrompts.tsx   community rail: expand, use as starting point, copy
components/ScoreParts.tsx       lift banner, rubric bars, prompt cards
skill/                          the Claude Skill v2 (loop, rubric, references, scorers)
scripts/parity-check.ts         TS vs Python scorer agreement
scripts/smoke-promptschat.ts    live hit against prompts.chat
```

## Checks

```bash
pnpm typecheck
pnpm build
pnpm test:parity          # needs python3
pnpm test:promptschat "write a cold email to a recruiter"   # needs network
```

## How the prompts.chat integration works

1. As you type (600 ms debounce, 8+ chars), the client posts the raw prompt to `/api/related-prompts`.
2. The route reduces it to content keywords (`lib/keywords.ts`) and calls `POST https://prompts.chat/api/mcp` with `tools/call` -> `search_prompts`. No API key needed for search.
3. The response is normalized into `{ id, title, description, content, author, category, tags, votes, url }` and cached for 10 minutes per keyword set.
4. Each result can be expanded, copied, or loaded into the textbox as a starting point.

Set `PROMPTS_CHAT_API_KEY` later if you want `save_prompt` or private prompts; search works without it.

## Install the Skill

**Claude.ai:** download [`dist/prompt-optimizer.skill`](dist/prompt-optimizer.skill), then Settings, Skills, upload. Optional: add the prompts.chat connector (Settings, Connectors, custom, `https://prompts.chat/api/mcp`) to get community templates.

**Claude Code:** copy `skill/` to `~/.claude/skills/prompt-optimizer/`, then `claude mcp add --transport http prompts-chat https://prompts.chat/api/mcp`.

The `.skill` file is a zip of `skill/`. Rebuild it after any change: `cd skill && zip -r ../dist/prompt-optimizer.skill .`

## License

Code: MIT. Community prompts fetched at runtime are CC0 per prompts.chat.
