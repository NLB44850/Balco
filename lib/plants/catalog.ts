import type { MaintenanceTaskType } from "../reminders/reminder-engine";
import { fertilizeTask } from "./fertilizing";
import { HARVEST_ONCE } from "./harvest-once";
import { REPOTTING } from "./repotting";
import { SOWING } from "./sowing";
import { PLANT_VARIETIES } from "./varieties";

/**
 * Catalogue des plantes de balcon proposées par Balco.
 *
 * Données pensées pour la France métropolitaine (climat tempéré, balcon en pot).
 * Les mois vont de 1 (janvier) à 12 (décembre). Les seuils de soin alimentent le
 * moteur de rappels (lib/reminders/reminder-engine.ts) : ce sont des valeurs
 * indicatives pour une culture en contenant, à ajuster avec les retours terrain.
 */

export type Sunlight = "shade" | "partial" | "sunny";
export type SpaceSize = "windowsill" | "planter" | "balcony" | "terrace";
export type GoalTag = "tomatoes" | "aromatics" | "bees" | "salads";
export type PlantCategory = "aromatic" | "fruiting-vegetable" | "leafy-vegetable" | "root" | "flower" | "small-fruit" | "fruit-tree" | "climber" | "shrub";
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type CareTask = {
  id: string;
  type: MaintenanceTaskType;
  title: string;
  instruction: string;
  minutes: number;
  /** Mois où le geste a du sens. Absent = toute la saison de culture. */
  months?: Month[];
  /** Geste espacé (engrais) : proposé seulement si le dernier date d'au moins ce nombre de jours. */
  everyDays?: number;
  /** Geste d'une seule fois par période de `months` (un peu d'engrais au printemps). */
  oncePerSeason?: boolean;
  doneTitle: string;
  doneText: string;
};

export type CareThresholds = {
  wateringIntervalHours: number;
  rainSkipMm: number;
  heatThresholdC: number;
  frostThresholdC: number;
  windThresholdKmh: number;
  frostSensitive: boolean;
};

/** Variété du commerce adaptée à la culture en pot : ce qui la distingue et pourquoi elle convient au balcon. */
export type PlantVariety = {
  id: string;
  name: string;
  note: string;
};

export type CatalogPlant = {
  id: string;
  name: string;
  /** Nom précédé de son article, pour construire des phrases : « le basilic », « les radis ». */
  label: string;
  /** Genre et nombre de `label`, pour accorder les phrases (lib/plants/grammar.ts) : « Garde-le », « Elles repartent ». */
  gender: "m" | "f";
  plural?: true;
  emoji: string;
  category: PlantCategory;
  sunlight: Sunlight[];
  /** Plus petit espace dans lequel la plante se cultive correctement. */
  minSpace: SpaceSize;
  difficulty: "easy" | "medium";
  perennial: boolean;
  melliferous: boolean;
  goals: GoalTag[];
  potLiters: number;
  pitch: string;
  sowMonths: Month[];
  /** Mois de semis (inclus dans `sowMonths`) qui se font seulement au chaud, à l'intérieur ; les autres se sèment dehors. */
  indoorSowMonths: Month[];
  plantMonths: Month[];
  harvestMonths: Month[];
  /**
   * Se récolte en une fois (radis, carottes, ail…) : jours pour tout récolter après la première récolte
   * (lib/plants/harvest-once.ts). Absent : la plante produit au fil des cueillettes.
   */
  harvestOnceDays?: number;
  /** Mois de rempotage des vivaces (terreau neuf, pot un peu plus grand) ; vide pour les annuelles. */
  repotMonths: Month[];
  harvestTip: string;
  /**
   * Plante d'ornement qu'on ne cueille pas (crocus, hellébore, joubarbe…) : `harvestMonths` est sa floraison, sans
   * geste « Récolte » chaque jour ni récolte à venir ; `harvestTip` dit quoi faire pendant la floraison.
   */
  bloomOnly?: true;
  /**
   * Plante de feuillage (érable du Japon, bambou, graminée ; toujours avec `bloomOnly`) : `harvestMonths` est sa belle
   * saison (couleurs, épis), ni récolte ni floraison à noter.
   */
  foliage?: true;
  care: CareThresholds;
  tasks: CareTask[];
  /** Variétés conseillées en pot, de la plus facile à la plus originale. */
  varieties: PlantVariety[];
  /** Pages consultées pour vérifier les mois de semis, de plantation et de récolte. */
  sources: string[];
};

/** Elle se cueille (légumes, fruits, fleurs à bouquet) : pas une plante d'ornement seulement (`bloomOnly`). */
export function hasHarvest(entry: Pick<CatalogPlant, "bloomOnly">) {
  return !entry.bloomOnly;
}

/** Une plante à fleurs (fleur, ou grimpante d'ornement comme la clématite) : ses mois de « récolte » sont sa floraison. */
export function isFlower(entry: Pick<CatalogPlant, "category" | "bloomOnly" | "foliage">) {
  return (entry.category === "flower" || entry.bloomOnly === true) && !entry.foliage;
}

/** Ce que disent ses mois de « récolte » : « 🌸  Floraison », « 🍁  Belle saison » (feuillage) ou « 🧺  Récolte ». */
export function seasonFact(entry: Pick<CatalogPlant, "category" | "bloomOnly" | "foliage">) {
  return isFlower(entry) ? "🌸  Floraison" : entry.foliage ? "🍁  Belle saison" : "🧺  Récolte";
}

export const CATEGORY_LABELS: Record<PlantCategory, string> = {
  aromatic: "Aromatiques",
  "fruiting-vegetable": "Légumes-fruits",
  "leafy-vegetable": "Légumes-feuilles",
  root: "Racines",
  flower: "Fleurs",
  "small-fruit": "Petits fruits",
  "fruit-tree": "Arbres fruitiers",
  climber: "Grimpantes",
  shrub: "Arbustes et feuillages",
};

export const SUNLIGHT_LABELS: Record<Sunlight, string> = { shade: "Ombre", partial: "Mi-ombre", sunny: "Soleil" };
export const SPACE_LABELS: Record<SpaceSize, string> = {
  windowsill: "rebord de fenêtre",
  planter: "jardinière",
  balcony: "petit balcon",
  terrace: "terrasse",
};
export const SPACE_ORDER: SpaceSize[] = ["windowsill", "planter", "balcony", "terrace"];

export const MONTH_SHORT = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"] as const;
export const MONTH_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"] as const;

const WHOLE_YEAR: Month[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const GROWING_SEASON: Month[] = [4, 5, 6, 7, 8, 9, 10];

// --- Gestes génériques ------------------------------------------------------

function wateringTask(label: string, months: Month[] = GROWING_SEASON, instruction = "Enfonce un doigt sur 2 cm : arrose doucement au pied seulement si la terre est sèche."): CareTask {
  return {
    id: "check-soil",
    type: "watering",
    title: `Arrose ${label}`,
    instruction,
    minutes: 3,
    months,
    doneTitle: "Terre vérifiée, journée gagnée.",
    doneText: "Arroser seulement quand il faut, c’est le meilleur geste pour tes racines.",
  };
}

function observeTask(label: string, months: Month[] = GROWING_SEASON): CareTask {
  return {
    id: "observe",
    type: "observation",
    title: `Aujourd’hui, observe ${label} de près.`,
    instruction: "Regarde le dessous des feuilles : pucerons, taches ou feuilles jaunies ? Retire à la main ce qui n’a rien à faire là.",
    minutes: 2,
    months,
    doneTitle: "Plante inspectée, bien vu.",
    doneText: "Repérer un souci tôt, c’est souvent éviter tout traitement.",
  };
}

function harvestTask(label: string, harvestMonths: Month[], instruction: string): CareTask {
  return {
    id: "harvest",
    type: "harvest",
    title: `Aujourd’hui, récolte ${label}.`,
    instruction,
    minutes: 5,
    months: harvestMonths,
    doneTitle: "Récolte faite, bon appétit !",
    doneText: "Récolter régulièrement encourage la plante à produire davantage.",
  };
}

function customTask(task: Omit<CareTask, "doneTitle" | "doneText"> & Partial<Pick<CareTask, "doneTitle" | "doneText">>): CareTask {
  return { doneTitle: "Geste fait, journée gagnée.", doneText: "Ta plante te remerciera dans quelques jours.", ...task };
}

type PlantInput = Omit<CatalogPlant, "tasks" | "varieties" | "repotMonths" | "indoorSowMonths" | "sources" | "harvestOnceDays"> & { varieties?: PlantVariety[]; repotMonths?: Month[]; extraTasks?: CareTask[]; wateringMonths?: Month[]; wateringInstruction?: string };

function plant({ extraTasks = [], wateringMonths, wateringInstruction, varieties, repotMonths, ...data }: PlantInput): CatalogPlant {
  const activeMonths = wateringMonths ?? GROWING_SEASON;
  const feed = fertilizeTask(data);
  return {
    ...data,
    // Une vivace se rempote à la reprise de végétation, avant la pousse de printemps.
    // Les mois vérifiés (lib/plants/repotting.ts) ; à défaut, la reprise de printemps.
    repotMonths: (REPOTTING[data.id]?.months as Month[] | undefined) ?? repotMonths ?? (data.perennial ? [3, 4] : []),
    varieties: varieties ?? PLANT_VARIETIES[data.id] ?? [],
    indoorSowMonths: (SOWING[data.id]?.indoor ?? []).filter((month) => data.sowMonths.includes(month)),
    sources: SOWING[data.id]?.sources ?? [],
    ...(HARVEST_ONCE[data.id] ? { harvestOnceDays: HARVEST_ONCE[data.id].harvestDays } : {}),
    tasks: [
      wateringTask(data.label, activeMonths, wateringInstruction),
      observeTask(data.label, activeMonths),
      ...(data.bloomOnly ? [] : [harvestTask(data.label, data.harvestMonths, data.harvestTip)]),
      ...extraTasks,
      ...(feed ? [feed] : []),
    ],
  };
}

/** Les bulbes en pot : peu d'eau, et jamais d'eau qui stagne. */
const BULB_WATERING = "Arrose seulement quand la terre est sèche sur 3 cm, et vide la soucoupe : un bulbe pourrit dans l’eau.";

// Profils de soin types
const THIRSTY: Pick<CareThresholds, "wateringIntervalHours" | "rainSkipMm" | "windThresholdKmh"> = { wateringIntervalHours: 36, rainSkipMm: 3, windThresholdKmh: 40 };
const REGULAR: Pick<CareThresholds, "wateringIntervalHours" | "rainSkipMm" | "windThresholdKmh"> = { wateringIntervalHours: 48, rainSkipMm: 2, windThresholdKmh: 40 };
const DROUGHT: Pick<CareThresholds, "wateringIntervalHours" | "rainSkipMm" | "windThresholdKmh"> = { wateringIntervalHours: 96, rainSkipMm: 2, windThresholdKmh: 50 };

export const PLANT_CATALOG: CatalogPlant[] = [
  // --- Aromatiques ----------------------------------------------------------
  plant({
    id: "basil", name: "Basilic", label: "le basilic", gender: "m", emoji: "🌿", category: "aromatic",
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: true, goals: ["aromatics"], potLiters: 5,
    pitch: "L’aromatique de l’été : quelques feuilles fraîches suffisent à transformer une salade de tomates.",
    sowMonths: [3, 4, 5], plantMonths: [5, 6], harvestMonths: [6, 7, 8, 9],
    harvestTip: "Coupe les têtes au-dessus d’une paire de feuilles plutôt que d’arracher des feuilles isolées.",
    care: { ...THIRSTY, heatThresholdC: 32, frostThresholdC: 8, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9],
    extraTasks: [customTask({ id: "pinch-flowers", type: "pruning", title: "Aujourd’hui, pince les fleurs du basilic.", instruction: "Coupe les boutons floraux dès qu’ils apparaissent : l’énergie reste dans les feuilles parfumées.", minutes: 2, months: [7, 8, 9] })],
  }),
  plant({
    id: "mint", name: "Menthe", label: "la menthe", gender: "f", emoji: "🍃", category: "aromatic",
    sunlight: ["shade", "partial", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics"], potLiters: 15,
    pitch: "Robuste et parfumée, elle démarre très bien dans un petit contenant, même à l’ombre.",
    sowMonths: [], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [4, 5, 6, 7, 8, 9, 10],
    harvestTip: "Coupe les tiges au-dessus d’une paire de feuilles : elle repartira de plus belle.",
    care: { ...THIRSTY, heatThresholdC: 30, frostThresholdC: -10, frostSensitive: false },
    extraTasks: [customTask({ id: "pinch", type: "pruning", title: "Aujourd’hui, pince la menthe.", instruction: "Coupe les extrémités juste au-dessus d’une paire de feuilles pour la faire ramifier.", minutes: 2, months: [5, 6, 7, 8] })],
  }),
  plant({
    id: "parsley", name: "Persil", label: "le persil", gender: "m", emoji: "🌿", category: "aromatic",
    sunlight: ["partial", "shade", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["aromatics"], potLiters: 8,
    pitch: "Il se récolte presque toute l’année et repousse après chaque coupe.",
    sowMonths: [3, 4, 5, 6, 7, 8], plantMonths: [4, 5, 9], harvestMonths: [5, 6, 7, 8, 9, 10, 11],
    harvestTip: "Coupe les tiges extérieures à la base, le cœur continuera à produire.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10, 11],
  }),
  plant({
    id: "chives", name: "Ciboulette", label: "la ciboulette", gender: "f", emoji: "🌱", category: "aromatic",
    sunlight: ["sunny", "partial", "shade"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 5,
    pitch: "Increvable, elle revient chaque printemps et ses fleurs mauves attirent les abeilles.",
    sowMonths: [3, 4, 5], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    harvestTip: "Coupe les brins à 3 cm du sol, ils repoussent en quelques jours.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  }),
  plant({
    id: "thyme", name: "Thym", label: "le thym", gender: "m", emoji: "🌿", category: "aromatic",
    sunlight: ["sunny"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 2,
    pitch: "Il adore le soleil et oublie volontiers tes arrosages : parfait pour les balcons brûlants.",
    sowMonths: [3, 4, 5], plantMonths: [3, 4, 5, 9, 10], harvestMonths: WHOLE_YEAR,
    harvestTip: "Coupe quelques rameaux, sans jamais tailler dans le bois dénudé.",
    care: { ...DROUGHT, heatThresholdC: 36, frostThresholdC: -12, frostSensitive: false },
    wateringInstruction: "Le thym craint l’excès d’eau : arrose seulement si la terre est sèche sur 4 cm.",
    extraTasks: [customTask({ id: "trim", type: "pruning", title: "Aujourd’hui, taille légèrement le thym.", instruction: "Après la floraison, rabats les tiges d’un tiers pour garder une touffe compacte.", minutes: 5, months: [7, 8] })],
  }),
  plant({
    id: "rosemary", name: "Romarin", label: "le romarin", gender: "m", emoji: "🌿", category: "aromatic",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 15,
    pitch: "Un arbuste méditerranéen qui fleurit dès la fin de l’hiver, une aubaine pour les pollinisateurs.",
    sowMonths: [], plantMonths: [3, 4, 5, 9, 10], harvestMonths: WHOLE_YEAR,
    harvestTip: "Prélève des brins de 10 cm à l’extrémité des branches.",
    care: { ...DROUGHT, heatThresholdC: 38, frostThresholdC: -5, frostSensitive: true },
    wateringInstruction: "Le romarin craint l’excès d’eau : arrose seulement si la terre est sèche sur 4 cm.",
  }),
  plant({
    id: "coriander", name: "Coriandre", label: "la coriandre", gender: "f", emoji: "🌿", category: "aromatic",
    sunlight: ["partial", "sunny"], minSpace: "windowsill", difficulty: "medium", perennial: false, melliferous: true, goals: ["aromatics"], potLiters: 25,
    pitch: "Fraîche et citronnée, elle pousse vite au printemps et à la fin de l’été.",
    sowMonths: [3, 4, 5, 8, 9], plantMonths: [], harvestMonths: [5, 6, 7, 9, 10],
    harvestTip: "Coupe les feuilles extérieures régulièrement pour retarder la montée en graines.",
    care: { ...REGULAR, heatThresholdC: 27, frostThresholdC: -3, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  }),
  plant({
    id: "sage", name: "Sauge officinale", label: "la sauge", gender: "f", emoji: "🍃", category: "aromatic",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 10,
    pitch: "Feuillage velouté, fleurs bleues adorées des bourdons, et presque aucun entretien.",
    sowMonths: [4, 5], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [4, 5, 6, 7, 8, 9, 10],
    harvestTip: "Cueille les jeunes feuilles au sommet des tiges.",
    care: { ...DROUGHT, heatThresholdC: 36, frostThresholdC: -10, frostSensitive: false },
  }),
  plant({
    id: "oregano", name: "Origan", label: "l’origan", gender: "m", emoji: "🌿", category: "aromatic",
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 5,
    pitch: "L’herbe de la pizza, couverte de petites fleurs roses que les abeilles adorent.",
    sowMonths: [3, 4, 5], plantMonths: [3, 4, 5, 9], harvestMonths: [5, 6, 7, 8, 9, 10],
    harvestTip: "Coupe les tiges juste avant la floraison, c’est là qu’elles sont les plus parfumées.",
    care: { ...DROUGHT, heatThresholdC: 35, frostThresholdC: -12, frostSensitive: false },
  }),
  plant({
    id: "dill", name: "Aneth", label: "l’aneth", gender: "m", emoji: "🌿", category: "aromatic",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["aromatics", "bees"], potLiters: 20,
    pitch: "Un feuillage plumeux au goût anisé, et des ombelles jaunes qui attirent les insectes utiles.",
    sowMonths: [4, 5, 6, 7], plantMonths: [], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Coupe les feuilles au fur et à mesure, garde quelques ombelles pour les graines.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: 2, frostSensitive: true },
  }),
  plant({
    id: "lemon-balm", name: "Mélisse", label: "la mélisse", gender: "f", emoji: "🍃", category: "aromatic",
    sunlight: ["partial", "shade", "sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 10,
    pitch: "Son parfum citronné fait des merveilles en tisane, et son nom vient du grec « abeille ».",
    sowMonths: [3, 4, 5], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [5, 6, 7, 8, 9],
    harvestTip: "Coupe les tiges à mi-hauteur avant la floraison pour une seconde récolte.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -10, frostSensitive: false },
  }),
  plant({
    id: "lemon-verbena", name: "Verveine citronnelle", label: "la verveine", gender: "f", emoji: "🍃", category: "aromatic",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "medium", perennial: true, melliferous: true, goals: ["aromatics"], potLiters: 15,
    pitch: "Le parfum de citron le plus intense du balcon, à rentrer à l’abri quand il gèle.",
    sowMonths: [], plantMonths: [5, 6], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Cueille les feuilles au fil de l’été, fais-les sécher pour l’hiver.",
    care: { ...REGULAR, heatThresholdC: 35, frostThresholdC: 3, frostSensitive: true },
  }),

  plant({
    id: "tarragon", name: "Estragon", label: "l’estragon", gender: "m", emoji: "🌿", category: "aromatic",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: false, goals: ["aromatics"], potLiters: 15,
    pitch: "Son goût anisé réveille une vinaigrette ou un poulet rôti, et il revient chaque printemps.",
    sowMonths: [], plantMonths: [4, 5, 9], harvestMonths: [5, 6, 7, 8, 9, 10],
    harvestTip: "Coupe les tiges au tiers de leur hauteur : de nouvelles pousses repartent aussitôt.",
    care: { ...REGULAR, heatThresholdC: 34, frostThresholdC: -10, frostSensitive: false },
    varieties: [
      { id: "french", name: "Estragon français", note: "Le vrai goût anisé : se multiplie par division, choisis-le en godet plutôt qu’en graines." },
      { id: "russian", name: "Estragon de Russie", note: "Plus rustique et vigoureux, au goût plus discret : pardonne les oublis d’arrosage." },
    ],
  }),
  plant({
    id: "chervil", name: "Cerfeuil", label: "le cerfeuil", gender: "m", emoji: "🌿", category: "aromatic",
    sunlight: ["partial", "shade"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["aromatics"], potLiters: 12,
    pitch: "L’aromatique des balcons à l’ombre : il monte en graines au soleil, mais s’épanouit au nord.",
    sowMonths: [3, 4, 5, 8, 9], plantMonths: [], harvestMonths: [4, 5, 6, 9, 10, 11],
    harvestTip: "Coupe les feuilles extérieures à 2 cm du sol, le cœur continuera à pousser.",
    care: { ...THIRSTY, heatThresholdC: 27, frostThresholdC: -6, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
    varieties: [
      { id: "common", name: "Cerfeuil commun", note: "Feuillage fin et parfum délicat : sème tous les mois pour en avoir sans interruption." },
      { id: "curled", name: "Cerfeuil frisé", note: "Plus décoratif et un peu plus lent à monter en graines en jardinière." },
    ],
  }),
  plant({
    id: "savory", name: "Sarriette", label: "la sarriette", gender: "f", emoji: "🌿", category: "aromatic",
    sunlight: ["sunny"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 5,
    pitch: "Le « poivre d’âne » provençal : parfum puissant, fleurs pour les abeilles et presque pas d’eau.",
    sowMonths: [4, 5], plantMonths: [4, 5, 9], harvestMonths: [6, 7, 8, 9],
    harvestTip: "Récolte juste avant la floraison, quand le parfum est le plus fort, et fais sécher en bouquets.",
    care: { ...DROUGHT, heatThresholdC: 38, frostThresholdC: -12, frostSensitive: false },
    wateringInstruction: "La sarriette aime les terres sèches : arrose seulement quand le pot est léger.",
    varieties: [
      { id: "mountain", name: "Sarriette des montagnes", note: "Vivace et compacte (30 cm), elle reste verte presque tout l’hiver en pot." },
      { id: "summer", name: "Sarriette annuelle", note: "Plus douce, à semer chaque printemps : la compagne des haricots en cuisine." },
    ],
  }),
  plant({
    id: "shiso", name: "Shiso", label: "le shiso", gender: "m", emoji: "🍃", category: "aromatic",
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: true, goals: ["aromatics"], potLiters: 10,
    pitch: "L’aromatique japonaise, entre menthe, basilic et cumin : originale et très décorative.",
    sowMonths: [4, 5], plantMonths: [5, 6], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Pince la tête des tiges et cueille les grandes feuilles : la plante se ramifie.",
    care: { ...THIRSTY, heatThresholdC: 32, frostThresholdC: 5, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    varieties: [
      { id: "green", name: "Shiso vert", note: "Le plus parfumé, parfait pour les sushis et les salades." },
      { id: "red", name: "Shiso pourpre", note: "Feuillage rouge sombre très décoratif, qui colore aussi les marinades." },
    ],
  }),
  plant({
    id: "lemongrass", name: "Citronnelle", label: "la citronnelle", gender: "f", emoji: "🌾", category: "aromatic",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: false, goals: ["aromatics"], potLiters: 20,
    pitch: "Les tiges parfumées de la cuisine thaïe : une belle touffe exotique sur un balcon chaud.",
    sowMonths: [], plantMonths: [5, 6], harvestMonths: [7, 8, 9, 10],
    harvestTip: "Coupe les tiges les plus grosses au ras de la terre ; les feuilles se mettent en infusion.",
    care: { ...THIRSTY, heatThresholdC: 38, frostThresholdC: 5, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    extraTasks: [customTask({ id: "shelter", type: "protection", title: "Aujourd’hui, rentre la citronnelle.", instruction: "Elle ne supporte pas le froid : installe le pot à l’intérieur, près d’une fenêtre, et arrose peu jusqu’au printemps.", minutes: 5, months: [10, 11] })],
    varieties: [
      { id: "madagascar", name: "Citronnelle de Madagascar", note: "La vraie citronnelle culinaire (Cymbopogon citratus) : une tige du marché bouture très bien dans l’eau." },
    ],
  }),
  plant({
    id: "stevia", name: "Stévia", label: "la stévia", gender: "f", emoji: "🍃", category: "aromatic",
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "medium", perennial: true, melliferous: true, goals: ["aromatics"], potLiters: 10,
    pitch: "Une feuille suffit à sucrer une tisane : la curiosité qui fait parler sur le balcon.",
    sowMonths: [], plantMonths: [5, 6], harvestMonths: [7, 8, 9, 10],
    harvestTip: "Cueille les feuilles avant la floraison, quand elles sont les plus sucrées, et fais-les sécher.",
    care: { ...REGULAR, heatThresholdC: 33, frostThresholdC: 5, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    extraTasks: [customTask({ id: "shelter", type: "protection", title: "Aujourd’hui, abrite la stévia pour l’hiver.", instruction: "Coupe les tiges à 5 cm et rentre le pot dans une pièce fraîche mais hors gel.", minutes: 5, months: [10, 11] })],
    varieties: [
      { id: "rebaudiana", name: "Stevia rebaudiana", note: "La plante sucrante classique, vendue en godet au printemps : compacte, 40 à 60 cm." },
    ],
  }),
  plant({
    id: "hyssop", name: "Hysope", label: "l’hysope", gender: "f", emoji: "🌿", category: "aromatic",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 20,
    pitch: "Des épis bleus que les abeilles adorent, et des feuilles mentholées pour les tisanes.",
    sowMonths: [3, 4, 5], plantMonths: [4, 5, 9], harvestMonths: [6, 7, 8, 9],
    harvestTip: "Coupe les jeunes tiges fleuries et fais-les sécher à l’ombre, tête en bas.",
    care: { ...DROUGHT, heatThresholdC: 36, frostThresholdC: -15, frostSensitive: false },
    extraTasks: [customTask({ id: "trim", type: "pruning", title: "Aujourd’hui, rabats l’hysope.", instruction: "Coupe les tiges défleuries de moitié : la touffe restera dense et refleurira l’an prochain.", minutes: 4, months: [9, 10] })],
    varieties: [
      { id: "blue", name: "Hysope officinale bleue", note: "La plus mellifère, en touffe de 40 cm qui tient dans une jardinière." },
      { id: "pink", name: "Hysope rose", note: "Même parfum, floraison rose tendre pour varier les couleurs." },
    ],
  }),
  plant({
    id: "wild-garlic", name: "Ail des ours", repotMonths: [9, 10], label: "l’ail des ours", gender: "m", emoji: "🍃", category: "aromatic",
    sunlight: ["shade", "partial"], minSpace: "planter", difficulty: "medium", perennial: true, melliferous: true, goals: ["aromatics"], potLiters: 15,
    pitch: "Le pesto du printemps pousse… à l’ombre : l’allié idéal des balcons orientés nord.",
    sowMonths: [9, 10], plantMonths: [9, 10, 11], harvestMonths: [3, 4, 5],
    harvestTip: "Cueille les feuilles avant la floraison, une ou deux par pied, pour ne pas épuiser les bulbes.",
    care: { ...THIRSTY, heatThresholdC: 26, frostThresholdC: -20, frostSensitive: false },
    wateringMonths: [2, 3, 4, 5, 6],
    wateringInstruction: "Garde la terre fraîche au printemps ; l’été, la plante disparaît sous terre, arrose à peine.",
    varieties: [
      { id: "ursinum", name: "Allium ursinum", note: "Achète des bulbes ou des plants en godet : les graines mettent parfois deux ans à lever." },
    ],
  }),

  // Nouveautés 2026 : variétés anciennes, originales et récentes qui tiennent en pot.
  plant({
    id: "agastache", name: "Agastache", label: "l’agastache", gender: "f", emoji: "🌿", category: "aromatic",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 15,
    pitch: "Feuilles au goût d’anis et de réglisse, et de longs épis bleus que les abeilles ne quittent plus.",
    sowMonths: [3, 4], plantMonths: [4, 5, 9], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Cueille les jeunes feuilles pour les tisanes et quelques épis fleuris pour les desserts.",
    care: { ...DROUGHT, heatThresholdC: 36, frostThresholdC: -10, frostSensitive: false },
    wateringInstruction: "L’agastache craint l’excès d’eau : arrose seulement si la terre est sèche sur 3 cm.",
    varieties: [
      { id: "foeniculum", name: "Agastache anisée", note: "L’hysope anisée d’Amérique du Nord, au parfum de réglisse : la plus mellifère." },
      { id: "rugosa", name: "Menthe coréenne", note: "Agastache rugosa, entre menthe et anis, très utilisée dans la cuisine coréenne." },
      { id: "blue-fortune", name: "Blue Fortune", note: "Sélection compacte de 60 cm aux épis bleu lavande, qui fleurit de juin à septembre." },
    ],
  }),
  plant({
    id: "lovage", name: "Livèche", label: "la livèche", gender: "f", emoji: "🌿", category: "aromatic",
    sunlight: ["partial", "sunny"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics"], potLiters: 15,
    pitch: "Le « céleri perpétuel » des potagers d’autrefois : quelques feuilles parfument toute une soupe.",
    sowMonths: [3, 4, 5], plantMonths: [3, 4, 9, 10], harvestMonths: [4, 5, 6, 7, 8, 9, 10],
    harvestTip: "Coupe les feuilles extérieures au fur et à mesure : elle repart chaque printemps plus vigoureuse.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -20, frostSensitive: false },
    varieties: [
      { id: "commune", name: "Livèche commune", note: "Levisticum officinale, cultivée depuis le Moyen Âge : un pot profond suffit pour des années." },
    ],
  }),
  plant({
    id: "oyster-plant", name: "Plante huître", label: "la plante huître", gender: "f", emoji: "🍃", category: "aromatic",
    sunlight: ["partial", "sunny"], minSpace: "planter", difficulty: "medium", perennial: true, melliferous: false, goals: ["aromatics"], potLiters: 30,
    pitch: "Ses feuilles bleutées ont vraiment le goût de l’huître : la surprise de l’apéritif.",
    sowMonths: [], plantMonths: [4, 5, 9], harvestMonths: [5, 6, 7, 8, 9],
    harvestTip: "Cueille quelques feuilles à la fois, sans dégarnir la touffe : elle pousse lentement.",
    care: { ...REGULAR, heatThresholdC: 28, frostThresholdC: -20, frostSensitive: false },
    wateringInstruction: "La plante huître pourrit dans l’eau stagnante : un terreau mêlé de sable, et de l’eau seulement si la terre est sèche.",
    varieties: [
      { id: "mertensia", name: "Mertensia maritima", note: "Plante des plages du Nord, à cultiver en pot drainé à l’abri du soleil brûlant." },
    ],
  }),
  plant({
    id: "pineapple-sage", name: "Sauge ananas", label: "la sauge ananas", gender: "f", emoji: "🌿", category: "aromatic",
    sunlight: ["sunny", "partial"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 25,
    pitch: "Froisse une feuille : elle sent l’ananas. Ses fleurs rouges illuminent le balcon en automne.",
    sowMonths: [], plantMonths: [5, 6], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Cueille les feuilles pour les salades de fruits, et les fleurs rouges sucrées en automne.",
    care: { ...REGULAR, heatThresholdC: 34, frostThresholdC: 0, frostSensitive: true },
    varieties: [
      { id: "elegans", name: "Salvia elegans", note: "La sauge ananas classique, haute de 80 cm, à rentrer près d’une fenêtre l’hiver." },
      { id: "golden-delicious", name: "Golden Delicious", note: "Feuillage doré lumineux et même parfum d’ananas, plus compacte en pot." },
    ],
  }),

  // --- Légumes-fruits -------------------------------------------------------
  plant({
    id: "cherry-tomato", name: "Tomates cerises", label: "les tomates cerises", gender: "f", plural: true, emoji: "🍅", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: ["tomatoes"], potLiters: 20,
    pitch: "Du soleil et un petit tuteur suffisent pour récolter des poignées de fruits tout l’été.",
    sowMonths: [3, 4], plantMonths: [5, 6], harvestMonths: [7, 8, 9, 10],
    harvestTip: "Cueille-les quand elles sont bien colorées et légèrement souples sous le doigt.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: 5, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    extraTasks: [
      customTask({ id: "suckers", type: "pruning", title: "Aujourd’hui, retire les gourmands des tomates.", instruction: "Pince entre deux doigts les pousses qui naissent à l’aisselle des feuilles.", minutes: 5, months: [6, 7, 8] }),
      customTask({ id: "stake", type: "observation", title: "Aujourd’hui, vérifie le tuteur des tomates.", instruction: "Attache la tige principale sans serrer, avec un lien souple tous les 20 cm.", minutes: 3, months: [5, 6, 7] }),
    ],
  }),
  plant({
    id: "chili", name: "Piment", label: "le piment", gender: "m", emoji: "🌶️", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "medium", perennial: false, melliferous: false, goals: [], potLiters: 15,
    pitch: "Compact et décoratif, il aime la chaleur des balcons plein sud.",
    sowMonths: [2, 3], plantMonths: [5, 6], harvestMonths: [8, 9, 10],
    harvestTip: "Coupe les fruits avec leur queue, à l’aide de ciseaux, pour ne pas abîmer la plante.",
    care: { ...REGULAR, heatThresholdC: 35, frostThresholdC: 8, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
  }),
  plant({
    id: "strawberry", name: "Fraisier", label: "les fraisiers", gender: "m", plural: true, emoji: "🍓", category: "small-fruit",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 5,
    pitch: "Une variété remontante donne des fraises de mai jusqu’aux premiers froids.",
    sowMonths: [], plantMonths: [3, 4, 8, 9], harvestMonths: [5, 6, 7, 8, 9],
    harvestTip: "Cueille les fraises bien rouges le matin, avec leur petite collerette verte.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -8, frostSensitive: false },
    extraTasks: [customTask({ id: "runners", type: "pruning", title: "Aujourd’hui, coupe les stolons des fraisiers.", instruction: "Supprime les longs filaments qui partent du pied, sauf si tu veux de nouveaux plants.", minutes: 3, months: [6, 7, 8] })],
  }),
  plant({
    id: "zucchini", name: "Courgette", label: "la courgette", gender: "f", emoji: "🥒", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "terrace", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 50,
    pitch: "Généreuse et spectaculaire, elle demande un grand bac mais nourrit tout l’été.",
    sowMonths: [4, 5], plantMonths: [5, 6], harvestMonths: [7, 8, 9, 10],
    harvestTip: "Récolte les courgettes jeunes, à 15-20 cm : elles sont plus tendres et la plante produit plus.",
    care: { ...THIRSTY, heatThresholdC: 32, frostThresholdC: 8, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9],
  }),
  plant({
    id: "eggplant", name: "Aubergine", label: "l’aubergine", gender: "f", emoji: "🍆", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: false, melliferous: false, goals: [], potLiters: 30,
    pitch: "Une variété naine donne de jolis fruits si ton balcon est bien chaud.",
    sowMonths: [2, 3], plantMonths: [5, 6], harvestMonths: [8, 9, 10],
    harvestTip: "Coupe le fruit quand sa peau est brillante ; terne, il devient amer.",
    care: { ...REGULAR, heatThresholdC: 35, frostThresholdC: 10, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9],
  }),
  plant({
    id: "dwarf-bean", name: "Haricots nains", label: "les haricots", gender: "m", plural: true, emoji: "🫘", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 25,
    pitch: "Semés en mai, ils se récoltent deux mois plus tard, sans tuteur.",
    sowMonths: [5, 6, 7], plantMonths: [], harvestMonths: [7, 8, 9],
    harvestTip: "Cueille les gousses avant que les grains ne gonflent, tous les deux ou trois jours.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: 8, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9],
  }),
  plant({
    id: "pea", name: "Petits pois", label: "les petits pois", gender: "m", plural: true, emoji: "🌱", category: "fruiting-vegetable",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 30,
    pitch: "Ils aiment la fraîcheur du printemps et grimpent sur un simple filet.",
    sowMonths: [2, 3, 4], plantMonths: [], harvestMonths: [5, 6, 7],
    harvestTip: "Récolte les cosses bien pleines mais encore vertes et lisses.",
    care: { ...REGULAR, heatThresholdC: 26, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6],
  }),
  plant({
    id: "mini-cucumber", name: "Concombre mini", label: "le concombre", gender: "m", emoji: "🥒", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: false, melliferous: true, goals: ["bees"], potLiters: 25,
    pitch: "Palissé contre une rambarde, il donne des petits fruits croquants tout l’été.",
    sowMonths: [4, 5], plantMonths: [5, 6], harvestMonths: [7, 8, 9],
    harvestTip: "Coupe les concombres à 10-15 cm, avant qu’ils ne jaunissent.",
    care: { ...THIRSTY, heatThresholdC: 32, frostThresholdC: 10, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9],
  }),

  plant({
    id: "dwarf-tomato", name: "Tomates naines", label: "les tomates naines", gender: "f", plural: true, emoji: "🍅", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["tomatoes"], potLiters: 15,
    pitch: "Des variétés de 20 à 60 cm, sans tuteur ni taille : des tomates même sur un rebord de fenêtre.",
    sowMonths: [3, 4], plantMonths: [5, 6], harvestMonths: [7, 8, 9, 10],
    harvestTip: "Cueille chaque fruit bien coloré : sur les variétés naines, tout mûrit en quelques semaines.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: 5, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    wateringInstruction: "Un petit pot sèche vite : vérifie la terre chaque jour en été et arrose au pied, sans mouiller les feuilles.",
    varieties: [
      { id: "micro-tom", name: "Micro Tom", note: "La plus petite tomate du monde (20 cm) : un pot de 2 L sur le rebord suffit." },
      { id: "balconi-red", name: "Balconi Red", note: "Buisson compact de 40 cm couvert de tomates cerises, fait pour les jardinières." },
      { id: "totem", name: "Totem", note: "Port trapu de 50 cm et fruits moyens, sans taille des gourmands." },
      { id: "maskotka", name: "Maskotka", note: "Port retombant et très productif : superbe en suspension ou en bord de balcon." },
      { id: "tasmanian-chocolate", name: "Tasmanian Chocolate", note: "Tomate naine d’1 m au goût des tomates noires anciennes, issue du Dwarf Tomato Project." },
      { id: "rosella-purple", name: "Rosella Purple", note: "Fruits pourpres sucrés sur un plant trapu, même programme : un pot de 20 L suffit." },
    ],
  }),
  plant({
    id: "sweet-pepper", name: "Poivron", label: "le poivron", gender: "m", emoji: "🫑", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "medium", perennial: false, melliferous: false, goals: [], potLiters: 15,
    pitch: "Sur un balcon plein sud, la chaleur des murs l’aide à mûrir mieux qu’au potager.",
    sowMonths: [2, 3], plantMonths: [5, 6], harvestMonths: [8, 9, 10],
    harvestTip: "Récolte vert ou attends qu’il rougisse : il sera plus sucré, mais la plante produira moins.",
    care: { ...REGULAR, heatThresholdC: 35, frostThresholdC: 8, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    extraTasks: [customTask({ id: "stake", type: "observation", title: "Aujourd’hui, soutiens le poivron.", instruction: "Les fruits alourdissent les branches : attache la tige à un petit tuteur avec un lien souple.", minutes: 3, months: [7, 8] })],
    varieties: [
      { id: "mini-belle", name: "Mini Belle", note: "Mini-poivrons de 5 cm en grappes, sur un plant de 50 cm : parfait en pot de 10 L." },
      { id: "lipstick", name: "Lipstick", note: "Poivron corne rouge, précoce et sucré : mûrit même quand l’été est court." },
      { id: "yolo-wonder", name: "Yolo Wonder", note: "Le gros poivron carré classique, à réserver aux grands pots en plein soleil." },
    ],
  }),
  plant({
    id: "physalis", name: "Physalis", label: "les physalis", gender: "m", plural: true, emoji: "🏮", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "easy", perennial: false, melliferous: true, goals: [], potLiters: 20,
    pitch: "Des petites lanternes qui cachent un fruit acidulé : la gourmandise qui étonne les invités.",
    sowMonths: [3, 4], plantMonths: [5, 6], harvestMonths: [8, 9, 10],
    harvestTip: "Cueille quand la lanterne est sèche et beige : le fruit se garde alors plusieurs semaines.",
    care: { ...REGULAR, heatThresholdC: 34, frostThresholdC: 5, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    varieties: [
      { id: "peruviana", name: "Coqueret du Pérou", note: "Le physalis des pâtissiers, vigoureux (80 cm) : prévois un grand pot et un tuteur." },
      { id: "pineapple", name: "Physalis ananas", note: "Plus compact (50 cm) et plus précoce, aux fruits parfumés d’ananas." },
    ],
  }),
  plant({
    id: "pole-bean", name: "Haricots à rames", label: "les haricots à rames", gender: "m", plural: true, emoji: "🫘", category: "fruiting-vegetable",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 25,
    pitch: "Ils grimpent le long de la rambarde : beaucoup de récolte pour très peu de place au sol.",
    sowMonths: [5, 6, 7], plantMonths: [], harvestMonths: [7, 8, 9, 10],
    harvestTip: "Cueille tous les deux jours, quand les gousses cassent net : plus tu récoltes, plus il en vient.",
    care: { ...THIRSTY, heatThresholdC: 32, frostThresholdC: 6, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    extraTasks: [customTask({ id: "guide", type: "observation", title: "Aujourd’hui, guide les haricots.", instruction: "Enroule les nouvelles tiges autour du treillage ou de la ficelle, dans le sens inverse des aiguilles d’une montre.", minutes: 3, months: [6, 7] })],
    varieties: [
      { id: "cobra", name: "Cobra", note: "Haricot vert filet très productif, qui grimpe à 2 m le long d’un treillis." },
      { id: "blauhilde", name: "Blauhilde", note: "Gousses violettes qui deviennent vertes à la cuisson : facile à repérer dans le feuillage." },
      { id: "scarlet-runner", name: "Haricot d’Espagne", note: "Fleurs rouge vif adorées des butineurs : aussi décoratif que gourmand, supporte la mi-ombre." },
    ],
  }),
  plant({
    id: "cucamelon", name: "Concombre à la souris", label: "le concombre à la souris", gender: "m", emoji: "🥒", category: "fruiting-vegetable",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: [], potLiters: 20,
    pitch: "Des mini-concombres de la taille d’un grain de raisin, sur une liane légère qui habille la rambarde.",
    sowMonths: [4, 5], plantMonths: [5, 6], harvestMonths: [7, 8, 9, 10],
    harvestTip: "Cueille les fruits encore fermes, à 2-3 cm : ils ont un goût de concombre citronné.",
    care: { ...THIRSTY, heatThresholdC: 34, frostThresholdC: 6, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    varieties: [
      { id: "melothria", name: "Melothria scabra", note: "Liane fine de 2 m qui s’accroche seule : un simple filet suffit sur un balcon." },
    ],
  }),
  plant({
    id: "mini-melon", name: "Melon", label: "le melon", gender: "m", emoji: "🍈", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "terrace", difficulty: "medium", perennial: false, melliferous: true, goals: ["bees"], potLiters: 25,
    pitch: "Sur une terrasse brûlante, un melon palissé peut donner quatre à six fruits parfumés.",
    sowMonths: [4], plantMonths: [5, 6], harvestMonths: [8, 9],
    harvestTip: "Il est mûr quand le pédoncule se fendille et que le melon sent bon sans le toucher.",
    care: { ...THIRSTY, heatThresholdC: 36, frostThresholdC: 8, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9],
    wateringInstruction: "Arrose généreusement au pied jusqu’aux fruits, puis réduis à l’approche de la récolte pour concentrer le sucre.",
    extraTasks: [customTask({ id: "pinch", type: "pruning", title: "Aujourd’hui, pince le melon.", instruction: "Coupe les tiges après deux feuilles au-delà de chaque petit fruit formé, et garde 4 à 6 fruits au plus.", minutes: 5, months: [6, 7] })],
    varieties: [
      { id: "minnesota-midget", name: "Minnesota Midget", note: "Fruits de 10 cm sur des tiges courtes : le melon conçu pour les petits espaces." },
      { id: "petit-gris-de-rennes", name: "Petit Gris de Rennes", note: "Variété ancienne précoce, qui mûrit même hors du Sud." },
    ],
  }),

  // Nouveautés 2026 : légumes-fruits originaux pour un balcon chaud.
  plant({
    id: "tomatillo", name: "Tomatillo", label: "les tomatillos", gender: "m", plural: true, emoji: "🏮", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "easy", perennial: false, melliferous: true, goals: ["tomatoes"], potLiters: 20,
    pitch: "La tomate verte en lanterne du Mexique, celle de la vraie salsa verde. Prévois deux plants.",
    sowMonths: [3, 4], plantMonths: [5, 6], harvestMonths: [8, 9, 10],
    harvestTip: "Cueille quand le fruit remplit sa lanterne et que celle-ci commence à se fendre.",
    care: { ...THIRSTY, heatThresholdC: 33, frostThresholdC: 5, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    extraTasks: [customTask({ id: "stake", type: "pruning", title: "Aujourd’hui, attache les tomatillos.", instruction: "Les tiges s’étalent vite : attache-les à un tuteur ou une cage, sans serrer.", minutes: 4, months: [6, 7, 8] })],
    varieties: [
      { id: "verde", name: "Verde", note: "Le tomatillo vert classique, acidulé : deux plants côte à côte pour qu’ils se pollinisent." },
      { id: "purple-de-milpa", name: "Purple de Milpa", note: "Ancienne variété mexicaine aux fruits violets, plus sucrés et plus petits." },
    ],
  }),
  plant({
    id: "okra", name: "Gombo", label: "le gombo", gender: "m", emoji: "🌱", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: false, melliferous: true, goals: [], potLiters: 40,
    pitch: "De la famille de l’hibiscus : de grandes fleurs crème, puis des gousses tendres pour la cuisine créole.",
    sowMonths: [3, 4], plantMonths: [5, 6], harvestMonths: [8, 9],
    harvestTip: "Récolte les gousses à 8 cm, tous les deux jours : plus grandes, elles deviennent fibreuses.",
    care: { ...THIRSTY, heatThresholdC: 38, frostThresholdC: 10, frostSensitive: true },
    wateringMonths: [6, 7, 8, 9],
    varieties: [
      { id: "clemson-spineless", name: "Clemson Spineless", note: "Le gombo classique sans épines, fiable même quand l’été est moyen." },
      { id: "burgundy", name: "Burgundy", note: "Tiges et gousses rouge bordeaux, superbes sur le balcon : elles verdissent à la cuisson." },
      { id: "baby-bubba", name: "Baby Bubba", note: "Sélection naine de 90 cm conçue pour les pots, productive sur un balcon chaud." },
    ],
  }),
  plant({
    id: "yardlong-bean", name: "Haricot kilomètre", label: "les haricots kilomètre", gender: "m", plural: true, emoji: "🫘", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: false, melliferous: true, goals: [], potLiters: 20,
    pitch: "Des gousses de 40 à 60 cm qui pendent du treillis : le légume qui fait rire les voisins.",
    sowMonths: [5, 6], plantMonths: [], harvestMonths: [8, 9],
    harvestTip: "Cueille les gousses quand elles ont la grosseur d’un crayon, avant que les grains ne gonflent.",
    care: { ...THIRSTY, heatThresholdC: 38, frostThresholdC: 10, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9],
    varieties: [
      { id: "dolique-asperge", name: "Dolique asperge", note: "Vigna unguiculata, la version verte classique d’Asie : grimpe à 2 m le long d’un filet." },
      { id: "red-noodle", name: "Red Noodle", note: "Gousses pourpres de 45 cm qui restent colorées après une cuisson rapide au wok." },
    ],
  }),
  plant({
    id: "west-indian-gherkin", name: "Concombre des Antilles", label: "le concombre des Antilles", gender: "m", emoji: "🥒", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "easy", perennial: false, melliferous: true, goals: [], potLiters: 20,
    pitch: "Une liane couverte de petits fruits ovales hérissés, croquants comme un cornichon.",
    sowMonths: [4, 5], plantMonths: [5, 6], harvestMonths: [7, 8, 9],
    harvestTip: "Récolte les fruits à 4 ou 5 cm, encore vert tendre : ils se mangent crus ou en pickles.",
    care: { ...THIRSTY, heatThresholdC: 35, frostThresholdC: 8, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9],
    varieties: [
      { id: "maxixe", name: "Maxixe", note: "Cucumis anguria, cultivé au Brésil et aux Antilles : très productif et sans amertume." },
    ],
  }),

  // --- Légumes-feuilles -----------------------------------------------------
  plant({
    id: "cut-lettuce", name: "Salade à couper", label: "la salade", gender: "f", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["partial", "shade", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["salads"], potLiters: 15,
    pitch: "Elle repousse plusieurs fois : parfaite pour récolter sans gaspiller.",
    sowMonths: [3, 4, 5, 6, 7, 8, 9], plantMonths: [], harvestMonths: [4, 5, 6, 7, 8, 9, 10, 11],
    harvestTip: "Coupe les feuilles à 3 cm du sol : elles repousseront pour une nouvelle récolte.",
    care: { ...THIRSTY, heatThresholdC: 27, frostThresholdC: -3, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
  }),
  plant({
    id: "head-lettuce", name: "Laitue pommée", label: "la laitue", gender: "f", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["partial", "sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: ["salads"], potLiters: 10,
    pitch: "Une belle pomme croquante par pot, à couper d’un coup quand elle est ferme.",
    sowMonths: [2, 3, 4, 5, 6, 7, 8], plantMonths: [4, 5, 6, 7, 8, 9], harvestMonths: [5, 6, 7, 8, 9, 10],
    harvestTip: "Coupe la pomme au ras de la terre dès qu’elle est ferme : n’attends pas, elle monterait en graine.",
    care: { ...THIRSTY, heatThresholdC: 25, frostThresholdC: -3, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  }),
  plant({
    id: "arugula", name: "Roquette", label: "la roquette", gender: "f", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["partial", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["salads"], potLiters: 15,
    pitch: "Prête à croquer trois semaines après le semis, avec un petit goût poivré.",
    sowMonths: [3, 4, 5, 8, 9], plantMonths: [], harvestMonths: [4, 5, 6, 9, 10, 11],
    harvestTip: "Récolte les feuilles jeunes, avant la floraison qui les rend piquantes.",
    care: { ...THIRSTY, heatThresholdC: 27, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 8, 9, 10, 11],
  }),
  plant({
    id: "spinach", name: "Épinards", label: "les épinards", gender: "m", plural: true, emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["partial", "shade"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: ["salads"], potLiters: 15,
    pitch: "Ils préfèrent la fraîcheur et se plaisent sur les balcons peu ensoleillés.",
    sowMonths: [3, 4, 8, 9], plantMonths: [], harvestMonths: [4, 5, 6, 10, 11],
    harvestTip: "Coupe les grandes feuilles extérieures en laissant le cœur produire.",
    care: { ...REGULAR, heatThresholdC: 25, frostThresholdC: -6, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 8, 9, 10, 11],
  }),
  plant({
    id: "chard", name: "Blettes", label: "les blettes", gender: "f", plural: true, emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["partial", "sunny"], minSpace: "balcony", difficulty: "easy", perennial: false, melliferous: false, goals: ["salads"], potLiters: 15,
    pitch: "Des côtes colorées qui se récoltent feuille à feuille de l’été jusqu’à l’hiver.",
    sowMonths: [4, 5, 6, 7], plantMonths: [5, 6], harvestMonths: [6, 7, 8, 9, 10, 11],
    harvestTip: "Coupe les feuilles extérieures à la base, le cœur continuera à en produire.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10, 11],
  }),
  plant({
    id: "lambs-lettuce", name: "Mâche", label: "la mâche", gender: "f", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["partial", "shade", "sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: ["salads"], potLiters: 20,
    pitch: "La salade de l’hiver : semée à la rentrée, elle se récolte quand le reste du balcon dort.",
    sowMonths: [8, 9, 10], plantMonths: [], harvestMonths: [10, 11, 12, 1, 2, 3],
    harvestTip: "Coupe les rosettes entières au ras de la terre.",
    care: { ...REGULAR, heatThresholdC: 25, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [8, 9, 10, 11, 3],
  }),
  plant({
    id: "kale", name: "Chou kale", label: "le chou kale", gender: "m", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["sunny", "partial"], minSpace: "balcony", difficulty: "easy", perennial: false, melliferous: false, goals: ["salads"], potLiters: 20,
    pitch: "Il résiste au froid et devient même plus doux après les premières gelées.",
    sowMonths: [4, 5, 6], plantMonths: [5, 6, 7], harvestMonths: [9, 10, 11, 12, 1, 2],
    harvestTip: "Récolte les feuilles du bas en remontant, le chou continue de grandir.",
    care: { ...REGULAR, heatThresholdC: 28, frostThresholdC: -12, frostSensitive: false },
    wateringMonths: [5, 6, 7, 8, 9, 10],
  }),

  plant({
    id: "garden-cress", name: "Cresson alénois", label: "le cresson", gender: "m", emoji: "🌱", category: "leafy-vegetable",
    sunlight: ["partial", "shade", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["salads"], potLiters: 2,
    pitch: "Semé lundi, dégusté le week-end : la récolte la plus rapide du balcon.",
    sowMonths: [3, 4, 5, 6, 7, 8, 9, 10], plantMonths: [], harvestMonths: [4, 5, 6, 7, 8, 9, 10, 11],
    harvestTip: "Coupe aux ciseaux dès 5 cm de haut, puis ressème : il ne repousse pas.",
    care: { ...THIRSTY, heatThresholdC: 28, frostThresholdC: 0, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
    wateringInstruction: "Le cresson ne doit jamais sécher : brumise ou arrose un peu chaque jour.",
    varieties: [
      { id: "common", name: "Cresson alénois commun", note: "Piquant et prêt en 8 jours, même sur du coton humide près d’une fenêtre." },
      { id: "wrinkled", name: "Cresson frisé", note: "Feuilles dentelées plus décoratives, un peu plus lentes à pousser." },
    ],
  }),
  plant({
    id: "sorrel", name: "Oseille", label: "l’oseille", gender: "f", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["partial", "shade", "sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: false, goals: ["salads"], potLiters: 15,
    pitch: "Vivace, acidulée et increvable : elle repousse chaque printemps, même au nord.",
    sowMonths: [3, 4, 5, 9], plantMonths: [3, 4, 10], harvestMonths: [4, 5, 6, 7, 8, 9, 10],
    harvestTip: "Cueille les feuilles extérieures jeunes et coupe les tiges florales pour qu’elle reste tendre.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -15, frostSensitive: false },
    varieties: [
      { id: "belleville", name: "Large de Belleville", note: "La variété classique à grandes feuilles, productive dès la première année." },
      { id: "red-veined", name: "Oseille sanguine", note: "Nervures rouges très décoratives, parfaite en jardinière mixte à l’ombre." },
    ],
  }),
  plant({
    id: "purslane", name: "Pourpier", label: "le pourpier", gender: "m", emoji: "🌱", category: "leafy-vegetable",
    sunlight: ["sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["salads"], potLiters: 10,
    pitch: "La salade des balcons brûlants : charnue, croquante et presque sans arrosage.",
    sowMonths: [5, 6, 7], plantMonths: [], harvestMonths: [6, 7, 8, 9],
    harvestTip: "Coupe les tiges à 5 cm du sol : elles repartent en quelques semaines.",
    care: { ...DROUGHT, heatThresholdC: 40, frostThresholdC: 6, frostSensitive: true },
    varieties: [
      { id: "golden", name: "Pourpier doré", note: "Feuilles plus larges et plus tendres que le pourpier sauvage, pousse en plein cagnard." },
      { id: "green", name: "Pourpier vert", note: "Plus vigoureux, il se ressème souvent seul dans la jardinière." },
    ],
  }),
  plant({
    id: "pak-choi", name: "Pak choï", label: "le pak choï", gender: "m", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["partial", "sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 15,
    pitch: "Le chou chinois express : récolté en six semaines, délicieux sauté au wok.",
    sowMonths: [7, 8, 9], plantMonths: [], harvestMonths: [9, 10, 11],
    harvestTip: "Récolte la rosette entière ou quelques feuilles à la fois, avant qu’il ne monte en fleurs.",
    care: { ...THIRSTY, heatThresholdC: 27, frostThresholdC: -4, frostSensitive: false },
    wateringMonths: [4, 5, 6, 8, 9, 10, 11],
    varieties: [
      { id: "mei-qing", name: "Mei Qing Choi", note: "Mini pak choï de 15 cm, lent à monter en graines : le plus sûr en jardinière." },
      { id: "joi-choi", name: "Joi Choi", note: "Côtes blanches charnues et bonne résistance à la chaleur." },
    ],
  }),
  plant({
    id: "mizuna", name: "Mizuna", label: "la mizuna", gender: "f", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["partial", "shade", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["salads"], potLiters: 5,
    pitch: "Une moutarde japonaise dentelée, douce et poivrée, qui repousse après chaque coupe.",
    sowMonths: [3, 4, 5, 8, 9, 10], plantMonths: [], harvestMonths: [4, 5, 6, 9, 10, 11, 12],
    harvestTip: "Coupe à 3 cm du sol : tu pourras récolter trois ou quatre fois.",
    care: { ...THIRSTY, heatThresholdC: 27, frostThresholdC: -6, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 8, 9, 10, 11, 12],
    varieties: [
      { id: "green", name: "Mizuna verte", note: "Feuillage fin et abondant, idéale en mélange de jeunes pousses." },
      { id: "red-kingdom", name: "Mizuna rouge (Red Kingdom)", note: "Tiges et feuilles pourpres qui colorent l’assiette et la jardinière." },
    ],
  }),
  plant({
    id: "microgreens", name: "Micro-pousses", label: "les micro-pousses", gender: "f", plural: true, emoji: "🌱", category: "leafy-vegetable",
    sunlight: ["partial", "shade", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["salads"], potLiters: 1,
    pitch: "Radis, betterave, roquette… récoltés à dix jours : concentrés de goût, même en plein hiver.",
    sowMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], plantMonths: [], harvestMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    harvestTip: "Coupe au-dessus des premières feuilles, dès qu’elles sont bien ouvertes.",
    care: { ...THIRSTY, heatThresholdC: 28, frostThresholdC: 5, frostSensitive: true },
    wateringMonths: WHOLE_YEAR,
    wateringInstruction: "Vaporise la surface matin et soir : le substrat doit rester humide, jamais détrempé.",
    varieties: [
      { id: "radish", name: "Radis Sango", note: "Tiges violettes et goût piquant, prêtes en 7 jours." },
      { id: "sunflower", name: "Tournesol", note: "Pousses croquantes au goût de noisette, les plus nourrissantes." },
      { id: "pea", name: "Pois", note: "Vrilles sucrées à couper deux fois, parfaites en salade." },
    ],
  }),

  // Nouveautés 2026 : légumes-feuilles anciens et originaux.
  plant({
    id: "strawberry-spinach", name: "Épinard-fraise", label: "l’épinard-fraise", gender: "m", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["salads"], potLiters: 15,
    pitch: "Un légume oublié : des feuilles comme l’épinard, puis de petites baies rouges le long des tiges.",
    sowMonths: [3, 4, 5], plantMonths: [], harvestMonths: [5, 6, 7, 8, 9, 10],
    harvestTip: "Cueille les jeunes feuilles au printemps, puis les baies bien rouges en été, crues en salade.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -5, frostSensitive: false },
    varieties: [
      { id: "blitum", name: "Blitum capitatum", note: "Cultivé dans les potagers du Moyen Âge, il se ressème souvent seul dans la jardinière." },
    ],
  }),
  plant({
    id: "orach", name: "Arroche", label: "l’arroche", gender: "f", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: ["salads"], potLiters: 15,
    pitch: "L’« épinard des Romains », au feuillage pourpre ou doré : aussi belle qu’une plante d’ornement.",
    sowMonths: [3, 4, 5, 6, 7, 8], plantMonths: [], harvestMonths: [5, 6, 7, 8, 9, 10],
    harvestTip: "Cueille les feuilles jeunes et tendres, et pince la tête pour retarder la floraison.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: -5, frostSensitive: false },
    varieties: [
      { id: "rouge", name: "Arroche rouge", note: "Feuilles pourpres très décoratives, qui colorent les salades et la jardinière." },
      { id: "blonde", name: "Arroche blonde", note: "La forme verte pâle des anciens potagers, la plus tendre en cuisine." },
    ],
  }),
  plant({
    id: "nz-spinach", name: "Tétragone", label: "la tétragone", gender: "f", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: ["salads"], potLiters: 15,
    pitch: "L’épinard d’été qui ne monte jamais en graines, même en pleine canicule.",
    sowMonths: [3, 4, 5], plantMonths: [5, 6], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Pince l’extrémité des tiges sur 8 cm : de nouvelles pousses repartent tout l’été.",
    care: { ...REGULAR, heatThresholdC: 38, frostThresholdC: 2, frostSensitive: true },
    varieties: [
      { id: "cornue", name: "Tétragone cornue", note: "Rapportée de Nouvelle-Zélande par le capitaine Cook : ses tiges débordent joliment du bac." },
    ],
  }),
  plant({
    id: "malabar-spinach", name: "Baselle", label: "la baselle", gender: "f", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "medium", perennial: false, melliferous: false, goals: [], potLiters: 15,
    pitch: "Un épinard grimpant aux feuilles brillantes, qui adore la chaleur des balcons plein sud.",
    sowMonths: [3, 4, 5], plantMonths: [6], harvestMonths: [7, 8, 9, 10],
    harvestTip: "Coupe les extrémités des tiges avec leurs feuilles charnues : la liane se ramifie.",
    care: { ...THIRSTY, heatThresholdC: 38, frostThresholdC: 8, frostSensitive: true },
    wateringMonths: [6, 7, 8, 9, 10],
    varieties: [
      { id: "verte", name: "Baselle verte", note: "Basella alba, la plus productive : grimpe à 1,5 m sur une simple ficelle." },
      { id: "rouge", name: "Baselle rouge", note: "Tiges pourpres et nervures rouges, aussi décorative qu’une plante grimpante d’ornement." },
    ],
  }),
  plant({
    id: "winter-purslane", name: "Claytone de Cuba", label: "la claytone", gender: "f", emoji: "🌱", category: "leafy-vegetable",
    sunlight: ["shade", "partial"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["salads"], potLiters: 5,
    pitch: "La salade de l’hiver à l’ombre : tendre, croquante, elle pousse même quand il gèle.",
    sowMonths: [3, 8, 9, 10], plantMonths: [], harvestMonths: [1, 2, 3, 4, 10, 11, 12],
    harvestTip: "Coupe les feuilles à 2 cm du cœur : elle repousse plusieurs fois jusqu’au printemps.",
    care: { ...REGULAR, heatThresholdC: 25, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [1, 2, 3, 4, 9, 10, 11, 12],
    varieties: [
      { id: "pourpier-d-hiver", name: "Pourpier d’hiver", note: "Claytonia perfoliata, cultivée en France depuis le XIXᵉ siècle : idéale pour un balcon nord." },
    ],
  }),
  plant({
    id: "ice-plant", name: "Ficoïde glaciale", label: "la ficoïde glaciale", gender: "f", emoji: "🌱", category: "leafy-vegetable",
    sunlight: ["sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 10,
    pitch: "Ses feuilles semblent couvertes de givre et croquent, légèrement salées : une curiosité au soleil.",
    sowMonths: [3, 4, 5, 6], plantMonths: [5, 6], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Cueille les tiges et les feuilles les plus charnues, à croquer crues ou à peine sautées.",
    care: { ...DROUGHT, heatThresholdC: 40, frostThresholdC: 3, frostSensitive: true },
    varieties: [
      { id: "crystallinum", name: "Mesembryanthemum crystallinum", note: "Plante des bords de mer chauds, elle se plaît dans un pot sec en plein soleil." },
    ],
  }),
  plant({
    id: "mustard-greens", name: "Moutarde de Chine", label: "la moutarde de Chine", gender: "f", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["partial", "sunny", "shade"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 10,
    pitch: "Des feuilles poivrées, pourpres ou dorées, prêtes en un mois : le piquant des salades d’automne.",
    sowMonths: [3, 4, 8, 9], plantMonths: [], harvestMonths: [4, 5, 6, 9, 10, 11],
    harvestTip: "Cueille les feuilles jeunes, à 10 cm : plus grandes, elles se cuisent comme un chou.",
    care: { ...REGULAR, heatThresholdC: 27, frostThresholdC: -6, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 8, 9, 10, 11],
    varieties: [
      { id: "red-giant", name: "Red Giant", note: "Grandes feuilles pourpres cloquées au goût de moutarde forte, très décoratives." },
      { id: "wasabina", name: "Wasabina", note: "Feuilles frisées vert vif au piquant de wasabi, pour relever un plat." },
      { id: "golden-streaks", name: "Golden Streaks", note: "Feuillage finement découpé vert doré, doux et rapide en jeunes pousses." },
    ],
  }),
  plant({
    id: "kohlrabi", name: "Chou-rave", label: "le chou-rave", gender: "m", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 10,
    pitch: "Le chou qui forme une boule croquante au-dessus de la terre, prêt en deux mois en jardinière.",
    sowMonths: [3, 4, 5, 6], plantMonths: [4, 5, 6, 7, 8, 9], harvestMonths: [6, 7, 8, 9, 10, 11],
    harvestTip: "Récolte la boule quand elle a la taille d’une balle de tennis : plus grosse, elle devient fibreuse.",
    care: { ...REGULAR, heatThresholdC: 28, frostThresholdC: -5, frostSensitive: false },
    varieties: [
      { id: "azur-star", name: "Azur Star", note: "Boule violette à chair blanche, précoce et lente à durcir en pot." },
      { id: "blanc-hatif-de-vienne", name: "Blanc hâtif de Vienne", note: "Variété ancienne du XIXᵉ siècle, petite et tendre, la plus sûre en jardinière." },
    ],
  }),
  plant({
    id: "perpetual-leek", name: "Poireau perpétuel", label: "le poireau perpétuel", gender: "m", emoji: "🌱", category: "leafy-vegetable",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: [], potLiters: 15,
    pitch: "On coupe une tige, la touffe en refait d’autres : le poireau qu’on ne replante jamais.",
    sowMonths: [], plantMonths: [8, 9, 10], harvestMonths: [1, 2, 3, 4, 5, 6, 10, 11, 12],
    harvestTip: "Coupe les tiges au ras du sol en laissant toujours quelques-unes : la touffe se densifie.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: -15, frostSensitive: false },
    repotMonths: [9, 10],
    varieties: [
      { id: "ampeloprasum", name: "Poireau perpétuel", note: "Allium ampeloprasum des anciens potagers : il se multiplie seul en petits caïeux." },
    ],
  }),

  // --- Racines --------------------------------------------------------------
  plant({
    id: "radish", name: "Radis", label: "les radis", gender: "m", plural: true, emoji: "🌱", category: "root",
    sunlight: ["partial", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 5,
    pitch: "Une récolte en quatre semaines qui donne confiance dès le premier essai.",
    sowMonths: [3, 4, 5, 6, 7, 8, 9], plantMonths: [], harvestMonths: [4, 5, 6, 7, 8, 9, 10],
    harvestTip: "Arrache-les dès qu’ils ont la taille d’une bille : trop gros, ils deviennent creux.",
    care: { ...THIRSTY, heatThresholdC: 28, frostThresholdC: -4, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    wateringInstruction: "Les radis doivent pousser vite : garde la terre fraîche, sans la détremper.",
    extraTasks: [customTask({ id: "thin", type: "pruning", title: "Aujourd’hui, éclaircis les radis.", instruction: "Garde les pousses les plus vigoureuses, espacées de 3 à 4 cm.", minutes: 3, months: [3, 4, 5, 6, 7, 8, 9], doneTitle: "Radis éclaircis, journée gagnée.", doneText: "Tes jeunes plants ont maintenant plus de place pour grossir." })],
  }),
  plant({
    id: "round-carrot", name: "Carottes rondes", label: "les carottes", gender: "f", plural: true, emoji: "🥕", category: "root",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "medium", perennial: false, melliferous: false, goals: [], potLiters: 10,
    pitch: "Les variétés rondes, comme « Marché de Paris », se contentent de 20 cm de terre.",
    sowMonths: [3, 4, 5, 6, 7], plantMonths: [], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Tire doucement sur le feuillage après avoir arrosé : la carotte vient toute seule.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  }),
  plant({
    id: "spring-onion", name: "Oignons botte", label: "les oignons botte", gender: "m", plural: true, emoji: "🧅", category: "root",
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 10,
    pitch: "Replante la base d’un oignon du commerce : il repousse en quelques jours.",
    sowMonths: [3, 8, 9], plantMonths: [3, 4, 5, 6, 7, 8, 9], harvestMonths: [5, 6, 7, 8, 9, 10],
    harvestTip: "Coupe les tiges vertes à 2 cm du bulbe : elles repousseront.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  }),

  plant({
    id: "beetroot", name: "Betterave", label: "les betteraves", gender: "f", plural: true, emoji: "🌱", category: "root",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 10,
    pitch: "Racines et feuilles se mangent : rien ne se perd, et les variétés rondes tiennent en jardinière.",
    sowMonths: [4, 5, 6, 7], plantMonths: [], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Arrache-les à la taille d’une balle de golf : elles sont plus tendres et plus sucrées.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -3, frostSensitive: false },
    extraTasks: [customTask({ id: "thin", type: "pruning", title: "Aujourd’hui, éclaircis les betteraves.", instruction: "Chaque graine donne plusieurs pousses : garde la plus belle tous les 8 cm et mange les autres en salade.", minutes: 3, months: [5, 6, 7] })],
    varieties: [
      { id: "detroit", name: "Détroit 2", note: "Ronde et rouge foncé, la plus fiable dans 20 cm de terre." },
      { id: "chioggia", name: "Chioggia", note: "Chair zébrée rose et blanc, très douce, superbe crue en carpaccio." },
      { id: "golden", name: "Burpee’s Golden", note: "Jaune, elle ne tache pas et ses feuilles sont excellentes en poêlée." },
    ],
  }),
  plant({
    id: "turnip", name: "Navets", label: "les navets", gender: "m", plural: true, emoji: "🌱", category: "root",
    sunlight: ["partial", "sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 10,
    pitch: "Les navets primeurs se récoltent en deux mois, au printemps comme à l’automne.",
    sowMonths: [3, 4, 5, 7, 8, 9], plantMonths: [], harvestMonths: [5, 6, 7, 9, 10, 11],
    harvestTip: "Récolte-les petits, à 4-5 cm de diamètre, avant qu’ils ne deviennent fibreux.",
    care: { ...THIRSTY, heatThresholdC: 27, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 8, 9, 10, 11],
    varieties: [
      { id: "milan", name: "Milan rouge", note: "Navet plat à collet violet, très précoce et peu exigeant en profondeur." },
      { id: "tokyo", name: "Tokyo Cross", note: "Petit navet blanc de 5 cm, tendre et prêt en 40 jours." },
    ],
  }),
  plant({
    id: "garlic", name: "Ail", label: "l’ail", gender: "m", emoji: "🧄", category: "root",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 10,
    pitch: "Planté à l’automne, il passe l’hiver seul : le légume parfait pour ne pas laisser les pots vides.",
    sowMonths: [], plantMonths: [10, 11, 2, 3], harvestMonths: [6, 7],
    harvestTip: "Arrache les têtes quand les deux tiers des feuilles ont jauni, puis laisse-les sécher à l’ombre.",
    care: { ...DROUGHT, heatThresholdC: 32, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [3, 4, 5],
    wateringInstruction: "L’ail craint l’excès d’eau : arrose seulement au printemps, si la terre est sèche.",
    varieties: [
      { id: "germidour", name: "Germidour", note: "Ail violet à planter en octobre, doux et de bonne conservation." },
      { id: "printanor", name: "Printanor", note: "Ail blanc à planter en février–mars si tu as raté l’automne." },
      { id: "green-garlic", name: "Aillet (ail vert)", note: "Plante des caïeux serrés et récolte les jeunes pousses au printemps, comme de la ciboulette." },
    ],
  }),
  plant({
    id: "potato", name: "Pommes de terre en sac", label: "les pommes de terre", gender: "f", plural: true, emoji: "🥔", category: "root",
    sunlight: ["sunny", "partial"], minSpace: "terrace", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 30,
    pitch: "Un grand sac de culture, trois plants, et le plaisir de fouiller la terre à la récolte.",
    sowMonths: [], plantMonths: [3, 4, 5], harvestMonths: [6, 7, 8],
    harvestTip: "Pour des pommes de terre nouvelles, récolte dès la floraison ; sinon attends que le feuillage jaunisse.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: 1, frostSensitive: true },
    wateringMonths: [4, 5, 6, 7, 8],
    extraTasks: [customTask({ id: "earth-up", type: "pruning", title: "Aujourd’hui, butte les pommes de terre.", instruction: "Quand les tiges font 20 cm, ajoute du terreau en ne laissant dépasser que les feuilles du haut.", minutes: 5, months: [4, 5, 6] })],
    varieties: [
      { id: "charlotte", name: "Charlotte", note: "Chair ferme et précoce : la valeur sûre pour une culture en sac." },
      { id: "ratte", name: "Ratte", note: "Petite et fondante, elle se plaît en contenant et se récolte en 90 jours." },
      { id: "vitelotte", name: "Vitelotte", note: "Chair violette et goût de châtaigne : la curiosité du balcon." },
    ],
  }),

  // Nouveautés 2026 : tubercules anciens et originaux, faciles en grand pot.
  plant({
    id: "oca", name: "Oca du Pérou", label: "l’oca du Pérou", gender: "m", emoji: "🌱", category: "root",
    sunlight: ["sunny", "partial"], minSpace: "balcony", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 15,
    pitch: "Le tubercule des Andes, rose ou jaune, au goût acidulé : il se plante comme une pomme de terre.",
    sowMonths: [], plantMonths: [4, 5], harvestMonths: [11, 12],
    harvestTip: "Attends que le feuillage fane après les premières gelées : les tubercules grossissent en fin d’automne.",
    care: { ...REGULAR, heatThresholdC: 28, frostThresholdC: 0, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10, 11],
    varieties: [
      { id: "rose", name: "Oca rose", note: "Tubercules roses brillants, croquants crus comme un radis acidulé." },
      { id: "jaune", name: "Oca jaune", note: "Plus doux une fois cuit, au goût de châtaigne citronnée." },
    ],
  }),
  plant({
    id: "crosne", name: "Crosnes du Japon", label: "les crosnes", gender: "m", plural: true, emoji: "🌱", category: "root",
    sunlight: ["partial", "sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: [], potLiters: 20,
    pitch: "Un légume oublié en forme de petits coquillages, au goût d’artichaut : le pot l’empêche d’envahir.",
    sowMonths: [], plantMonths: [3, 4], harvestMonths: [1, 2, 3, 11, 12],
    harvestTip: "Récolte au fur et à mesure en hiver : les crosnes se gardent mieux dans la terre que dans le frigo.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10],
    varieties: [
      { id: "stachys", name: "Stachys affinis", note: "Arrivé en France en 1882 au village de Crosne : replante quelques tubercules chaque printemps." },
    ],
  }),

  // --- Fleurs ---------------------------------------------------------------
  plant({
    id: "nasturtium", name: "Capucines", label: "les capucines", gender: "f", plural: true, emoji: "🏵️", category: "flower",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 10,
    pitch: "Des fleurs colorées et comestibles, qui attirent les abeilles et éloignent les pucerons des tomates.",
    sowMonths: [3, 4, 5, 6], plantMonths: [5, 6], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Cueille fleurs et jeunes feuilles pour tes salades : elles ont un goût poivré.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: 3, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    extraTasks: [customTask({ id: "deadhead", type: "pruning", title: "Aujourd’hui, observe les fleurs des capucines.", instruction: "Retire une fleur fanée pour encourager les nouvelles et laisse les abeilles butiner.", minutes: 2, months: [6, 7, 8, 9, 10], doneTitle: "Capucines observées, journée gagnée.", doneText: "Ton balcon reste accueillant pour les pollinisateurs." })],
  }),
  plant({
    id: "calendula", name: "Soucis", label: "les soucis", gender: "m", plural: true, emoji: "🌼", category: "flower",
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 10,
    pitch: "Des fleurs orange du printemps à l’automne, qui se ressèment toutes seules.",
    sowMonths: [3, 4, 5, 6, 9], plantMonths: [4, 5], harvestMonths: [5, 6, 7, 8, 9, 10, 11],
    harvestTip: "Cueille les fleurs épanouies : leurs pétales colorent salades et infusions.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: -3, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10],
  }),
  plant({
    id: "lavender", name: "Lavande", label: "la lavande", gender: "f", emoji: "🌸", category: "flower",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 15,
    pitch: "Un parfum de vacances, une floraison qui bourdonne tout l’été, et très peu d’eau.",
    sowMonths: [], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [6, 7, 8],
    harvestTip: "Coupe les épis quand les premières fleurs s’ouvrent, pour les faire sécher tête en bas.",
    care: { ...DROUGHT, wateringIntervalHours: 120, heatThresholdC: 38, frostThresholdC: -12, frostSensitive: false },
    wateringInstruction: "La lavande déteste l’humidité : arrose seulement si la terre est sèche sur 5 cm.",
    extraTasks: [customTask({ id: "trim", type: "pruning", title: "Aujourd’hui, taille la lavande.", instruction: "Après la floraison, coupe les tiges fanées et un tiers du feuillage, sans toucher au vieux bois.", minutes: 5, months: [8, 9] })],
  }),
  plant({
    id: "cosmos", name: "Cosmos", label: "les cosmos", gender: "m", plural: true, emoji: "🌸", category: "flower",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 15,
    pitch: "Légers et graciles, ils fleurissent sans relâche de juillet aux gelées.",
    sowMonths: [3, 4, 5], plantMonths: [5, 6], harvestMonths: [7, 8, 9, 10],
    harvestTip: "Coupe quelques tiges fleuries pour un bouquet : la plante n’en fleurira que plus.",
    care: { ...REGULAR, heatThresholdC: 34, frostThresholdC: 3, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
  }),
  plant({
    id: "borage", name: "Bourrache", label: "la bourrache", gender: "f", emoji: "🌸", category: "flower",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 15,
    pitch: "Ses fleurs bleues en étoile sont parmi les plus visitées par les abeilles.",
    sowMonths: [3, 4, 5, 6], plantMonths: [], harvestMonths: [6, 7, 8, 9],
    harvestTip: "Cueille les fleurs pour décorer tes plats : elles ont un léger goût de concombre.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: -3, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9],
  }),
  plant({
    id: "marigold", name: "Œillets d’Inde", label: "les œillets d’Inde", gender: "m", plural: true, emoji: "🏵️", category: "flower",
    sunlight: ["sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees", "tomatoes"], potLiters: 8,
    pitch: "Les compagnons des tomates : leur odeur tient à distance certains ravageurs.",
    sowMonths: [3, 4, 5], plantMonths: [5, 6], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Retire les fleurs fanées pour prolonger la floraison jusqu’en octobre.",
    care: { ...REGULAR, heatThresholdC: 34, frostThresholdC: 3, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
  }),
  plant({
    id: "dwarf-sunflower", name: "Tournesol nain", label: "le tournesol", gender: "m", emoji: "🌻", category: "flower",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 15,
    pitch: "Un vrai soleil en pot, et ses graines nourrissent les oiseaux à l’automne.",
    sowMonths: [4, 5, 6], plantMonths: [], harvestMonths: [7, 8, 9],
    harvestTip: "Laisse sécher la fleur sur pied, puis offre les graines aux mésanges.",
    care: { ...REGULAR, heatThresholdC: 35, frostThresholdC: 3, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9],
  }),
  plant({
    id: "viola", name: "Violas et pensées", label: "les violas", gender: "f", plural: true, emoji: "🌸", category: "flower",
    sunlight: ["partial", "shade", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 3,
    pitch: "Des fleurs comestibles de l’automne au printemps : le balcon reste gai même en hiver, même au nord.",
    sowMonths: [7, 8], plantMonths: [9, 10, 11, 3, 4], harvestMonths: [10, 11, 12, 1, 2, 3, 4, 5],
    harvestTip: "Cueille les fleurs fraîchement ouvertes pour décorer salades et desserts, et retire les fanées.",
    care: { ...REGULAR, heatThresholdC: 26, frostThresholdC: -10, frostSensitive: false },
    wateringMonths: [9, 10, 11, 12, 1, 2, 3, 4, 5],
    varieties: [
      { id: "cornuta", name: "Viola cornuta", note: "Petites fleurs très nombreuses, les plus florifères et résistantes au froid." },
      { id: "tricolor", name: "Pensée sauvage", note: "Viola tricolor, ancienne et comestible, qui se ressème seule dans les pots." },
      { id: "swiss-giants", name: "Pensée Géante suisse", note: "Grandes fleurs à « visage » pour une jardinière bien visible de l’intérieur." },
    ],
  }),
  plant({
    id: "zinnia", name: "Zinnias", label: "les zinnias", gender: "m", plural: true, emoji: "🌺", category: "flower",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 10,
    pitch: "Des couleurs franches tout l’été et des papillons en visite : ils aiment la chaleur des balcons sud.",
    sowMonths: [4, 5, 6], plantMonths: [5, 6], harvestMonths: [7, 8, 9, 10],
    harvestTip: "Coupe les fleurs pour les bouquets : plus tu en coupes, plus la plante en refait.",
    care: { ...REGULAR, heatThresholdC: 36, frostThresholdC: 5, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    wateringInstruction: "Arrose au pied, jamais sur le feuillage : le zinnia est sensible à l’oïdium.",
    varieties: [
      { id: "profusion", name: "Profusion", note: "Compact (30 cm) et résistant à l’oïdium : la série pensée pour les pots." },
      { id: "thumbelina", name: "Thumbelina", note: "Zinnia nain de 15 cm, en mélange de couleurs, pour les rebords de fenêtre." },
      { id: "state-fair", name: "Géant de Californie", note: "Grandes fleurs à couper, sur 80 cm : à réserver aux grands bacs abrités du vent." },
    ],
  }),
  plant({
    id: "phacelia", name: "Phacélie", label: "la phacélie", gender: "f", emoji: "🌸", category: "flower",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 15,
    pitch: "La plante préférée des abeilles : ses fleurs bleues bourdonnent six semaines après le semis.",
    sowMonths: [3, 4, 5, 6, 7, 8, 9], plantMonths: [], harvestMonths: [5, 6, 7, 8, 9, 10],
    harvestTip: "Laisse-la fleurir, puis coupe-la au ras du sol et pose-la sur la terre : elle nourrit le pot.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: -6, frostSensitive: false },
    varieties: [
      { id: "tanacetifolia", name: "Phacelia tanacetifolia", note: "Engrais vert et fleur mellifère à la fois : elle régénère la terre d’une jardinière fatiguée." },
    ],
  }),
  plant({
    id: "cornflower", name: "Bleuets", label: "les bleuets", gender: "m", plural: true, emoji: "🌸", category: "flower",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 8,
    pitch: "Le bleu des champs, comestible et adoré des butineurs, qui pousse dans peu de terre.",
    sowMonths: [3, 4, 5, 9], plantMonths: [], harvestMonths: [5, 6, 7, 8],
    harvestTip: "Cueille les fleurs juste ouvertes : leurs pétales décorent salades et gâteaux.",
    care: { ...DROUGHT, wateringIntervalHours: 72, heatThresholdC: 34, frostThresholdC: -10, frostSensitive: false },
    varieties: [
      { id: "blue-boy", name: "Blue Boy", note: "Le bleu intense classique, sur des tiges de 60 cm à tuteurer légèrement." },
      { id: "dwarf", name: "Bleuet nain double", note: "Touffe de 30 cm en mélange de bleus, roses et blancs, stable au vent." },
    ],
  }),
  plant({
    id: "sweet-alyssum", name: "Alysse odorante", label: "l’alysse", gender: "f", emoji: "🌼", category: "flower",
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 2,
    pitch: "Un tapis blanc au parfum de miel, qui attire les insectes mangeurs de pucerons.",
    sowMonths: [3, 4, 5, 8, 9], plantMonths: [4, 5], harvestMonths: [5, 6, 7, 8, 9, 10],
    harvestTip: "Rabats-la de moitié aux ciseaux quand la floraison faiblit : elle refleurit en trois semaines.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: -3, frostSensitive: false },
    varieties: [
      { id: "carpet-of-snow", name: "Tapis de neige", note: "Blanc pur et très parfumé, parfait au pied des tomates et des aromatiques." },
      { id: "royal-carpet", name: "Tapis royal", note: "Nuances violettes, pour border une jardinière de couleur." },
    ],
  }),
  plant({
    id: "sweet-pea", name: "Pois de senteur", label: "les pois de senteur", gender: "m", plural: true, emoji: "🌸", category: "flower",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 15,
    pitch: "Une liane parfumée qui fleurit la rambarde tout le printemps.",
    sowMonths: [2, 3, 4, 10], plantMonths: [4, 5], harvestMonths: [5, 6, 7, 8],
    harvestTip: "Coupe des bouquets tous les deux jours : si les gousses se forment, la floraison s’arrête.",
    care: { ...THIRSTY, heatThresholdC: 28, frostThresholdC: -5, frostSensitive: false },
    extraTasks: [customTask({ id: "guide", type: "observation", title: "Aujourd’hui, guide les pois de senteur.", instruction: "Accroche les nouvelles tiges au treillage ou à la rambarde avec un lien souple.", minutes: 3, months: [4, 5, 6] })],
    varieties: [
      { id: "spencer", name: "Spencer en mélange", note: "Grandes fleurs ondulées très parfumées, pour grimper à 1,50 m le long d’un filet." },
      { id: "cupid", name: "Cupid", note: "Variété naine de 20 cm, sans support : idéale en pot suspendu." },
    ],
  }),
  plant({
    id: "hardy-geranium", name: "Géranium vivace", label: "le géranium vivace", gender: "m", emoji: "🌸", category: "flower",
    sunlight: ["shade", "partial"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 15,
    pitch: "La vivace des balcons à l’ombre : feuillage parfumé, fleurs pour les abeilles, aucun entretien.",
    sowMonths: [], plantMonths: [3, 4, 9, 10], harvestMonths: [5, 6, 7],
    harvestTip: "Après la floraison, coupe les tiges défleuries : un nouveau feuillage frais repousse.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -20, frostSensitive: false },
    varieties: [
      { id: "macrorrhizum", name: "Geranium macrorrhizum", note: "Couvre-sol parfumé qui supporte l’ombre sèche et l’oubli d’arrosage." },
      { id: "rozanne", name: "Rozanne", note: "Fleurs bleu violet de juin aux gelées, retombantes en bord de bac." },
    ],
  }),
  plant({
    id: "tall-verbena", name: "Verveine de Buenos Aires", label: "la verveine de Buenos Aires", gender: "f", emoji: "🌸", category: "flower",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 25,
    pitch: "De hautes tiges légères couronnées de violet, véritable aimant à papillons jusqu’en octobre.",
    sowMonths: [3, 4], plantMonths: [5], harvestMonths: [7, 8, 9, 10],
    harvestTip: "Laisse les tiges sèches en hiver : les oiseaux mangent les graines, et tu couperas au printemps.",
    care: { ...DROUGHT, heatThresholdC: 38, frostThresholdC: -8, frostSensitive: false },
    varieties: [
      { id: "bonariensis", name: "Verbena bonariensis", note: "1 m de haut mais très aérienne : elle laisse passer la vue et le vent." },
      { id: "lollipop", name: "Lollipop", note: "Version naine de 60 cm, plus adaptée à une jardinière exposée au vent." },
    ],
  }),

  // Nouveautés 2026 : fleurs anciennes et sélections récentes pour pots.
  plant({
    id: "pinks", name: "Œillet mignardise", label: "l’œillet mignardise", gender: "m", emoji: "🌸", category: "flower",
    sunlight: ["sunny"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 10,
    pitch: "Le parfum de clou de girofle des jardins de grand-mère, sur un coussin argenté toute l’année.",
    sowMonths: [4, 5], plantMonths: [3, 4, 9, 10], harvestMonths: [5, 6, 7],
    harvestTip: "Coupe quelques fleurs pour un petit bouquet parfumé, et les fleurs fanées pour qu’il refleurisse.",
    care: { ...DROUGHT, heatThresholdC: 35, frostThresholdC: -20, frostSensitive: false },
    wateringInstruction: "L’œillet craint l’humidité : arrose seulement quand la terre est sèche, jamais sur le feuillage.",
    varieties: [
      { id: "mrs-sinkins", name: "Mrs Sinkins", note: "Fleurs blanches doubles très parfumées, cultivée depuis 1868 en Angleterre." },
      { id: "doris", name: "Doris", note: "Fleurs rose saumon à cœur foncé, remontante et parfumée, une valeur sûre depuis 1954." },
      { id: "pink-kisses", name: "Pink Kisses", note: "Sélection récente très compacte (15 cm), couverte de fleurs roses parfumées en pot." },
    ],
  }),
  plant({
    id: "dahlia", name: "Dahlias nains", label: "les dahlias", gender: "m", plural: true, emoji: "🌺", category: "flower",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 15,
    pitch: "Des fleurs de juillet aux gelées, en pot : les variétés à fleurs simples nourrissent les abeilles.",
    sowMonths: [], plantMonths: [4, 5], harvestMonths: [7, 8, 9, 10],
    harvestTip: "Coupe les fleurs fanées et quelques tiges pour les bouquets : plus tu coupes, plus il fleurit.",
    care: { ...THIRSTY, heatThresholdC: 32, frostThresholdC: 0, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    repotMonths: [4],
    extraTasks: [customTask({ id: "store-tubers", type: "protection", title: "Aujourd’hui, mets les dahlias à l’abri pour l’hiver.", instruction: "Après le premier gel, coupe les tiges à 10 cm et rentre le pot (ou les tubercules) dans un endroit sec hors gel.", minutes: 10, months: [11] })],
    varieties: [
      { id: "bishop-of-llandaff", name: "Bishop of Llandaff", note: "Fleurs simples rouge vif sur feuillage pourpre, une ancienne star de 1924." },
      { id: "gallery", name: "Gallery", note: "Série naine de 40 cm créée pour les pots, aux fleurs doubles de toutes les couleurs." },
      { id: "happy-single", name: "Happy Single", note: "Fleurs simples grandes ouvertes, faciles d’accès pour les abeilles, port compact." },
    ],
  }),
  plant({
    id: "snapdragon", name: "Mufliers", label: "les mufliers", gender: "m", plural: true, emoji: "🌸", category: "flower",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 5,
    pitch: "Les « gueules-de-loup » que les enfants font parler, et que seuls les bourdons savent ouvrir.",
    sowMonths: [2, 3, 4], plantMonths: [4, 5], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Coupe les épis fanés au-dessus d’une feuille : une nouvelle floraison suit en quelques semaines.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -5, frostSensitive: false },
    varieties: [
      { id: "tom-thumb", name: "Tom Pouce", note: "Muflier nain de 20 cm en mélange de couleurs, la variété ancienne des bordures." },
      { id: "twinny", name: "Twinny", note: "Fleurs doubles en papillon sur 30 cm, une sélection récente très florifère en pot." },
      { id: "night-and-day", name: "Night and Day", note: "Fleurs pourpre sombre à gorge blanche, très originales sur un balcon clair." },
    ],
  }),
  plant({
    id: "fuchsia", name: "Fuchsia rustique", label: "le fuchsia", gender: "m", emoji: "🌺", category: "flower",
    sunlight: ["shade", "partial"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 15,
    pitch: "La fleur des balcons à l’ombre, en clochettes de juin aux gelées, et ses baies se mangent.",
    sowMonths: [], plantMonths: [4, 5, 9], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Les baies bien mûres, presque noires, sont sucrées : goûte-les ou fais-en une confiture.",
    care: { ...THIRSTY, heatThresholdC: 28, frostThresholdC: -10, frostSensitive: false },
    varieties: [
      { id: "magellanica", name: "Fuchsia magellanica", note: "L’espèce rustique du Chili, qui passe l’hiver dehors en pot et repart de la base." },
      { id: "riccartonii", name: "Riccartonii", note: "Hybride écossais de 1830, très florifère, rouge et violet, le plus résistant au froid." },
    ],
  }),

  // --- Petits fruits -------------------------------------------------------
  plant({
    id: "dwarf-raspberry", name: "Framboisier nain", label: "le framboisier", gender: "m", emoji: "🪴", category: "small-fruit",
    sunlight: ["sunny", "partial"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 30,
    pitch: "Des framboisiers sans épines d’un mètre, sélectionnés pour donner des fruits en pot.",
    sowMonths: [], plantMonths: [3, 10, 11], harvestMonths: [7, 8, 9],
    harvestTip: "Cueille les framboises quand elles se détachent seules : ne les lave pas avant de les manger.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -18, frostSensitive: false },
    extraTasks: [customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille le framboisier.", instruction: "Coupe au ras de la terre les cannes qui ont donné des fruits ; garde les nouvelles pousses vigoureuses.", minutes: 5, months: [11, 12, 2] })],
    varieties: [
      { id: "ruby-beauty", name: "Ruby Beauty", note: "Nain (80 cm), sans épines et sans tuteur : le premier framboisier conçu pour les pots." },
      { id: "yummy", name: "Yummy", note: "Remontant et compact, il donne en été puis de nouveau à l’automne." },
    ],
  }),
  plant({
    id: "blueberry", name: "Myrtillier", label: "le myrtillier", gender: "m", emoji: "🫐", category: "small-fruit",
    sunlight: ["partial", "sunny"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: true, goals: ["bees"], potLiters: 30,
    pitch: "Fleurs au printemps, baies l’été, feuillage rouge à l’automne : le pot vaut aussi pour sa beauté.",
    sowMonths: [], plantMonths: [3, 4, 10, 11], harvestMonths: [7, 8, 9],
    harvestTip: "Attends que les baies soient bleues depuis quelques jours : elles deviennent alors vraiment sucrées.",
    care: { ...THIRSTY, heatThresholdC: 32, frostThresholdC: -20, frostSensitive: false },
    wateringInstruction: "Le myrtillier veut une terre acide toujours fraîche : utilise de l’eau de pluie si possible, le calcaire du robinet le fait jaunir.",
    varieties: [
      { id: "top-hat", name: "Top Hat", note: "Nain (50 cm), autofertile : un seul pied en pot suffit pour récolter." },
      { id: "sunshine-blue", name: "Sunshine Blue", note: "Compact, persistant et moins exigeant sur l’acidité que les autres." },
      { id: "northblue", name: "Northblue", note: "Très rustique et généreux, pour un balcon exposé au froid." },
    ],
  }),
  plant({
    id: "redcurrant", name: "Groseillier", label: "le groseillier", gender: "m", emoji: "🪴", category: "small-fruit",
    sunlight: ["partial", "shade", "sunny"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 40,
    pitch: "Le petit fruit qui accepte la mi-ombre : des grappes brillantes même sur un balcon peu ensoleillé.",
    sowMonths: [], plantMonths: [10, 11, 12, 2, 3], harvestMonths: [6, 7],
    harvestTip: "Cueille les grappes entières avec des ciseaux, quand toutes les baies sont colorées.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -20, frostSensitive: false },
    extraTasks: [customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille le groseillier.", instruction: "Supprime les branches de plus de trois ans et celles qui partent vers le centre, pour aérer.", minutes: 5, months: [12, 1, 2] })],
    varieties: [
      { id: "jonkheer", name: "Jonkheer van Tets", note: "Groseille rouge précoce à longues grappes, très productive en bac." },
      { id: "white-versailles", name: "Blanche de Versailles", note: "Baies blanches plus douces, parfaites à croquer sur le balcon." },
      { id: "gooseberry", name: "Groseillier à maquereau Hinnonmaki", note: "Grosses baies rouges acidulées, résistant à l’oïdium." },
    ],
  }),
  plant({
    id: "lemon-tree", name: "Citronnier", repotMonths: [4, 5], label: "le citronnier", gender: "m", emoji: "🍋", category: "fruit-tree",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: true, goals: [], potLiters: 25,
    pitch: "Des fleurs au parfum enivrant et des citrons presque toute l’année, à condition de l’abriter l’hiver.",
    sowMonths: [], plantMonths: [4, 5], harvestMonths: [11, 12, 1, 2, 3],
    harvestTip: "Un citron se cueille bien jaune et légèrement souple ; il peut rester sur l’arbre plusieurs semaines.",
    care: { ...REGULAR, wateringIntervalHours: 72, heatThresholdC: 36, frostThresholdC: 3, frostSensitive: true },
    wateringMonths: WHOLE_YEAR,
    wateringInstruction: "Arrose copieusement quand la terre est sèche sur 3 cm, puis vide la soucoupe : ses racines détestent l’eau stagnante.",
    extraTasks: [customTask({ id: "shelter", type: "protection", title: "Aujourd’hui, abrite le citronnier.", instruction: "Sous 3 °C, rentre-le dans une pièce lumineuse et fraîche (idéalement 10 °C), ou protège-le d’un voile d’hivernage.", minutes: 10, months: [10, 11, 12, 1, 2, 3] })],
    varieties: [
      { id: "four-seasons", name: "Citronnier 4 saisons", note: "Fleurit et fructifie plusieurs fois par an : le plus adapté à la culture en pot." },
      { id: "meyer", name: "Meyer", note: "Compact, un peu plus résistant au froid (-4 °C), aux citrons doux et juteux." },
    ],
  }),
  plant({
    id: "dwarf-fig", name: "Figuier nain", label: "le figuier", gender: "m", emoji: "🪴", category: "fruit-tree",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: false, goals: [], potLiters: 30,
    pitch: "Un parfum de vacances et deux récoltes par an sur un arbuste d’à peine un mètre cinquante.",
    sowMonths: [], plantMonths: [3, 4, 10], harvestMonths: [7, 8, 9],
    harvestTip: "La figue est mûre quand elle ploie sur son pédoncule et qu’une goutte perle à son œil.",
    care: { ...DROUGHT, heatThresholdC: 40, frostThresholdC: -10, frostSensitive: false },
    extraTasks: [customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille le figuier.", instruction: "Raccourcis les rameaux trop longs et retire le bois mort pour garder un port compact.", minutes: 5, months: [2, 3] })],
    varieties: [
      { id: "petite-negra", name: "Petite Négra", note: "Figuier nain bifère, qui fructifie dès 50 cm de haut : le champion des pots." },
      { id: "little-miss-figgy", name: "Little Miss Figgy", note: "Port très compact (1,20 m) et figues violettes sucrées." },
    ],
  }),

  // Nouveautés 2026 : petits fruits anciens et sélections récentes pour pots.
  plant({
    id: "woodland-strawberry", name: "Fraisier des bois", label: "les fraisiers des bois", gender: "m", plural: true, emoji: "🍓", category: "small-fruit",
    sunlight: ["shade", "partial", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: [], potLiters: 4,
    pitch: "Les petites fraises parfumées des sous-bois, qui se plaisent même sur un balcon à l’ombre.",
    sowMonths: [2, 3], plantMonths: [3, 4, 9, 10], harvestMonths: [5, 6, 7, 8, 9],
    harvestTip: "Cueille-les bien rouges, presque tous les jours : chaque plant donne peu, mais tout l’été.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -15, frostSensitive: false },
    varieties: [
      { id: "baron-solemacher", name: "Baron Solemacher", note: "Fraisier des quatre saisons sans stolons, sélectionné en 1935 : il reste sagement dans son pot." },
      { id: "yellow-wonder", name: "Yellow Wonder", note: "Fraises blanc crème au goût d’ananas, que les oiseaux ne repèrent pas." },
    ],
  }),
  plant({
    id: "kiwiberry", name: "Kiwaï", label: "le kiwaï", gender: "m", emoji: "🥝", category: "small-fruit",
    sunlight: ["sunny", "partial"], minSpace: "terrace", difficulty: "medium", perennial: true, melliferous: false, goals: [], potLiters: 40,
    pitch: "Des mini-kiwis à la peau lisse, qui se croquent comme des raisins, sur une liane très rustique.",
    sowMonths: [], plantMonths: [3, 4, 10, 11], harvestMonths: [9, 10],
    harvestTip: "Cueille les fruits encore fermes et laisse-les mûrir quelques jours à la maison.",
    care: { ...THIRSTY, heatThresholdC: 32, frostThresholdC: -25, frostSensitive: false },
    extraTasks: [customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille le kiwaï.", instruction: "Raccourcis les longues pousses de l’année à 4 ou 5 bourgeons et attache les autres au treillis.", minutes: 10, months: [1, 2] })],
    varieties: [
      { id: "issai", name: "Issai", note: "Autofertile et compact : un seul pied suffit sur un balcon, fruits dès la 2ᵉ année." },
      { id: "kens-red", name: "Ken’s Red", note: "Fruits rouges à l’intérieur comme à l’extérieur, mais il lui faut un pied mâle à côté." },
    ],
  }),
  plant({
    id: "blackcurrant", name: "Cassissier", label: "le cassissier", gender: "m", emoji: "🫐", category: "small-fruit",
    sunlight: ["sunny", "partial"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 30,
    pitch: "Un arbuste rustique d’un mètre, et des grappes noires parfumées pour les sirops et les confitures.",
    sowMonths: [], plantMonths: [2, 3, 10, 11], harvestMonths: [6, 7],
    harvestTip: "Cueille les grappes entières quand toutes les baies sont noires et brillantes.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -25, frostSensitive: false },
    extraTasks: [customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille le cassissier.", instruction: "Coupe à la base les plus vieilles branches (les plus foncées) pour faire place aux jeunes.", minutes: 10, months: [2, 3] })],
    varieties: [
      { id: "noir-de-bourgogne", name: "Noir de Bourgogne", note: "La variété ancienne de la crème de cassis : petites baies très parfumées." },
      { id: "titania", name: "Titania", note: "Grosses baies et bonne résistance aux maladies, la plus facile en pot." },
    ],
  }),
  plant({
    id: "thornless-blackberry", name: "Mûres sans épines", label: "les mûres sans épines", gender: "f", plural: true, emoji: "🌱", category: "small-fruit",
    sunlight: ["sunny", "partial"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 30,
    pitch: "De grosses mûres sucrées sans se griffer : les nouvelles variétés tiennent dans un pot.",
    sowMonths: [], plantMonths: [3, 4, 10, 11], harvestMonths: [7, 8, 9],
    harvestTip: "Une mûre est prête quand elle se détache toute seule, noire et brillante, sans tirer.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: -15, frostSensitive: false },
    extraTasks: [customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille les mûres.", instruction: "Après la récolte, coupe au ras les tiges qui ont donné des fruits : les nouvelles porteront l’an prochain.", minutes: 10, months: [9, 10] })],
    varieties: [
      { id: "little-black-prince", name: "Little Black Prince", note: "Mûrier nain d’1 m sans épines, sélectionné pour les pots de balcon." },
      { id: "black-cascade", name: "Black Cascade", note: "Port retombant pour suspension ou bord de balcon, des mûres à hauteur de main." },
      { id: "navaho", name: "Navaho", note: "Tiges dressées sans épines et mûres très sucrées : un tuteur et un grand bac suffisent." },
    ],
  }),

  // --- Catalogue balcon et terrasse, livraison 1 (21/10) : bulbes, fleurs d’hiver, plantes grasses -------------
  // Plantes d’ornement qu’on ne cueille pas (`bloomOnly`) : leurs mois de « récolte » sont leur floraison.
  plant({
    id: "tulip", name: "Tulipes", label: "les tulipes", gender: "f", plural: true, emoji: "🌷", category: "flower", bloomOnly: true,
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: false, goals: [], potLiters: 18,
    pitch: "Un pot qui explose de couleurs en avril, planté en dix minutes à l’automne.",
    sowMonths: [], plantMonths: [9, 10, 11, 12], harvestMonths: [3, 4, 5],
    harvestTip: "Coupe chaque fleur fanée juste sous la tête, et laisse les feuilles jaunir toutes seules : elles nourrissent le bulbe.",
    care: { ...DROUGHT, rainSkipMm: 3, heatThresholdC: 25, frostThresholdC: -10, frostSensitive: false },
    wateringMonths: [10, 11, 3, 4, 5],
    wateringInstruction: BULB_WATERING,
    extraTasks: [customTask({ id: "deadhead", type: "pruning", title: "Aujourd’hui, coupe les fleurs fanées des tulipes.", instruction: "Coupe chaque fleur fanée juste sous la tête, et garde tiges et feuilles jusqu’à ce qu’elles jaunissent : elles rechargent le bulbe.", minutes: 3, months: [4, 5] })],
    varieties: [
      { id: "red-riding-hood", name: "Red Riding Hood", note: "Tulipe courte (20 à 25 cm), rouge à cœur noir, aux feuilles striées : elle tient bien au vent du balcon." },
      { id: "foxtrot", name: "Foxtrot", note: "Double hâtive rose tendre, aux fleurs pleines comme des pivoines en avril, assez courte pour un pot." },
      { id: "little-beauty", name: "Little Beauty", note: "Tulipe botanique naine rose et bleu, qui peut refleurir plusieurs années dans le même pot." },
    ],
  }),
  plant({
    id: "daffodil", name: "Narcisses", label: "les narcisses", gender: "m", plural: true, emoji: "🌼", category: "flower", bloomOnly: true,
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: false, goals: [], potLiters: 10,
    pitch: "Les premières fleurs jaunes de l’année sur ton balcon, et elles reviennent chaque printemps.",
    sowMonths: [], plantMonths: [9, 10, 11], harvestMonths: [2, 3, 4],
    harvestTip: "Coupe les fleurs fanées sous la tête, mais laisse tiges et feuilles jaunir toutes seules jusqu’au bout.",
    care: { ...DROUGHT, rainSkipMm: 3, heatThresholdC: 25, frostThresholdC: -10, frostSensitive: false },
    wateringMonths: [10, 11, 2, 3, 4],
    wateringInstruction: BULB_WATERING,
    extraTasks: [customTask({ id: "deadhead", type: "pruning", title: "Aujourd’hui, coupe les fleurs fanées des narcisses.", instruction: "Coupe les fleurs fanées sous la tête, sans nouer ni couper les feuilles : laisse-les jaunir, elles rechargent le bulbe pour l’an prochain.", minutes: 3, months: [3, 4] })],
    varieties: [
      { id: "tete-a-tete", name: "Tête-à-tête", note: "Mini-narcisse de 15 à 20 cm, 2 ou 3 fleurs jaunes par tige dès février : le classique des pots." },
      { id: "jetfire", name: "Jetfire", note: "Petit narcisse jaune à trompette orange, très précoce, parfait en pot." },
      { id: "minnow", name: "Minnow", note: "Narcisse nain crème à cœur jaune, parfumé, en avril : il prend le relais de Tête-à-tête." },
    ],
  }),
  plant({
    id: "muscari", name: "Muscaris", label: "les muscaris", gender: "m", plural: true, emoji: "🌸", category: "flower", bloomOnly: true,
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 5,
    pitch: "Des grappes bleues qui reviennent chaque printemps et régalent les premières abeilles.",
    sowMonths: [], plantMonths: [9, 10, 11], harvestMonths: [3, 4, 5],
    harvestTip: "Coupe les épis fanés et laisse les feuilles jaunir : les muscaris reviendront plus fournis l’an prochain.",
    care: { ...DROUGHT, rainSkipMm: 3, heatThresholdC: 25, frostThresholdC: -12, frostSensitive: false },
    wateringMonths: [10, 11, 3, 4, 5],
    wateringInstruction: BULB_WATERING,
    extraTasks: [customTask({ id: "deadhead", type: "pruning", title: "Aujourd’hui, coupe les épis fanés des muscaris.", instruction: "Coupe les épis fanés et garde les feuilles jusqu’à ce qu’elles jaunissent. Leurs nouvelles feuilles d’automne, c’est normal.", minutes: 2, months: [4, 5] })],
    varieties: [
      { id: "valerie-finnis", name: "Valerie Finnis", note: "Épis bleu ciel très pâle, légèrement parfumés, port compact : joli seul ou au pied des tulipes." },
      { id: "peppermint", name: "Peppermint", note: "Bleu clair à pointe plus pâle, petit et compact, parfait au premier rang d’une jardinière." },
      { id: "big-smile", name: "Big Smile", note: "Longs épis bleus ourlés de blanc, plus hauts que le muscari classique : ils se voient de loin." },
    ],
  }),
  plant({
    id: "crocus", name: "Crocus", label: "les crocus", gender: "m", plural: true, emoji: "🌸", category: "flower", bloomOnly: true,
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 4,
    pitch: "Les premières fleurs de l’année, dès février, et un festin pour les abeilles qui se réveillent.",
    sowMonths: [], plantMonths: [9, 10, 11], harvestMonths: [2, 3, 4],
    harvestTip: "Profite des fleurs au soleil, elles s’ouvrent en grand à midi. Après, laisse les feuilles jaunir sans les couper.",
    care: { ...DROUGHT, rainSkipMm: 3, heatThresholdC: 20, frostThresholdC: -12, frostSensitive: false },
    wateringMonths: [10, 11, 2, 3],
    wateringInstruction: BULB_WATERING,
    varieties: [
      { id: "cream-beauty", name: "Cream Beauty", note: "Crocus crème à gorge jaune, parfumé, parmi les plus précoces : il fleurit en pot dès février." },
      { id: "pickwick", name: "Pickwick", note: "Grosses fleurs blanches striées de violet, très visibles dans une petite jardinière." },
      { id: "lilac-beauty", name: "Lilac Beauty", note: "Crocus mauve qui supporte un peu d’ombre et revient bien d’une année sur l’autre en pot." },
    ],
  }),
  plant({
    id: "winter-heath", name: "Bruyère d’hiver", label: "la bruyère d’hiver", gender: "f", emoji: "🌸", category: "flower", bloomOnly: true,
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 4,
    pitch: "Des fleurs roses ou blanches tout l’hiver, même sous la neige, et du nectar pour les abeilles.",
    sowMonths: [], plantMonths: [3, 4, 5, 6, 10, 11, 12], harvestMonths: [11, 12, 1, 2, 3, 4],
    harvestTip: "Pendant la floraison, laisse-la dehors et garde sa terre fraîche : ses fleurs tiennent des semaines, même sous la neige.",
    care: { ...REGULAR, wateringIntervalHours: 72, heatThresholdC: 30, frostThresholdC: -10, frostSensitive: false },
    wateringMonths: WHOLE_YEAR,
    wateringInstruction: "Sa terre ne doit jamais sécher complètement : arrose quand le dessus est sec, jamais quand il gèle.",
    extraTasks: [customTask({ id: "trim", type: "pruning", title: "Aujourd’hui, taille la bruyère.", instruction: "Quand les fleurs ont fané, coupe le bout des tiges juste sous les fleurs sèches, sans descendre dans le vieux bois : il ne repousse pas.", minutes: 5, months: [4, 5] })],
    varieties: [
      { id: "kramers-rote", name: "Kramer’s Rote", note: "Fleurs rouge magenta et feuillage sombre, en touffe compacte : parfaite dans un pot de 20 cm." },
      { id: "silberschmelze", name: "Silberschmelze", note: "Fleurs blanches parfumées de novembre à avril : elle éclaire un balcon à l’ombre légère." },
      { id: "springwood-white", name: "Springwood White", note: "Tapis bas de fleurs blanches de janvier à avril, qui retombe joliment d’une jardinière." },
    ],
  }),
  plant({
    id: "hellebore", name: "Hellébore", label: "l’hellébore", gender: "m", emoji: "🌼", category: "flower", bloomOnly: true,
    sunlight: ["partial", "shade"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 15,
    pitch: "La rose de Noël : des fleurs en plein cœur de l’hiver, sur un balcon à l’ombre.",
    sowMonths: [], plantMonths: [3, 4, 5, 9, 10, 11], harvestMonths: [12, 1, 2, 3, 4],
    harvestTip: "Pendant la floraison, laisse-le dehors au frais : au chaud, à l’intérieur, ses fleurs fanent en quelques jours.",
    care: { ...REGULAR, wateringIntervalHours: 72, heatThresholdC: 28, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: WHOLE_YEAR,
    wateringInstruction: "Garde sa terre fraîche, jamais détrempée : arrose quand le dessus est sec, à l’ombre l’été, jamais quand il gèle.",
    extraTasks: [customTask({ id: "old-leaves", type: "pruning", title: "Aujourd’hui, coupe les vieilles feuilles de l’hellébore.", instruction: "Avec des gants (toute la plante est toxique), coupe à la base les vieilles feuilles abîmées ou tachées de noir : les boutons sortent mieux.", minutes: 5, months: [12, 1] })],
    varieties: [
      { id: "christmas-carol", name: "Christmas Carol", note: "Rose de Noël aux grandes fleurs blanches dès décembre, en touffe compacte vendue en pot." },
      { id: "ice-n-roses", name: "Ice N’ Roses", note: "Fleurs roses ou rouges bien droites, très nombreuses : faite pour les potées." },
      { id: "jacob", name: "Jacob", note: "Fleurs blanches précoces et nombreuses sur une touffe basse : une valeur sûre en pot." },
    ],
  }),
  plant({
    id: "houseleek", name: "Joubarbe", label: "la joubarbe", gender: "f", emoji: "🌵", category: "flower", bloomOnly: true,
    sunlight: ["sunny"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: [], potLiters: 2,
    pitch: "Increvable et presque sans eau : un tapis de rosettes qui vit des années dans un tout petit pot.",
    sowMonths: [], plantMonths: [3, 4, 5, 6, 9, 10], harvestMonths: [6, 7, 8],
    harvestTip: "Admire sa hampe étoilée sans arroser plus : la rosette qui fleurit vit sa dernière saison, ses rejets prendront sa place.",
    care: { ...DROUGHT, wateringIntervalHours: 240, heatThresholdC: 40, frostThresholdC: -20, frostSensitive: false },
    wateringMonths: [5, 6, 7, 8, 9],
    wateringInstruction: "Presque jamais : arrose seulement quand la terre est sèche jusqu’au fond, et jamais l’hiver. C’est l’humidité qui la tue, pas le froid.",
    extraTasks: [customTask({ id: "rosette", type: "pruning", title: "Aujourd’hui, retire la rosette fanée de la joubarbe.", instruction: "Une rosette qui a fleuri meurt ensuite : retire-la avec sa hampe sèche. Les petits rejets autour prennent sa place.", minutes: 2, months: [8, 9] })],
    varieties: [
      { id: "arachnoideum", name: "Joubarbe toile d’araignée", note: "Petites rosettes couvertes de fils blancs comme une toile : spectaculaire dans une coupe basse." },
      { id: "tectorum", name: "Joubarbe des toits", note: "La classique, aux grosses rosettes vertes à pointes rouges : increvable, elle remplit vite un pot." },
      { id: "rubin", name: "Rubin", note: "Rosettes rouge rubis tissées de blanc : une couleur vive toute l’année dans un petit pot." },
    ],
  }),
  plant({
    id: "sedum", name: "Sédum d’automne", label: "le sédum", gender: "m", emoji: "🌸", category: "flower", bloomOnly: true,
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 12,
    pitch: "Des bouquets roses en fin d’été, couverts d’abeilles et de papillons, sur un balcon brûlant.",
    sowMonths: [], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [8, 9, 10],
    harvestTip: "Ne coupe rien : les abeilles et les papillons s’y nourrissent, et les fleurs sèches resteront belles tout l’hiver.",
    care: { ...DROUGHT, wateringIntervalHours: 168, heatThresholdC: 38, frostThresholdC: -20, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9],
    wateringInstruction: "Arrose seulement quand la terre est bien sèche : il craint bien plus l’eau que la sécheresse.",
    extraTasks: [customTask({ id: "cut-stems", type: "pruning", title: "Aujourd’hui, coupe les tiges sèches du sédum.", instruction: "Coupe toutes les tiges sèches au ras des nouvelles pousses. Tout l’hiver, elles ont protégé la souche du froid.", minutes: 3, months: [2, 3] })],
    varieties: [
      { id: "herbstfreude", name: "Herbstfreude", note: "La variété la plus courante : fleurs roses qui virent au rouge brique puis au cuivre." },
      { id: "brillant", name: "Brillant", note: "Fleurs rose vif très visitées par les abeilles, port compact d’environ 40 cm." },
      { id: "angelina", name: "Angelina", note: "Sédum rampant doré qui retombe du pot : pour les petits pots, presque sans arrosage." },
    ],
  }),

  // --- Catalogue balcon et terrasse, livraison 2 (21/10) : arbres fruitiers en pot -----------------------------
  plant({
    id: "olive-tree", name: "Olivier", label: "l’olivier", gender: "m", emoji: "🫒", category: "fruit-tree",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: false, goals: [], potLiters: 35,
    pitch: "Un air de Méditerranée toute l’année : feuillage argenté, et quelques olives si l’été est chaud.",
    sowMonths: [], plantMonths: [4, 5, 6], harvestMonths: [10, 11, 12],
    harvestTip: "Cueille les olives à la main, vertes ou bien noires, puis fais-les tremper : crues, elles sont immangeables.",
    care: { ...DROUGHT, heatThresholdC: 40, frostThresholdC: -5, frostSensitive: true },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    wateringInstruction: "Arrose quand la terre est sèche sur 5 cm, et vide la soucoupe : il craint bien plus l’humidité que la sécheresse.",
    extraTasks: [
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille l’olivier.", instruction: "Après les dernières gelées, taille légèrement pour aérer le centre et garder une jolie forme.", minutes: 10, months: [4, 5] }),
      customTask({ id: "shelter", type: "protection", title: "Aujourd’hui, prépare l’abri de l’olivier.", instruction: "Sous -5 °C plusieurs nuits, rentre-le dans une pièce lumineuse non chauffée, ou isole le pot et couvre-le d’un voile d’hivernage contre un mur.", minutes: 10, months: [11, 12, 1, 2] }),
    ],
    varieties: [
      { id: "arbequina", name: "Arbequina", note: "Petite olive catalane, port compact et olives dès les premières années : la plus conseillée en pot." },
      { id: "leccino", name: "Leccino", note: "Variété italienne assez rustique, qui donne mieux qu’une autre quand elle est seule." },
      { id: "aglandau", name: "Aglandau", note: "Variété provençale réputée rustique, olives d’automne." },
    ],
  }),
  plant({
    id: "columnar-apple", name: "Pommier colonnaire", label: "le pommier", gender: "m", emoji: "🍎", category: "fruit-tree",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 40,
    pitch: "Des pommes sur un tronc unique de 40 cm de large : un vrai verger dans un coin de balcon.",
    sowMonths: [], plantMonths: [3, 4, 10, 11], harvestMonths: [9, 10],
    harvestTip: "Soulève la pomme et tourne-la doucement : si elle se détache seule, elle est prête.",
    care: { ...REGULAR, wateringIntervalHours: 72, heatThresholdC: 32, frostThresholdC: -10, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10],
    extraTasks: [
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille le pommier.", instruction: "Taille peu : enlève le bois mort et les branches qui partent de travers, pour garder la colonne.", minutes: 10, months: [1, 2] }),
      customTask({ id: "summer-prune", type: "pruning", title: "Aujourd’hui, raccourcis les pousses du pommier.", instruction: "Raccourcis à 10 ou 15 cm les pousses de côté qui dépassent 20 cm.", minutes: 5, months: [6] }),
      customTask({ id: "thin-fruits", type: "pruning", title: "Aujourd’hui, éclaircis les pommes.", instruction: "Après la chute naturelle des petits fruits, garde une ou deux pommes par bouquet : elles grossiront mieux.", minutes: 5, months: [6, 7] }),
    ],
    varieties: [
      { id: "polka", name: "Ballerina Polka", note: "Pommes rouges et vertes en septembre-octobre, très productif et peu encombrant." },
      { id: "rondo", name: "Rondo", note: "Colonnaire compact à pommes rouges ; il lui faut un 2ᵉ pommier en fleur en même temps." },
      { id: "maypole", name: "Ballerina Maypole", note: "Pommier d’ornement colonnaire à fleurs rose vif : le bon voisin pour polliniser un autre colonnaire." },
    ],
  }),
  plant({
    id: "dwarf-peach", name: "Pêcher nain", label: "le pêcher", gender: "m", emoji: "🍑", category: "fruit-tree",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: true, goals: ["bees"], potLiters: 40,
    pitch: "Des fleurs roses en mars et des pêches juteuses en août, sur un arbre plus petit que toi.",
    sowMonths: [], plantMonths: [2, 3, 4, 10, 11], harvestMonths: [7, 8, 9],
    harvestTip: "Cueille la pêche quand elle cède un peu sous le doigt et se détache d’une légère torsion, sans tirer.",
    care: { ...REGULAR, wateringIntervalHours: 72, heatThresholdC: 35, frostThresholdC: -10, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9],
    wateringInstruction: "Arrose en profondeur quand la terre est sèche sur 3 cm, et vide la soucoupe : il craint l’excès d’eau.",
    extraTasks: [
      customTask({ id: "leaf-curl", type: "protection", title: "Aujourd’hui, protège le pêcher de la cloque.", instruction: "Pulvérise de la bouillie bordelaise (utilisable en agriculture biologique) à la chute des feuilles, puis avant que les bourgeons gonflent : seule la prévention marche.", minutes: 10, months: [11, 2] }),
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille le pêcher.", instruction: "Il donne sur les rameaux de l’an dernier : raccourcis les vieux rameaux pour en faire pousser des neufs.", minutes: 10, months: [2, 3] }),
      customTask({ id: "thin-fruits", type: "pruning", title: "Aujourd’hui, éclaircis les pêches.", instruction: "Garde une petite pêche tous les 15 cm de rameau et enlève les autres : elles seront plus grosses.", minutes: 5, months: [5, 6] }),
    ],
    varieties: [
      { id: "bonanza", name: "Bonanza", note: "Le pêcher nain classique, 1,50 m au plus, autofertile, pêches jaunes dès août." },
      { id: "crimson-bonfire", name: "Crimson Bonfire", note: "Feuillage pourpre décoratif, autofertile, pêches à chair jaune en août-septembre." },
      { id: "peach-me-red", name: "Peach Me Red", note: "Pensé pour le pot : sans taille, pêches de taille normale dès la 1ʳᵉ année, très rustique." },
    ],
  }),
  plant({
    id: "dwarf-cherry", name: "Cerisier nain", label: "le cerisier", gender: "m", emoji: "🍒", category: "fruit-tree",
    sunlight: ["sunny"], minSpace: "terrace", difficulty: "medium", perennial: true, melliferous: true, goals: ["bees"], potLiters: 70,
    pitch: "Des cerises cueillies sur ta terrasse, et un nuage de fleurs blanches au printemps.",
    sowMonths: [], plantMonths: [3, 4, 10, 11], harvestMonths: [6, 7],
    harvestTip: "Cueille les cerises bien colorées avec leur queue, par temps sec, et mange-les vite.",
    care: { ...REGULAR, wateringIntervalHours: 72, heatThresholdC: 32, frostThresholdC: -10, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    extraTasks: [
      customTask({ id: "net", type: "protection", title: "Aujourd’hui, pose un filet sur le cerisier.", instruction: "Quand les cerises commencent à rougir, couvre l’arbre d’un filet contre les oiseaux ; retire-le après la récolte.", minutes: 10, months: [5, 6] }),
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille le cerisier.", instruction: "Après la récolte, raccourcis un peu les pousses trop longues, sans grosse coupe ni taille d’hiver.", minutes: 10, months: [7, 8] }),
    ],
    varieties: [
      { id: "garden-bing", name: "Garden Bing", note: "Nain autofertile d’environ 1,50 m, grosses cerises rouge foncé en juin : fait pour un bac." },
      { id: "cherry-me", name: "Cherry Me", note: "Burlat nain autofertile, cerises précoces dès la mi-juin." },
      { id: "sylvia", name: "Sylvia", note: "Colonnaire autofertile, 50 cm de large seulement, cerises croquantes en juillet." },
    ],
  }),
  plant({
    id: "kumquat", name: "Kumquat", label: "le kumquat", gender: "m", emoji: "🍊", category: "fruit-tree",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: true, goals: [], potLiters: 40,
    pitch: "Un petit oranger couvert de fruits en plein hiver, qui se croquent avec la peau.",
    sowMonths: [], plantMonths: [4, 5, 6, 7, 8], harvestMonths: [11, 12, 1, 2, 3],
    harvestTip: "Cueille les kumquats bien orange avec un sécateur et croque-les entiers, peau comprise.",
    care: { ...REGULAR, wateringIntervalHours: 72, heatThresholdC: 35, frostThresholdC: -2, frostSensitive: true },
    wateringMonths: WHOLE_YEAR,
    wateringInstruction: "Arrose quand la terre est sèche sur 3 cm, puis vide la soucoupe ; l’hiver à l’abri, bien moins souvent.",
    extraTasks: [
      customTask({ id: "shelter", type: "protection", title: "Aujourd’hui, abrite le kumquat.", instruction: "Avant les nuits froides, rentre-le dans une pièce lumineuse et fraîche (5 à 12 °C), loin des radiateurs.", minutes: 10, months: [10, 11, 12, 1, 2, 3, 4] }),
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille le kumquat.", instruction: "Après la récolte, coupe le bois mort et les branches mal placées.", minutes: 5, months: [3, 4] }),
    ],
    varieties: [
      { id: "nagami", name: "Nagami", note: "Le plus vendu : petits fruits ovales acidulés, à croquer avec la peau." },
      { id: "marumi", name: "Marumi", note: "Fruits ronds plus doux, port compact, un peu plus résistant au froid que Nagami." },
      { id: "limequat", name: "Limequat", note: "Croisement de lime et de kumquat : petits fruits au goût de citron vert." },
    ],
  }),
  plant({
    id: "pomegranate", name: "Grenadier", label: "le grenadier", gender: "m", emoji: "🪴", category: "fruit-tree",
    sunlight: ["sunny"], minSpace: "terrace", difficulty: "medium", perennial: true, melliferous: true, goals: [], potLiters: 60,
    pitch: "Des fleurs rouge orangé tout l’été, puis des grenades si l’été est chaud.",
    sowMonths: [], plantMonths: [3, 4, 5, 10], harvestMonths: [9, 10, 11],
    harvestTip: "Cueille la grenade au sécateur quand elle sonne creux ou commence à se fendre, avant les gelées.",
    care: { ...DROUGHT, heatThresholdC: 40, frostThresholdC: -5, frostSensitive: true },
    wateringMonths: [4, 5, 6, 7, 8, 9],
    wateringInstruction: "Arrose quand la surface est sèche, environ deux fois par semaine l’été : il supporte un peu de sécheresse.",
    extraTasks: [
      customTask({ id: "shelter", type: "protection", title: "Aujourd’hui, abrite le grenadier.", instruction: "Avant les gelées, rentre-le au frais et au clair, hors gel (véranda, garage éclairé). Il perd ses feuilles : arrose très peu.", minutes: 10, months: [10, 11, 12, 1, 2, 3, 4] }),
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille le grenadier.", instruction: "En fin d’hiver, enlève le bois mort et éclaircis le centre, sans raccourcir les rameaux qui porteront les fruits.", minutes: 10, months: [2, 3] }),
    ],
    varieties: [
      { id: "provence", name: "Provence", note: "Le grenadier fruitier le plus planté en France, le plus rustique ; pousse lentement et tient des années en bac." },
      { id: "mollar-de-elche", name: "Mollar de Elche", note: "Grenades douces à pépins tendres, en octobre-novembre ; à abriter l’hiver." },
      { id: "nana", name: "Nana", note: "Grenadier nain d’un mètre à fleurs orange tout l’été ; ses petits fruits sont décoratifs." },
    ],
  }),

  // --- Catalogue balcon et terrasse, livraison 3 (23/10) : grimpantes ------------------------------------------
  plant({
    id: "star-jasmine", name: "Jasmin étoilé", label: "le jasmin", gender: "m", emoji: "🌼", category: "climber",
    sunlight: ["sunny", "partial"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 30, bloomOnly: true,
    pitch: "Des étoiles blanches au parfum puissant tout l’été, et des feuilles vertes même en hiver.",
    sowMonths: [], plantMonths: [3, 4, 5, 6], harvestMonths: [6, 7, 8],
    harvestTip: "Profite de son parfum le soir, quand il est le plus fort, et enlève les bouquets fanés.",
    care: { ...REGULAR, heatThresholdC: 35, frostThresholdC: -5, frostSensitive: true },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10],
    wateringInstruction: "L’été, arrose deux fois par semaine quand la terre est sèche sur 2 cm ; l’hiver, deux ou trois fois par mois suffisent.",
    extraTasks: [
      customTask({ id: "guide", type: "observation", title: "Aujourd’hui, guide le jasmin.", instruction: "Enroule les nouvelles tiges autour du treillage ou de la rambarde, et attache-les avec un lien souple.", minutes: 3, months: [4, 5, 6] }),
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille le jasmin.", instruction: "Après la floraison, raccourcis les tiges trop longues et enlève le bois sec.", minutes: 10, months: [9] }),
      customTask({ id: "shelter", type: "protection", title: "Aujourd’hui, prépare l’abri du jasmin.", instruction: "Avant les nuits sous -5 °C, paille le pied, entoure le pot d’un voile et colle-le contre un mur.", minutes: 10, months: [12, 1, 2] }),
    ],
    varieties: [
      { id: "jasminoides", name: "Trachelospermum jasminoides", note: "Le jasmin étoilé classique : fleurs blanches très parfumées, feuillage toujours vert." },
      { id: "winter-ruby", name: "Winter Ruby", note: "Feuillage qui rougit en hiver, annoncé plus résistant au froid que le classique." },
      { id: "asiaticum", name: "Trachelospermum asiaticum", note: "Fleurs crème à cœur jaune, plus compact et plus rustique." },
    ],
  }),
  plant({
    id: "clematis", name: "Clématite", label: "la clématite", gender: "f", emoji: "🌸", category: "climber",
    sunlight: ["sunny", "partial"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: true, goals: ["bees"], potLiters: 35, bloomOnly: true,
    pitch: "La reine des grimpantes : de grandes fleurs qui couvrent un treillage de mai à l’automne.",
    sowMonths: [], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [5, 6, 7, 8, 9],
    harvestTip: "Coupe les fleurs fanées : beaucoup de variétés refleurissent à la fin de l’été.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    wateringInstruction: "Le pied au frais, la tête au soleil : arrose dès que la terre sèche sur 2 cm, et vide la soucoupe.",
    extraTasks: [
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille la clématite.", instruction: "Si elle fleurit l’été, coupe toutes les tiges à 30 cm du sol ; si elle fleurit au printemps, enlève seulement le bois sec.", minutes: 10, months: [2, 3] }),
      customTask({ id: "guide", type: "observation", title: "Aujourd’hui, guide la clématite.", instruction: "Accroche les nouvelles tiges au treillage avec un lien souple : elles cassent facilement.", minutes: 3, months: [4, 5, 6] }),
    ],
    varieties: [
      { id: "boulevard", name: "Série Boulevard", note: "Clématites compactes d’un mètre et demi, créées pour le pot, fleurs de mai à septembre." },
      { id: "piilu", name: "Piilu", note: "Fleurs mauve rosé rayées, plante compacte qui fleurit deux fois." },
      { id: "rouge-cardinal", name: "Rouge Cardinal", note: "Grandes fleurs rouge velours en été ; taille facile, à 30 cm chaque fin d’hiver." },
    ],
  }),
  plant({
    id: "passionflower", name: "Passiflore", label: "la passiflore", gender: "f", emoji: "🌸", category: "climber",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 30, bloomOnly: true,
    pitch: "Des fleurs étonnantes, comme dessinées, qui se succèdent de juin aux gelées.",
    sowMonths: [], plantMonths: [3, 4, 5, 6], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Chaque fleur ne dure qu’un jour, mais d’autres suivent tout l’été ; ses fruits orange sont décoratifs.",
    care: { ...REGULAR, heatThresholdC: 35, frostThresholdC: -5, frostSensitive: true },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10],
    wateringInstruction: "Arrose quand la terre est sèche sur 2 cm ; à l’automne et l’hiver, beaucoup moins : elle craint l’humidité.",
    extraTasks: [
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille la passiflore.", instruction: "Raccourcis les tiges de l’an dernier et enlève le bois sec : elle fleurit sur les pousses de l’année.", minutes: 10, months: [3, 4] }),
      customTask({ id: "guide", type: "observation", title: "Aujourd’hui, guide la passiflore.", instruction: "Accroche les nouvelles tiges au treillage : ses vrilles s’agrippent ensuite toutes seules.", minutes: 3, months: [5, 6, 7] }),
    ],
    varieties: [
      { id: "caerulea", name: "Passiflora caerulea", note: "La passiflore bleue, la plus rustique : repart de la souche après un hiver froid." },
      { id: "constance-elliott", name: "Constance Elliott", note: "Fleurs blanches parfumées, aussi rustique que la bleue." },
      { id: "edulis", name: "Passiflora edulis", note: "Le fruit de la passion : frileuse, à rentrer l’hiver ; fruits seulement après un été très chaud." },
    ],
  }),
  plant({
    id: "grapevine", name: "Vigne en pot", label: "la vigne", gender: "f", emoji: "🍇", category: "climber",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: false, goals: [], potLiters: 35,
    pitch: "Une treille sur ta rambarde : de l’ombre l’été, et des grappes de raisin à la rentrée.",
    sowMonths: [], plantMonths: [3, 4, 10, 11], harvestMonths: [8, 9, 10],
    harvestTip: "Goûte un grain : quand il est souple et sucré, coupe la grappe entière au sécateur.",
    care: { ...REGULAR, wateringIntervalHours: 72, heatThresholdC: 38, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9],
    wateringInstruction: "Arrose en profondeur quand la terre est sèche sur 3 cm ; un peu moins quand les raisins changent de couleur.",
    extraTasks: [
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille la vigne.", instruction: "Hors gel, raccourcis chaque rameau de l’an dernier à 2 bourgeons : les grappes viennent sur les nouvelles pousses.", minutes: 10, months: [2, 3] }),
      customTask({ id: "thin-bunches", type: "pruning", title: "Aujourd’hui, éclaircis la vigne.", instruction: "Garde 2 ou 3 grappes par tige et coupe le bout des tiges 2 feuilles après la dernière grappe : les grains seront plus gros.", minutes: 10, months: [6, 7] }),
    ],
    varieties: [
      { id: "chasselas", name: "Chasselas doré", note: "Raisin blanc de table, l’un des plus faciles à réussir, même au nord." },
      { id: "centennial-seedless", name: "Centennial Seedless", note: "Grains blancs sans pépins, en août-septembre." },
      { id: "alvina", name: "Alvina", note: "Raisin noir tardif, en septembre-octobre." },
    ],
  }),
  plant({
    id: "honeysuckle", name: "Chèvrefeuille", label: "le chèvrefeuille", gender: "m", emoji: "🌼", category: "climber",
    sunlight: ["sunny", "partial"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 30, bloomOnly: true,
    pitch: "Un parfum de miel les soirs d’été, et des fleurs que papillons et abeilles adorent.",
    sowMonths: [], plantMonths: [3, 4, 5], harvestMonths: [6, 7, 8, 9],
    harvestTip: "Respire-le le soir, quand son parfum est le plus fort.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10],
    wateringInstruction: "Il aime une terre fraîche : arrose dès qu’elle sèche sur 2 cm, surtout les deux premières années.",
    extraTasks: [
      customTask({ id: "guide", type: "observation", title: "Aujourd’hui, guide le chèvrefeuille.", instruction: "Enroule les nouvelles tiges autour du treillage : il s’y tiendra tout seul.", minutes: 3, months: [4, 5, 6] }),
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille le chèvrefeuille.", instruction: "Après la floraison, raccourcis les tiges trop longues et enlève le bois mort.", minutes: 10, months: [10, 11] }),
    ],
    varieties: [
      { id: "halliana", name: "Halliana", note: "Fleurs blanches puis jaunes, très parfumées, feuillage presque toujours vert." },
      { id: "sinensis", name: "Sinensis", note: "Fleurs pourpres et blanches de juin à septembre, feuillage teinté de pourpre." },
      { id: "serotina", name: "Serotina", note: "Le chèvrefeuille des bois, rouge et crème, fleuri tout l’été." },
    ],
  }),
  plant({
    id: "morning-glory", name: "Ipomées", label: "les ipomées", gender: "f", plural: true, emoji: "🌺", category: "climber",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 15, bloomOnly: true,
    pitch: "Semées au printemps, elles couvrent un treillage de fleurs bleues ou pourpres jusqu’aux gelées.",
    sowMonths: [3, 4, 5], plantMonths: [5, 6], harvestMonths: [7, 8, 9, 10],
    harvestTip: "Chaque fleur s’ouvre le matin et fane le soir : d’autres suivent jusqu’aux gelées.",
    care: { ...REGULAR, heatThresholdC: 35, frostThresholdC: 5, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    extraTasks: [
      customTask({ id: "guide", type: "observation", title: "Aujourd’hui, guide les ipomées.", instruction: "Enroule les nouvelles tiges autour d’une ficelle ou du treillage, toujours dans le même sens.", minutes: 3, months: [6, 7, 8] }),
    ],
    varieties: [
      { id: "heavenly-blue", name: "Heavenly Blue", note: "Grandes fleurs bleu ciel, l’ipomée la plus spectaculaire." },
      { id: "purpurea", name: "Volubilis en mélange", note: "Fleurs pourpres, roses ou bleues, très faciles à semer." },
      { id: "carnevale", name: "Carnevale di Venezia", note: "Fleurs blanches striées de rose, de pourpre ou de bleu." },
    ],
  }),

  // --- Livraison 3 (23/10) : légumes ---------------------------------------------------------------------------
  plant({
    id: "fava-bean", name: "Fèves", label: "les fèves", gender: "f", plural: true, emoji: "🫘", category: "fruiting-vegetable",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 25,
    pitch: "Le premier légume de l’année : semées en fin d’hiver, elles se croquent crues dès le mois de mai.",
    sowMonths: [2, 3, 4], plantMonths: [], harvestMonths: [5, 6, 7],
    harvestTip: "Cueille les gousses bien vertes, quand les grains font la taille d’un ongle : plus gros, ils deviennent farineux.",
    care: { ...REGULAR, heatThresholdC: 28, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7],
    varieties: [
      { id: "aguadulce", name: "Aguadulce", note: "Très longues cosses, la fève la plus semée, récoltée en 12 à 14 semaines." },
      { id: "the-sutton", name: "The Sutton", note: "Fève naine de 40 cm, sans tuteur : faite pour le pot." },
      { id: "witkiem", name: "Witkiem", note: "Précoce et productive, gros grains tendres." },
    ],
  }),
  plant({
    id: "sweet-potato", name: "Patate douce", label: "la patate douce", gender: "f", emoji: "🍠", category: "root",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: false, melliferous: false, goals: [], potLiters: 40,
    pitch: "Un feuillage qui retombe joliment du pot tout l’été, et des tubercules sucrés à déterrer en automne.",
    sowMonths: [], plantMonths: [5, 6], harvestMonths: [9, 10],
    harvestTip: "Quand les feuilles jaunissent, avant le gel, vide le pot, puis laisse sécher les patates douces au soleil quelques heures.",
    care: { ...REGULAR, heatThresholdC: 38, frostThresholdC: 10, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    wateringInstruction: "Arrose quand la terre est sèche sur 2 cm, plus souvent par temps chaud ; moins en septembre, pour des tubercules qui se gardent.",
    varieties: [
      { id: "beauregard", name: "Beauregard", note: "Chair orange, la plus cultivée, assez précoce pour nos étés." },
      { id: "bonita", name: "Bonita", note: "Chair blanche, vendue en plant au printemps." },
      { id: "murasaki", name: "Murasaki", note: "Peau violette et chair blanche au goût de châtaigne." },
    ],
  }),
  plant({
    id: "kuri-squash", name: "Potimarron", label: "le potimarron", gender: "m", emoji: "🎃", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "terrace", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 60,
    pitch: "Palissé sur un treillage solide, il donne des courges au goût de châtaigne qui se gardent tout l’hiver.",
    sowMonths: [4, 5], plantMonths: [5, 6], harvestMonths: [9, 10],
    harvestTip: "Coupe-le avec 5 cm de queue quand elle sèche et se fendille, avant les gelées ; il se garde des mois au frais.",
    care: { ...THIRSTY, heatThresholdC: 32, frostThresholdC: 8, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9],
    wateringInstruction: "Arrose au pied, sans mouiller les feuilles, dès que la terre sèche sur 2 cm : un grand pot de courge boit beaucoup.",
    extraTasks: [
      customTask({ id: "guide", type: "observation", title: "Aujourd’hui, guide le potimarron.", instruction: "Attache les tiges au treillage, et soutiens chaque fruit avec un filet ou un vieux collant noué au support.", minutes: 5, months: [6, 7, 8] }),
    ],
    varieties: [
      { id: "uchiki-kuri", name: "Uchiki Kuri", note: "Le potimarron rouge orangé classique, chair douce au goût de châtaigne." },
      { id: "green-hokkaido", name: "Green Hokkaido", note: "Peau vert foncé, chair orange très sucrée, se garde longtemps." },
    ],
  }),
  plant({
    id: "artichoke", name: "Artichaut", label: "l’artichaut", gender: "m", emoji: "🌿", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "terrace", difficulty: "medium", perennial: true, melliferous: true, goals: ["bees"], potLiters: 60,
    pitch: "Une grande plante au feuillage argenté, des artichauts à cueillir l’été, et des fleurs bleues pour les abeilles.",
    sowMonths: [], plantMonths: [3, 4, 5], harvestMonths: [6, 7, 8, 9],
    harvestTip: "Coupe l’artichaut avec 10 cm de tige quand il est bien rond et encore serré, avant qu’il s’ouvre.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: -5, frostSensitive: true },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10],
    extraTasks: [
      customTask({ id: "shelter", type: "protection", title: "Aujourd’hui, prépare l’abri de l’artichaut.", instruction: "Coupe les grandes feuilles à 20 cm, paille bien le pied et entoure le pot d’un voile avant les nuits sous -5 °C.", minutes: 10, months: [11, 12, 1, 2] }),
    ],
    varieties: [
      { id: "vert-de-laon", name: "Gros vert de Laon", note: "Le plus résistant au froid, pour le nord et l’est." },
      { id: "camus", name: "Camus de Bretagne", note: "Gros artichaut rond, pour les régions aux hivers doux." },
      { id: "violet-de-provence", name: "Violet de Provence", note: "Petits artichauts violets à croquer crus ; plus frileux." },
    ],
  }),
  plant({
    id: "rhubarb", name: "Rhubarbe", label: "la rhubarbe", gender: "f", emoji: "🌿", category: "leafy-vegetable",
    sunlight: ["sunny", "partial"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: false, goals: [], potLiters: 40,
    pitch: "Une vivace increvable : des tiges acidulées pour les tartes et les compotes, chaque printemps.",
    sowMonths: [], plantMonths: [3, 4, 10, 11], harvestMonths: [4, 5, 6],
    harvestTip: "Tire chaque tige en la tournant à la base, jamais plus d’un tiers de la touffe ; coupe la feuille, toxique, et mets-la au compost.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -20, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9],
    wateringInstruction: "Elle aime une terre toujours fraîche : arrose dès que la terre sèche sur 2 cm, surtout l’été.",
    extraTasks: [
      customTask({ id: "flower-stalk", type: "pruning", title: "Aujourd’hui, coupe la tige à fleurs de la rhubarbe.", instruction: "Coupe à la base la grosse tige qui porte les fleurs : la plante garde sa force pour les tiges à manger.", minutes: 2, months: [5, 6, 7] }),
    ],
    varieties: [
      { id: "victoria", name: "Victoria", note: "La rhubarbe classique, vigoureuse, tiges vertes et rouges." },
      { id: "glaskins", name: "Glaskins Perpetual", note: "Moins acide, elle se récolte plus longtemps dans la saison." },
      { id: "frambozen-rood", name: "Frambozen Rood", note: "Tiges rouges et douces, au goût de framboise." },
    ],
  }),
  plant({
    id: "florence-fennel", name: "Fenouil", label: "le fenouil", gender: "m", emoji: "🌿", category: "leafy-vegetable",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "medium", perennial: false, melliferous: false, goals: [], potLiters: 15,
    pitch: "Des bulbes croquants au goût anisé, à semer en été pour une récolte à l’automne.",
    sowMonths: [5, 6, 7], plantMonths: [], harvestMonths: [8, 9, 10, 11],
    harvestTip: "Coupe le bulbe au ras de la terre quand il est gros comme une orange : laissé trop longtemps, il durcit.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -3, frostSensitive: false },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    wateringInstruction: "Garde la terre fraîche, sans excès : un fenouil qui a soif monte en graines au lieu de faire son bulbe.",
    extraTasks: [
      customTask({ id: "earth-up", type: "pruning", title: "Aujourd’hui, butte le fenouil.", instruction: "Ramène un peu de terreau autour du bulbe quand il grossit : il reste blanc et tendre.", minutes: 3, months: [8, 9] }),
    ],
    varieties: [
      { id: "zefa-fino", name: "Zefa Fino", note: "Résiste bien à la montée en graines, peut se semer plus tôt." },
      { id: "rondo", name: "Rondo", note: "Bulbe bien rond, précoce." },
      { id: "doux-de-florence", name: "Doux de Florence", note: "Le classique : à semer après le 20 juin, sinon il monte en graines." },
    ],
  }),

  // --- Catalogue balcon et terrasse, livraison 4 (24/10) : arbustes et graminées -------------------------------
  plant({
    id: "hydrangea", name: "Hortensia", label: "l’hortensia", gender: "m", emoji: "🌸", category: "shrub",
    sunlight: ["partial", "shade"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: false, goals: [], potLiters: 30, bloomOnly: true,
    pitch: "De grosses boules de fleurs bleues, roses ou blanches tout l’été, pour un balcon à mi-ombre.",
    sowMonths: [], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [6, 7, 8, 9],
    harvestTip: "Coupe quelques fleurs pour un bouquet, et laisse les fleurs sèches sur la plante jusqu’au printemps : elles protègent les bourgeons du froid.",
    care: { ...THIRSTY, heatThresholdC: 30, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10],
    wateringInstruction: "Il a très soif en pot : arrose dès que la terre sèche en surface, avec de l’eau de pluie si tu peux (le calcaire jaunit ses feuilles).",
    extraTasks: [
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille l’hortensia.", instruction: "Après les gelées, coupe les fleurs sèches juste au-dessus de la première paire de gros bourgeons, et les tiges mortes à la base.", minutes: 10, months: [3] }),
    ],
    varieties: [
      { id: "endless-summer", name: "Endless Summer", note: "Refleurit sur les pousses de l’année : des fleurs même après un hiver froid." },
      { id: "annabelle", name: "Annabelle", note: "Grosses boules blanches, très rustique, taille facile en fin d’hiver." },
      { id: "bobo", name: "Bobo", note: "Hortensia paniculé compact, fleurs blanches puis roses ; supporte plus de soleil." },
    ],
  }),
  plant({
    id: "rose-bush", name: "Rosier", label: "le rosier", gender: "m", emoji: "🌹", category: "shrub",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: true, goals: ["bees"], potLiters: 30, bloomOnly: true,
    pitch: "Des roses de mai aux gelées : choisis un rosier buisson ou paysager, fait pour le pot.",
    sowMonths: [], plantMonths: [2, 3, 4, 10, 11], harvestMonths: [5, 6, 7, 8, 9, 10],
    harvestTip: "Coupe des roses pour un bouquet le matin, quand le bouton commence à s’ouvrir.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10],
    wateringInstruction: "Arrose au pied, sans mouiller les feuilles, dès que la terre sèche sur 2 cm : en pot, elle ne doit jamais sécher tout à fait.",
    extraTasks: [
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille le rosier.", instruction: "Un jour sans gel, garde 3 à 5 belles tiges et raccourcis-les au-dessus d’un bourgeon tourné vers l’extérieur.", minutes: 10, months: [2, 3] }),
      customTask({ id: "deadhead", type: "pruning", title: "Aujourd’hui, coupe les roses fanées.", instruction: "Coupe chaque rose fanée au-dessus de la première grande feuille : il refleurit plus vite.", minutes: 5, months: [6, 7, 8, 9] }),
    ],
    varieties: [
      { id: "the-fairy", name: "The Fairy", note: "Rosier paysager couvert de petites roses roses jusqu’aux gelées, très résistant aux maladies." },
      { id: "bonica", name: "Bonica", note: "Buisson compact, roses rose tendre en bouquets, très florifère." },
      { id: "peace", name: "Madame A. Meilland (Peace)", note: "Grandes roses jaune pâle bordées de rose, le classique à bouquets." },
    ],
  }),
  plant({
    id: "oleander", name: "Laurier-rose", label: "le laurier-rose", gender: "m", emoji: "🌺", category: "shrub",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: false, goals: [], potLiters: 30, bloomOnly: true,
    pitch: "Un air de vacances du Midi : des fleurs tout l’été et des feuilles vertes toute l’année.",
    sowMonths: [], plantMonths: [4, 5, 6], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Avec des gants, coupe les bouquets de fleurs fanées : il en refait tout l’été.",
    care: { ...REGULAR, heatThresholdC: 40, frostThresholdC: -5, frostSensitive: true },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10],
    wateringInstruction: "En pot, l’été, arrose copieusement dès que la terre sèche en surface ; l’hiver, presque plus.",
    extraTasks: [
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille le laurier-rose.", instruction: "Après la floraison, avec des gants, rabats de moitié les tiges qui ont fleuri : il restera compact et fleurira plus.", minutes: 10, months: [9, 10] }),
      customTask({ id: "shelter", type: "protection", title: "Aujourd’hui, prépare l’abri du laurier-rose.", instruction: "Sous -5 °C, isole le pot et couvre-le d’un voile ; si le froid dure, rentre-le dans une pièce fraîche et lumineuse (5 à 15 °C).", minutes: 10, months: [11, 12, 1, 2] }),
    ],
    varieties: [
      { id: "soeur-agnes", name: "Sœur Agnès", note: "Fleurs blanches simples." },
      { id: "italia", name: "Italia", note: "Fleurs rouge vif tout l’été." },
      { id: "villa-romaine", name: "Villa Romaine", note: "Fleurs rose tendre en bouquets." },
    ],
  }),
  plant({
    id: "japanese-maple", name: "Érable du Japon", label: "l’érable", gender: "m", emoji: "🍁", category: "shrub",
    sunlight: ["partial", "shade"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: false, goals: [], potLiters: 30, bloomOnly: true, foliage: true,
    pitch: "Un petit arbre aux feuilles découpées, tendres au printemps et rouge feu à l’automne.",
    sowMonths: [], plantMonths: [3, 4, 10, 11], harvestMonths: [4, 5, 10, 11],
    harvestTip: "Profite de ses couleurs, et garde-le à l’abri du vent et du soleil de l’après-midi : ses feuilles grillent vite.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    wateringInstruction: "Garde la terre fraîche sans la détremper : arrose dès qu’elle sèche sur 2 cm, de préférence à l’eau de pluie.",
    extraTasks: [
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, nettoie l’érable.", instruction: "En hiver, enlève seulement le bois mort et les branches qui se croisent : il n’aime pas les grosses tailles.", minutes: 5, months: [12, 1, 2] }),
    ],
    varieties: [
      { id: "atropurpureum", name: "Atropurpureum", note: "Feuillage pourpre tout l’été, rouge vif à l’automne." },
      { id: "shaina", name: "Shaina", note: "Compact, idéal en pot : rouge au printemps, rouge vif à l’automne." },
      { id: "katsura", name: "Katsura", note: "Jeunes feuilles orange clair au printemps, petit et léger." },
    ],
  }),
  plant({
    id: "fargesia", name: "Bambou non traçant", label: "le bambou", gender: "m", emoji: "🎋", category: "shrub",
    sunlight: ["partial", "sunny", "shade"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: false, goals: [], potLiters: 40, bloomOnly: true, foliage: true,
    pitch: "Un brise-vue vert toute l’année qui bruisse au vent ; ce bambou ne court pas, il reste en touffe.",
    sowMonths: [], plantMonths: [3, 4, 9, 10, 11], harvestMonths: WHOLE_YEAR,
    harvestTip: "Si ses feuilles s’enroulent sur elles-mêmes, il a soif : arrose tout de suite, copieusement.",
    care: { ...THIRSTY, heatThresholdC: 32, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    wateringInstruction: "En pot, il boit beaucoup : arrose copieusement dès que la terre sèche en surface, et garde une soucoupe l’été.",
    extraTasks: [
      customTask({ id: "thin-canes", type: "pruning", title: "Aujourd’hui, éclaircis le bambou.", instruction: "Coupe à ras les vieilles cannes sèches ou abîmées : la touffe s’aère et se renouvelle.", minutes: 10, months: [3, 4] }),
    ],
    varieties: [
      { id: "asian-wonder", name: "Asian Wonder", note: "Cannes rougeâtres et feuillage fin, convient en pot." },
      { id: "angustissima", name: "Fargesia angustissima", note: "Feuillage très fin et léger, rustique jusque vers -15 °C, se plaît en pot." },
      { id: "pingwu", name: "Robusta Pingwu", note: "Port droit et dense, brise-vue efficace, très rustique." },
    ],
  }),
  plant({
    id: "stipa", name: "Stipa cheveux d’ange", label: "le stipa", gender: "m", emoji: "🌾", category: "shrub",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: false, goals: [], potLiters: 10, bloomOnly: true, foliage: true,
    pitch: "Une graminée aux feuilles fines comme des cheveux, qui ondule au moindre souffle et blondit l’été.",
    sowMonths: [], plantMonths: [3, 4, 5, 10, 11], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Laisse les épis sécher sur pied jusqu’à la fin de l’hiver : ils restent beaux et protègent le cœur de la touffe.",
    care: { ...DROUGHT, heatThresholdC: 36, frostThresholdC: -10, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9],
    wateringInstruction: "Elle aime les terres sèches : arrose seulement quand la terre est sèche sur 4 cm, et jamais d’eau dans la soucoupe.",
    extraTasks: [
      customTask({ id: "comb", type: "pruning", title: "Aujourd’hui, nettoie le stipa.", instruction: "Retire à la main les feuilles sèches ; si la touffe est toute brune, rabats-la à 10 cm du sol.", minutes: 5, months: [2, 3] }),
    ],
    varieties: [
      { id: "pony-tails", name: "Pony Tails", note: "Le stipa cheveux d’ange classique, 40 à 60 cm, épis blonds l’été." },
      { id: "gigantea", name: "Stipa gigantea", note: "L’avoine géante : grands épis dorés à 1,50 m, pour un grand bac." },
    ],
  }),

  // --- Catalogue balcon et terrasse, livraison 5 (24/10) : fruitiers et bananier du Japon ----------------------
  plant({
    id: "dwarf-apricot", name: "Abricotier nain", label: "l’abricotier", gender: "m", emoji: "🪴", category: "fruit-tree",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: true, goals: ["bees"], potLiters: 40,
    pitch: "Des abricots parfumés en juillet sur un arbre d’un mètre : il se suffit à lui-même pour donner des fruits.",
    sowMonths: [], plantMonths: [11, 12, 2, 3], harvestMonths: [7],
    harvestTip: "Cueille les abricots tachés de rouge et très parfumés : une fois cueillis, ils ne mûrissent plus.",
    care: { ...REGULAR, wateringIntervalHours: 72, heatThresholdC: 35, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9],
    extraTasks: [
      customTask({ id: "thin-fruits", type: "pruning", title: "Aujourd’hui, éclaircis les abricots.", instruction: "Garde un petit abricot tous les 10 cm de branche et enlève les autres : ils seront plus gros.", minutes: 5, months: [5, 6] }),
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille l’abricotier.", instruction: "Après la récolte, raccourcis les branches trop longues et enlève le bois mort, pour le garder petit.", minutes: 10, months: [8, 9] }),
    ],
    varieties: [
      { id: "petit-abri", name: "Petit Abri", note: "Abricotier nain d’environ 1 m sur 60 cm, conçu pour les petits espaces." },
      { id: "aurora", name: "Aurora", note: "Variété précoce vendue en pot, à garder petite par la taille." },
    ],
  }),
  plant({
    id: "dwarf-plum", name: "Prunier nain", label: "le prunier", gender: "m", emoji: "🪴", category: "fruit-tree",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 40,
    pitch: "Mirabelles ou reines-claudes sur ton balcon, de juillet à septembre selon la variété.",
    sowMonths: [], plantMonths: [10, 11, 12, 2, 3], harvestMonths: [7, 8, 9],
    harvestTip: "Cueille les prunes quand elles cèdent un peu sous le doigt et se détachent seules.",
    care: { ...REGULAR, wateringIntervalHours: 72, heatThresholdC: 35, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9],
    extraTasks: [
      customTask({ id: "thin-fruits", type: "pruning", title: "Aujourd’hui, éclaircis les prunes.", instruction: "Si les fruits sont serrés, garde-en un tous les 5 cm : les branches ne cassent pas et les prunes grossissent.", minutes: 5, months: [6] }),
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille le prunier.", instruction: "Après la récolte, raccourcis les pousses trop longues et enlève le bois mort ; jamais de grosse taille en hiver.", minutes: 10, months: [8, 9] }),
    ],
    varieties: [
      { id: "plum-me", name: "Plum Me", note: "Prunier nain pensé pour le pot." },
      { id: "miraclaude", name: "Miraclaude", note: "Croisement mirabelle × reine-claude, autofertile et très productif, fruits en juillet." },
      { id: "mirabelle-nancy", name: "Mirabelle de Nancy", note: "Autofertile, petites prunes dorées en août-septembre ; sur porte-greffe nanifiant pour le pot." },
    ],
  }),
  plant({
    id: "columnar-pear", name: "Poirier colonnaire", label: "le poirier", gender: "m", emoji: "🍐", category: "fruit-tree",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: true, goals: ["bees"], potLiters: 50,
    pitch: "Des poires d’automne sur une colonne étroite ; il lui faut presque toujours un 2ᵉ poirier en fleur à côté.",
    sowMonths: [], plantMonths: [11, 12, 2, 3], harvestMonths: [8, 9, 10],
    harvestTip: "Cueille les poires encore fermes, quand elles se détachent d’une légère torsion, et laisse-les mûrir quelques jours à la maison.",
    care: { ...REGULAR, wateringIntervalHours: 72, heatThresholdC: 32, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10],
    extraTasks: [
      customTask({ id: "thin-fruits", type: "pruning", title: "Aujourd’hui, éclaircis les poires.", instruction: "Garde une ou deux petites poires par bouquet : elles grossiront mieux.", minutes: 5, months: [6] }),
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille le poirier.", instruction: "Taille peu : raccourcis les pousses de côté qui dépassent et enlève le bois mort, pour garder la colonne.", minutes: 10, months: [1, 2] }),
    ],
    varieties: [
      { id: "conference", name: "Conférence", note: "Poires allongées d’automne ; se pollinise en partie seule, mais donne mieux avec un autre poirier." },
      { id: "comice", name: "Doyenné du Comice", note: "Poires fondantes d’octobre ; il lui faut un autre poirier en fleur en même temps." },
    ],
  }),
  plant({
    id: "calamondin", name: "Calamondin", label: "le calamondin", gender: "m", emoji: "🍊", category: "fruit-tree",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "medium", perennial: true, melliferous: true, goals: [], potLiters: 20,
    pitch: "Le petit oranger « cocktail » : des fruits acidulés en plein hiver, pour la confiture ou un verre d’eau.",
    sowMonths: [], plantMonths: [4, 5, 6], harvestMonths: [11, 12, 1, 2],
    harvestTip: "Cueille les fruits bien orange au sécateur : très acides, ils parfument confitures et boissons.",
    care: { ...REGULAR, wateringIntervalHours: 72, heatThresholdC: 35, frostThresholdC: 3, frostSensitive: true },
    wateringMonths: WHOLE_YEAR,
    wateringInstruction: "Arrose quand la terre est sèche sur 2 cm ; l’hiver à l’abri, deux fois par mois environ.",
    extraTasks: [
      customTask({ id: "shelter", type: "protection", title: "Aujourd’hui, abrite le calamondin.", instruction: "Avant les nuits froides, rentre-le dans une pièce lumineuse vers 10 °C, loin des radiateurs.", minutes: 10, months: [10, 11, 12, 1, 2, 3, 4] }),
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, taille le calamondin.", instruction: "En fin d’hiver, après la récolte, raccourcis légèrement les branches pour le garder compact.", minutes: 5, months: [3] }),
    ],
    varieties: [
      { id: "calamondin", name: "Calamondin commun", note: "Le plus vendu, très décoratif avec ses petits fruits." },
      { id: "variegata", name: "Calamondin panaché", note: "Feuilles bordées de crème et fruits striés." },
    ],
  }),
  plant({
    id: "mandarin", name: "Mandarinier", label: "le mandarinier", gender: "m", emoji: "🍊", category: "fruit-tree",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: true, goals: [], potLiters: 40,
    pitch: "Des mandarines à l’automne : le Satsuma est l’agrume le plus résistant au froid, mais il passe l’hiver à l’abri en pot.",
    sowMonths: [], plantMonths: [4, 5, 6], harvestMonths: [10, 11, 12],
    harvestTip: "Cueille les mandarines quand elles sont bien colorées et se détachent facilement ; elles tiennent un moment sur l’arbre.",
    care: { ...REGULAR, wateringIntervalHours: 72, heatThresholdC: 35, frostThresholdC: -2, frostSensitive: true },
    wateringMonths: WHOLE_YEAR,
    wateringInstruction: "Arrose quand la terre est sèche sur 3 cm, puis vide la soucoupe ; l’hiver à l’abri, bien moins souvent.",
    extraTasks: [
      customTask({ id: "shelter", type: "protection", title: "Aujourd’hui, abrite le mandarinier.", instruction: "Avant les gelées, rentre-le dans une pièce lumineuse et fraîche, hors gel (5 à 12 °C).", minutes: 10, months: [11, 12, 1, 2, 3] }),
    ],
    varieties: [
      { id: "satsuma", name: "Satsuma", note: "Le mandarinier le plus résistant au froid, fruits sans pépins de septembre à novembre." },
      { id: "okitsu", name: "Satsuma Okitsu", note: "Mûrit de mi-septembre à novembre selon le climat." },
    ],
  }),
  plant({
    id: "lime", name: "Citron vert", label: "le citronnier vert", gender: "m", emoji: "🍋", category: "fruit-tree",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: true, goals: [], potLiters: 30,
    pitch: "Des citrons verts pour les cocktails et les plats d’été ; plus frileux que le citronnier, il passe l’hiver à l’abri.",
    sowMonths: [], plantMonths: [4, 5, 6], harvestMonths: [8, 9, 10, 11],
    harvestTip: "Cueille les citrons verts quand ils sont brillants et cèdent un peu sous le doigt.",
    care: { ...REGULAR, wateringIntervalHours: 72, heatThresholdC: 35, frostThresholdC: 3, frostSensitive: true },
    wateringMonths: WHOLE_YEAR,
    wateringInstruction: "Arrose quand la terre est sèche sur 3 cm, puis vide la soucoupe ; l’hiver à l’abri, bien moins souvent.",
    extraTasks: [
      customTask({ id: "shelter", type: "protection", title: "Aujourd’hui, abrite le citron vert.", instruction: "Dès que les nuits approchent 5 °C, rentre-le dans une pièce lumineuse, hors gel, loin des radiateurs.", minutes: 10, months: [10, 11, 12, 1, 2, 3, 4] }),
    ],
    varieties: [
      { id: "tahiti", name: "Lime de Tahiti", note: "Le citron vert du commerce, sans pépins, un peu moins frileux." },
      { id: "mexicain", name: "Citron vert mexicain", note: "Petits fruits très parfumés, encore plus frileux." },
    ],
  }),
  plant({
    id: "feijoa", name: "Feijoa", label: "le feijoa", gender: "m", emoji: "🪴", category: "fruit-tree",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: true, goals: ["bees"], potLiters: 40,
    pitch: "La « goyave ananas » : un arbuste persistant aux fleurs rouges, et des fruits parfumés à l’automne si l’été est chaud.",
    sowMonths: [], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [10, 11],
    harvestTip: "Ramasse les feijoas quand ils tombent tout seuls : c’est qu’ils sont mûrs. Ses pétales se mangent aussi.",
    care: { ...REGULAR, wateringIntervalHours: 72, heatThresholdC: 35, frostThresholdC: -8, frostSensitive: true },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10],
    extraTasks: [
      customTask({ id: "shelter", type: "protection", title: "Aujourd’hui, prépare l’abri du feijoa.", instruction: "Si le froid passe sous -8 °C, isole le pot, paille le pied et couvre-le d’un voile d’hivernage.", minutes: 10, months: [12, 1, 2] }),
    ],
    varieties: [
      { id: "coolidge", name: "Coolidge", note: "Autofertile ; un 2ᵉ pied d’une autre variété donne quand même plus de fruits." },
      { id: "andre", name: "André", note: "Autofertile, gros fruits parfumés." },
    ],
  }),
  plant({
    id: "loquat", name: "Néflier du Japon", label: "le néflier", gender: "m", emoji: "🪴", category: "fruit-tree",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: true, goals: ["bees"], potLiters: 40,
    pitch: "Un feuillage tropical toute l’année, des fleurs parfumées l’hiver et des nèfles au printemps… si l’hiver est doux.",
    sowMonths: [], plantMonths: [4, 5, 9, 10], harvestMonths: [5, 6],
    harvestTip: "Cueille les nèfles bien orange et un peu souples ; elles se mangent fraîches, sans attendre.",
    care: { ...REGULAR, wateringIntervalHours: 72, heatThresholdC: 35, frostThresholdC: -5, frostSensitive: true },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    extraTasks: [
      customTask({ id: "shelter", type: "protection", title: "Aujourd’hui, prépare l’abri du néflier.", instruction: "Ses fleurs d’hiver gèlent vers -5 °C : par grand froid, voile sur la plante et pot isolé, ou rentre-le au frais et au clair.", minutes: 10, months: [11, 12, 1, 2, 3] }),
    ],
    varieties: [
      { id: "tanaka", name: "Tanaka", note: "Gros fruits orangés, l’une des variétés les plus cultivées." },
      { id: "golden-nugget", name: "Golden Nugget", note: "Fruits dorés, port assez compact." },
    ],
  }),
  plant({
    id: "dwarf-mulberry", name: "Mûrier nain", label: "le mûrier", gender: "m", emoji: "🪴", category: "fruit-tree",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: false, goals: [], potLiters: 25,
    pitch: "Un mûrier qui reste petit en pot et se couvre de mûres noires tout l’été, dès la première année.",
    sowMonths: [], plantMonths: [3, 4, 10, 11], harvestMonths: [6, 7, 8, 9],
    harvestTip: "Cueille les mûres quand elles sont bien noires et se détachent toutes seules ; elles tachent les doigts !",
    care: { ...REGULAR, wateringIntervalHours: 72, heatThresholdC: 35, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9],
    extraTasks: [
      customTask({ id: "prune", type: "pruning", title: "Aujourd’hui, nettoie le mûrier.", instruction: "Après la chute des feuilles, enlève seulement le bois mort ou abîmé.", minutes: 5, months: [11, 12] }),
    ],
    varieties: [
      { id: "mojo-berry", name: "Mojo Berry", note: "Mûrier nain autofertile, 1,20 à 1,50 m en pot, fruits dès la première année." },
    ],
  }),
  plant({
    id: "musa-basjoo", name: "Bananier du Japon", label: "le bananier", gender: "m", emoji: "🍌", category: "shrub",
    sunlight: ["sunny", "partial"], minSpace: "terrace", difficulty: "medium", perennial: true, melliferous: false, goals: [], potLiters: 50, bloomOnly: true, foliage: true,
    pitch: "Des feuilles géantes et un air de jungle sur la terrasse. Ses petites bananes, elles, ne sont pas bonnes à manger.",
    sowMonths: [], plantMonths: [4, 5, 6], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Coupe les feuilles abîmées par le vent à leur base ; abrite-le du vent, qui déchire ses grandes feuilles.",
    care: { ...THIRSTY, heatThresholdC: 35, frostThresholdC: -5, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    wateringInstruction: "L’été, il a très soif : arrose copieusement dès que la terre sèche en surface. L’hiver, presque plus.",
    extraTasks: [
      customTask({ id: "shelter", type: "protection", title: "Aujourd’hui, prépare l’abri du bananier.", instruction: "Le feuillage gèle vers -2 °C, la souche tient bien plus bas : paille épaisse au pied et pot isolé, ou pot rentré au frais l’hiver.", minutes: 15, months: [11, 12, 1, 2] }),
    ],
    varieties: [
      { id: "basjoo", name: "Musa basjoo", note: "Le bananier le plus résistant au froid : il repart de la souche au printemps." },
    ],
  }),
];

const BY_ID = new Map(PLANT_CATALOG.map((entry) => [entry.id, entry]));

export function getCatalogPlant(id: string): CatalogPlant | undefined {
  return BY_ID.get(id);
}

/** Tâches pertinentes pour un mois donné (1-12). */
/** Profondeur à laquelle tâter la terre avant d'arroser : 2 cm, plus pour les plantes qui craignent l'eau. */
export function soilCheckDepthCm(entry: CatalogPlant) {
  const instruction = entry.tasks.find((task) => task.type === "watering")?.instruction ?? "";
  const depth = Number(/sèche sur (\d+) cm/u.exec(instruction)?.[1]);
  return Number.isFinite(depth) && depth > 0 ? depth : 2;
}

/** La vérification avant d'arroser, en une phrase : « Enfonce ton doigt : sèche sur 2 cm ? Arrose. » */
export function soilCheckText(depthCm = 2) {
  return `Enfonce ton doigt : sèche sur ${depthCm} cm ? Arrose.`;
}

export function tasksForMonth(entry: CatalogPlant, month: number): CareTask[] {
  return entry.tasks.filter((task) => !task.months || task.months.includes(month as Month));
}

export function fitsSpace(entry: CatalogPlant, space: SpaceSize | undefined) {
  if (!space) return true;
  return SPACE_ORDER.indexOf(entry.minSpace) <= SPACE_ORDER.indexOf(space);
}

export function fitsSunlight(entry: CatalogPlant, sunlight: Sunlight | undefined) {
  return !sunlight || entry.sunlight.includes(sunlight);
}

export function effortLabel(entry: CatalogPlant) {
  const light = entry.sunlight.map((value) => SUNLIGHT_LABELS[value]).join(" / ");
  return `${light} · ${entry.difficulty === "easy" ? "facile" : "demande un peu d’attention"}`;
}

export type OnboardingAnswers = {
  /** « Tu as déjà des plantes sur ton balcon ? » (accueil). */
  hasPlants?: boolean;
  experience?: string;
  sunlight?: string;
  /** « Je ne sais pas » (accueil, Réglages) : `sunlight` vaut alors « partial », le choix le plus prudent. */
  sunlightUnknown?: boolean;
  /** Simulateur de soleil (« Pots et balcon », étape 3) : orientation, balcon couvert, vis-à-vis. `sunlight` en découle. */
  orientation?: "S" | "E" | "W" | "N";
  covered?: boolean;
  facing?: boolean;
  space?: string;
  goals?: string[];
  skipped?: boolean;
  /** L'hiver, dans l'accueil : les plantes à semer ou planter au printemps (rappel en mars). */
  springWishes?: string[];
  /** Fin de l'accueil (ou « Passer ») : la carte « Bienvenue » d'Aujourd'hui en dépend. */
  completedAt?: string;
};

/** La plante que l'utilisateur a en tête quand il coche un objectif. */
export const GOAL_FLAGSHIPS: Record<GoalTag, string[]> = {
  tomatoes: ["cherry-tomato"],
  aromatics: ["basil", "mint"],
  bees: ["lavender"],
  salads: ["cut-lettuce"],
};

export const DEFAULT_PICKS = ["basil", "mint", "radish", "nasturtium", "cut-lettuce", "chives"];

/**
 * Classe le catalogue selon les réponses d'onboarding : l'exposition et l'espace
 * éliminent ce qui ne poussera pas, les objectifs et la facilité départagent.
 */
export function recommendPlants(answers: OnboardingAnswers | null, options: { exclude?: string[]; month?: number } = {}): CatalogPlant[] {
  const exclude = new Set(options.exclude ?? []);
  if (!answers || answers.skipped) {
    return DEFAULT_PICKS.map((id) => BY_ID.get(id)!).filter((entry) => !exclude.has(entry.id));
  }
  const sunlight = answers.sunlight as Sunlight | undefined;
  const space = answers.space as SpaceSize | undefined;
  const goals = new Set(answers.goals ?? []);
  const month = options.month;

  return PLANT_CATALOG
    .filter((entry) => !exclude.has(entry.id) && fitsSunlight(entry, sunlight) && fitsSpace(entry, space))
    .map((entry) => {
      // Une plante qui coche plusieurs objectifs ne doit pas passer devant celle que l'utilisateur a demandée.
      const matches = entry.goals.filter((goal) => goals.has(goal)).length;
      let score = matches > 0 ? 10 + (matches - 1) * 3 : 0;
      if ([...goals].some((goal) => GOAL_FLAGSHIPS[goal as GoalTag]?.includes(entry.id))) score += 8;
      // Un léger avantage aux plantes faciles, pour tout le monde (l'accueil ne demande plus l'expérience).
      if (entry.difficulty === "easy") score += 3;
      if (month && (entry.sowMonths.includes(month as Month) || entry.plantMonths.includes(month as Month))) score += 4;
      if (DEFAULT_PICKS.includes(entry.id)) score += 1;
      return { entry, score };
    })
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name, "fr"))
    .map(({ entry }) => entry);
}

/** Ce que les gens tapent réellement : le fruit plutôt que la plante, le nom botanique, le singulier… */
const SEARCH_ALIASES: Record<string, string[]> = {
  strawberry: ["fraise"],
  "cherry-tomato": ["tomate"],
  chili: ["piment", "poivron"],
  "dwarf-bean": ["haricot"],
  pea: ["pois"],
  "mini-cucumber": ["concombre", "cornichon"],
  "cut-lettuce": ["laitue", "salade"],
  "head-lettuce": ["laitue", "salade", "batavia", "sucrine"],
  chard: ["bette", "blette"],
  kale: ["chou", "kale"],
  "spring-onion": ["oignon", "cebette", "ciboule"],
  "round-carrot": ["carotte"],
  calendula: ["calendula", "souci"],
  marigold: ["oeillet", "tagete"],
  nasturtium: ["capucine"],
  "dwarf-sunflower": ["tournesol"],
  "lemon-verbena": ["verveine", "citronnelle"],
  "lemon-balm": ["melisse", "citronnelle"],
  agastache: ["anis", "hysope anisee", "menthe coreenne"],
  lovage: ["celeri perpetuel", "ache"],
  "oyster-plant": ["huitre", "mertensia"],
  "pineapple-sage": ["sauge"],
  tomatillo: ["tomate verte", "salsa", "physalis"],
  okra: ["okra", "bamia"],
  "yardlong-bean": ["haricot", "dolique"],
  "west-indian-gherkin": ["concombre", "cornichon", "maxixe"],
  "strawberry-spinach": ["epinard", "blette fraise"],
  orach: ["epinard"],
  "nz-spinach": ["epinard", "tetragone cornue"],
  "malabar-spinach": ["epinard", "basella"],
  "winter-purslane": ["pourpier", "salade d hiver"],
  "ice-plant": ["glaciale", "ficoide"],
  "mustard-greens": ["moutarde", "chou chinois"],
  kohlrabi: ["chou", "chou rave"],
  "perpetual-leek": ["poireau"],
  oca: ["oxalis", "tubercule"],
  crosne: ["crosne", "stachys"],
  pinks: ["oeillet", "dianthus"],
  dahlia: ["dahlia"],
  snapdragon: ["gueule de loup", "antirrhinum"],
  fuchsia: ["fuchsia"],
  "woodland-strawberry": ["fraise", "fraise des bois"],
  kiwiberry: ["kiwi", "actinidia"],
  blackcurrant: ["cassis"],
  "thornless-blackberry": ["mure", "ronce"],
  "dwarf-tomato": ["tomate"],
  "sweet-pepper": ["poivron"],
  physalis: ["coqueret", "amour en cage"],
  "pole-bean": ["haricot"],
  cucamelon: ["concombre", "melothria"],
  "mini-melon": ["melon"],
  "garden-cress": ["cresson"],
  microgreens: ["germes", "pousses", "micro pousses"],
  "pak-choi": ["pak choi", "bok choy", "chou chinois"],
  beetroot: ["betterave"],
  turnip: ["navet"],
  potato: ["pomme de terre", "patate"],
  viola: ["pensee", "violette"],
  "sweet-alyssum": ["alysse", "lobularia"],
  "hardy-geranium": ["geranium"],
  "tall-verbena": ["verveine", "verbena"],
  "dwarf-raspberry": ["framboise"],
  blueberry: ["myrtille"],
  redcurrant: ["groseille"],
  "lemon-tree": ["citron", "agrume"],
  "dwarf-fig": ["figue", "figuier"],
  "wild-garlic": ["ail"],
  lemongrass: ["citronnelle"],
  tulip: ["bulbe"],
  daffodil: ["jonquille", "bulbe"],
  muscari: ["bulbe"],
  crocus: ["bulbe"],
  "winter-heath": ["erica"],
  hellebore: ["rose de noël"],
  houseleek: ["sempervivum", "plante grasse", "succulente"],
  sedum: ["orpin", "plante grasse", "succulente"],
  "olive-tree": ["olive", "arbre"],
  "columnar-apple": ["pomme", "colonnaire", "arbre"],
  "dwarf-peach": ["pêche", "arbre"],
  "dwarf-cherry": ["cerise", "arbre"],
  kumquat: ["agrume", "orange"],
  pomegranate: ["grenade", "arbre"],
  "star-jasmine": ["trachelospermum", "grimpante", "parfum"],
  clematis: ["grimpante"],
  passionflower: ["passiflora", "fruit de la passion", "grimpante"],
  grapevine: ["raisin", "treille", "grimpante"],
  honeysuckle: ["lonicera", "grimpante", "parfum"],
  "morning-glory": ["volubilis", "grimpante"],
  "sweet-potato": ["patate"],
  "kuri-squash": ["courge", "potiron", "citrouille"],
  rhubarb: ["tarte"],
  "florence-fennel": ["bulbe", "anis"],
  hydrangea: ["hydrangea", "arbuste"],
  "rose-bush": ["rose", "arbuste"],
  oleander: ["nerium", "arbuste"],
  "japanese-maple": ["acer", "arbre", "feuillage"],
  fargesia: ["brise-vue", "feuillage"],
  stipa: ["graminée", "herbe", "feuillage"],
  "dwarf-apricot": ["abricot", "arbre"],
  "dwarf-plum": ["prune", "mirabelle", "reine-claude", "arbre"],
  "columnar-pear": ["poire", "colonnaire", "arbre"],
  calamondin: ["agrume", "orange"],
  mandarin: ["mandarine", "clémentine", "agrume"],
  lime: ["citron", "lime", "agrume"],
  feijoa: ["goyave", "goyavier", "arbre"],
  loquat: ["nèfle", "bibacier", "arbre"],
  "dwarf-mulberry": ["mûre", "arbre"],
  "musa-basjoo": ["banane", "banana", "palmier", "exotique"],
};

export function searchCatalog(query: string, category?: PlantCategory): CatalogPlant[] {
  const normalized = normalize(query);
  return PLANT_CATALOG.filter((entry) => {
    if (category && entry.category !== category) return false;
    if (!normalized) return true;
    return [entry.name, entry.label, ...(SEARCH_ALIASES[entry.id] ?? []), ...entry.varieties.map((variety) => variety.name)].some((term) => normalize(term).includes(normalized));
  });
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** Le semis de ce mois se fait-il seulement au chaud, à l'intérieur ? */
export function sowsIndoors(entry: CatalogPlant, month: number) {
  return entry.indoorSowMonths.includes(month as Month);
}

/** « mars–mai (au chaud en mars–avril) », « avril–juin », pour les fiches. */
export function describeSowing(entry: CatalogPlant) {
  const all = formatMonthRange(entry.sowMonths);
  if (entry.indoorSowMonths.length === 0) return all;
  if (entry.indoorSowMonths.length === entry.sowMonths.length) return `${all}, au chaud à l’intérieur`;
  return `${all} (au chaud à l’intérieur en ${formatMonthRange(entry.indoorSowMonths)})`;
}

/** « mars–mai », « oct.–mars », « avr.–juin, sept. » : regroupe les mois consécutifs, y compris à cheval sur l'année. */
export function formatMonthRange(months: number[]): string {
  const sorted = Array.from(new Set(months)).filter((month) => month >= 1 && month <= 12).sort((a, b) => a - b);
  if (sorted.length === 0) return "";
  if (sorted.length === 12) return "toute l’année";
  const runs: number[][] = [];
  for (const month of sorted) {
    const last = runs[runs.length - 1];
    if (last && month === last[last.length - 1] + 1) last.push(month);
    else runs.push([month]);
  }
  // Fusionne décembre → janvier.
  if (runs.length > 1 && runs[0][0] === 1 && runs[runs.length - 1].at(-1) === 12) {
    const tail = runs.pop()!;
    runs[0] = [...tail, ...runs[0]];
  }
  return runs
    .map((run) => (run.length === 1 ? MONTH_LONG[run[0] - 1] : `${MONTH_LONG[run[0] - 1]}–${MONTH_LONG[run[run.length - 1] - 1]}`))
    .join(", ");
}
