import type { Config } from "tailwindcss";

const config: Config = {
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
        // === AkarFinder official brand board ===
        // Deep Blue — institutionnel, fond sombre premium, wordmark
        deepblue: {
          DEFAULT: "#071B33",
          900: "#04111F",
          800: "#071B33",
          700: "#0C2746",
          600: "#13355C",
          500: "#1D4774",
        },
        // Bronze premium — symbole, accents, baseline
        bronze: {
          DEFAULT: "#9B7838",
          900: "#6F551F",
          800: "#80622B",
          700: "#9B7838",
          600: "#B08A47",
          500: "#C2A368", // bronze clair (sur fond sombre)
          400: "#D4BC8C",
        },
        // Premium Blanc — fond clair cassé
        premium: {
          DEFAULT: "#F7F5EF",
          white: "#F7F5EF",
          50: "#FBFAF5",
          100: "#F7F5EF",
          200: "#EFEBE0",
        },
        // Noir monochrome (exports / documents sobres)
        mono: "#0B0B0C",

        // Legacy aliases remappés sur la nouvelle marque (transition douce)
        sand: "#EFEBE0",
        cream: "#FBFAF5",
        ink: "#071B33",
        navy: "#071B33",
        midnight: "#04111F",
        gold: "#9B7838",
        atlas: "#13355C",
        mist: "#dce6f0",
        stone: "#6B7280",
        primary: {
          50: "#F2F6FB",
          100: "#DCE6F2",
          200: "#B8CBE2",
          600: "#13355C",
          700: "#0C2746",
          900: "#071B33",
        },
      },
      boxShadow: {
        soft: "0 18px 60px rgba(20, 33, 61, 0.12)",
        panel: "0 24px 80px rgba(20, 33, 61, 0.16)",
        glow: "0 30px 90px rgba(17, 28, 55, 0.28)",
        card: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)",
        badge: "0 2px 8px rgba(7,27,51,0.22)",
        bronze: "0 6px 18px rgba(155,120,56,0.28)",
      }
    }
  },
  plugins: []
};

export default config;
