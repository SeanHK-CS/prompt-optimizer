/*
  Rubric scorer. A line-for-line port of skill/scripts/score_prompt.py.
  If you change a regex here, change it there too and run `pnpm test:parity`.
  Deterministic and client-safe, so the live score renders without any network.
*/

export const DIMENSIONS = [
  "Role or persona",
  "Task clarity",
  "Context",
  "Output format",
  "Examples",
  "Constraints",
  "Reasoning guidance",
] as const;

export type Dimension = (typeof DIMENSIONS)[number];
export type Scores = Record<Dimension, number>;
export type ScoreResult = { scores: Scores; total: number };

export const MAX_SCORE = 14;

const ACTION_VERBS = [
  "write", "summarize", "summarise", "analyze", "analyse", "compare", "draft", "classify",
  "explain", "list", "generate", "create", "describe", "translate", "rewrite", "outline",
  "review", "evaluate", "design", "plan", "extract", "calculate", "rank", "recommend",
  "identify", "brainstorm", "critique", "improve", "convert", "build", "code",
];
const VERB_RE = new RegExp("\\b(" + ACTION_VERBS.join("|") + ")\\b");

const has = (t: string, pats: RegExp[]) => pats.some((p) => p.test(t));
const count = (t: string, pats: RegExp[]) => pats.reduce((n, p) => n + (p.test(t) ? 1 : 0), 0);
const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

function scoreRole(t: string): number {
  const strong = [/\byou are an?\b/, /\bact as an?\b/, /\bas an? (expert|professional|senior|experienced)\b/, /\bplay the role of\b/, /\byou'?re an?\b/];
  const weak = [/\bas an?\b/, /\bexpert\b/, /\bspecialist\b/, /\bprofessional\b/];
  if (has(t, strong)) return 2;
  if (has(t, weak)) return 1;
  return 0;
}

function scoreTask(t: string): number {
  if (!VERB_RE.test(t)) return 0;
  let spec = 0;
  if (/\b\d+\b/.test(t)) spec++;
  if (words(t) >= 12) spec++;
  if (/\babout\b|\bregarding\b|\bon (the|how|why)\b/.test(t)) spec++;
  const vague = /\b(write|post|article|blog|essay) about \w+\b/.test(t) && words(t) < 10;
  if (vague) return 1;
  return spec >= 2 ? 2 : 1;
}

function scoreContext(t: string): number {
  const strong = [
    /\bfor [\w\s,'-]{2,45}? who (has|have|are|is|do|don'?t|need)/, /\bthe goal is\b/, /\bthis is for\b/,
    /\baudience\b/, /\bbackground:?\b/, /\bcontext:?\b/, /\bgiven that\b/,
    /\bfor (a|an|my|our|the) [a-z]+ (audience|reader|team|customer|client|user|manager|executive)/,
  ];
  const weak = [/\bfor (a|an|my|our)\b/, /\bbecause\b/, /\bso that\b/, /\bin order to\b/, /\bto help\b/, /\bwho (has|have|are|is)\b/];
  const s = count(t, strong);
  const w = has(t, weak);
  if (s >= 2 || (s >= 1 && w)) return 2;
  if (s === 1 || w) return 1;
  return 0;
}

function scoreFormat(t: string): number {
  const strong = [
    /\b\d+\s*(word|words|sentence|sentences|bullet|bullets|paragraph|paragraphs|point|points)\b/, /\bin \d+ words\b/,
    /\btable\b/, /\bjson\b/, /\bnumbered list\b/, /\bbullet points?\b/, /\bsubheadings?\b/, /\bheadings?\b/,
    /\bmarkdown\b/, /\bformat:?\b/, /\bsections?\b/,
  ];
  const weak = [/\bshort\b/, /\bbrief\b/, /\bconcise\b/, /\bdetailed\b/, /\blist\b/, /\bsummary\b/, /\bparagraph\b/, /\btone\b/];
  const s = count(t, strong);
  if (s >= 1 && (/\b\d+\b/.test(t) || s >= 2)) return 2;
  if (s >= 1 || has(t, weak)) return 1;
  return 0;
}

function scoreExamples(t: string): number {
  const strong = [/\bfor example[:,]/, /\blike this:?/, /\binput:[\s\S]*output:/, /\be\.g\.,?\s/, /\bsample (input|output|response)\b/, /\bhere'?s an example\b/];
  const weak = [/\bfor example\b/, /\bsuch as\b/, /\bfor instance\b/, /\bexample\b/, /\bstyle of\b/];
  if (has(t, strong)) return 2;
  if (has(t, weak)) return 1;
  return 0;
}

function scoreConstraints(t: string): number {
  const strong = [
    /\bdo not\b/, /\bdon'?t\b/, /\bavoid\b/, /\bno more than\b/, /\bonly\b/, /\bmust not\b/, /\bnever\b/,
    /\blimit (it|the|to)\b/, /\bexclude\b/, /\bwithout\b/, /\bfocus (only )?on\b/,
  ];
  const weak = [/\bmust\b/, /\bshould\b/, /\bkeep it\b/, /\bmake sure\b/, /\bensure\b/, /\bplain language\b/, /\bno jargon\b/, /\bdefine (any|each|the|all)\b/];
  const s = count(t, strong);
  const w = has(t, weak);
  if (s >= 2 || (s >= 1 && w)) return 2;
  if (s === 1 || w) return 1;
  return 0;
}

function scoreReasoning(t: string): number {
  // Python uses `.` which does not match newlines; [\s\S] with a bound approximates
  // the same intent across line breaks. Parity check covers the common cases.
  const strong = [
    /\bstep[\s-]by[\s-]step\b/, /\bshow your (work|reasoning)\b/, /\bexplain your reasoning\b/, /\bwork through\b/,
    /\bbreak (it|this|the .* )?down\b/, /\bfirst.*then\b/, /\bthink through\b/, /\breason about\b/,
  ];
  const weak = [/\bexplain why\b/, /\bjustify\b/, /\bwalk me through\b/, /\bthink\b/];
  if (has(t, strong)) return 2;
  if (has(t, weak)) return 1;
  return 0;
}

const SCORERS: Array<(t: string) => number> = [
  scoreRole, scoreTask, scoreContext, scoreFormat, scoreExamples, scoreConstraints, scoreReasoning,
];

export function scorePrompt(prompt: string): ScoreResult {
  const scores = Object.fromEntries(DIMENSIONS.map((d) => [d, 0])) as Scores;
  if (!prompt || !prompt.trim()) return { scores, total: 0 };
  const t = " " + prompt.toLowerCase().trim() + " ";
  let total = 0;
  DIMENSIONS.forEach((d, i) => {
    const v = SCORERS[i](t);
    scores[d] = v;
    total += v;
  });
  return { scores, total };
}

export function band(total: number): string {
  if (total <= 4) return "Bare. The model is guessing at almost everything.";
  if (total <= 9) return "Functional but generic.";
  if (total <= 12) return "Strong.";
  return "Excellent.";
}
