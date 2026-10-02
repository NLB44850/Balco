import "dotenv/config";
import { existsSync } from "node:fs";
import path from "node:path";
import { createServer } from "node:http";
import net from "node:net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express, { type Express } from "express";

import { costReport, formatCostReport } from "../ai/budget";
import { authenticateRequest } from "../auth/session";
import { appRouter } from "../routers";
import { dispatchDueReminderNotifications, recalculateAllReminders } from "../reminders";
import { createContext } from "./context";
import { assertProductionConfig, ENV } from "./env";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

/** Origines autorisées : celles listées dans CORS_ORIGINS, plus le serveur Expo local en développement. */
export function isAllowedOrigin(origin: string) {
  if (ENV.corsOrigins.includes(origin)) return true;
  return !ENV.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1|\d+\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin);
}

/** L'app web (export Expo statique) est servie par l'API : même origine, pas de CORS à ouvrir. */
function serveWebApp(app: Express) {
  const webDir = path.resolve(ENV.webDir);
  if (!existsSync(path.join(webDir, "index.html"))) return false;
  app.use(express.static(webDir, { extensions: ["html"], index: "index.html", maxAge: "1h" }));
  // Route dynamique : l'export statique produit garden/[id].html, à servir pour /garden/<id> (lien direct, rechargement).
  const plantPage = path.join(webDir, "garden", "[id].html");
  if (existsSync(plantPage)) app.get("/garden/:id", (_req, res) => res.sendFile(plantPage));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(webDir, "index.html")));
  return true;
}

export function createApp() {
  const app = express();
  // Derrière le proxy de l'hébergeur : vraie IP du client (limites de débit) et détection du HTTPS.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.header("X-Content-Type-Options", "nosniff");
    res.header("Referrer-Policy", "strict-origin-when-cross-origin");
    const origin = req.headers.origin;
    if (origin && isAllowedOrigin(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(origin && isAllowedOrigin(origin) ? 204 : 403);
      return;
    }
    next();
  });

  // Assez pour une photo de plante (le scanner) ; les autres requêtes restent minuscules.
  app.use(express.json({ limit: "8mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Appelé par un cron externe (toutes les heures, minute 31) : recalcule les décisions avec une météo fraîche puis envoie les push dus.
  app.post("/api/scheduled/reminders", async (req, res) => {
    if (!ENV.cronSecret || req.headers.authorization !== `Bearer ${ENV.cronSecret}`) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    try {
      const recalculated = await recalculateAllReminders();
      const dispatched = await dispatchDueReminderNotifications();
      res.json({ recalculated: { users: recalculated.users, decisions: recalculated.decisions, failures: recalculated.failures }, dispatched });
    } catch (error) {
      console.error("[scheduled/reminders] failed", error);
      res.status(500).json({ error: "failed" });
    }
  });

  // Rapport des coûts de l'IA, lisible dans un navigateur connecté avec un compte `role = admin`.
  app.get("/api/admin/ai-costs", async (req, res) => {
    const user = await authenticateRequest(req).catch(() => null);
    if (!user || user.role !== "admin") {
      res.status(user ? 403 : 401).type("text/plain").send("Réservé aux administrateurs de Balco.");
      return;
    }
    const from = typeof req.query.from === "string" && !Number.isNaN(Date.parse(req.query.from)) ? new Date(req.query.from) : undefined;
    res.type("text/plain; charset=utf-8").send(formatCostReport(await costReport(from)));
  });

  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }));

  const servesWeb = serveWebApp(app);
  return { app, servesWeb };
}

async function startServer() {
  assertProductionConfig();
  const { app, servesWeb } = createApp();
  const server = createServer(app);
  const preferredPort = parseInt(process.env.PORT || "3000");
  // En production, le port est imposé par l'hébergeur : pas question d'en choisir un autre.
  const port = ENV.isProduction ? preferredPort : await findAvailablePort(preferredPort);
  if (port !== preferredPort) console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}${servesWeb ? " (web app included)" : ""}`);
  });
}

if (process.env.VITEST !== "true") {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
