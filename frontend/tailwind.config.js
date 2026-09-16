/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: "#07080C",
          50: "#1A1D2B",
          100: "#141724",
          200: "#0F121C",
          300: "#0B0D15",
          400: "#07080C",
        },
        surface: {
          1: "#0F121C",
          2: "#161B2A",
          3: "#1F263B",
          card: "rgba(15, 18, 28, 0.85)",
          glass: "rgba(22, 27, 42, 0.65)",
        },
        cinema: {
          violet: "#8B5CF6",
          indigo: "#6366F1",
          cyan: "#38BDF8",
          blue: "#3B82F6",
          gold: "#F59E0B",
          emerald: "#10B981",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "cinema-glow": "radial-gradient(circle at 50% -20%, rgba(99, 102, 241, 0.25), transparent 70%)",
        "card-gradient": "linear-gradient(180deg, rgba(22, 27, 42, 0.6) 0%, rgba(15, 18, 28, 0.95) 100%)",
      },
      boxShadow: {
        "glow-violet": "0 0 25px -5px rgba(139, 92, 246, 0.35)",
        "glow-indigo": "0 0 30px -5px rgba(99, 102, 241, 0.4)",
        "glow-card": "0 10px 30px -10px rgba(0, 0, 0, 0.7), 0 0 15px rgba(99, 102, 241, 0.15)",
      },
    },
  },
  plugins: [],
}
