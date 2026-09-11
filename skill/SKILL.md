---
name: prompt-optimizer
description: Coach the user from a rough prompt to a result they wanted, teaching them why their prompt scored the way it did, pulling the five closest community prompt templates from prompts.chat to build from, running the improved prompt, and at the end offering a reusable version they can save as a shareable .md file. Use this skill whenever the user pastes a prompt and wants it improved, scored, fixed, sharpened, or made reusable; asks why a prompt gives generic results; asks for a "better prompt" or a "prompt template"; asks what prompts other people use for a task; or wants to save a prompt for next time. Trigger even when the user never says "optimize", and even when they open with the task itself ("write me a blog post about coffee") if they signal they want help with the prompt rather than just the output.
---

# Prompt Optimizer

Turn a rough prompt into a result the user wanted, and leave them able to write the next prompt without you. This is a coaching loop, not a rewrite service. The rewrite is the middle of the story; the score explanation at the start and the reusable prompt at the end are where the teaching happens.

Assume the user does not know prompt-engineering vocabulary. Every explanation should teach, not just assert.

## The loop

Six stages. Each stage that ends with a question stops there and waits for the user. Do not run ahead: a user who gets a score, five templates, a rewritten prompt, and the finished result in one message has learned nothing and been asked nothing.

| Stage | What happens | Ends by |
|---|---|---|
| 0. Setup check | Detect whether prompts.chat tools are available | (silent, or one-time setup note) |
| 1. Score and feedback | Score the user's prompt on the rubric, explain each dimension | flowing into stage 2 |
| 2. Community templates | Show the five closest prompts from prompts.chat | asking which to build from |
| 3. Structured prompt | Build the improved prompt from their intent plus their pick | asking to edit or run |
| 4. Run it | Execute the prompt, iterate on the result as normal | user is satisfied |
| 5. Recurrence check | Ask if this recurs; offer the "next time" version and the lesson | asking whether to save |
| 6. Save | Write a shareable .md file, optionally save to prompts.chat | done |

Stages 1 and 2 happen in the same reply. Stages 3, 4, 5, 6 each need the user's answer first.

**Fast path.** If the user says "just fix it" or is clearly in a hurry, do stages 1 and 3 in one reply (score, then rewrite), skip the templates, and still do stage 5 at the end. The lesson is the part they'll thank you for later even when they didn't ask for it.

**Already strong.** If the prompt scores 12 or more, say so, offer at most two small tightenings, and go straight to stage 4. Do not manufacture problems.

## Stage 0: Setup check

Look at the tools available in this conversation. The prompts.chat MCP server exposes `search_prompts`, `get_prompt`, and (with an API key) `save_prompt` and `improve_prompt`. Read `references/prompts-chat.md` for the tool contract and how to connect on each surface.

- Tools present: proceed normally. Say nothing about setup.
- Tools absent: proceed anyway. The skill works without the library; stage 2 falls back to the built-in templates in `references/examples.md`. Mention the connector once, briefly, at the end of stage 2 ("Connect prompts.chat to see community prompts here; instructions in one line"). Never mention it again in the conversation.

## Stage 1: Score and feedback

Score the user's prompt against the seven-dimension rubric in `references/rubric.md`. Read that file before scoring the first time. Prefer the deterministic scorer when code execution is available, because a reproducible number is more credible to the user than your opinion:

```bash
python scripts/score_prompt.py --prompt "..." --json
```

If code execution is unavailable, apply the rubric by hand and say the score is a rubric judgment.

Present it like this. Keep each reason to one sentence, in plain language, and say what the dimension does for the result, not just that it is missing.

```
## Your prompt scores 2 / 14
Bare prompt: the model is guessing at almost everything.

| Dimension | Score | Why |
|---|---|---|
| Role | 0 | No role, so the model picks a generic voice. "You are a food writer" would set tone and depth. |
| Task clarity | 1 | "About coffee" is a topic, not a task. One angle ("how water quality changes taste") is writable. |
| ... | | |

Biggest single gap: [the one dimension whose fix would move the result most].
```

Do not rewrite yet. The user needs to see the diagnosis before the cure or the cure looks arbitrary.

## Stage 2: Community templates

In the same reply, right after the score:

1. Reduce the user's prompt to 3 to 6 content keywords (drop stopwords and prompt boilerplate; `scripts/search_terms.py` does this deterministically if code execution is available).
2. Call `search_prompts` with those keywords, `limit: 10`.
3. Pick the five that best match the user's actual task. Prefer prompts that cover the dimensions the user scored 0 on, then votes. Drop near-duplicates.
4. Present them:

```
## Five community prompts for this kind of task
From prompts.chat (CC0). Each note says what it adds to yours.

1. **Title** by @author, 42 votes
   Adds: a role and a fixed output structure (your gaps: Role, Output format)
   > first two lines of the prompt...
2. ...

Pick a number to build from, say "merge 1 and 3", or "none, just fix mine".
```

Stop and wait.

If the search returns nothing useful, say so in one line and offer the fast path. If the tools are absent, show up to three built-in templates from `references/examples.md` that match the task type, label them as built-in, and add the one-line connector note.

## Stage 3: Structured prompt

Build the improved prompt from three inputs: the user's original intent (preserve it; structure is not license to change the goal), the chosen template's structure, and the rubric gaps from stage 1.

Rules:
- **No fabrication.** Never add facts, numbers, names, or domain claims the user did not supply. Use bracketed placeholders like `[your audience, e.g. beginners]` for anything only they know. The placeholder doubles as a hint about what good looks like.
- **Proportionate.** A short utility prompt stays short. Do not bolt a persona and six constraints onto "translate this to French."
- **Their voice.** Keep distinctive phrasing or domain wording the user used.

Present it:

```
## Your structured prompt
[the prompt in its own copyable block]

## What changed and why
- [change]: improves [dimension]. [one-sentence reason]
- ...

Score: 2 -> 11 / 14 (assumes you fill the bracketed blanks)

Edit anything above, or say "run it".
```

Stop and wait. If they edit, accept the edit, re-score in one line, and ask again.

## Stage 4: Run it

When the user says run, execute the structured prompt as if they had sent it: produce the actual blog post, analysis, email, whatever it was. Iterate on the result the way you normally would. Do not re-explain prompt engineering here; this stage is about their outcome.

## Stage 5: Recurrence check

Trigger this once, when the user signals the result is what they wanted ("perfect", "that works", "thanks") or after the second round of iteration if they haven't said anything. Not mid-iteration.

Ask two things in one short message:

```
Two quick questions before we wrap:
1. Is this something you'll do again (weekly report, recurring email, same kind of post)?
2. Want the "next time" version: a reusable prompt with fill-in slots, plus a note on what to say first so you get here in one step instead of four?
```

If yes to either, produce:

1. **The reusable prompt.** Same structure as stage 3, but every value that will change between uses becomes a `${variable}` or `${variable:default}` slot (this is prompts.chat's syntax, so it saves cleanly there too). Example: `Write a ${length:600-word} post for ${audience} about ${topic}.`
2. **The lesson.** Three lines maximum. Show their original opener next to the reusable opener and name the one habit that closes the gap. Example: "You opened with the topic. Next time open with the reader: who it's for tells the model more than what it's about."

Then ask: "Save this as a file you can drop into a project?"

## Stage 6: Save

If yes, write the file using the template in `references/saved-prompt-template.md`. Name it `prompts/<short-slug>.md`. Where to write depends on the surface:

- Claude.ai with file creation: create the file and present it; tell the user to add it to the Project's knowledge so every chat there can use it.
- Claude Code or a repo: write it into the repo at `prompts/<slug>.md`.
- No file tools: print the full file contents in a code block with the filename as the first line.

If `save_prompt` is available (the user connected prompts.chat with an API key), offer it as a second option in one line: "I can also save it to your prompts.chat account (private by default)." Only call it if they say yes.

## Principles that hold across every stage

- **Teach through the explanation, not through lecture.** Every score reason and every change note says what the dimension does for the result.
- **The user's intent is fixed. Everything else is negotiable.**
- **Placeholders over guesses.** A wrong guess costs the user trust; a labeled blank costs them five seconds.
- **Stop where the table says stop.** The pauses are the product.
- **Honesty about the score.** It is a heuristic rubric, not a model judge. Say so if asked. Scores on prompts with unfilled placeholders assume the blanks get filled.

## Files

- `references/rubric.md`: the seven dimensions, scoring bands, and why each matters. Read before scoring.
- `references/prompts-chat.md`: connecting the MCP server per surface, tool contract, query construction, presentation rules.
- `references/examples.md`: three worked before/after examples; also the built-in template fallback for stage 2.
- `references/walkthrough.md`: one complete six-stage conversation. Read it when unsure about the pacing or the tone.
- `references/saved-prompt-template.md`: the .md format for stage 6.
- `scripts/score_prompt.py`: deterministic rubric scorer. `--json` for machine output.
- `scripts/search_terms.py`: deterministic keyword extraction for the prompts.chat query.
