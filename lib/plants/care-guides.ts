/**
 * Les pas-à-pas illustrés des gestes d'entretien arrivés avec le catalogue balcon et terrasse (retour du 23/10 :
 * « illustre les nouveaux gestes dans le pas-à-pas ») : guider les tiges d'une grimpante, tailler une grimpante ou
 * la vigne, éclaircir les grappes, couper la tige à fleurs de la rhubarbe, butter, protéger du froid une plante qui
 * reste dehors. Chaque pas-à-pas part d'un geste du catalogue (`CareTask.id`) : on l'ouvre depuis ce geste
 * (Aujourd'hui) ou depuis la fiche de la plante pendant ses mois, et « C'est fait » coche le geste du jour.
 * Logique pure ; l'écran est app/guide/[catalogId].tsx, les dessins components/guide/illustrations.tsx.
 */
import type { CareTask, CatalogPlant } from "./catalog";
import { coldTenderOf } from "./cold-hardiness";
import { objectBefore, objectPronoun } from "./grammar";
import type { IllustrationId } from "./illustration-names";

export type CareGuideTask = "train" | "prune" | "prune-vine" | "thin-bunches" | "flower-stalk" | "earth-up" | "wrap";
export const CARE_GUIDE_TASKS: CareGuideTask[] = ["train", "prune", "prune-vine", "thin-bunches", "flower-stalk", "earth-up", "wrap"];
export const isCareGuideTask = (value: unknown): value is CareGuideTask => CARE_GUIDE_TASKS.includes(value as CareGuideTask);

/** Les grimpantes dont la taille suit le même pas-à-pas (la vigne a le sien). */
const PRUNED_CLIMBERS = new Set(["star-jasmine", "clematis", "passionflower", "honeysuckle"]);

/** Le pas-à-pas d'un geste du catalogue, s'il en a un. */
export function careGuideFor(entry: Pick<CatalogPlant, "id" | "category">, taskId: string): CareGuideTask | null {
  if (taskId === "guide") return "train";
  if (taskId === "prune") return entry.id === "grapevine" ? "prune-vine" : PRUNED_CLIMBERS.has(entry.id) ? "prune" : null;
  if (taskId === "thin-bunches") return "thin-bunches";
  if (taskId === "flower-stalk") return "flower-stalk";
  if (taskId === "earth-up") return "earth-up";
  // « Abrite le citronnier » se fait en le rentrant (pas-à-pas « Rentrer ») ; ici, les plantes qui restent dehors.
  if (taskId === "shelter" && !coldTenderOf(entry)) return "wrap";
  return null;
}

/** Le geste du catalogue d'un pas-à-pas d'entretien, pour cette plante. */
export function careTaskOf(entry: CatalogPlant, task: CareGuideTask): CareTask | null {
  return entry.tasks.find((candidate) => careGuideFor(entry, candidate.id) === task) ?? null;
}

/**
 * Les pas-à-pas d'entretien proposés sur la fiche : ceux dont le geste a lieu ce mois-ci ou le mois prochain (pour s'y
 * préparer : en octobre, « Protéger l'artichaut du froid » de novembre), et « Protéger du froid » dès qu'un gel est
 * annoncé, quel que soit le mois (retour du 23/10 : rien sur la fiche de l'artichaut avec la simulation de gel).
 */
export function careGuidesNow(entry: CatalogPlant, month: number, frost = false): CareGuideTask[] {
  const next = (month % 12) + 1;
  const guides = entry.tasks
    .filter((task) => task.months?.some((candidate) => candidate === month || candidate === next) && careGuideFor(entry, task.id) !== null)
    .map((task) => careGuideFor(entry, task.id)!);
  if (frost && frostGuideFor(entry)) guides.unshift("wrap");
  return [...new Set(guides)];
}

/**
 * Tous les pas-à-pas d'entretien de la plante, pour la fiche (retour du 23/10 : « Guider les tiges » du potimarron
 * introuvable en octobre) : ceux du moment d'abord (`careGuidesNow`), puis les autres avec leurs mois.
 */
export function plantCareGuides(entry: CatalogPlant, month: number, frost = false): { task: CareGuideTask; months: number[] | null }[] {
  const now = careGuidesNow(entry, month, frost);
  const later = new Map<CareGuideTask, number[]>();
  for (const task of entry.tasks) {
    const guide = careGuideFor(entry, task.id);
    if (!guide || now.includes(guide)) continue;
    later.set(guide, [...new Set([...(later.get(guide) ?? []), ...(task.months ?? [])])]);
  }
  return [...now.map((task) => ({ task, months: null })), ...[...later].map(([task, months]) => ({ task, months }))];
}

/**
 * « Protéger du froid », pour une plante qui reste dehors l'hiver : celles dont le catalogue prévoit l'abri (olivier,
 * jasmin, artichaut), et les vivaces qui reçoivent les alertes gel sans être des frileuses à rentrer (romarin,
 * passiflore ; vérifié le 23/10 à sa question « seulement l'artichaut ? »).
 */
export function frostGuideFor(entry: CatalogPlant): CareGuideTask | null {
  if (entry.tasks.some((task) => careGuideFor(entry, task.id) === "wrap")) return "wrap";
  return entry.perennial && entry.care.frostSensitive && !coldTenderOf(entry) ? "wrap" : null;
}

type Step = { illustration: IllustrationId; text: string; why?: string; mistake?: string };
type Supply = { id: string; label: string; detail?: string; shared: boolean };

const TIES: Supply = { id: "ties", label: "Des liens souples", detail: "Raphia, ficelle de jardin ou attaches en mousse.", shared: true };
const SECATEURS: Supply = { id: "secateurs", label: "Un sécateur propre et aiguisé", detail: "Passe les lames à l’alcool : il ne transmet pas de maladie.", shared: true };

export function careSupplies(entry: CatalogPlant, task: CareGuideTask): Supply[] {
  switch (task) {
    case "train":
      return [
        { id: "trellis", label: "Un treillage, des fils ou une ficelle", detail: "Fixé au mur ou à la rambarde, au-dessus du pot.", shared: false },
        TIES,
        ...(entry.id === "kuri-squash" ? [{ id: "net", label: "Un filet ou un vieux collant", detail: "Un par fruit, pour le soutenir.", shared: true }] : []),
      ];
    case "prune":
      return [SECATEURS, TIES, ...(entry.id === "clematis" ? [{ id: "gloves", label: "Des gants", detail: "Sa sève irrite la peau.", shared: true }] : [])];
    case "prune-vine":
      return [SECATEURS];
    case "thin-bunches":
      return [{ id: "scissors", label: "Une petite paire de ciseaux", detail: "Des ciseaux à bout pointu passent entre les grains.", shared: true }];
    case "flower-stalk":
      return [{ id: "gloves", label: "Des gants", detail: "Ses feuilles sont toxiques.", shared: true }, { id: "knife", label: "Un couteau ou un sécateur", shared: true }];
    case "earth-up":
      return [{ id: "soil", label: "Du terreau", detail: "Quelques poignées suffisent.", shared: true }, { id: "watering-can", label: "Un arrosoir", shared: true }];
    case "wrap":
      return [
        ...(entry.id === "artichoke" ? [SECATEURS] : []),
        { id: "mulch", label: "De la paille ou des feuilles mortes", detail: "Une couche de 10 cm sur la terre.", shared: true },
        { id: "bubble-wrap", label: "Du papier bulle ou une natte", detail: "Pour entourer le pot.", shared: true },
        { id: "fleece", label: "Un voile d’hivernage", detail: "En jardinerie, au rayon protection.", shared: true },
      ];
  }
}

export function careSteps(entry: CatalogPlant, task: CareGuideTask): Step[] {
  const how = careTaskOf(entry, task)?.instruction.replace(/'/gu, "’");
  switch (task) {
    case "train":
      return [
        { illustration: "trellis", text: "Repère les nouvelles tiges qui partent dans le vide.", why: "Les plus jeunes se plient sans casser." },
        { illustration: "trellis", text: "Enroule chaque tige autour du support.", why: entry.id === "morning-glory" ? "Toujours dans le même sens : elle ne s’enroule que dans un sens." : "Sans forcer : elle prendra le pli toute seule." },
        { illustration: "tie-stem", text: "Attache-la avec un lien souple, sans serrer.", mistake: "Erreur à éviter : un lien serré ou du fil de fer. Il étrangle la tige en grossissant." },
        { illustration: "trellis", text: "Recommence chaque semaine, tant qu’elle pousse.", why: "Les nouvelles tiges s’allongent vite au printemps." },
        ...(entry.id === "kuri-squash" ? [{ illustration: "fruit-sling" as const, text: "Glisse chaque fruit dans un filet noué au support.", why: "Sinon son poids arrache la tige." }] : []),
      ];
    case "prune":
      return [
        { illustration: "secateurs", text: "Prends un sécateur propre et bien aiguisé.", why: "Une coupe nette cicatrise vite." },
        { illustration: "secateurs", text: "Coupe d’abord le bois sec, à la base.", why: "Les tiges grises et cassantes, sans bourgeons." },
        { illustration: "two-buds", text: "Raccourcis les tiges trop longues, au-dessus d’un bourgeon.", why: how, mistake: "Erreur à éviter : laisser un long bout au-dessus du bourgeon. Il sèche et pourrit." },
        { illustration: "tie-stem", text: "Attache les tiges gardées au support.", why: "Écarte-les en éventail : elles fleuriront de partout." },
      ];
    case "prune-vine":
      return [
        { illustration: "two-buds", text: "Repère les rameaux poussés l’an dernier.", why: "Bruns et lisses, gros comme un crayon : les grappes viendront sur leurs pousses." },
        { illustration: "two-buds", text: "Compte deux bourgeons à partir de la base.", why: "Les petites bosses le long du rameau." },
        { illustration: "secateurs", text: "Coupe un peu au-dessus du deuxième bourgeon.", why: "En biais, à 2 cm du bourgeon.", mistake: "Erreur à éviter : tailler un jour de gel. Le bois gelé éclate." },
        { illustration: "secateurs", text: "Coupe aussi le bois mort et les rameaux trop fins." },
      ];
    case "thin-bunches":
      return [
        { illustration: "grape-bunches", text: "Compte les grappes sur chaque tige.", why: "Garde les 2 ou 3 plus belles." },
        { illustration: "grape-bunches", text: "Coupe les grappes en trop avec de petits ciseaux.", why: "Le pied nourrit mieux celles qui restent.", mistake: "Erreur à éviter : attendre la fin de l’été. Éclaircis quand les grains sont encore petits." },
        { illustration: "pinch", text: "Coupe la tige deux feuilles après la dernière grappe.", why: "La sève va aux raisins plutôt qu’aux feuilles." },
        { illustration: "secateurs", text: "Enlève quelques feuilles qui cachent les grappes.", why: "Juste autour : le soleil fait mûrir les grains." },
      ];
    case "flower-stalk":
      return [
        { illustration: "cut-stalk", text: "Repère la grosse tige qui porte les fleurs.", why: "Plus haute et plus épaisse que les autres, avec un gros bouton au bout." },
        { illustration: "cut-stalk", text: "Mets des gants.", why: "Ses feuilles sont toxiques, et la sève colle aux doigts." },
        { illustration: "cut-stalk", text: "Coupe-la tout en bas, au ras de la touffe.", why: "Il ne doit rien en rester.", mistake: "Erreur à éviter : la laisser fleurir. La plante s’épuise et donne moins de tiges." },
        { illustration: "scrape-top", text: "Mets la tige coupée au compost.", why: "Elle ne se mange pas : dure, et pleine de feuilles toxiques autour." },
      ];
    case "earth-up":
      return [
        { illustration: "fill-soil", text: "Prends quelques poignées de terreau." },
        { illustration: "earth-up", text: "Ramène-les en butte autour du pied.", why: how, mistake: "Erreur à éviter : enterrer les feuilles. Laisse toujours dépasser le haut." },
        { illustration: "firm-soil", text: "Tasse doucement avec les mains." },
        { illustration: "fine-water", text: "Arrose doucement, au pied." },
      ];
    case "wrap":
      return [
        ...(entry.id === "artichoke" ? [{ illustration: "secateurs" as const, text: "Coupe les grandes feuilles à 20 cm du sol.", why: "Le cœur de la plante reste à l’abri dessous." }] : []),
        { illustration: "mulch", text: "Pose de la paille ou des feuilles mortes au pied.", why: "Une couche de 10 cm garde les racines au chaud." },
        { illustration: "winter-wrap", text: "Entoure le pot de papier bulle ou d’une natte.", why: "En pot, ce sont les racines qui gèlent les premières." },
        { illustration: "winter-wrap", text: "Pousse le pot contre un mur, à l’abri du vent.", why: "Un mur garde la chaleur du jour." },
        { illustration: "fleece", text: `Couvre-${objectPronoun(entry)} d’un voile les nuits de gel.`, why: "Retire-le dès que le froid passe : la plante a besoin de lumière.", mistake: "Erreur à éviter : un plastique fermé. L’humidité fait pourrir les feuilles." },
      ];
  }
}

export function careTitle(entry: CatalogPlant, task: CareGuideTask) {
  switch (task) {
    case "train": return `Guider ${entry.label}`;
    case "prune": return `Tailler ${entry.label}`;
    case "prune-vine": return `Tailler ${entry.label}`;
    case "thin-bunches": return "Éclaircir les grappes";
    case "flower-stalk": return `Couper la tige à fleurs`;
    case "earth-up": return `Butter ${entry.label}`;
    case "wrap": return `Protéger ${entry.label} du froid`;
  }
}

export function careLinkText(entry: CatalogPlant, task: CareGuideTask) {
  switch (task) {
    case "train": return `Comment ${objectBefore(entry, "guider")}, pas à pas ›`;
    case "prune":
    case "prune-vine": return `Comment ${objectBefore(entry, "tailler")}, pas à pas ›`;
    case "thin-bunches": return "Comment éclaircir les grappes, pas à pas ›";
    case "flower-stalk": return "Comment couper la tige à fleurs, pas à pas ›";
    case "earth-up": return `Comment ${objectBefore(entry, "butter")}, pas à pas ›`;
    case "wrap": return `Comment ${objectBefore(entry, "protéger")} du froid, pas à pas ›`;
  }
}

export const CARE_DONE_LABELS: Record<CareGuideTask, string> = {
  train: "Tiges attachées",
  prune: "C’est taillé",
  "prune-vine": "C’est taillé",
  "thin-bunches": "Grappes éclaircies",
  "flower-stalk": "Tige coupée",
  "earth-up": "C’est butté",
  wrap: "C’est protégé",
};

/** Le dessin de « Et après ? ». */
export const CARE_AFTER_ILLUSTRATIONS: Record<CareGuideTask, IllustrationId> = {
  train: "trellis",
  prune: "two-shoots",
  "prune-vine": "two-buds",
  "thin-bunches": "grape-bunches",
  "flower-stalk": "cut-stalk",
  "earth-up": "earth-up",
  wrap: "winter-wrap",
};

export function careWhatsNext(entry: CatalogPlant, task: CareGuideTask): string[] {
  switch (task) {
    case "train": return ["En quelques jours, les tiges s’accrochent toutes seules."];
    case "prune": return ["De nouvelles pousses repartent sous les coupes, et les fleurs avec."];
    case "prune-vine": return ["Au printemps, chaque bourgeon gardé donne une pousse, et les grappes viennent dessus."];
    case "thin-bunches": return ["Les grains grossissent et mûrissent mieux d’ici la récolte."];
    case "flower-stalk": return ["Une autre tige à fleurs peut venir : coupe-la aussi."];
    case "earth-up": return [entry.id === "potato" ? "Recommence quand les tiges ont repoussé de 20 cm." : "Le bulbe grossit à l’abri : récolte-le gros comme une orange."];
    case "wrap": return ["Garde la paille tout l’hiver ; enlève le papier bulle au printemps."];
  }
}
