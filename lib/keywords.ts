/*
  prompts.chat search is keyword-based, so sending a full prompt as the query
  matches poorly. Reduce the prompt to its content words: strip stopwords and
  prompt-engineering boilerplate, keep order, dedupe, cap the count.
*/

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "so", "of", "to", "in", "on", "for", "with",
  "at", "by", "from", "as", "into", "about", "over", "under", "is", "are", "was", "were", "be",
  "been", "being", "am", "do", "does", "did", "have", "has", "had", "will", "would", "can", "could",
  "should", "may", "might", "must", "i", "me", "my", "mine", "we", "our", "us", "you", "your",
  "yours", "he", "she", "it", "its", "they", "them", "their", "this", "that", "these", "those",
  "there", "here", "what", "which", "who", "whom", "how", "why", "when", "where", "not", "no",
  "yes", "please", "help", "want", "need", "like", "make", "get", "give", "let", "just", "some",
  "any", "all", "each", "very", "more", "most", "also", "than", "too", "out", "up", "down", "off",
  // prompt-engineering scaffolding that carries no topic signal
  "write", "me", "create", "generate", "using", "use", "act", "role", "prompt", "output", "format",
  "step", "steps", "explain", "following", "below", "above", "text", "words", "word", "tone",
]);

export function toSearchQuery(prompt: string, maxTerms = 6): string | null {
  const tokens = prompt
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, " ") // drop [placeholders]
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^['-]+|['-]+$/g, ""))
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

  const seen = new Set<string>();
  const kept: string[] = [];
  for (const w of tokens) {
    if (seen.has(w)) continue;
    seen.add(w);
    kept.push(w);
    if (kept.length >= maxTerms) break;
  }
  return kept.length ? kept.join(" ") : null;
}
