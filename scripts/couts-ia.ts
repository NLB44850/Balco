/**
 * Rapport des coûts réels de l'IA (diagnostics, questions à Nora, par compte), lu dans ai_requests.
 *
 *   DATABASE_URL=mysql://balco:MOT_DE_PASSE@127.0.0.1:3306/balco pnpm exec tsx scripts/couts-ia.ts
 *   … scripts/couts-ia.ts 2026-09-01     (depuis une date ; par défaut le début du mois)
 *
 * Même rapport dans un navigateur connecté avec un compte admin : /api/admin/ai-costs
 */
import "dotenv/config";

import { costReport, formatCostReport } from "../server/ai/budget";

const from = process.argv[2] ? new Date(process.argv[2]) : undefined;
if (from && Number.isNaN(from.getTime())) {
  console.error("Date invalide : utilise le format 2026-09-01.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manque (voir docs/deploiement.md).");
  process.exit(1);
}
costReport(from)
  .then((report) => {
    console.log(formatCostReport(report));
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error("Rapport impossible :", error instanceof Error ? error.message : error);
    process.exit(1);
  });
