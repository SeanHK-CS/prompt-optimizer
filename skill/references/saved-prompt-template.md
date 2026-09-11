# Saved prompt file format

Use this exact structure for stage 6. It is plain markdown so it drops into a Claude Project's knowledge, a repo, Notion, or anywhere else. Keep the front block short; the prompt block is what gets copied.

```markdown
# [Short title, e.g. Weekly sales summary for my manager]

**Use when:** [one line: the recurring situation this prompt is for]
**Fill in:** `${variable}` slots below. Slots with `:default` can be left as is.
**Rubric score:** [N] / 14 with slots filled
**Source:** built with Prompt Optimizer on [YYYY-MM-DD][, structure from @author's "Title" on prompts.chat]

## Prompt

[the reusable prompt, verbatim, with ${variable} and ${variable:default} slots]

## Next time, open with

[the three-line lesson from stage 5: their original opener, the better opener, the one habit]

## Example fill

[one concrete filled-in example so a future reader sees what the slots expect]
```

Naming: `prompts/<short-slug>.md`, lowercase, hyphens, no dates in the name (`prompts/weekly-sales-summary.md`, not `prompts/2026-09-11-sales.md`). If the file already exists, ask before overwriting.

After writing on Claude.ai: "Added it to `prompts/`. To reuse it in every chat here, upload it to this Project's knowledge." On Claude Code: mention the path and that it is uncommitted.
