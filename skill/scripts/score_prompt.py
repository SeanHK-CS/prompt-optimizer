#!/usr/bin/env python3
"""
score_prompt.py - Heuristic rubric scorer for prompts.

Scores a prompt against the seven-dimension Prompt Quality Rubric defined in
references/rubric.md. Each dimension is scored 0 (absent), 1 (partial), or
2 (strong), for a maximum of 14.

This is a deterministic HEURISTIC scorer, not a model-graded judge. It looks for
structural and lexical signals of each rubric dimension. It runs offline and
gives the same answer every time, which is what makes a before/after comparison
reproducible and defensible. It will not catch every nuance a human or an LLM
judge would, and it is intentionally conservative: it rewards explicit signals.

Usage:
    python score_prompt.py --prompt "Write me a blog post about coffee"
    python score_prompt.py path/to/prompt.txt
    echo "Summarize this report" | python score_prompt.py
    python score_prompt.py --prompt "..." --json
"""

import argparse
import json
import re
import sys

DIMENSIONS = [
    "Role or persona",
    "Task clarity",
    "Context",
    "Output format",
    "Examples",
    "Constraints",
    "Reasoning guidance",
]

ACTION_VERBS = [
    "write", "summarize", "summarise", "analyze", "analyse", "compare",
    "draft", "classify", "explain", "list", "generate", "create", "describe",
    "translate", "rewrite", "outline", "review", "evaluate", "design",
    "plan", "extract", "calculate", "rank", "recommend", "identify",
    "brainstorm", "critique", "improve", "convert", "build", "code",
]


def _has(text, patterns):
    """Return True if any regex pattern matches the text."""
    return any(re.search(p, text) for p in patterns)


def _count(text, patterns):
    """Count how many distinct patterns match (a rough strength proxy)."""
    return sum(1 for p in patterns if re.search(p, text))


def score_role(t):
    strong = [r"\byou are an?\b", r"\bact as an?\b", r"\bas an? (expert|professional|senior|experienced)\b",
              r"\bplay the role of\b", r"\byou'?re an?\b"]
    weak = [r"\bas an?\b", r"\bexpert\b", r"\bspecialist\b", r"\bprofessional\b"]
    if _has(t, strong):
        return 2
    if _has(t, weak):
        return 1
    return 0


def score_task_clarity(t):
    has_verb = any(re.search(r"\b" + v + r"\b", t) for v in ACTION_VERBS)
    if not has_verb:
        # No clear action at all.
        return 0
    # Specificity proxies: numbers, proper-noun-ish capitalization mid-sentence,
    # concrete nouns, sufficient length.
    specificity = 0
    if re.search(r"\b\d+\b", t):
        specificity += 1
    if len(t.split()) >= 12:
        specificity += 1
    if re.search(r"\babout\b|\bregarding\b|\bon (the|how|why)\b", t):
        specificity += 1
    # "write about X" with no further scope reads as vague.
    vague_about = re.search(r"\b(write|post|article|blog|essay) about \w+\b", t) and len(t.split()) < 10
    if vague_about:
        return 1
    return 2 if specificity >= 2 else 1


def score_context(t):
    strong = [r"\bfor [\w\s,'-]{2,45}? who (has|have|are|is|do|don'?t|need)",  # described audience
              r"\bthe goal is\b", r"\bthis is for\b", r"\baudience\b", r"\bbackground:?\b",
              r"\bcontext:?\b", r"\bgiven that\b",
              r"\bfor (a|an|my|our|the) [a-z]+ (audience|reader|team|customer|client|user|manager|executive)"]
    weak = [r"\bfor (a|an|my|our)\b", r"\bbecause\b", r"\bso that\b", r"\bin order to\b",
            r"\bto help\b", r"\bwho (has|have|are|is)\b"]
    s = _count(t, strong)
    w = _has(t, weak)
    if s >= 2 or (s >= 1 and w):
        return 2
    if s == 1 or w:
        return 1
    return 0


def score_output_format(t):
    strong = [r"\b\d+\s*(word|words|sentence|sentences|bullet|bullets|paragraph|paragraphs|point|points)\b",
              r"\bin \d+ words\b", r"\btable\b", r"\bjson\b", r"\bnumbered list\b",
              r"\bbullet points?\b", r"\bsubheadings?\b", r"\bheadings?\b", r"\bmarkdown\b",
              r"\bformat:?\b", r"\bsections?\b"]
    weak = [r"\bshort\b", r"\bbrief\b", r"\bconcise\b", r"\bdetailed\b", r"\blist\b",
            r"\bsummary\b", r"\bparagraph\b", r"\btone\b"]
    s = _count(t, strong)
    if s >= 1 and (re.search(r"\b\d+\b", t) or s >= 2):
        return 2
    if s >= 1 or _has(t, weak):
        return 1
    return 0


def score_examples(t):
    strong = [r"\bfor example[:,]", r"\blike this:?", r"\binput:.*output:", r"\be\.g\.,?\s",
              r"\bsample (input|output|response)\b", r"\bhere'?s an example\b"]
    weak = [r"\bfor example\b", r"\bsuch as\b", r"\bfor instance\b", r"\bexample\b", r"\bstyle of\b"]
    if _has(t, strong):
        return 2
    if _has(t, weak):
        return 1
    return 0


def score_constraints(t):
    strong = [r"\bdo not\b", r"\bdon'?t\b", r"\bavoid\b", r"\bno more than\b", r"\bonly\b",
              r"\bmust not\b", r"\bnever\b", r"\blimit (it|the|to)\b", r"\bexclude\b",
              r"\bwithout\b", r"\bfocus (only )?on\b"]
    weak = [r"\bmust\b", r"\bshould\b", r"\bkeep it\b", r"\bmake sure\b", r"\bensure\b",
            r"\bplain language\b", r"\bno jargon\b", r"\bdefine (any|each|the|all)\b"]
    s = _count(t, strong)
    w = _has(t, weak)
    if s >= 2 or (s >= 1 and w):
        return 2
    if s == 1 or w:
        return 1
    return 0


def score_reasoning(t):
    strong = [r"\bstep[\s-]by[\s-]step\b", r"\bshow your (work|reasoning)\b",
              r"\bexplain your reasoning\b", r"\bwork through\b", r"\bbreak (it|this|the .* )?down\b",
              r"\bfirst.*then\b", r"\bthink through\b", r"\breason about\b"]
    weak = [r"\bexplain why\b", r"\bjustify\b", r"\bwalk me through\b", r"\bthink\b"]
    if _has(t, strong):
        return 2
    if _has(t, weak):
        return 1
    return 0


SCORERS = [
    score_role,
    score_task_clarity,
    score_context,
    score_output_format,
    score_examples,
    score_constraints,
    score_reasoning,
]


def score_prompt(prompt):
    t = " " + prompt.lower().strip() + " "
    scores = {dim: fn(t) for dim, fn in zip(DIMENSIONS, SCORERS)}
    total = sum(scores.values())
    return scores, total


def band(total):
    if total <= 4:
        return "Bare prompt. The model is guessing at almost everything."
    if total <= 9:
        return "Functional but generic. Usually missing format, context, or constraints."
    if total <= 12:
        return "Strong. Refinements only."
    return "Excellent. Touch lightly."


def format_report(prompt, scores, total):
    lines = []
    lines.append("Prompt Quality Score")
    lines.append("=" * 40)
    bars = {0: "[    ]", 1: "[==  ]", 2: "[====]"}
    for dim in DIMENSIONS:
        v = scores[dim]
        lines.append(f"  {bars[v]} {v}/2  {dim}")
    lines.append("-" * 40)
    lines.append(f"  Total: {total}/14")
    lines.append(f"  {band(total)}")
    return "\n".join(lines)


def read_input(args):
    if args.prompt is not None:
        return args.prompt
    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            return f.read()
    if not sys.stdin.isatty():
        data = sys.stdin.read()
        if data.strip():
            return data
    return None


def main():
    parser = argparse.ArgumentParser(description="Score a prompt against the Prompt Quality Rubric.")
    parser.add_argument("file", nargs="?", help="Path to a file containing the prompt.")
    parser.add_argument("--prompt", help="The prompt text passed directly.")
    parser.add_argument("--json", action="store_true", help="Output machine-readable JSON.")
    args = parser.parse_args()

    prompt = read_input(args)
    if not prompt or not prompt.strip():
        parser.error("No prompt provided. Use --prompt, a file path, or pipe via stdin.")

    scores, total = score_prompt(prompt)

    if args.json:
        print(json.dumps({
            "scores": scores,
            "total": total,
            "max": 14,
            "band": band(total),
        }, indent=2))
    else:
        print(format_report(prompt, scores, total))


if __name__ == "__main__":
    main()
