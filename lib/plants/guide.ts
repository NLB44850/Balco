/**
 * Le pas-à-pas pour planter, côté données : quel modèle de guide (semer en pot, semer au chaud, planter un
 * plant, planter un bulbe ou un tubercule, installer une vivace en grand pot), « Ce qu'il te faut » et
 * « Et après ? », calculés depuis le catalogue (lib/plants/catalog.ts) et les données de plantation
 * (lib/plants/planting.ts). Logique pure.
 */
import type { IllustrationId } from "./illustration-names";
import { MONTH_LONG, type CatalogPlant } from "./catalog";
import { sowsOnWindowsill } from "./indoor";
import { PLANTING, type Planting } from "./planting";
import { startActivity } from "./calendar";
import type { ClimateInfo } from "./climate";

export type GuideModel = "sow-pot" | "sow-indoor" | "plant-seedling" | "plant-bulb" | "perennial-pot";

/**
 * Bulbes et tubercules : on ne les sème pas, on ne plante pas un « plant ». Profondeur de plantation et ce qu'on
 * achète (sources : fiches de plantation Promesse de Fleurs, Gamm vert, Jardiner malin, Rustica).
 */
const BULBS: Record<string, { buy: string; depthCm: number; tip: string }> = {
  garlic: { buy: "Des gousses d’ail à planter", depthCm: 3, tip: "pointe vers le haut" },
  potato: { buy: "Des pommes de terre germées", depthCm: 10, tip: "germes vers le haut" },
  oca: { buy: "Des tubercules d’oca", depthCm: 8, tip: "bourgeons vers le haut" },
  crosne: { buy: "Des tubercules de crosnes", depthCm: 5, tip: "couchés à plat" },
  dahlia: { buy: "Des tubercules de dahlia", depthCm: 8, tip: "vieilles tiges vers le haut" },
};

export function bulbOf(entry: CatalogPlant) {
  return BULBS[entry.id] ?? null;
}

export function plantingOf(entry: CatalogPlant): Planting {
  return PLANTING[entry.id];
}

/** Une vivace qui demande un grand pot (arbuste, petit fruitier) : on l'installe pour des années. */
const BIG_POT_LITERS = 15;

/** Le modèle du guide, d'après le premier geste du mois (« Sème… au chaud », « Plante… »). */
export function guideModelFor(entry: CatalogPlant, month: number, climate?: ClimateInfo | null): GuideModel {
  if (BULBS[entry.id]) return "plant-bulb";
  // Semis serré coupé jeune (micro-pousses, cresson) : une barquette, même à l'intérieur.
  if (plantingOf(entry).perPot === 0) return "sow-pot";
  const start = startActivity({ id: entry.id, entry, displayName: entry.name }, month, { climate });
  if (start.kind === "sow") return start.title.includes("au chaud") || sowsOnWindowsill(entry, month) ? "sow-indoor" : "sow-pot";
  return entry.perennial && entry.potLiters >= BIG_POT_LITERS ? "perennial-pot" : "plant-seedling";
}

export const isSowing = (model: GuideModel) => model === "sow-pot" || model === "sow-indoor";

/** « de mâche », « d’agastache », « de tomates cerises ». */
export function ofName(name: string) {
  const lower = name.charAt(0).toLowerCase() + name.slice(1);
  return /^[aeéèêiouyh]/iu.test(lower) ? `d’${lower}` : `de ${lower}`;
}

/**
 * Un objet de « Ce qu'il te faut ». `shared` : commun à toutes les plantes (terreau, billes, arrosoir) ; coché
 * « J'ai déjà » une fois, il l'est partout. Sinon, propre à cette plante (pot, graines, plant).
 */
export type Supply = { id: string; label: string; detail?: string; shared: boolean };

/** Semis serré coupé jeune (micro-pousses, cresson) : une barquette suffit. */
const isDenseSowing = (planting: Planting) => planting.perPot === 0;

export function supplies(entry: CatalogPlant, model: GuideModel): Supply[] {
  const planting = plantingOf(entry);
  const potLabel = model === "perennial-pot" ? `Un grand pot percé de ${entry.potLiters} L ou plus` : `Un pot percé d’au moins ${entry.potLiters} L`;
  const pot: Supply = isDenseSowing(planting)
    ? { id: "tray", label: "Une barquette ou une assiette creuse", detail: "Quelques centimètres de terreau suffisent.", shared: false }
    : { id: "pot", label: potLabel, detail: planting.perPot > 1 ? `Pour ${planting.perPot} plants, à ${planting.spacingCm} cm l’un de l’autre.` : "Avec des trous au fond, et une soucoupe.", shared: false };
  // Le myrtillier ne pousse que dans une terre acide.
  const soil: Supply = entry.id === "blueberry"
    ? { id: "heath-soil", label: "De la terre de bruyère", detail: "Il ne pousse que dans une terre acide.", shared: true }
    : { id: "soil", label: "Du terreau", detail: "Un sac de 20 L remplit deux ou trois pots moyens.", shared: true };
  const clay: Supply = { id: "clay-balls", label: "Une poignée de billes d’argile", detail: "Au fond du pot, l’eau s’écoule mieux.", shared: true };
  const can: Supply = isSowing(model)
    ? { id: "spray", label: "Un vaporisateur ou un arrosoir à pomme fine", detail: "Une pluie fine ne déplace pas les graines.", shared: true }
    : { id: "watering-can", label: "Un arrosoir", shared: true };
  const bulb = BULBS[entry.id];
  const what: Supply = bulb
    ? { id: "bulbs", label: bulb.buy, detail: `${planting.perPot} pour ce pot.`, shared: false }
    : isSowing(model)
      ? { id: "seeds", label: `Un sachet de graines ${ofName(entry.name)}`, shared: false }
      : { id: "plant", label: model === "perennial-pot" ? `Un pied ${ofName(entry.name)} en pot` : `Un plant ${ofName(entry.name)} en godet`, detail: planting.perPot > 1 ? `${planting.perPot} pour ce pot.` : undefined, shared: false };
  if (model === "sow-indoor") {
    return [
      what,
      { id: "cells", label: "Des godets ou de petits pots", detail: "Un par graine ou par pincée de graines.", shared: false },
      soil,
      { id: "cover", label: "Un sac transparent ou un film", detail: "Il garde l’humidité jusqu’à la levée.", shared: true },
      can,
      ...(entry.plantMonths.length > 0 ? [{ ...pot, id: "pot-later", label: `Plus tard : ${pot.label.charAt(0).toLowerCase()}${pot.label.slice(1)}` }] : []),
    ];
  }
  return isDenseSowing(planting) ? [what, pot, soil, can] : [what, pot, clay, soil, can];
}

/** « 5 à 15 jours », « 2 à 3 mois », « l’an prochain » : un délai lisible. */
export function delayText([min, max]: [number, number], unit: "days" | "weeks") {
  if (unit === "days") return min === max ? `${min} jours` : `${min} à ${max} jours`;
  if (max <= 12) return min === max ? `${min} semaines` : `${min} à ${max} semaines`;
  if (min >= 40) return "l’an prochain, parfois plus tard";
  const months = [Math.max(1, Math.round(min / 4.33)), Math.round(max / 4.33)];
  if (months[1] > 12) return `${months[0]} mois à plus d’un an`;
  return months[0] === months[1] ? `${months[0]} mois` : `${months[0]} à ${months[1]} mois`;
}

/**
 * « Et après ? » : ce qui va se passer, tiré des données (levée, première récolte ou floraison).
 * Ex. « Les pousses sortent dans 7 à 10 jours. Garde la terre humide. »
 */
export function whatsNext(entry: CatalogPlant, model: GuideModel): string[] {
  const planting = plantingOf(entry);
  const flower = entry.category === "flower";
  const lines: string[] = [];
  if (isSowing(model) && planting.germinationDays) lines.push(`Les pousses sortent dans ${delayText(planting.germinationDays, "days")}. Garde la terre humide.`);
  if (model === "plant-bulb") lines.push("Les premières pousses sortent en quelques semaines. Arrose peu tant qu’elles ne sont pas sorties.");
  const harvest = isSowing(model) ? planting.harvestWeeksFromSowing : planting.harvestWeeksFromPlanting;
  if (harvest) lines.push(`${flower ? "Premières fleurs" : "Première récolte"} dans ${delayText(harvest, "weeks")}.`);
  return lines;
}

// --- Les étapes -------------------------------------------------------------------------------------------

/**
 * Une étape du pas-à-pas : une seule action, verbe en tête, moins de 12 mots, au tutoiement ; une ligne grise
 * facultative pour le « pourquoi » ; l'erreur à éviter du modèle, à l'étape qu'elle concerne.
 */
export type GuideStep = { illustration: IllustrationId; text: string; why?: string; mistake?: string };

/** « 1 cm », « 0,5 cm » : une mesure lisible. */
const cm = (value: number) => `${String(value).replace(".", ",")} cm`;

function sowingSteps(entry: CatalogPlant, planting: Planting, indoors: boolean): GuideStep[] {
  const depth = planting.sowDepthCm ?? 0;
  const seeds = planting.seedsPerHole ?? 0;
  const dense = isDenseSowing(planting);
  const steps: GuideStep[] = [];
  if (indoors) steps.push({ illustration: "cells", text: "Remplis des godets de terreau, sans tasser.", why: "Un godet par graine, ou par pincée de graines." });
  else if (dense) steps.push({ illustration: "fill-soil", text: "Remplis la barquette de 3 cm de terreau." });
  else {
    steps.push({ illustration: "clay-balls", text: "Mets une poignée de billes d’argile au fond.", why: "Les racines ne baigneront pas dans l’eau." });
    steps.push({ illustration: "fill-soil", text: "Remplis de terreau jusqu’à 2 cm du bord.", why: "Il reste de la place pour arroser." });
  }
  // Graines profondes (haricots, pois…) : le trou d'abord ; sinon on pose les graines et on recouvre.
  // Une seule erreur à éviter par guide : au chaud, c'est la lumière (étape de la fenêtre) ; dehors, la profondeur.
  const mistake = indoors ? undefined : depth > 0 ? "Erreur à éviter : semer plus profond. La graine s’épuise avant de sortir." : "Erreur à éviter : couvrir ces graines. Elles ne germent qu’à la lumière.";
  if (depth >= 2) {
    steps.push({ illustration: "finger-hole", text: `Fais des trous de ${cm(depth)} avec le doigt.`, why: planting.perPot > 1 ? `Un trou tous les ${planting.spacingCm} cm, ${planting.perPot} en tout.` : "Un seul trou, au centre du pot.", mistake });
    steps.push({ illustration: "drop-seeds", text: `Mets ${seeds > 1 ? `${seeds} graines` : "une graine"} dans chaque trou.`, why: seeds > 1 ? "Tu garderas la plus belle pousse." : undefined });
    steps.push({ illustration: "firm-soil", text: "Rebouche les trous et tasse doucement." });
  } else {
    const where = indoors ? "au centre de chaque godet" : planting.perPot > 1 ? `tous les ${planting.spacingCm} cm` : "au centre du pot";
    if (dense) steps.push({ illustration: "scatter-seeds", text: "Sème les graines serrées sur toute la surface.", why: "Tu les couperas jeunes : pas besoin de place." });
    else if (seeds === 0) steps.push({ illustration: "scatter-seeds", text: `Sème une graine tous les ${Math.max(1, Math.round(planting.spacingCm / 2))} cm.`, why: `Tu éclairciras ensuite à ${planting.spacingCm} cm.` });
    else steps.push({ illustration: "drop-seeds", text: `Pose ${seeds > 1 ? `${seeds} graines` : "une graine"} ${where}.`, why: seeds > 1 ? "Tu garderas la plus belle pousse." : undefined });
    if (depth === 0) steps.push({ illustration: "cover-seeds", text: "Laisse les graines à la surface, sans les couvrir.", why: "Appuie juste du plat de la main.", mistake });
    else steps.push({ illustration: "cover-seeds", text: depth < 1 ? "Recouvre d’une fine pincée de terreau." : `Recouvre de ${cm(depth)} de terreau fin.`, mistake });
  }
  steps.push({ illustration: "fine-water", text: "Arrose en pluie fine.", why: "Un jet fort emporterait les graines." });
  if (indoors) {
    steps.push({ illustration: "cover-bag", text: "Couvre d’un sac transparent jusqu’à la levée.", why: "La terre reste humide sans arroser." });
    steps.push({ illustration: "windowsill", text: "Pose-les près d’une fenêtre, au chaud.", why: "Entre 18 et 22 °C, sans soleil brûlant.", mistake: "Erreur à éviter : loin de la fenêtre, les pousses filent et tombent." });
  }
  return steps;
}

function plantingSteps(entry: CatalogPlant, planting: Planting, model: GuideModel): GuideStep[] {
  const bulb = BULBS[entry.id];
  const several = planting.perPot > 1 ? `Un tous les ${planting.spacingCm} cm, ${planting.perPot} en tout.` : undefined;
  const steps: GuideStep[] = [
    { illustration: "clay-balls", text: model === "perennial-pot" ? "Mets 3 cm de billes d’argile au fond." : "Mets une poignée de billes d’argile au fond.", why: "Les racines ne baigneront pas dans l’eau." },
  ];
  if (bulb) {
    steps.push({ illustration: "fill-soil", text: "Remplis de terreau jusqu’à 3 cm du bord." });
    steps.push({ illustration: "bulb", text: `Enfonce-les à ${cm(bulb.depthCm)}, ${bulb.tip}.`, why: several, mistake: "Erreur à éviter : les planter à l’envers. Ils poussent mal." });
    steps.push({ illustration: "firm-soil", text: "Recouvre de terreau et tasse doucement." });
    steps.push({ illustration: "water-well", text: "Arrose une fois, puis peu jusqu’aux pousses.", why: "Trop d’eau les ferait pourrir." });
    return steps;
  }
  steps.push({ illustration: "fill-soil", text: model === "perennial-pot" ? "Remplis le grand pot de terreau à moitié." : "Remplis le pot de terreau aux deux tiers." });
  steps.push({ illustration: "unpot", text: "Sors la motte du godet, sans tirer sur la tige.", why: "Retourne le godet et tapote le fond." });
  steps.push({
    illustration: model === "perennial-pot" ? "big-pot" : "place-plant",
    text: "Pose la motte au centre, au même niveau qu’avant.",
    why: several,
    mistake: model === "plant-seedling" ? "Erreur à éviter : enterrer la tige plus bas qu’avant. Elle pourrirait." : undefined,
  });
  steps.push({ illustration: "firm-soil", text: "Ajoute du terreau autour, puis tasse avec les mains.", why: "La motte ne doit plus bouger." });
  steps.push({
    illustration: "water-well",
    text: "Arrose bien, jusqu’à ce que l’eau coule dessous.",
    why: "La terre se colle aux racines.",
    mistake: model === "perennial-pot" ? "Erreur à éviter : le laisser sécher le premier été, pendant qu’il s’installe." : undefined,
  });
  return steps;
}

/** Les étapes du guide, selon son modèle et les données de la plante. */
export function guideSteps(entry: CatalogPlant, model: GuideModel): GuideStep[] {
  const planting = plantingOf(entry);
  return isSowing(model) ? sowingSteps(entry, planting, model === "sow-indoor") : plantingSteps(entry, planting, model);
}

/** Le titre de l'écran : « Planter la lavande », « Semer la mâche ». */
export function guideTitle(entry: CatalogPlant, model: GuideModel) {
  return `${isSowing(model) ? "Semer" : "Planter"} ${entry.label}`;
}

/** « Et après ? », en plus de la levée et de la récolte : les gestes de suite que Balco rappellera. */
export function nextGestures(entry: CatalogPlant, model: GuideModel): string[] {
  const planting = plantingOf(entry);
  const lines: string[] = [];
  if (isSowing(model) && planting.thinning) lines.push("Une semaine après la levée, tu éclairciras : Balco te le dira.");
  if (model === "sow-indoor" && entry.plantMonths.length > 0) lines.push(`Les plants iront sur le balcon en ${MONTH_LONG[entry.plantMonths[0] - 1]}.`);
  if (planting.pinching) lines.push("Plus tard, tu la pinceras pour qu’elle soit plus touffue.");
  return lines;
}

// --- « Ce qu'il te faut » : ce qu'on a déjà, ce qu'on partage -----------------------------------------------

/** Ce qui est coché « J'ai déjà » : les objets communs valent pour toutes les plantes, le reste pour celle-ci. */
export type HaveState = { shared: string[]; byPlant: Record<string, string[]> };

export const emptyHave = (): HaveState => ({ shared: [], byPlant: {} });

export function hasItem(have: HaveState, catalogId: string, item: Supply) {
  return item.shared ? have.shared.includes(item.id) : (have.byPlant[catalogId] ?? []).includes(item.id);
}

export function toggleHave(have: HaveState, catalogId: string, item: Supply): HaveState {
  const flip = (list: string[]) => (list.includes(item.id) ? list.filter((id) => id !== item.id) : [...list, item.id]);
  if (item.shared) return { ...have, shared: flip(have.shared) };
  return { ...have, byPlant: { ...have.byPlant, [catalogId]: flip(have.byPlant[catalogId] ?? []) } };
}

/** Le texte partagé par le téléphone : seulement ce qui manque. */
export function shareText(entry: CatalogPlant, model: GuideModel, missing: Supply[]) {
  return [`Pour ${isSowing(model) ? "semer" : "planter"} ${entry.label}, il me faut :`, ...missing.map((item) => `• ${item.label}`)].join("\n");
}
