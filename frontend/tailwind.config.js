/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        display: ["Outfit", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        // Deep cinematic background
        charcoal: {
          DEFAULT: "#0B0B0D",
          50: "#1C1C20",
          100: "#161618",
          200: "#111113",
          300: "#0E0E10",
          400: "#0B0B0D",
        },
        // Surface system (warm-tinted dark)
        surface: {
          1: "#141416",
          2: "#1C1C20",
          3: "#252528",
          card: "rgba(20, 20, 22, 0.92)",
          glass: "rgba(28, 28, 32, 0.70)",
        },
        // Legacy obsidian (kept for backward compat)
        obsidian: {
          DEFAULT: "#0B0B0D",
          50: "#1C1C20",
          100: "#161618",
          200: "#111113",
          300: "#0E0E10",
          400: "#0B0B0D",
        },
        // Cinema accent palette
        cinema: {
          // Warm gold — ratings, metadata, scores ONLY
          gold: "#D9A441",
          "gold-light": "#E8B96A",
          // Brighter amber — primary CTAs, buttons, active states ONLY
          amber: "#F0B429",
          "amber-hover": "#F5C04A",
          // Muted violet — AI-related elements ONLY
          violet: "#7C5CBF",
          "violet-light": "#9B7DD4",
          // Supporting
          indigo: "#5B5BD6",
          cyan: "#22D3EE",
          emerald: "#10B981",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "cinema-vignette": "radial-gradient(ellipse at center, transparent 40%, rgba(11,11,13,0.85) 100%)",
        "hero-gradient": "linear-gradient(to top, #0B0B0D 0%, #0B0B0D 15%, rgba(11,11,13,0.85) 50%, rgba(11,11,13,0.3) 80%, transparent 100%)",
        "card-fade": "linear-gradient(to top, rgba(20,20,22,1) 0%, rgba(20,20,22,0.6) 40%, transparent 100%)",
        "film-grain": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
      },
      boxShadow: {
        "card": "0 4px 24px -4px rgba(0,0,0,0.7)",
        "card-hover": "0 12px 40px -8px rgba(0,0,0,0.85)",
        "poster": "0 8px 32px -4px rgba(0,0,0,0.75)",
        "amber-glow": "0 0 20px -4px rgba(240,180,41,0.25)",
        "amber-btn": "0 4px 16px -2px rgba(240,180,41,0.3)",
        "modal": "0 24px 80px -12px rgba(0,0,0,0.9)",
        "nav": "0 1px 0 rgba(255,255,255,0.05)",
      },
      screens: {
        xs: "480px",
      },
    },
  },
  plugins: [],
};
