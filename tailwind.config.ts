import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        // === THEME SYSTEM — semantic tokens (flip light/dark via CSS vars) ===
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        "bg-page": "rgb(var(--bg-page) / <alpha-value>)",
        "bg-section": "rgb(var(--bg-section) / <alpha-value>)",
        "bg-card": "rgb(var(--bg-card) / <alpha-value>)",
        "bg-card-muted": "rgb(var(--bg-card-muted) / <alpha-value>)",
        "bg-elevated": "rgb(var(--bg-elevated) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          muted: "rgb(var(--surface-muted) / <alpha-value>)",
        },
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },
        border: "rgb(var(--border) / <alpha-value>)",
        "border-subtle": "rgb(var(--border-subtle) / <alpha-value>)",
        "border-strong": "rgb(var(--border-strong) / <alpha-value>)",
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        accent: "rgb(var(--accent) / <alpha-value>)",
        "primary-token": "rgb(var(--primary) / <alpha-value>)",
        "primary-token-foreground": "rgb(var(--primary-foreground) / <alpha-value>)",
        "text-primary": "rgb(var(--text-primary) / <alpha-value>)",
        "text-secondary": "rgb(var(--text-secondary) / <alpha-value>)",
        "text-muted-token": "rgb(var(--text-muted) / <alpha-value>)",
        "text-inverted": "rgb(var(--text-inverted) / <alpha-value>)",
        "brand-primary": "rgb(var(--brand-primary) / <alpha-value>)",
        "brand-primary-hover": "rgb(var(--brand-primary-hover) / <alpha-value>)",
        "brand-primary-soft": "rgb(var(--brand-primary-soft) / <alpha-value>)",
        "brand-blue": "rgb(var(--brand-blue) / <alpha-value>)",
        "brand-navy": "rgb(var(--brand-navy) / <alpha-value>)",
        "brand-white": "rgb(var(--brand-white) / <alpha-value>)",
        "brand-surface": "rgb(var(--brand-surface) / <alpha-value>)",
        "brand-bronze": "rgb(var(--brand-bronze) / <alpha-value>)",
        "brand-ivory": "rgb(var(--brand-ivory) / <alpha-value>)",

        // === AkarFinder official brand board ===
        // Deep Blue — institutionnel, fond sombre premium, wordmark
        deepblue: {
          DEFAULT: "#06162D",
          900: "#04101F",
          800: "#06162D",
          700: "#081F3D",
          600: "#0A2547",
          500: "#0E2A4D",
        },
        // Bronze premium — symbole, accents, baseline
        bronze: {
          DEFAULT: "#0B63CE",
          900: "#073061",
          800: "#08428C",
          700: "#0B63CE",
          600: "#0A66D8",
          500: "#3B82F6",
          400: "#60A5FA",
        },
        // Premium Blanc — fond clair cassé
        premium: {
          DEFAULT: "#F8FAFC",
          white: "#FFFFFF",
          50: "#FBFCFE",
          100: "#F8FAFC",
          200: "#EEF3F8",
        },
        // Noir monochrome (exports / documents sobres)
        mono: "#0B0B0C",

        // Legacy aliases remappés sur la nouvelle marque (transition douce)
        sand: "#EEF3F8",
        cream: "#FBFCFE",
        ink: "#0B1F3A",
        navy: "#06162D",
        midnight: "#04101F",
        gold: "#0B63CE",
        atlas: "#0A66D8",
        mist: "#DDE7F2",
        stone: "#64748B",
        primary: {
          50: "#EEF6FF",
          100: "#DDEBFF",
          200: "#BDD9FF",
          600: "#0B63CE",
          700: "#084FA8",
          900: "#0B1F3A",
        },
      },
      boxShadow: {
        soft: "0 18px 60px rgba(20, 33, 61, 0.12)",
        panel: "0 24px 80px rgba(20, 33, 61, 0.16)",
        glow: "0 30px 90px rgba(17, 28, 55, 0.28)",
        card: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)",
        badge: "0 2px 8px rgba(7,27,51,0.22)",
        bronze: "0 6px 18px rgba(11,99,206,0.24)",
      }
    }
  },
  plugins: []
};

export default config;
