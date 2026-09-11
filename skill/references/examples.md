# Worked Examples

Three full optimizations showing the depth and tone the skill should hit. Each shows the raw prompt, the optimized prompt, the plain-language changes, and the rubric movement.

---

## Example 1: A vague writing request

**Raw prompt:**
> Write me a blog post about coffee.

**Diagnosis:** No role, no audience, no length, no angle, no format. The model will produce a generic, average post.

**Optimized prompt:**
> You are a food writer for a specialty coffee brand's blog. Write a 600-word blog post for home brewers who are curious but not yet expert. Topic: how water quality changes the taste of coffee. Use a warm, practical tone, include 3 short subheadings, and end with one concrete action the reader can take this week. Avoid jargon, and define any technical term the first time it appears.

**What changed and why:**
- Added a role ("food writer for a specialty coffee brand"): improves Role. It sets tone and depth.
- Named the audience ("home brewers, curious but not expert"): improves Context. It calibrates the vocabulary.
- Picked a specific angle ("how water quality changes taste"): improves Task clarity. "About coffee" is unanswerable; this is writable.
- Specified length, subheadings, and a closing action: improves Output format. The post is now usable as-is.
- Added "avoid jargon, define technical terms": improves Constraints. It prevents the most common failure for this audience.

**Score:** Before 1 / 14, After 10 / 14. Biggest single gain: a specific, writable angle in place of an unanswerable topic.

---

## Example 2: An analysis task

**Raw prompt:**
> Look at this sales data and tell me what's going on.

**Diagnosis:** Clear-ish verb, but no definition of "what's going on," no output structure, and no reasoning guidance for what is fundamentally an analytical task.

**Optimized prompt:**
> You are a data analyst. I will paste a table of monthly sales by region. Identify the three most important patterns: the strongest trend, the biggest anomaly, and one segment worth a closer look. For each, state the pattern in one sentence, cite the specific numbers that support it, then give one plausible explanation. Work through the data step by step before giving conclusions. Present the result as three short labeled sections. Do not speculate beyond what the numbers support.

**What changed and why:**
- Added the analyst role: improves Role.
- Defined "what's going on" as three specific outputs (trend, anomaly, segment): improves Task clarity. This is the core fix.
- Asked for supporting numbers and one explanation each: improves Constraints and grounding.
- Added "work through the data step by step": improves Reasoning guidance, which raises accuracy on analytical tasks.
- Specified three labeled sections: improves Output format.
- Added "do not speculate beyond the numbers": improves Constraints and reduces hallucinated conclusions.

**Score:** Before 0 / 14, After 8 / 14. Biggest single gain: turning "what's going on" into three concrete, checkable deliverables.

---

## Example 3: A summarization task

**Raw prompt:**
> Summarize this article for me.

**Diagnosis:** A clear verb and object, but no length, no audience, no purpose. "Summarize" without a target produces an unpredictable length and focus.

**Optimized prompt:**
> Summarize the article below for a busy executive who has not read it and has 60 seconds. Give a 3-sentence overview first, then 4 bullet points covering the key facts and any numbers that matter, then one sentence on why it is relevant to the reader. Keep the whole thing under 150 words. Use plain language, no marketing tone.

**What changed and why:**
- Named the reader ("busy executive, 60 seconds"): improves Context. It sets the right level and length.
- Specified structure (3-sentence overview, 4 bullets, 1 relevance line): improves Output format. This is the main fix for summaries.
- Set a hard length ("under 150 words"): improves Output format and Constraints.
- Added "plain language, no marketing tone": improves Constraints.

**Score:** Before 1 / 14, After 9 / 14. Biggest single gain: a defined structure and length in place of an open-ended "summarize."

---

## Tone notes for the explanations

- Lead with the change, not the jargon. "Added a length limit" before "this improves output format."
- One reason per change, concrete and outcome-focused ("so the post is usable as-is," not "for better results").
- It is fine to say a dimension was deliberately left low when the task does not need it.
