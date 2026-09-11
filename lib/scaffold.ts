/*
  Rules engine: a zero-cost rewrite. No model, no network, runs in the browser.

  The rubric tells us which dimensions are absent or weak. For each gap we add one
  short, labeled block with a bracketed placeholder that doubles as a hint about
  what "good" looks like. The user's original wording is preserved as the task.

  Deliberately conservative: examples and reasoning blocks are only added when the
  task type benefits (rubric.md says not to penalize prompts that don't need them).
*/

import { scorePrompt, type Dimension } from "./rubric";
import { toSearchQuery } from "./keywords";

export type ScaffoldChange = { text: string; dimension: Dimension };
export type ScaffoldResult = { optimized: string; changes: ScaffoldChange[]; engine: "rules" };

const WRITING_VERBS = /\b(write|draft|compose|create|generate|rewrite|email|post|blog|article|essay|story|caption|copy|script)\b/i;
const ANALYTIC_VERBS = /\b(analy[sz]e|compare|evaluate|review|assess|plan|calculate|recommend|decide|diagnose|debug|critique|rank|prioriti[sz]e|strategy|why|what'?s going on)\b/i;

// Words that describe the form of the request, not its subject. Kept out of the
// role hint so we get "who knows coffee well", not "who knows blog post well".
const FORM_WORDS = new Set(["blog", "post", "email", "article", "essay", "summarize", "summary", "look", "tell",
  "data", "boss", "help", "draft", "review", "going", "letter", "report", "message", "reply", "story"]);

function topicHint(prompt: string): string | null {
  const q = toSearchQuery(prompt, 6);
  if (!q) return null;
  const kept = q.split(" ").filter((w) => !FORM_WORDS.has(w) && !w.includes("'")).slice(0, 2);
  return kept.length ? kept.join(" ") : null;
}

export function scaffoldRewrite(raw: string): ScaffoldResult {
  const prompt = raw.trim().replace(/\s+/g, " ");
  const before = scorePrompt(prompt);
  const changes: ScaffoldChange[] = [];

  if (before.total >= 12) {
    return {
      optimized: prompt,
      changes: [{ text: "This prompt is already strong. Left as is; tighten placeholders by hand if any remain.", dimension: "Task clarity" }],
      engine: "rules",
    };
  }

  const s = before.scores;
  const topic = topicHint(prompt);
  const isWriting = WRITING_VERBS.test(prompt);
  const isAnalytic = ANALYTIC_VERBS.test(prompt);
  const lines: string[] = [];

  if (s["Role or persona"] < 2) {
    const who = topic ? ` who knows ${topic} well` : "";
    lines.push(`You are an experienced [role, e.g. ${isWriting ? "writer" : "analyst"}${who}].`);
    changes.push({ text: "Gave the model a role so it picks the right vocabulary and depth instead of a generic voice.", dimension: "Role or persona" });
  }

  // Task: keep the user's own words. Add a scope line only if clarity is weak.
  const task = prompt.replace(/[.\s]+$/, "");
  lines.push(s["Role or persona"] === 2 ? `${task}.` : `Task: ${task}.`);
  if (s["Task clarity"] < 2) {
    lines.push(`Specifically: [the one angle or question to focus on, e.g. "how X affects Y" rather than "about X"].`);
    changes.push({ text: "Added a line that forces one specific angle. \"About X\" is unanswerable; one angle is writable.", dimension: "Task clarity" });
  }

  if (s["Context"] < 2) {
    lines.push(`This is for [audience, e.g. beginners who are curious but not expert]. The goal is [what this needs to achieve for them].`);
    changes.push({ text: "Named the audience and purpose. The model can't see your situation; this is what separates tailored from textbook.", dimension: "Context" });
  }

  if (s["Output format"] < 2) {
    lines.push(`Format: [length, e.g. 300 words] in [structure, e.g. 3 short sections with headings]. Tone: [e.g. warm and practical].`);
    changes.push({ text: "Specified length, structure, and tone. Cheapest, highest-leverage fix for most weak prompts.", dimension: "Output format" });
  }

  if (isWriting && s["Examples"] < 2) {
    lines.push(`Here's an example of the style I want: [paste 2 to 3 sentences you like].`);
    changes.push({ text: "Left a slot for a style example. One good sample beats a paragraph of description for writing tasks.", dimension: "Examples" });
  }

  if (s["Constraints"] < 2) {
    lines.push(`Do not [thing to avoid, e.g. use jargon or marketing tone]. Only include [what actually matters to the reader].`);
    changes.push({ text: "Added an exclusion and an inclusion boundary so the answer stays on target and needs less editing.", dimension: "Constraints" });
  }

  if (isAnalytic && s["Reasoning guidance"] < 2) {
    lines.push(`Work through it step by step before giving conclusions, and cite the specific evidence behind each one.`);
    changes.push({ text: "Asked for step-by-step reasoning. For analysis and planning tasks this measurably improves accuracy.", dimension: "Reasoning guidance" });
  }

  return { optimized: lines.join("\n"), changes, engine: "rules" };
}
