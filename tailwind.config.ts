import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: "var(--background)",
          secondary: "var(--background-secondary)",
          tertiary: "var(--background-tertiary)",
        },
        foreground: {
          DEFAULT: "var(--foreground)",
          secondary: "var(--foreground-secondary)",
          tertiary: "var(--foreground-tertiary)",
          muted: "var(--foreground-muted)",
        },
        primary: {
          50: "var(--primary-50)",
          100: "var(--primary-100)",
          500: "var(--primary-500)",
          600: "var(--primary-600)",
          700: "var(--primary-700)",
        },
        secondary: {
          100: "var(--secondary-100)",
          600: "var(--secondary-600)",
          700: "var(--secondary-700)",
        },
        accent: {
          50: "var(--accent-50)",
        },
        neutral: {
          50: "var(--neutral-50)",
          100: "var(--neutral-100)",
          200: "var(--neutral-200)",
          300: "var(--neutral-300)",
          500: "var(--neutral-500)",
          600: "var(--neutral-600)",
          700: "var(--neutral-700)",
          800: "var(--neutral-800)",
          900: "var(--neutral-900)",
        },
        error: {
          50: "var(--error-50)",
          500: "var(--error-500)",
          800: "var(--error-800)",
          900: "var(--error-900)",
        },
        border: {
          DEFAULT: "var(--border)",
          light: "var(--border-light)",
        },
      },
    },
  },
  plugins: [],
};
export default config;

