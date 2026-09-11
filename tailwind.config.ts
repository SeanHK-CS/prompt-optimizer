import type { Config } from "tailwindcss";

// Theme tokens live here so a palette swap (e.g. to the studio PAPER/INK/sage set)
// is a one-block change, not a hunt through components.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#14120d",
        panel: "#1c190f",
        panel2: "#221e12",
        ink: "#ece5d4",
        muted: "#9a917a",
        faint: "#6b6450",
        line: "rgba(236,229,212,0.10)",
        amber: "#e8a13a",
        sage: "#9cc06a",
        rust: "#c2683a",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "SFMono-Regular", "SF Mono", "Menlo", "Consolas", "Liberation Mono", "monospace"],
        serif: ["Georgia", "Iowan Old Style", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
