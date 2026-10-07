#!/usr/bin/env bash
# Télécharge la photo choisie d'une plante (scripts/photos/choix.json), met à jour l'index et la pousse.
#   bash scripts/photos/ajouter-photo.sh head-lettuce
# À lancer dans le Codespace (le réseau de la session Claude bloque Wikimedia).
set -uo pipefail
cd "$(dirname "$0")/../.."
id="${1:?Il manque la plante, par exemple : bash scripts/photos/ajouter-photo.sh head-lettuce}"
branch="$(git rev-parse --abbrev-ref HEAD)"

echo "→ 1/4 Mise à jour du code ($branch)…"
git pull --quiet origin "$branch" || { echo "✘ git pull a échoué : copie ce message à Claude."; exit 1; }

echo "→ 2/4 Téléchargement de la photo choisie…"
node scripts/photos/telecharger-photos.mjs --final | grep -E "$id|Terminé" || true
[ -f "assets/plants/$id.jpg" ] || { echo "✘ La photo assets/plants/$id.jpg n'a pas été téléchargée : copie ce message à Claude."; exit 1; }

echo "→ 3/4 Photo allégée et index des photos…"
if command -v convert >/dev/null 2>&1; then
  convert "assets/plants/$id.jpg" -resize '800x800>' -strip -quality 74 "assets/plants/$id.jpg"
else
  echo "  (convert absent : Claude allégera la photo de son côté)"
fi
node scripts/photos/generer-index.mjs >/dev/null || { echo "✘ L'index des photos n'a pas pu être refait : copie ce message à Claude."; exit 1; }

echo "→ 4/4 Envoi sur GitHub…"
git add "assets/plants/$id.jpg" assets/plants/credits.json components/plant-stock-photos.ts
git commit --quiet -m "Photo de la plante $id" || { echo "✘ Rien à enregistrer : copie ce message à Claude."; exit 1; }
git push --quiet origin "$branch" || { echo "✘ git push a échoué : copie ce message à Claude."; exit 1; }
echo "✔ Photo envoyée ($(du -k "assets/plants/$id.jpg" | cut -f1) Ko). Dis à Claude : « c'est poussé »."
