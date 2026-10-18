// Redessine l’icône, l’écran de démarrage et le favicon : node scripts/art/icone.mjs (depuis la racine).
import { chromium } from "playwright";
import { MOTIF_CENTER, motif } from "./icone-motif.mjs";

const GREEN = "#1F7A4D";
const svg = (size, body, bg = "") => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${bg}${body}</svg>`;
const bg = `<rect width="1024" height="1024" fill="${GREEN}"/>`;
// Le dessin rapetissé autour du centre de l'image (zone sûre des icônes adaptatives d'Android : 66 %).
const centered = (k, opts) => `<g transform="translate(${512 - MOTIF_CENTER.x * k} ${512 - MOTIF_CENTER.y * k}) scale(${k})">${motif(opts)}</g>`;
const jobs = [
  ["icon.png", 1024, svg(1024, centered(0.95), bg)],
  ["android-icon-foreground.png", 512, svg(1024, centered(0.72))],
  ["android-icon-background.png", 512, svg(1024, "", bg)],
  ["android-icon-monochrome.png", 432, svg(1024, centered(0.72, { mono: true }))],
  ["splash-icon.png", 1024, svg(1024, centered(1))],
  // Petite icône des notifications d'Android : blanche sur fond transparent (le téléphone la teinte).
  ["notification-icon.png", 96, svg(1024, centered(1.1, { mono: true }))],
  ["favicon.png", 48, svg(1024, centered(1.05), `<rect width="1024" height="1024" rx="220" fill="${GREEN}"/>`)],
];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [name, size, content] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0;background:transparent">${content.replace(/width="1024" height="1024" viewBox/, `width="${size}" height="${size}" viewBox`)}</body></html>`);
  await page.screenshot({ path: `assets/images/${name}`, omitBackground: true });
  await page.close();
}
await browser.close();
