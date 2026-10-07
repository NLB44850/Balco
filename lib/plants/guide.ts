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
import { ofLabel, potSizes, startActivity } from "./calendar";
import { REPOTTING } from "./repotting";
import type { ClimateInfo } from "./climate";
import { agree, byForm, elides, capitalize, objectBefore, objectPronoun, stressedPronoun, subjectPronoun, verb } from "./grammar";

export type GuideModel = "sow-pot" | "sow-indoor" | "plant-seedling" | "plant-bulb" | "perennial-pot" | GuideTask;

/** Les gestes du pot d'une vivace installée : rempoter, ou changer la terre du dessus. */
export type PotTask = "repot" | "topdress";
export const isPotTask = (value: unknown): value is PotTask => value === "repot" || value === "topdress";
/** Les gestes de suite d'un semis ou d'une plantation (lib/garden/follow-ups.ts). */
export type FollowUpTask = "thin" | "pinch" | "outdoors";
export const isFollowUpTask = (value: unknown): value is FollowUpTask => value === "thin" || value === "pinch" || value === "outdoors";
/** Un pas-à-pas pour un geste précis, ouvert depuis ce geste (`task=` de la route du guide). */
export type GuideTask = PotTask | FollowUpTask;
export const isGuideTask = (value: unknown): value is GuideTask => isPotTask(value) || isFollowUpTask(value);

/** Le pas-à-pas d'un geste du calendrier, s'il en a un (sinon celui pour planter, ou aucun). */
export function guideTaskOf(activity: { kind: string; topdress?: true; followUp?: FollowUpTask }): GuideTask | null {
  if (activity.followUp) return activity.followUp;
  if (activity.kind === "repot") return activity.topdress ? "topdress" : "repot";
  return null;
}

/** Pour le pot suivant : combien de fois elle a déjà été rempotée (`potHistory`). */
export type GuideOptions = { repots?: number };

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
  return elides(lower) ? `d’${lower}` : `de ${lower}`;
}

/**
 * Un objet de « Ce qu'il te faut ». `shared` : commun à toutes les plantes (terreau, billes, arrosoir) ; coché
 * « J'ai déjà » une fois, il l'est partout. Sinon, propre à cette plante (pot, graines, plant).
 */
export type Supply = { id: string; label: string; detail?: string; shared: boolean };

/** Semis serré coupé jeune (micro-pousses, cresson) : une barquette suffit. */
const isDenseSowing = (planting: Planting) => planting.perPot === 0;

export function supplies(entry: CatalogPlant, model: GuideModel, options: GuideOptions = {}): Supply[] {
  const planting = plantingOf(entry);
  if (model === "repot" || model === "topdress") return potCareSupplies(entry, model, options);
  if (model === "thin") return [{ id: "scissors", label: "Une petite paire de ciseaux", detail: "Des ciseaux à ongles font très bien l’affaire.", shared: true }, { id: "spray", label: "Un vaporisateur ou un arrosoir à pomme fine", detail: "Une pluie fine ne couche pas les pousses.", shared: true }];
  if (model === "pinch") return [{ id: "fingers", label: "Tes doigts, ou de petits ciseaux propres", detail: "Rien d’autre : c’est un geste de quelques secondes.", shared: true }];
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
  if (model === "outdoors") {
    return [
      { id: "pot", label: `Un pot percé d’au moins ${entry.potLiters} L`, detail: planting.perPot > 1 ? `Pour ${planting.perPot} plants, à ${planting.spacingCm} cm l’un de l’autre.` : "Un par plant, avec des trous au fond et une soucoupe.", shared: false },
      clay,
      soil,
      { id: "watering-can", label: "Un arrosoir", shared: true },
    ];
  }
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

/** Le pot suivant (un tiers de plus) ; la terre du dessus ne demande qu'une fourchette et un peu de terreau. */
function potCareSupplies(entry: CatalogPlant, task: PotTask, { repots = 0 }: GuideOptions): Supply[] {
  const acid = entry.id === "blueberry";
  const can: Supply = { id: "watering-can", label: "Un arrosoir", shared: true };
  if (task === "topdress") {
    return [
      { id: "fork", label: "Une vieille fourchette ou une petite griffe", detail: "Pour gratter sans abîmer les racines.", shared: true },
      acid ? { id: "heath-soil", label: "De la terre de bruyère", detail: "Quelques poignées suffisent.", shared: true } : { id: "soil", label: "Du terreau", detail: "Quelques poignées suffisent.", shared: true },
      can,
    ];
  }
  const pot = potSizes(entry, repots);
  return [
    { id: "next-pot", label: `Un pot percé d’environ ${pot.next} L`, detail: `${pot.nextWidthCm} cm de large : un tiers de plus que l’actuel.`, shared: false },
    { id: "clay-balls", label: "Une poignée de billes d’argile", detail: "Au fond du pot, l’eau s’écoule mieux.", shared: true },
    acid ? { id: "heath-soil", label: "De la terre de bruyère", detail: "Il ne pousse que dans une terre acide.", shared: true } : { id: "soil", label: "Du terreau", detail: "Un sac de 20 L remplit deux ou trois pots moyens.", shared: true },
    can,
  ];
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
  if (model === "repot") return [`Garde-${objectPronoun(entry)} quelques jours à l’ombre légère : ${verb(entry, "ses", "leurs")} racines s’installent.`, "Arrose un peu moins les deux premières semaines."];
  if (model === "topdress") return [`Le terreau neuf ${objectBefore(entry, "nourrit")} pour toute la saison.`];
  if (model === "thin") return ["Celles qui restent ont maintenant la place de grandir."];
  if (model === "pinch") {
    if (!pinchesTip(plantingOf(entry))) return [`En quelques semaines, ${subjectPronoun(entry)} ${verb(entry, "repart", "repartent")} plus ${agree(entry, "dense")}.`];
    return ["En une ou deux semaines, deux pousses repartent sous chaque coupe.", ...(entry.category === "aromatic" ? ["Les bouts pincés se mangent : ne les jette pas."] : [])];
  }
  if (model === "outdoors") {
    const harvest = plantingOf(entry).harvestWeeksFromPlanting;
    return ["Les premiers jours, garde-les à l’abri du plein soleil de midi.", ...(harvest ? [`${entry.category === "flower" ? "Premières fleurs" : "Première récolte"} dans ${delayText(harvest, "weeks")}.`] : [])];
  }
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

/** Rempoter : vérifier le signe, un pot à peine plus grand, démêler les racines, au même niveau qu'avant. */
function repotSteps(entry: CatalogPlant, { repots = 0 }: GuideOptions): GuideStep[] {
  const pot = potSizes(entry, repots);
  return [
    { illustration: "roots-out", text: "Regarde sous le pot si des racines sortent.", why: `Ou si l’eau ressort tout de suite : ${subjectPronoun(entry)} ${verb(entry, "manque", "manquent")} de place.` },
    { illustration: "clay-balls", text: "Mets des billes d’argile au fond du nouveau pot.", why: `Environ ${pot.next} L, ${pot.nextWidthCm} cm de large.`, mistake: "Erreur à éviter : un pot bien plus grand. La terre resterait trempée." },
    { illustration: "unpot", text: "Sors la plante en tapotant le pot retourné.", why: "Arrosée la veille, la motte sort plus facilement." },
    { illustration: "loosen-roots", text: "Démêle du bout des doigts les racines qui tournent.", why: "Elles partiront dans la terre neuve." },
    { illustration: "place-plant", text: "Pose la motte au centre, au même niveau qu’avant.", why: "Mets un peu de terreau dessous pour la remonter." },
    { illustration: "firm-soil", text: "Ajoute du terreau autour, puis tasse avec les mains." },
    { illustration: "water-well", text: "Arrose bien, jusqu’à ce que l’eau coule dessous.", why: "La terre neuve se colle aux racines." },
  ];
}

/** Changer la terre du dessus : 5 cm grattés, du terreau neuf, sans changer de pot. */
function topdressSteps(): GuideStep[] {
  return [
    { illustration: "scrape-top", text: "Gratte la terre du dessus sur 5 cm.", why: "Avec une vieille fourchette, en restant en surface.", mistake: "Erreur à éviter : gratter trop profond. Tu abîmerais les racines." },
    { illustration: "fill-soil", text: "Remets du terreau neuf jusqu’au même niveau.", why: "Laisse 2 cm sous le bord pour arroser." },
    { illustration: "firm-soil", text: "Tasse doucement avec le plat de la main." },
    { illustration: "water-well", text: "Arrose bien, jusqu’à ce que l’eau coule dessous." },
  ];
}

/** Éclaircir : garder la plus belle pousse, couper les autres au ras de la terre (sans arracher). */
function thinSteps(planting: Planting): GuideStep[] {
  const keep = planting.seedsPerHole && planting.seedsPerHole > 1
    ? { text: "Repère la plus belle pousse de chaque trou.", why: "Garde la plus droite, aux feuilles bien vertes." }
    : { text: `Repère une belle pousse tous les ${cm(planting.spacingCm)}.`, why: "Garde les plus droites, aux feuilles bien vertes." };
  return [
    { illustration: "sprouts", ...keep },
    { illustration: "thin", text: "Coupe les autres aux ciseaux, au ras de la terre.", mistake: "Erreur à éviter : les arracher. Tu déracinerais les pousses gardées." },
    { illustration: "firm-soil", text: "Tasse doucement la terre autour des pousses gardées." },
    { illustration: "fine-water", text: "Arrose en pluie fine.", why: "La terre se remet en place autour d’elles." },
  ];
}

/**
 * Pincer le bout des tiges (« Pince la pointe… ») ; sinon la plante demande une autre coupe (fleurs qui montent,
 * stolons, touffe rabattue) : le même geste aux ciseaux, guidé par sa consigne.
 */
export function pinchesTip(planting: Pick<Planting, "pinching">) {
  return /(pince|coupe) (la |le )?(tête|pointe|bout|tige |au-dessus)/iu.test(planting.pinching ?? "");
}

function pinchSteps(entry: CatalogPlant, planting: Planting): GuideStep[] {
  const how = planting.pinching?.replace(/'/gu, "’") ?? undefined;
  if (!pinchesTip(planting)) {
    return [
      { illustration: "pinch", text: `Repère ce qu’il faut couper chez ${stressedPronoun(entry)}.`, why: how },
      { illustration: "thin", text: "Coupe-le avec de petits ciseaux propres.", mistake: "Erreur à éviter : des ciseaux sales. Ils transmettent les maladies." },
      { illustration: "two-shoots", text: `Laisse-${objectPronoun(entry)} repartir : de nouvelles pousses vont venir.`, why: `${capitalize(subjectPronoun(entry))} ${verb(entry, "reste", "restent")} ${agree(entry, "dense")} et ${verb(entry, "produit", "produisent")} plus longtemps.` },
      { illustration: "pinch", text: "Fais pareil sur le reste de la plante." },
    ];
  }
  return [
    { illustration: "pinch", text: "Repère le bout d’une tige, au-dessus d’une paire de feuilles.", why: how },
    { illustration: "pinch", text: "Pince-le entre le pouce et l’index.", why: "Ou coupe-le avec de petits ciseaux propres.", mistake: "Erreur à éviter : couper sous les feuilles. La tige ne repartirait pas." },
    { illustration: "two-shoots", text: "Laisse repartir : deux tiges pousseront à la place.", why: `C’est ce qui ${objectPronoun(entry)} rend ${agree(entry, "touffu")}.` },
    { illustration: "pinch", text: "Fais pareil sur les autres grandes tiges." },
  ];
}

/** Sortir les plants semés au chaud : les habituer au dehors, puis les installer chacun dans son pot. */
function outdoorsSteps(planting: Planting): GuideStep[] {
  return [
    { illustration: "harden-off", text: "Sors-les quelques heures par jour, pendant une semaine.", why: "À l’ombre légère d’abord : ils s’habituent au vent et au soleil.", mistake: "Erreur à éviter : les sortir d’un coup en plein soleil. Ils brûleraient." },
    { illustration: "clay-balls", text: "Mets une poignée de billes d’argile au fond du pot." },
    { illustration: "fill-soil", text: "Remplis le pot de terreau aux deux tiers." },
    { illustration: "unpot", text: "Sors la motte du godet, sans tirer sur la tige.", why: "Retourne le godet et tapote le fond." },
    { illustration: "place-plant", text: "Pose la motte au centre, au même niveau qu’avant.", why: planting.perPot > 1 ? `Un tous les ${planting.spacingCm} cm, ${planting.perPot} en tout.` : undefined },
    { illustration: "firm-soil", text: "Ajoute du terreau autour, puis tasse avec les mains." },
    { illustration: "water-well", text: "Arrose bien, jusqu’à ce que l’eau coule dessous.", why: "La terre se colle aux racines." },
  ];
}

/** Les étapes du guide, selon son modèle et les données de la plante. */
export function guideSteps(entry: CatalogPlant, model: GuideModel, options: GuideOptions = {}): GuideStep[] {
  if (model === "repot") return repotSteps(entry, options);
  if (model === "topdress") return topdressSteps();
  if (model === "thin") return thinSteps(plantingOf(entry));
  if (model === "pinch") return pinchSteps(entry, plantingOf(entry));
  if (model === "outdoors") return outdoorsSteps(plantingOf(entry));
  const planting = plantingOf(entry);
  return isSowing(model) ? sowingSteps(entry, planting, model === "sow-indoor") : plantingSteps(entry, planting, model);
}

/** Le titre de l'écran : « Planter la lavande », « Semer la mâche ». */
export function guideTitle(entry: CatalogPlant, model: GuideModel) {
  if (model === "repot") return `Rempoter ${entry.label}`;
  if (model === "topdress") return `Changer la terre ${ofLabel(entry.label)}`;
  if (model === "thin") return `Éclaircir ${entry.label}`;
  if (model === "pinch") return `Pincer ${entry.label}`;
  if (model === "outdoors") return `Sortir tes plants ${ofName(entry.name)}`;
  return `${isSowing(model) ? "Semer" : "Planter"} ${entry.label}`;
}

/** Les liens vers un pas-à-pas (fiche de la plante, catalogue) : « Comment le pincer, pas à pas › », « Comment les rempoter › ». */
export function guideLinkText(entry: CatalogPlant, task: GuideTask | "need") {
  if (task === "thin") return `Comment ${objectBefore(entry, "éclaircir")}, pas à pas ›`;
  if (task === "pinch") return `Comment ${objectBefore(entry, "pincer")}, pas à pas ›`;
  if (task === "outdoors") return "Comment sortir les plants, pas à pas ›";
  if (task === "repot") return `Comment ${objectBefore(entry, "rempoter")} ›`;
  if (task === "topdress") return "Changer la terre du dessus, pas à pas ›";
  return `Ce qu’il te faut pour ${objectBefore(entry, "planter")} ›`;
}

/** « tu le pinceras pour qu’il soit plus touffu. », « tu les pinceras pour qu’elles soient plus touffues. » */
function laterPinch(entry: CatalogPlant) {
  return `tu ${objectPronoun(entry)} pinceras pour qu’${byForm(entry, "il soit", "elle soit", "ils soient", "elles soient")} plus ${agree(entry, "touffu")}.`;
}

/** « Et après ? », en plus de la levée et de la récolte : les gestes de suite que Balco rappellera. */
export function nextGestures(entry: CatalogPlant, model: GuideModel): string[] {
  if (model === "thin") return [];
  if (model === "pinch") return ["Tu peux recommencer à chaque fois qu’une tige s’allonge trop."];
  if (model === "outdoors") return plantingOf(entry).pinching ? [`Dans deux semaines, ${laterPinch(entry)}`] : [];
  if (model === "repot" || model === "topdress") {
    const data = REPOTTING[entry.id];
    if (model === "topdress" || !data) return ["L’an prochain, Balco te dira s’il faut rempoter ou changer la terre."];
    const [min, max] = data.everyYears;
    const when = max === 1 ? "l’an prochain" : min === max ? `dans ${min} ans` : `dans ${min} à ${max} ans`;
    return [`Prochain rempotage ${when} : Balco te le dira.`, ...(data.topdress && min > 1 ? ["Entre-temps, tu changeras la terre du dessus."] : [])];
  }
  const planting = plantingOf(entry);
  const lines: string[] = [];
  if (isSowing(model) && planting.thinning) lines.push("Une semaine après la levée, tu éclairciras : Balco te le dira.");
  if (model === "sow-indoor" && entry.plantMonths.length > 0) lines.push(`Les plants iront sur le balcon en ${MONTH_LONG[entry.plantMonths[0] - 1]}.`);
  if (planting.pinching) lines.push(`Plus tard, ${laterPinch(entry)}`);
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
  const what = isGuideTask(model) ? guideTitle(entry, model).replace(/^./u, (first) => first.toLowerCase()) : `${isSowing(model) ? "semer" : "planter"} ${entry.label}`;
  return [`Pour ${what}, il me faut :`, ...missing.map((item) => `• ${item.label}`)].join("\n");
}
