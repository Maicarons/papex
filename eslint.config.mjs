import coreWebVitals from "eslint-config-next/core-web-vitals";
import tseslint from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...tseslint,
  {
    ignores: [
      "drizzle/**",
      "node_modules/**",
      ".next/**",
      "next-env.d.ts",
      "docs/**",
      ".docs-dist/**",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      // eslint-plugin-react-hooks v7 ships React-Compiler-only rules inside its
      // `recommended` set, which eslint-config-next spreads in. papex does NOT
      // use the React Compiler, so these are noisy false-positives here.
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      // Legitimate "sync state in effect" patterns exist (reading the
      // locale/cookie/theme from the DOM on mount). Keep visible but non-blocking.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
