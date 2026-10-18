// Redessine l’icône, l’écran de démarrage et le favicon : node scripts/art/icone.mjs (depuis la racine).
import { chromium } from "playwright";
import { motif } from "./icone-motif.mjs";
const GREEN = "#1F7A4D";
const svg = (size, body, bg = "") => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${bg}${body}</svg>`;
// Le dessin rapetissé autour du centre (zone sûre des icônes adaptatives d'Android).
const scaled = (k, body, dy = 0) => `<g transform="translate(${512 - 512 * k} ${512 - 512 * k + dy}) scale(${k})">${body}</g>`;
const bg = `<rect width="1024" height="1024" fill="${GREEN}"/>`;
// Le dessin occupe y 255-836 : on le recentre (centre ≈ 545 → 512).
const centered = (k, opts) => `<g transform="translate(${512 - 515 * k} ${512 - 545 * k}) scale(${k})">${motif(opts)}</g>`;
const jobs = [
  ["icon.png", 1024, svg(1024, centered(1.3), bg)],
  ["android-icon-foreground.png", 512, svg(1024, centered(1))],
  ["android-icon-background.png", 512, svg(1024, "", bg)],
  ["android-icon-monochrome.png", 432, svg(1024, centered(1, { mono: true }))],
  ["splash-icon.png", 1024, svg(1024, centered(1.3))],
  ["favicon.png", 48, svg(1024, centered(1.4), `<rect width="1024" height="1024" rx="220" fill="${GREEN}"/>`)],
];
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [name, size, content] of jobs) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<html><body style="margin:0;background:transparent">${content.replace(/width="1024" height="1024" viewBox/, `width="${size}" height="${size}" viewBox`)}</body></html>`);
  await page.screenshot({ path: `assets/images/${name}`, omitBackground: true });
  await page.close();
}
await browser.close();
