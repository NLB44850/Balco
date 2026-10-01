import { defineConfig } from "vitest/config";

// Les tests de bout en bout (e2e/, Playwright) se lancent à part : bash scripts/e2e.sh
export default defineConfig({ test: { include: ["tests/**/*.test.ts"] } });
