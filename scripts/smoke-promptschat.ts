/*
  Live smoke test for the prompts.chat client. Needs network access to prompts.chat.
  Run with `pnpm test:promptschat`. Prints source used (mcp or rest) and top hits.
*/
import { searchCommunityPrompts } from "../lib/promptsChat";
import { toSearchQuery } from "../lib/keywords";

const raw = process.argv.slice(2).join(" ") || "Write me a blog post about coffee for home brewers";
const query = toSearchQuery(raw);
console.log("raw   :", raw);
console.log("query :", query);
if (!query) process.exit(1);

searchCommunityPrompts(query, 5)
  .then(({ prompts, source }) => {
    console.log("source:", source, "| results:", prompts.length);
    for (const p of prompts) console.log(` - [${p.votes}] ${p.title} (@${p.author}) ${p.tags.join(",")}`);
    if (prompts.length) {
      console.log("\nfirst content preview:\n", prompts[0].content.slice(0, 300));
    }
  })
  .catch((e) => {
    console.error("FAILED:", e.message);
    process.exit(1);
  });
