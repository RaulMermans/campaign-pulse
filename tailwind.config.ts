import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f5f6f3",
        ink: "#171817",
        muted: "#667069",
        card: "#ffffff",
        line: "#d8ddd6"
      },
      boxShadow: {
        soft: "0 14px 34px rgba(23, 24, 23, 0.07)"
      }
    }
  },
  plugins: []
};

export default config;
