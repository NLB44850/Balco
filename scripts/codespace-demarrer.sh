#!/usr/bin/env bash
# Démarre Balco dans un GitHub Codespace, en une commande :
#   bash scripts/codespace-demarrer.sh
#
# Le cache de construction de Docker s'abîme souvent quand le Codespace est arrêté
# (« parent snapshot … does not exist ») : on le vide avant de reconstruire.
# Les données (compte, plantes) sont dans un volume à part : elles ne sont pas touchées.
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.codespaces.yml)

if [ ! -f .env ]; then
  echo "✖ Fichier .env introuvable : crée-le d'abord (voir docs/deploiement.md)."
  exit 1
fi

echo "1/4 · Nettoyage du cache Docker…"
docker builder prune -af >/dev/null 2>&1 || true
"${COMPOSE[@]}" rm -sf >/dev/null 2>&1 || true

echo "2/4 · Construction et démarrage (5 à 10 minutes la première fois)…"
"${COMPOSE[@]}" up -d --build

echo "3/4 · Attente du serveur…"
for _ in $(seq 1 60); do
  if curl -fsS http://localhost:3000/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 3
done

if ! curl -fsS http://localhost:3000/api/health >/dev/null 2>&1; then
  echo "✖ Le serveur ne répond pas. Dernières lignes du journal :"
  "${COMPOSE[@]}" logs app --tail 30
  exit 1
fi

echo "4/4 · Balco tourne."
if [ -n "${CODESPACE_NAME:-}" ]; then
  echo "   Adresse : https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  # Rend le port public pour l'app du téléphone (si l'outil gh est disponible).
  if command -v gh >/dev/null 2>&1 && gh codespace ports visibility 3000:public -c "$CODESPACE_NAME" >/dev/null 2>&1; then
    echo "   Port 3000 rendu public."
  else
    echo "   ⚠ Pense à rendre le port 3000 public : onglet Ports → clic droit sur 3000 → Port Visibility → Public."
  fi
fi
echo "   Code de connexion : docker compose logs app | grep \"login code\" | tail -1"
