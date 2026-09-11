# Prompt Optimizer (Claude Skill, v2)

A Claude Skill that coaches you from a rough prompt to the result you wanted, and leaves you able to write the next prompt yourself. It scores your prompt on a seven-dimension rubric and explains every score, pulls the five closest community prompt templates from prompts.chat to build from, runs the improved prompt with you, then offers a reusable version with fill-in slots and saves it as a shareable `.md` file.

Zero cost to run: it executes on your own Claude plan, and prompts.chat search is free with no account.

## What's inside

```
prompt-optimizer/
  SKILL.md                          the six-stage loop, stop points, principles
  references/
    rubric.md                       the seven-dimension rubric (source of truth)
    prompts-chat.md                 connecting the MCP server, tool contract, query rules
    examples.md                     three before/after examples; fallback templates
    walkthrough.md                  one complete six-stage conversation
    saved-prompt-template.md        the .md format for saved prompts
  scripts/
    score_prompt.py                 deterministic rubric scorer (0 to 14)
    search_terms.py                 deterministic keyword query builder
```

## Install

1. Install the packaged `prompt-optimizer.skill` in Claude.ai (Settings, Skills) or drop the `prompt-optimizer/` folder into your skills directory for Claude Code.
2. Optional but recommended: connect prompts.chat.
   - Claude.ai: Settings, Connectors, Add custom connector, URL `https://prompts.chat/api/mcp`. No key needed for search.
   - Claude Code: `claude mcp add --transport http prompts-chat https://prompts.chat/api/mcp`
3. Paste a prompt and ask for it to be improved. The skill takes over from there.

Without the connector, everything still works; the community-template step uses built-in templates instead.

## The loop

| Stage | You see | You do |
|---|---|---|
| 1 | Score out of 14 with a one-line reason per dimension | read |
| 2 | Five community prompts, each labeled with what it adds to yours | pick one, merge, or skip |
| 3 | Your structured prompt, what changed, new score | edit or run |
| 4 | The actual result | iterate as normal |
| 5 | "Is this recurring?" then a reusable prompt with `${slots}` and a three-line lesson | yes or no |
| 6 | A `prompts/<name>.md` file to drop into a project | done |

## Scripts

```bash
python scripts/score_prompt.py --prompt "Write me a blog post about coffee" --json
python scripts/search_terms.py --prompt "Write me a blog post about coffee for home brewers"
```

## License

MIT. Community prompts fetched at runtime are CC0 per prompts.chat.
