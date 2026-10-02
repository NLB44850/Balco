#!/usr/bin/env bash
# Tests de bout en bout de Balco (app web servie par le vrai serveur, météo simulée).
#   bash scripts/e2e.sh              → tous les scénarios
#   bash scripts/e2e.sh meteo        → seulement les fichiers dont le nom contient « meteo »
#   E2E_SKIP_BUILD=1 bash scripts/e2e.sh   → sans reconstruire l'app (plus rapide)
# Rapport : dist/e2e-report/index.html ; captures des échecs : dist/e2e-results/.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p dist
export E2E_DATABASE_URL="${E2E_DATABASE_URL:-mysql://balco:balco@localhost:3306/balco_cal}"

if [ "${E2E_SKIP_BUILD:-0}" != "1" ]; then
  echo "→ Construction de l'app web (simulation météo activée)…"
  # L'API est servie par le même serveur que l'app : pas d'adresse d'API venue d'un .env.
  EXPO_PUBLIC_API_BASE_URL= EXPO_PUBLIC_WEATHER_SIMULATION=1 npx expo export --platform web --clear --output-dir dist/e2e-web > dist/e2e-build.log 2>&1 || { tail -30 dist/e2e-build.log; exit 1; }
  echo "→ Construction du serveur…"
  pnpm -s build
fi

echo "→ Base de données à jour…"
DATABASE_URL="$E2E_DATABASE_URL" node dist/migrate.mjs

echo "→ Scénarios…"
npx playwright test -c e2e/playwright.config.ts "$@"
