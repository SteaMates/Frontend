import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  // Archivos a analizar
  {
    files: ["src/**/*.{ts,tsx}"],
  },

  // Archivos a ignorar
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "src/components/ui/**", // componentes generados por shadcn — no los tocamos
    ],
  },

  // Reglas base de JS
  js.configs.recommended,

  // Reglas de TypeScript
  ...tseslint.configs.recommended,

  // Reglas de React
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // React
      "react/react-in-jsx-scope": "off", // no hace falta con React 17+
      "react/prop-types": "off", // usamos TypeScript para los tipos
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // TypeScript
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",

      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-debugger": "error",
    },
  },
);
