import { existsSync } from "node:fs";
import path from "node:path";

import { defineConfig, devices } from "@playwright/test";

/**
 * Tests de bout en bout de l'app web (même code que l'app Android), servie par le vrai serveur.
 * Lancement : `bash scripts/e2e.sh` (construit l'app, prépare la base, démarre le serveur).
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const ROOT = path.resolve(__dirname, "..");
// Le Chromium déjà installé dans la session Claude ; ailleurs, celui de Playwright.
const chromium = process.env.E2E_CHROMIUM ?? (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

export default defineConfig({
  testDir: ".",
  outputDir: path.join(ROOT, "dist/e2e-results"),
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: path.join(ROOT, "dist/e2e-report") }]],
  use: {
    ...devices["Pixel 7"],
    baseURL: `http://localhost:${PORT}`,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    launchOptions: chromium ? { executablePath: chromium } : {},
  },
  webServer: {
    command: `node dist/index.mjs > dist/e2e-server.log 2>&1`,
    cwd: ROOT,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      PORT: String(PORT),
      WEB_DIR: "dist/e2e-web",
      DATABASE_URL: process.env.E2E_DATABASE_URL ?? "mysql://balco:balco@localhost:3306/balco_cal",
      JWT_SECRET: "e2e-secret-e2e-secret-e2e-secret-0001",
      NODE_ENV: "development",
    },
  },
});
