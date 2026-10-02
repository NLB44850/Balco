/**
 * Peint les ombres du décor de l'accueil (rambarde, feuillages, plantes en pot) et les gouttes
 * sur la vitre, en PNG transparents, dans assets/images/balcony. Les ombres sont noires :
 * l'app les teinte (vert chaud le jour, bleu la nuit) et les anime.
 *
 * Usage (Chromium via Playwright) : node scripts/art/ombres-balcon.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const out = join(dirname(fileURLToPath(import.meta.url)), "../../assets/images/balcony");

const painter = () => {
  let seed = 1;
  const random = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  const reseed = (value) => (seed = value);

  function canvas(width, height) {
    const node = document.createElement("canvas");
    node.width = width;
    node.height = height;
    return [node, node.getContext("2d")];
  }

  /** Une feuille au contour irrégulier, nervure centrale évidée pour laisser passer la lumière. */
  function leaf(ctx, length, width) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(width * (0.9 + random() * 0.3), -length * 0.25, width * (0.7 + random() * 0.2), -length * 0.8, 0, -length);
    ctx.bezierCurveTo(-width * (0.7 + random() * 0.2), -length * 0.8, -width * (0.9 + random() * 0.3), -length * 0.25, 0, 0);
    ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = Math.max(1, width * 0.06);
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.moveTo(0, -length * 0.08);
    ctx.lineTo(0, -length * 0.9);
    ctx.stroke();
    ctx.restore();
  }

  /** Une branche souple avec des rameaux et des feuilles en alternance. */
  function branch(ctx, x, y, angle, length, size, depth = 0) {
    const steps = 11;
    let px = x, py = y, a = angle;
    ctx.lineWidth = Math.max(1.2, size * 0.09 * (1 - depth * 0.3));
    for (let step = 0; step < steps; step++) {
      const t = step / steps;
      a += (random() - 0.5) * 0.18 + 0.02;
      const seg = length / steps;
      const nx = px + Math.cos(a) * seg, ny = py + Math.sin(a) * seg;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      px = nx; py = ny;
      if (step > 1) {
        for (const side of [-1, 1]) {
          if (random() < 0.45) continue;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(a + Math.PI / 2 + side * (0.75 + random() * 0.5));
          const l = size * (0.75 + random() * 0.5) * (1 - t * 0.35);
          leaf(ctx, l, l * 0.38);
          ctx.restore();
        }
        if (depth < 1 && random() < 0.16) branch(ctx, px, py, a + (random() < 0.5 ? -1 : 1) * (0.6 + random() * 0.4), length * 0.45, size * 0.8, depth + 1);
      }
    }
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a + Math.PI / 2);
    leaf(ctx, size * 0.8, size * 0.3);
    ctx.restore();
  }

  function blurred(source, blur) {
    const [node, ctx] = canvas(source.width, source.height);
    ctx.filter = `blur(${blur}px)`;
    ctx.drawImage(source, 0, 0);
    return node.toDataURL("image/png");
  }

  const W = 900, H = 1800;
  const result = {};

  // Rambarde : barreaux inclinés et main courante, projetés par un soleil haut sur la gauche.
  {
    const [node, ctx] = canvas(W, H);
    ctx.fillStyle = "#000";
    ctx.setTransform(1, 0, -0.42, 1, 0, 0);
    const top = H * 0.36;
    ctx.fillRect(-200, top, W + 900, 34);
    ctx.fillRect(-200, top + 40, W + 900, 8);
    for (let x = -100; x < W + 700; x += 58) ctx.fillRect(x, top + 26, 13, H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // L'ombre s'adoucit en s'éloignant du sol.
    ctx.globalCompositeOperation = "destination-in";
    const fade = ctx.createLinearGradient(0, top - 40, 0, H);
    fade.addColorStop(0, "rgba(0,0,0,0.55)");
    fade.addColorStop(0.35, "rgba(0,0,0,1)");
    fade.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, W, H);
    result.railing = blurred(node, 7);
  }

  // Feuillages : une plante grimpante au-dessus du balcon, en deux plans (net et flou).
  for (const [name, blur, specs, seedValue] of [
    ["leaves-near", 4, [[W + 30, -30, 2.3, 820, 86], [W + 20, 560, 2.95, 480, 70]], 11],
    ["leaves-far", 14, [[-40, -40, 0.8, 760, 104], [W + 60, 180, 2.6, 660, 110], [-60, 740, 0.35, 440, 90]], 29],
  ]) {
    reseed(seedValue);
    const [node, ctx] = canvas(W, H);
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#000";
    ctx.lineCap = "round";
    for (const [x, y, angle, length, size] of specs) branch(ctx, x, y, angle, length, size);
    result[name] = blurred(node, blur);
  }

  // Plantes en pot : l'ombre de chaque plante posée au pied de la rambarde, penchée comme la lumière.
  const PW = 560, PH = 560, CX = 200;
  const plants = {
    bush: (ctx) => { for (let i = 0; i < 26; i++) { ctx.save(); ctx.translate(PW / 2 + (random() - 0.5) * 120, PH * 0.56 - random() * 150); ctx.rotate((random() - 0.5) * 3); leaf(ctx, 46 + random() * 20, 22); ctx.restore(); } },
    tall: (ctx) => { ctx.fillRect(PW / 2 + 34, 70, 6, PH * 0.57); branch(ctx, PW / 2, PH * 0.64, -1.62, 270, 40); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(PW / 2 + (random() - 0.5) * 70, PH * 0.25 + random() * 150, 13 + random() * 6, 0, Math.PI * 2); ctx.fill(); } },
    flower: (ctx) => { for (let i = 0; i < 6; i++) { const x = PW / 2 + (i - 2.5) * 16; const top = PH * 0.2 + random() * 90; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(PW / 2, PH * 0.64); ctx.quadraticCurveTo(x, (PH * 0.64 + top) / 2, x + (random() - 0.5) * 30, top); ctx.stroke(); ctx.beginPath(); ctx.arc(x, top, 15 + random() * 6, 0, Math.PI * 2); ctx.fill(); } for (let i = 0; i < 8; i++) { ctx.save(); ctx.translate(PW / 2 + (random() - 0.5) * 60, PH * 0.6 - random() * 60); ctx.rotate((random() - 0.5) * 2.4); leaf(ctx, 44, 14); ctx.restore(); } },
    leafy: (ctx) => { for (let i = 0; i < 11; i++) { ctx.save(); ctx.translate(PW / 2, PH * 0.64); ctx.rotate((i / 10 - 0.5) * 1.9 + (random() - 0.5) * 0.2); leaf(ctx, 170 + random() * 50, 40); ctx.restore(); } },
    berry: (ctx) => { for (let i = 0; i < 18; i++) { ctx.save(); ctx.translate(PW / 2 + (random() - 0.5) * 130, PH * 0.6 - random() * 110); ctx.rotate((random() - 0.5) * 3); leaf(ctx, 40 + random() * 16, 22); ctx.restore(); } for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(PW / 2 + (random() - 0.5) * 120, PH * 0.6 - random() * 40, 8, 0, Math.PI * 2); ctx.fill(); } },
    sprout: (ctx) => { ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(PW / 2, PH * 0.64); ctx.lineTo(PW / 2, PH * 0.5); ctx.stroke(); for (const side of [-1, 1]) { ctx.save(); ctx.translate(PW / 2, PH * 0.5); ctx.rotate(side * 1.0); leaf(ctx, 50, 22); ctx.restore(); } },
  };
  for (const [name, draw] of Object.entries(plants)) {
    reseed(name.length * 97);
    const [node, ctx] = canvas(PW, PH);
    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#000";
    ctx.lineCap = "round";
    // Penchée comme la rambarde, le pied du pot restant à sa place.
    ctx.setTransform(1, 0, -0.42, 1, PH * 0.42 * 0.77 + CX - PW / 2, 0);
    draw(ctx);
    // Le pot : un tronc de cône avec son rebord, un peu plus clair que le feuillage.
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(PW / 2 - 70, PH * 0.64);
    ctx.lineTo(PW / 2 + 70, PH * 0.64);
    ctx.lineTo(PW / 2 + 54, PH * 0.9);
    ctx.lineTo(PW / 2 - 54, PH * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(PW / 2 - 78, PH * 0.62, 156, 22);
    ctx.globalAlpha = 1;
    result[`plant-${name}`] = blurred(node, 5);
  }

  // Gouttes sur la vitre : reflet clair en haut, bord sombre en bas, comme une petite lentille.
  for (const [name, r] of [["drop-small", 10], ["drop-medium", 16], ["drop-large", 24]]) {
    const size = r * 4;
    const [node, ctx] = canvas(size, size);
    const cx = size / 2, cy = size / 2;
    const body = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.35, r * 0.1, cx, cy, r);
    body.addColorStop(0, "rgba(255,255,255,0.55)");
    body.addColorStop(0.6, "rgba(230,236,242,0.10)");
    body.addColorStop(0.88, "rgba(140,158,176,0.22)");
    body.addColorStop(1, "rgba(90,110,130,0.38)");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 0.88, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.3, cy - r * 0.42, r * 0.22, r * 0.13, -0.5, 0, Math.PI * 2);
    ctx.fill();
    const shade = ctx.createRadialGradient(cx, cy + r * 1.05, 0, cx, cy + r * 1.05, r * 0.9);
    shade.addColorStop(0, "rgba(40,60,80,0.10)");
    shade.addColorStop(1, "rgba(40,60,80,0)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, size, size);
    result[name] = node.toDataURL("image/png");
  }
  return result;
};

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage();
const images = await page.evaluate(painter);
for (const [name, url] of Object.entries(images)) writeFileSync(join(out, `${name}.png`), Buffer.from(url.split(",")[1], "base64"));
await browser.close();
console.log(`${Object.keys(images).length} images écrites dans ${out}`);
