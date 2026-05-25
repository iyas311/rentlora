/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1B3A6B",
        accent: "#FF6B6B",
        secondary: "#F8F4EF",
        text: "#2D2D2D",
        muted: "#6B7280",
        success: "#10B981"
      }
    }
  },
  plugins: []
};
