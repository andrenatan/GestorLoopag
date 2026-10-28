import type { Config } from "tailwindcss";

// Tokens live in client/src/index.css as bare HSL channels ("334 82% 47%").
// `tone` maps a token to a Tailwind color that supports opacity modifiers
// (bg-primary/15). Glass tokens carry their own base alpha (e.g. --card-alpha),
// multiplied by the modifier so `bg-card` is translucent by design.
const tone = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;
const glassTone = (name: string, alphaVar: string) =>
  `hsl(var(--${name}) / calc(<alpha-value> * var(--${alphaVar})))`;

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', "ui-sans-serif", "system-ui", "sans-serif"],
        display: ['"Bricolage Grotesque"', '"Instrument Sans"', "ui-sans-serif", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 6px)",
        card: "1.5rem",
        panel: "1.75rem",
      },
      boxShadow: {
        glass: "var(--shadow-glass)",
        float: "var(--shadow-float)",
        glow: "0 10px 30px -12px hsl(var(--primary) / 0.65)",
      },
      backgroundImage: {
        brand: "var(--gradient-brand)",
      },
      colors: {
        background: tone("background"),
        foreground: tone("foreground"),
        card: {
          DEFAULT: glassTone("card", "card-alpha"),
          foreground: tone("card-foreground"),
        },
        popover: {
          DEFAULT: glassTone("popover", "popover-alpha"),
          foreground: tone("popover-foreground"),
        },
        primary: {
          DEFAULT: tone("primary"),
          foreground: tone("primary-foreground"),
        },
        secondary: {
          DEFAULT: glassTone("secondary", "secondary-alpha"),
          foreground: tone("secondary-foreground"),
        },
        muted: {
          DEFAULT: glassTone("muted", "muted-alpha"),
          foreground: tone("muted-foreground"),
        },
        accent: {
          DEFAULT: glassTone("accent", "accent-alpha"),
          foreground: tone("accent-foreground"),
        },
        destructive: {
          DEFAULT: tone("destructive"),
          foreground: tone("destructive-foreground"),
        },
        success: {
          DEFAULT: tone("success"),
          foreground: tone("success-foreground"),
        },
        warning: {
          DEFAULT: tone("warning"),
          foreground: tone("warning-foreground"),
        },
        info: {
          DEFAULT: tone("info"),
          foreground: tone("info-foreground"),
        },
        highlight: {
          DEFAULT: tone("highlight"),
          foreground: tone("highlight-foreground"),
        },
        ink: {
          DEFAULT: tone("ink"),
          foreground: tone("ink-foreground"),
        },
        field: glassTone("field", "field-alpha"),
        edge: glassTone("edge", "edge-alpha"),
        border: glassTone("border", "border-alpha"),
        input: glassTone("input", "input-alpha"),
        ring: tone("ring"),
        scrim: tone("scrim"),
        whatsapp: {
          wallpaper: tone("whatsapp-wallpaper"),
          bubble: tone("whatsapp-bubble"),
        },
        chart: {
          "1": tone("chart-1"),
          "2": tone("chart-2"),
          "3": tone("chart-3"),
          "4": tone("chart-4"),
          "5": tone("chart-5"),
          "6": tone("chart-6"),
        },
        sidebar: {
          DEFAULT: glassTone("card", "card-alpha"),
          foreground: tone("foreground"),
          primary: tone("ink"),
          "primary-foreground": tone("ink-foreground"),
          accent: glassTone("accent", "accent-alpha"),
          "accent-foreground": tone("accent-foreground"),
          border: glassTone("border", "border-alpha"),
          ring: tone("ring"),
        },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
