#!/usr/bin/env python3
"""
search_terms.py - Reduce a raw prompt to a short keyword query for prompts.chat.

prompts.chat search is keyword-based, so a full prompt sentence matches poorly.
This keeps 3 to 6 content words in their original order, dropping stopwords and
prompt-engineering boilerplate. Deterministic, so the same prompt always yields
the same query. Mirrors lib/keywords.ts in the companion web app.

Usage:
    python search_terms.py --prompt "Write me a blog post about coffee for home brewers"
    echo "Summarize this report" | python search_terms.py
    python search_terms.py --prompt "..." --max 4
"""

import argparse
import re
import sys

STOPWORDS = set("""
a an the and or but if then so of to in on for with at by from as into about over under
is are was were be been being am do does did have has had will would can could should
may might must i me my mine we our us you your yours he she it its they them their
this that these those there here what which who whom how why when where not no yes
please help want need like make get give let just some any all each very more most
also than too out up down off
write me create generate using use act role prompt output format step steps explain
following below above text words word tone
""".split())


def search_terms(prompt: str, max_terms: int = 6) -> str:
    text = prompt.lower()
    text = re.sub(r"\[[^\]]*\]", " ", text)          # drop [placeholders]
    text = re.sub(r"[^a-z0-9\s'-]", " ", text)
    kept, seen = [], set()
    for raw in text.split():
        w = raw.strip("'-")
        if len(w) < 3 or w in STOPWORDS or w.isdigit() or w in seen:
            continue
        seen.add(w)
        kept.append(w)
        if len(kept) >= max_terms:
            break
    return " ".join(kept)


def main():
    p = argparse.ArgumentParser(description="Build a prompts.chat search query from a raw prompt.")
    p.add_argument("--prompt", help="The prompt text.")
    p.add_argument("--max", type=int, default=6, help="Maximum keywords (default 6).")
    args = p.parse_args()
    prompt = args.prompt
    if prompt is None and not sys.stdin.isatty():
        prompt = sys.stdin.read()
    if not prompt or not prompt.strip():
        p.error("No prompt provided. Use --prompt or pipe via stdin.")
    print(search_terms(prompt, args.max))


if __name__ == "__main__":
    main()
