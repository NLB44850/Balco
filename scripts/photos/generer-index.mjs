#!/usr/bin/env node
/**
 * Écrit components/plant-stock-photos.ts : une ligne `require` par photo de assets/plants/, pour
 * que l'app embarque les photos d'exemple. À relancer après avoir ajouté ou retiré une photo :
 *   node scripts/photos/generer-index.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const files = (await fs.readdir(path.join(ROOT, "assets/plants"))).filter((name) => name.endsWith(".jpg")).sort();
const lines = files.map((name) => `  ${JSON.stringify(name.replace(/\.jpg$/, ""))}: require("@/assets/plants/${name}"),`);
const source = `// Généré par scripts/photos/generer-index.mjs : ne pas modifier à la main.

/** Photos d'exemple des plantes du catalogue (Wikimedia Commons, voir app/credits.tsx). */
export const STOCK_PHOTOS: Record<string, number> = {
${lines.join("\n")}
};
`;
await fs.writeFile(path.join(ROOT, "components/plant-stock-photos.ts"), source);
console.log(`${files.length} photos dans components/plant-stock-photos.ts`);
