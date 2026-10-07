#!/usr/bin/env bash
# Captures d'écran des nouveautés pour le récap Claude (docs/captures/*.jpg, 540 px de large).
#   bash scripts/captures.sh   (≈ 3 min : construit l'app web, lance e2e/captures.spec.ts)
set -euo pipefail
cd "$(dirname "$0")/.."
CAPTURES=1 bash scripts/e2e.sh captures
for f in docs/captures/*.png; do
  convert "$f" -resize 540x -strip -quality 82 "${f%.png}.jpg" && rm "$f"
done
ls docs/captures
