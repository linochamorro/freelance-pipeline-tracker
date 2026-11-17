import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "dist/**",
      "node_modules/**",
      "out/**",
      "prisma/generated/**",
      "reports/**",
      "src/generated/**",
      "next-env.d.ts",
    ],
  },
  {
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
    },
  },
  {
    files: [
      "src/app/(dashboard)/**/page.tsx",
      "src/components/auth/reset-password-form.tsx",
      "src/components/kanban/kanban-card.tsx",
      "src/components/tasks/notification-bell.tsx",
    ],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);
