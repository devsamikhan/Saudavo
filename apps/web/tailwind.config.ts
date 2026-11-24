import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0F6B52",
          "primary-hover": "#0B5440",
          "primary-soft": "#E7F4EF",
          accent: "#D96B27",
          "accent-soft": "#FCEFE6"
        },
        surface: {
          canvas: "#F8FAF9",
          card: "#FFFFFF",
          muted: "#F1F5F4"
        },
        border: {
          subtle: "#DDE5E2"
        },
        ink: {
          primary: "#111827",
          secondary: "#4B5563"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        urdu: [
          "var(--font-noto-arabic)",
          "Noto Sans Arabic",
          "Tahoma",
          "Arial",
          "sans-serif"
        ]
      },
      boxShadow: {
        soft: "0 10px 30px -10px rgba(15, 107, 82, 0.14)",
        card: "0 4px 20px -4px rgba(15, 107, 82, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
