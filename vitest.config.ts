import path from "node:path";
import { defineConfig } from "vitest/config";

// Les tests de bout en bout (e2e/, Playwright) se lancent à part : bash scripts/e2e.sh
// L'alias « @/ » est celui de l'app (tsconfig) : il permet de tester les modules de l'app qui l'utilisent.
export default defineConfig({ resolve: { alias: { "@": path.resolve(__dirname) } }, test: { include: ["tests/**/*.test.ts"] } });
