/**
 * Remet à jour docs/pas-a-pas.md depuis le code : pour chaque modèle, « Ce qu'il te faut », les étapes et « Et après ? »
 * de sa plante d'exemple, et le nombre de plantes concernées. Les textes d'introduction restent ceux du document.
 * Lancer : pnpm exec tsx scripts/pas-a-pas/mettre-a-jour.ts
 */
import { readFileSync, writeFileSync } from "node:fs";

import { getCatalogPlant, PLANT_CATALOG } from "../../lib/plants/catalog";
import { guideModelFor, guideSteps, guideTitle, nextGestures, supplies, whatsNext, type GuideModel, type GuideOptions } from "../../lib/plants/guide";
import { ILLUSTRATION_LABELS } from "../../lib/plants/illustration-names";

type Section = { number: number; plant: string; model: GuideModel; options?: GuideOptions; counted?: boolean };

const SECTIONS: Section[] = [
  { number: 1, plant: "lambs-lettuce", model: "sow-pot", counted: true },
  { number: 2, plant: "basil", model: "sow-indoor", counted: true },
  { number: 3, plant: "lavender", model: "plant-seedling", counted: true },
  { number: 4, plant: "garlic", model: "plant-bulb", counted: true },
  { number: 5, plant: "redcurrant", model: "perennial-pot", counted: true },
  { number: 6, plant: "thyme", model: "repot" },
  { number: 7, plant: "thyme", model: "topdress" },
  { number: 8, plant: "lambs-lettuce", model: "thin" },
  { number: 9, plant: "basil", model: "pinch" },
  { number: 10, plant: "thyme", model: "pinch" },
  { number: 11, plant: "basil", model: "outdoors" },
];

// Combien de plantes passent par chaque modèle, sur toute l'année.
const counts = new Map<string, number>();
for (const entry of PLANT_CATALOG) {
  const models = new Set<string>();
  for (let month = 1; month <= 12; month++) models.add(guideModelFor(entry, month));
  for (const model of models) counts.set(model, (counts.get(model) ?? 0) + 1);
}

const path = "docs/pas-a-pas.md";
let doc = readFileSync(path, "utf8");
for (const section of SECTIONS) {
  const entry = getCatalogPlant(section.plant)!;
  const start = doc.search(new RegExp(`^## ${section.number}\\. `, "mu"));
  const next = doc.slice(start + 3).search(/^## /mu);
  const end = next < 0 ? doc.length : start + 3 + next;
  let body = doc.slice(start, end);
  // L'exemple et le nombre de plantes.
  body = body.replace(/^Exemple : \*\*[^*]+\*\*\./mu, `Exemple : **${guideTitle(entry, section.model)}**.`);
  if (section.counted) body = body.replace(/Utilisé pour \d+ plantes/u, `Utilisé pour ${counts.get(section.model) ?? 0} plantes`);
  const items = supplies(entry, section.model, section.options).map((item) => `- ${item.label}${item.detail ? ` : ${item.detail}` : ""}`).join("\n");
  const steps = guideSteps(entry, section.model, section.options)
    .map((step, index) => {
      const lines = [`${index + 1}. **${step.text}**${step.why ? ` ${step.why}` : ""}  `, `   _Dessin : ${ILLUSTRATION_LABELS[step.illustration].charAt(0).toLowerCase()}${ILLUSTRATION_LABELS[step.illustration].slice(1)}._${step.mistake ? "  " : ""}`];
      if (step.mistake) lines.push(`   ⚠️ ${step.mistake}`);
      return lines.join("\n");
    })
    .join("\n");
  const after = [...whatsNext(entry, section.model), ...nextGestures(entry, section.model)].map((line) => `- ${line}`).join("\n");
  body = body.replace(/\*\*Ce qu'il te faut\*\*\n\n[\s\S]*?\n\n\*\*Les étapes\*\*/u, `**Ce qu'il te faut**\n\n${items}\n\n**Les étapes**`);
  body = body.replace(/(\*\*Les étapes\*\*[^\n]*\n\n)[\s\S]*?\n\n\*\*Et après \?\*\*/u, `$1${steps}\n\n**Et après ?**`);
  body = body.replace(/\*\*Et après \?\*\*\n\n[\s\S]*?(\n\n|$)/u, `**Et après ?**\n\n${after}$1`);
  doc = doc.slice(0, start) + body + doc.slice(end);
}
doc = doc.replace(/^Mis à jour le [^.]+\./mu, `Mis à jour le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}.`);
writeFileSync(path, doc);
console.log("docs/pas-a-pas.md mis à jour");
