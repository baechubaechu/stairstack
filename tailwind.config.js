import { ACCENT, LAVA } from "./src/lib/game/palette.js";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      opacity: Object.fromEntries(Array.from({ length: 101 }, (_, i) => [i, `${i / 100}`])),
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        paper: "hsl(var(--paper))",
        // The canvases' ochre accent, so HTML labels match the drawings exactly.
        // (`accent` above is shadcn's near-white hover tint, not this.)
        ochre: { DEFAULT: ACCENT, hi: "#e39a2c" },
        // The crane cab (docs/ui-moodboard.html). Each colour has one job: the cab's dark interior
        // and its painted steel behind everything, ochre only on what the hand works, LCD green
        // only on numbers, danger red only for lava and alarms.
        cab: { DEFAULT: "#1d2328", steel: "#2c343b", edge: "#414b54", text: "#dfe3e6", dim: "#8f9aa3" },
        lcd: { DEFAULT: "#9fe08a", glass: "#0f1a12" },
        danger: LAVA,
      },
      fontFamily: {
        body: ["var(--font-body)"],
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
        stencil: ["var(--font-stencil)"],
        sign: ["var(--font-sign)"],
        lcd: ["var(--font-lcd)"],
      },
    },
  },
};
