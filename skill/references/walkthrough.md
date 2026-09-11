# Walkthrough: one complete loop

A full conversation, all six stages, so the pacing and tone are unambiguous. Turn boundaries are marked. Community prompts shown here are illustrative; real ones come from `search_prompts`.

---

**User:** Can you make this prompt better? "Write a weekly update email to my team about what we shipped."

**Claude (stages 1 and 2, one reply):**

## Your prompt scores 2 / 14
Bare prompt: the model is guessing at almost everything.

| Dimension | Score | Why |
|---|---|---|
| Role | 0 | No role, so it'll write in a generic corporate voice. Naming who you are ("engineering manager writing to my own team") sets the register. |
| Task clarity | 2 | Clear verb and object: a weekly email about what shipped. This is the one thing you got right, and it's the most important one. |
| Context | 0 | "My team" names a recipient but not who they are, how technical they are, or what the update is for (morale, alignment, record). |
| Output format | 0 | No length, no structure. You'll get five paragraphs one week and two bullets the next. |
| Examples | 0 | A two-line sample of your usual tone would fix the voice instantly. |
| Constraints | 0 | Nothing says what to leave out: ticket numbers, metrics, blockers? You'll be deleting by hand. |
| Reasoning guidance | 0 | Not needed for this task; leaving it at 0 on purpose. |

Biggest single gap: output format. A fixed shape is what makes a recurring email recurring.

## Five community prompts for this kind of task
From prompts.chat (CC0). Each note says what it adds to yours.

1. **Weekly Team Update Writer** by @mara_k, 61 votes
   Adds: fixed sections (Shipped / In progress / Blockers) and a length cap (your gaps: Output format, Constraints)
   > You are a team lead writing a Friday update. Structure it as three sections...
2. **Ship Log to Announcement** by @devrel_sam, 44 votes
   Adds: turns a raw commit or ticket list into readable wins (your gap: Task clarity)
   > I'll paste a list of merged PRs. Rewrite each as a one-line win a non-engineer...
3. **Internal Comms Tone Coach** by @jlin, 38 votes
   Adds: a role and a tone spec with a sample (your gaps: Role, Examples)
   > Act as an internal communications editor. Match this sample voice...
4. **Status Email, 150 Words** by @quietops, 29 votes
   Adds: a hard word limit and a "one ask" closer (your gaps: Output format, Constraints)
   > Write a status email under 150 words. End with exactly one request...
5. **Stakeholder Digest** by @pmnotes, 22 votes
   Adds: audience-split versions (your gap: Context)
   > Produce two versions of the same update: one for the team, one for leadership...

Pick a number to build from, say "merge 1 and 4", or "none, just fix mine".

---

**User:** merge 1 and 4

**Claude (stage 3):**

## Your structured prompt

```
You are an engineering manager writing your team's Friday update. I will paste a list of what shipped this week.

Write an email under 150 words with three short sections: Shipped, In progress, Blockers. In Shipped, turn each item into a one-line win in plain language, no ticket numbers. Keep the tone [your usual tone, e.g. direct and a little dry]. Do not include metrics or anything still in review. End with exactly one request or question for the team.

This is for a team of [size] who [are mostly engineers / are cross-functional]; the goal is [e.g. keep everyone aligned without a meeting].

Here's a sample of how I usually sound: [paste two lines from a past email]
```

## What changed and why
- Added the role (engineering manager, own team): improves Role. Sets the register without you describing it.
- Said the input is a pasted list: improves Task clarity. The model now knows where "what we shipped" comes from.
- Three fixed sections (structure from @mara_k's Weekly Team Update Writer): improves Output format. Same shape every week.
- 150-word cap and one closing ask (from @quietops's Status Email): improves Output format and Constraints. Keeps it readable and gives the email a job.
- "No ticket numbers, no metrics, nothing still in review": improves Constraints. The things you'd otherwise delete by hand.
- Named the team and the goal as placeholders: improves Context. Only you know these; the blanks say what to fill.
- Two placeholders for tone and a sample: improves Examples. Only you know your voice; the blanks tell you what to paste.

Score: 2 -> 12 / 14 (assumes you fill the bracketed blanks)

Edit anything above, or say "run it".

---

**User:** run it. tone is direct, skip the sample. here's the list: [pastes six items]

**Claude (stage 4):**

[Writes the actual email: under 150 words, three sections, one closing ask. No prompt-engineering commentary.]

---

**User:** perfect, that's exactly it

**Claude (stage 5):**

Two quick questions before we wrap:
1. Is this something you'll do again (it sounded weekly)?
2. Want the "next time" version: a reusable prompt with fill-in slots, plus a note on what to say first so you get here in one step instead of four?

---

**User:** yes to both

**Claude (stage 5, continued):**

## Reusable prompt

```
You are an engineering manager writing your team's ${cadence:Friday} update. I will paste a list of what shipped this ${period:week}.

Write an email under ${limit:150} words with three short sections: Shipped, In progress, Blockers. In Shipped, turn each item into a one-line win in plain language, no ticket numbers. Keep the tone ${tone:direct}. Do not include metrics or anything still in review. End with exactly one request or question for the team.

This is for a team of ${team_size} who ${team_makeup:are mostly engineers}; the goal is ${goal:keep everyone aligned without a meeting}.

${shipped_list}
```

## Next time, open with
You opened with the topic ("what we shipped"). The reusable version opens with the shape (three sections, 150 words, one ask). Next time, say the shape first and the topic second; the model can guess a topic but it can't guess a format.

Save this as a file you can drop into a project?

---

**User:** yes

**Claude (stage 6):**

[Writes `prompts/weekly-team-update.md` using `references/saved-prompt-template.md`, presents it, and says:]

Saved `prompts/weekly-team-update.md`. Upload it to this Project's knowledge and every chat here can use it. I can also save it to your prompts.chat account (private by default) if you've connected it with an API key.

---

## What this walkthrough shows

- Stages 1 and 2 share a reply; 3, 4, 5, 6 each wait for the user.
- Reasoning guidance was deliberately left at 0 and said so. Not every dimension applies.
- Nothing was invented: tone and sample were placeholders until the user supplied them.
- The lesson in stage 5 is three lines and names one habit. That's the teaching payload.
- Credit to community authors appears in "What changed", not as a disclaimer block.
