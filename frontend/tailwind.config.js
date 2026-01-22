/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Using only grayscale + black and white
        black: "#000000",
        white: "#FFFFFF",
        gray: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
        },
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "segoe ui",
          "roboto",
          "helvetica neue",
          "arial",
          "sans-serif",
        ],
      },
      spacing: {
        "safe-inset": "max(1rem, env(safe-area-inset-right))",
      },
    },
  },
  plugins: [],
  // Ensure Tailwind is available
  corePlugins: {
    preflight: true,
  },
};
