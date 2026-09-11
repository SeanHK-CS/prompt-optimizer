/*
  Parity check: the TS scorer must agree with skill/scripts/score_prompt.py on
  every dimension for a spread of prompts. Run with `pnpm test:parity`.
*/
import { execFileSync } from "node:child_process";
import path from "node:path";
import { scorePrompt, DIMENSIONS } from "../lib/rubric";

const PROMPTS = [
  "Write me a blog post about coffee.",
  "Look at this sales data and tell me what's going on.",
  "Summarize this article for me.",
  "Help me write an email to my boss.",
  "You are a food writer for a specialty coffee brand's blog. Write a 600-word blog post for home brewers who are curious but not yet expert. Topic: how water quality changes the taste of coffee. Use a warm, practical tone, include 3 short subheadings, and end with one concrete action the reader can take this week. Avoid jargon, and define any technical term the first time it appears.",
  "You are a data analyst. I will paste a table of monthly sales by region. Identify the three most important patterns: the strongest trend, the biggest anomaly, and one segment worth a closer look. For each, state the pattern in one sentence, cite the specific numbers that support it, then give one plausible explanation. Work through the data step by step before giving conclusions. Present the result as three short labeled sections. Do not speculate beyond what the numbers support.",
  "Summarize the article below for a busy executive who has not read it and has 60 seconds. Give a 3-sentence overview first, then 4 bullet points covering the key facts and any numbers that matter, then one sentence on why it is relevant to the reader. Keep the whole thing under 150 words. Use plain language, no marketing tone.",
  "Act as a senior React engineer. Review the component below for performance issues. For example: unnecessary re-renders, missing memoization. Output a numbered list. Don't rewrite the whole file.",
  "explain quantum computing",
  "First outline the argument, then draft the essay in markdown with headings. Think through counterarguments. The goal is to persuade a skeptical audience.",
  "translate this to french",
  "Input: a customer complaint. Output: a JSON object with fields sentiment and summary. Only return JSON.",
  "",
  "   ",
];

const py = path.join(__dirname, "..", "skill", "scripts", "score_prompt.py");
let failures = 0;
for (const p of PROMPTS) {
  const ts = scorePrompt(p);
  let pyScores: Record<string, number>;
  if (!p.trim()) {
    pyScores = Object.fromEntries(DIMENSIONS.map((d) => [d, 0])); // python errors on empty; TS returns zeros by design
  } else {
    const out = execFileSync("python3", [py, "--prompt", p, "--json"], { encoding: "utf8" });
    pyScores = JSON.parse(out).scores;
  }
  for (const d of DIMENSIONS) {
    if (ts.scores[d] !== pyScores[d]) {
      failures++;
      console.log(`MISMATCH  ${d}: ts=${ts.scores[d]} py=${pyScores[d]}  :: ${p.slice(0, 60)}`);
    }
  }
}
console.log(failures === 0 ? `PARITY OK across ${PROMPTS.length} prompts x ${DIMENSIONS.length} dimensions` : `${failures} mismatches`);
process.exit(failures ? 1 : 0);
