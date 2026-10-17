#!/usr/bin/env node
/**
 * Écrit components/plant-stock-photos.ts : une ligne `require` par photo de assets/plants/, pour
 * que l'app embarque les photos d'exemple, et une vignette de 200 px par photo (assets/plants/thumbs/, pour les
 * petits ronds du catalogue et de l'accueil : refaite ici si `convert` existe). À relancer après avoir ajouté ou
 * retiré une photo :
 *   node scripts/photos/generer-index.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const files = (await fs.readdir(path.join(ROOT, "assets/plants"))).filter((name) => name.endsWith(".jpg")).sort();
const lines = files.map((name) => `  ${JSON.stringify(name.replace(/\.jpg$/, ""))}: require("@/assets/plants/${name}"),`);
const thumbsDir = path.join(ROOT, "assets/plants/thumbs");
await fs.mkdir(thumbsDir, { recursive: true });
for (const name of files) {
  const thumb = path.join(thumbsDir, name);
  if (existsSync(thumb)) continue;
  try {
    execFileSync("convert", [path.join(ROOT, "assets/plants", name), "-resize", "200x200^", "-gravity", "center", "-extent", "200x200", "-strip", "-quality", "72", thumb]);
  } catch {
    console.warn(`Vignette manquante pour ${name} : installe ImageMagick (convert) puis relance.`);
  }
}
const thumbs = new Set((await fs.readdir(thumbsDir)).filter((name) => name.endsWith(".jpg")));
const thumbLines = files.filter((name) => thumbs.has(name)).map((name) => `  ${JSON.stringify(name.replace(/\.jpg$/, ""))}: require("@/assets/plants/thumbs/${name}"),`);
const source = `// Généré par scripts/photos/generer-index.mjs : ne pas modifier à la main.

/** Photos d'exemple des plantes du catalogue (Wikimedia Commons, voir app/credits.tsx). */
export const STOCK_PHOTOS: Record<string, number> = {
${lines.join("\n")}
};

/** Les mêmes en vignettes de 200 px, pour les petits ronds (catalogue, accueil, suggestions). */
export const STOCK_THUMBS: Record<string, number> = {
${thumbLines.join("\n")}
};
`;
await fs.writeFile(path.join(ROOT, "components/plant-stock-photos.ts"), source);
console.log(`${files.length} photos dans components/plant-stock-photos.ts`);
