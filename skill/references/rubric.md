# Prompt Quality Rubric

Seven dimensions, each scored 0, 1, or 2. Maximum 14. This is the single source of truth shared by the SKILL.md workflow, the `score_prompt.py` scorer, and any UI built on top of the skill. Keep all three in sync if you change it.

Scoring bands per dimension:

- **0 (absent):** the dimension is missing entirely.
- **1 (partial):** the dimension is present but vague, implicit, or underspecified.
- **2 (strong):** the dimension is explicit, specific, and useful to the model.

---

## 1. Role or persona

Does the prompt tell the model who it should be or what expertise to bring?

- Signals: "you are a...", "act as", "as an expert in", a named perspective or audience-facing role.
- Why it matters: a role primes the model toward the right vocabulary, depth, and assumptions. "Explain inflation" and "You are an economics teacher explaining inflation to a 12-year-old" produce very different answers.
- 0: no role. 1: a role is implied but generic ("help me with"). 2: a specific, relevant role with enough detail to shape tone and depth.

## 2. Task clarity

Is the core instruction specific and unambiguous?

- Signals: a clear action verb (write, summarize, analyze, compare, draft, classify), a concrete object, and specific scope.
- Why it matters: ambiguity is the single biggest cause of generic output. The model fills gaps with the most average interpretation.
- 0: no clear ask, or contradictory asks. 1: a clear verb but vague scope ("write about marketing"). 2: a specific, bounded task ("write a 200-word LinkedIn post announcing a product launch to existing customers").

## 3. Context

Does the prompt supply the background the model needs?

- Signals: audience, purpose, situation, prior constraints, "the goal is", "this is for", "given that".
- Why it matters: the model cannot read the user's situation. Context is what separates a tailored answer from a textbook one.
- 0: none. 1: minimal or one-dimensional context. 2: audience plus purpose plus relevant situational detail.

## 4. Output format

Does the prompt specify the shape of the answer?

- Signals: length ("150 words", "3 bullets"), structure (table, numbered list, headings, JSON), tone, medium.
- Why it matters: format control turns a wall of text into something usable. It is also the cheapest, highest-leverage fix for most weak prompts.
- 0: unspecified. 1: a loose hint ("keep it short"). 2: explicit structure and length or medium.

## 5. Examples

Where examples would help, does the prompt include them?

- Signals: "for example", "like this:", a sample input/output pair, a style reference.
- Why it matters: one good example often does more than a paragraph of description, especially for format-sensitive or stylistic tasks.
- 0: none where they would clearly help. 1: a passing reference to a style or example. 2: a concrete example or input/output demonstration.
- Note: simple factual lookups do not need examples. Do not penalize a prompt for omitting examples it does not need; score this dimension against whether examples would have helped.

## 6. Constraints

Does the prompt state boundaries: what to include, exclude, or limit?

- Signals: "do not", "avoid", "only", "must", "no more than", tone limits, scope limits, "focus on".
- Why it matters: constraints prevent the model from wandering and reduce the editing the user has to do afterward.
- 0: none. 1: one soft constraint. 2: clear inclusion and exclusion boundaries.

## 7. Reasoning guidance

For tasks that benefit from it, does the prompt ask the model to work through its thinking?

- Signals: "step by step", "first... then", "explain your reasoning", "show your work", "break it down".
- Why it matters: for analysis, math, planning, and multi-step tasks, asking for structured reasoning measurably improves accuracy.
- 0: none where it would help. 1: a light nudge. 2: explicit reasoning structure.
- Note: like examples, this is task-dependent. A simple rewrite does not need it. Score against whether reasoning guidance would have helped.

---

## Interpreting the total

- **0 to 4:** Bare prompt. The model is guessing at almost everything. Large, easy gains available.
- **5 to 9:** Functional but generic. Usually missing format, context, or constraints.
- **10 to 12:** Strong. Refinements only.
- **13 to 14:** Excellent. Touch lightly.

A jump from, say, 1 to 10 is the kind of concrete, defensible improvement to show the user.
