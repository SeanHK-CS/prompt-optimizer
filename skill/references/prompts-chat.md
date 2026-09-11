# prompts.chat integration

prompts.chat is a free, CC0 community library of AI prompts. It exposes an MCP (Model Context Protocol) server, which means Claude can search it as a tool once the user connects it. Search needs no account. Saving needs a free API key.

Source of truth: https://prompts.chat/docs/api

## Connecting (tell the user only what applies to their surface)

**Claude.ai (web or desktop):** Settings, Connectors, Add custom connector. Name: `prompts.chat`. URL: `https://prompts.chat/api/mcp`. No auth needed for search. Then enable it in the chat's tools menu.

**Claude Code:**
```bash
claude mcp add --transport http prompts-chat https://prompts.chat/api/mcp
```

**Other MCP clients (Cursor, VS Code, Windsurf, Codex, Gemini):** add an HTTP server with URL `https://prompts.chat/api/mcp`. The docs page has copy-paste config for each.

**Optional API key** (only for `save_prompt` and private prompts): generate at https://prompts.chat/settings, keys start with `pchat_`. Pass it as the `PROMPTS_API_KEY` header on the remote connector, or `PROMPTS_API_KEY` env var on the local `npx -y @fkadev/prompts.chat-mcp` server.

When the connector is absent, say this once, in one line, and move on:
"To see community prompts here, add `https://prompts.chat/api/mcp` as a connector (Settings, Connectors). I'll use built-in templates for now."

## Tool contract

### search_prompts (no auth)

| Parameter | Type | Required | Notes |
|---|---|---|---|
| query | string | yes | keyword search, so send content words, not the whole prompt |
| limit | number | no | default 10, max 50; use 10 and pick the best 5 |
| type | string | no | TEXT, STRUCTURED, IMAGE, VIDEO, AUDIO; use TEXT for text tasks |
| category | string | no | category slug |
| tag | string | no | tag slug |

Returns `{ query, count, prompts: [ { id, title, description, content, type, author, category, tags, votes, createdAt } ] }`.

### get_prompt (no auth)

`{ id }`. Returns the full prompt; if it contains `${variable}` slots, the client may be asked to fill them. Use it only when a search hit's `content` was truncated.

### save_prompt (auth)

`{ title, content, description?, tags?, category?, isPrivate?, type? }`. Private by default unless the user changed their settings. Content may include `${variable}` and `${variable:default}` slots, which is why stage 5 uses that syntax.

### improve_prompt (auth)

Their own AI rewrite. Do not use it inside this skill: it returns plain text with no explanation, which defeats the teaching purpose. Mention it only if the user asks what else prompts.chat can do.

## Building the query

prompts.chat matches on keywords. A full prompt sentence matches poorly; three to six content words match well.

1. Lowercase, strip punctuation and `[bracketed placeholders]`.
2. Drop stopwords and prompt boilerplate (write, create, help, please, prompt, format, output, step, explain, following, tone, words).
3. Keep the first 3 to 6 distinct remaining words in order.

`scripts/search_terms.py` does exactly this; run it when code execution is available so the query is reproducible.

Examples:

| Raw prompt | Query |
|---|---|
| Write me a blog post about coffee for home brewers | `blog post coffee home brewers` |
| Look at this sales data and tell me what's going on | `look sales data tell what's going` (nouns only on retry: `sales data`) |
| Help me write an email to my boss asking for Friday off | `email boss asking friday` |

If the first search returns fewer than three usable hits, retry once with only the two most specific words (usually the nouns). Do not retry a third time.

## Choosing the five

From up to ten hits, keep five by this order of preference:

1. Same task type as the user's (a blog-post template for a blog-post request, not a code-review one that happens to mention coffee).
2. Covers a dimension the user scored 0 on in stage 1.
3. Higher votes.
4. Not a near-duplicate of one already kept.

If fewer than five survive, show what survived. Never pad with irrelevant hits to reach five.

## Presenting them

For each: title, `@author`, votes, one "Adds:" line naming which rubric dimensions the template brings that the user's prompt lacks, and the first two lines of the content as a quote. Link is `https://prompts.chat/prompts/<id>`.

Do not paste full prompt contents for all five; that is a wall of text. Full content appears only for the one the user picks, in stage 3, and only the parts that made it into the structured prompt.

Community prompts are CC0, so reusing their structure is fine. Still credit the author in the "What changed" section when a template shaped the rewrite ("structure borrowed from @author's Blog Writer").
