import type { MaintenanceTaskType } from "../reminders/reminder-engine";
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
export type GoalTag = "tomatoes" | "aromatics" | "bees" | "zero-waste";
export type PlantCategory = "aromatic" | "fruiting-vegetable" | "leafy-vegetable" | "root" | "flower" | "small-fruit";
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type CareTask = {
  id: string;
  type: MaintenanceTaskType;
  title: string;
  instruction: string;
  minutes: number;
  /** Mois où le geste a du sens. Absent = toute la saison de culture. */
  months?: Month[];
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
  plantMonths: Month[];
  harvestMonths: Month[];
  harvestTip: string;
  care: CareThresholds;
  tasks: CareTask[];
  /** Variétés conseillées en pot, de la plus facile à la plus originale. */
  varieties: PlantVariety[];
};

export const CATEGORY_LABELS: Record<PlantCategory, string> = {
  aromatic: "Aromatiques",
  "fruiting-vegetable": "Légumes-fruits",
  "leafy-vegetable": "Légumes-feuilles",
  root: "Racines",
  flower: "Fleurs",
  "small-fruit": "Petits fruits",
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
    title: `Aujourd’hui, arrose ${label} si besoin.`,
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

type PlantInput = Omit<CatalogPlant, "tasks" | "varieties"> & { varieties?: PlantVariety[]; extraTasks?: CareTask[]; wateringMonths?: Month[]; wateringInstruction?: string };

function plant({ extraTasks = [], wateringMonths, wateringInstruction, varieties, ...data }: PlantInput): CatalogPlant {
  const activeMonths = wateringMonths ?? GROWING_SEASON;
  return {
    ...data,
    varieties: varieties ?? PLANT_VARIETIES[data.id] ?? [],
    tasks: [
      wateringTask(data.label, activeMonths, wateringInstruction),
      observeTask(data.label, activeMonths),
      harvestTask(data.label, data.harvestMonths, data.harvestTip),
      ...extraTasks,
    ],
  };
}

// Profils de soin types
const THIRSTY: Pick<CareThresholds, "wateringIntervalHours" | "rainSkipMm" | "windThresholdKmh"> = { wateringIntervalHours: 36, rainSkipMm: 3, windThresholdKmh: 40 };
const REGULAR: Pick<CareThresholds, "wateringIntervalHours" | "rainSkipMm" | "windThresholdKmh"> = { wateringIntervalHours: 48, rainSkipMm: 2, windThresholdKmh: 40 };
const DROUGHT: Pick<CareThresholds, "wateringIntervalHours" | "rainSkipMm" | "windThresholdKmh"> = { wateringIntervalHours: 96, rainSkipMm: 2, windThresholdKmh: 50 };

export const PLANT_CATALOG: CatalogPlant[] = [
  // --- Aromatiques ----------------------------------------------------------
  plant({
    id: "basil", name: "Basilic", label: "le basilic", emoji: "🌿", category: "aromatic",
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: true, goals: ["aromatics"], potLiters: 3,
    pitch: "L’aromatique de l’été : quelques feuilles fraîches suffisent à transformer une salade de tomates.",
    sowMonths: [3, 4, 5], plantMonths: [5, 6], harvestMonths: [6, 7, 8, 9],
    harvestTip: "Coupe les têtes au-dessus d’une paire de feuilles plutôt que d’arracher des feuilles isolées.",
    care: { ...THIRSTY, heatThresholdC: 32, frostThresholdC: 8, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9],
    extraTasks: [customTask({ id: "pinch-flowers", type: "pruning", title: "Aujourd’hui, pince les fleurs du basilic.", instruction: "Coupe les boutons floraux dès qu’ils apparaissent : l’énergie reste dans les feuilles parfumées.", minutes: 2, months: [7, 8, 9] })],
  }),
  plant({
    id: "mint", name: "Menthe", label: "la menthe", emoji: "🍃", category: "aromatic",
    sunlight: ["shade", "partial", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics"], potLiters: 5,
    pitch: "Robuste et parfumée, elle démarre très bien dans un petit contenant, même à l’ombre.",
    sowMonths: [], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [4, 5, 6, 7, 8, 9, 10],
    harvestTip: "Coupe les tiges au-dessus d’une paire de feuilles : elle repartira de plus belle.",
    care: { ...THIRSTY, heatThresholdC: 30, frostThresholdC: -10, frostSensitive: false },
    extraTasks: [customTask({ id: "pinch", type: "pruning", title: "Aujourd’hui, pince la menthe.", instruction: "Coupe les extrémités juste au-dessus d’une paire de feuilles pour la faire ramifier.", minutes: 2, months: [5, 6, 7, 8] })],
  }),
  plant({
    id: "parsley", name: "Persil", label: "le persil", emoji: "☘️", category: "aromatic",
    sunlight: ["partial", "shade", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["aromatics", "zero-waste"], potLiters: 3,
    pitch: "Il se récolte presque toute l’année et repousse après chaque coupe.",
    sowMonths: [3, 4, 5, 6, 7, 8], plantMonths: [4, 5, 9], harvestMonths: [5, 6, 7, 8, 9, 10, 11],
    harvestTip: "Coupe les tiges extérieures à la base, le cœur continuera à produire.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10, 11],
  }),
  plant({
    id: "chives", name: "Ciboulette", label: "la ciboulette", emoji: "🌾", category: "aromatic",
    sunlight: ["sunny", "partial", "shade"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 2,
    pitch: "Increvable, elle revient chaque printemps et ses fleurs mauves attirent les abeilles.",
    sowMonths: [3, 4, 5], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    harvestTip: "Coupe les brins à 3 cm du sol, ils repoussent en quelques jours.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  }),
  plant({
    id: "thyme", name: "Thym", label: "le thym", emoji: "🍖", category: "aromatic",
    sunlight: ["sunny"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 3,
    pitch: "Il adore le soleil et oublie volontiers tes arrosages : parfait pour les balcons brûlants.",
    sowMonths: [4, 5], plantMonths: [3, 4, 5, 9, 10], harvestMonths: WHOLE_YEAR,
    harvestTip: "Coupe quelques rameaux, sans jamais tailler dans le bois dénudé.",
    care: { ...DROUGHT, heatThresholdC: 36, frostThresholdC: -12, frostSensitive: false },
    wateringInstruction: "Le thym craint l’excès d’eau : arrose seulement si la terre est sèche sur 4 cm.",
    extraTasks: [customTask({ id: "trim", type: "pruning", title: "Aujourd’hui, taille légèrement le thym.", instruction: "Après la floraison, rabats les tiges d’un tiers pour garder une touffe compacte.", minutes: 5, months: [7, 8] })],
  }),
  plant({
    id: "rosemary", name: "Romarin", label: "le romarin", emoji: "🌲", category: "aromatic",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 10,
    pitch: "Un arbuste méditerranéen qui fleurit dès la fin de l’hiver, une aubaine pour les pollinisateurs.",
    sowMonths: [], plantMonths: [3, 4, 5, 9, 10], harvestMonths: WHOLE_YEAR,
    harvestTip: "Prélève des brins de 10 cm à l’extrémité des branches.",
    care: { ...DROUGHT, heatThresholdC: 38, frostThresholdC: -5, frostSensitive: true },
    wateringInstruction: "Le romarin craint l’excès d’eau : arrose seulement si la terre est sèche sur 4 cm.",
  }),
  plant({
    id: "coriander", name: "Coriandre", label: "la coriandre", emoji: "🍀", category: "aromatic",
    sunlight: ["partial", "sunny"], minSpace: "windowsill", difficulty: "medium", perennial: false, melliferous: true, goals: ["aromatics"], potLiters: 4,
    pitch: "Fraîche et citronnée, elle pousse vite au printemps et à la fin de l’été.",
    sowMonths: [3, 4, 5, 8, 9], plantMonths: [], harvestMonths: [5, 6, 7, 9, 10],
    harvestTip: "Coupe les feuilles extérieures régulièrement pour retarder la montée en graines.",
    care: { ...REGULAR, heatThresholdC: 27, frostThresholdC: -3, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  }),
  plant({
    id: "sage", name: "Sauge officinale", label: "la sauge", emoji: "🪶", category: "aromatic",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 8,
    pitch: "Feuillage velouté, fleurs bleues adorées des bourdons, et presque aucun entretien.",
    sowMonths: [4, 5], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [4, 5, 6, 7, 8, 9, 10],
    harvestTip: "Cueille les jeunes feuilles au sommet des tiges.",
    care: { ...DROUGHT, heatThresholdC: 36, frostThresholdC: -10, frostSensitive: false },
  }),
  plant({
    id: "oregano", name: "Origan", label: "l’origan", emoji: "🍕", category: "aromatic",
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 3,
    pitch: "L’herbe de la pizza, couverte de petites fleurs roses que les abeilles adorent.",
    sowMonths: [4, 5], plantMonths: [3, 4, 5, 9], harvestMonths: [5, 6, 7, 8, 9, 10],
    harvestTip: "Coupe les tiges juste avant la floraison, c’est là qu’elles sont les plus parfumées.",
    care: { ...DROUGHT, heatThresholdC: 35, frostThresholdC: -12, frostSensitive: false },
  }),
  plant({
    id: "dill", name: "Aneth", label: "l’aneth", emoji: "🐟", category: "aromatic",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["aromatics", "bees"], potLiters: 6,
    pitch: "Un feuillage plumeux au goût anisé, et des ombelles jaunes qui attirent les insectes utiles.",
    sowMonths: [4, 5, 6], plantMonths: [], harvestMonths: [6, 7, 8, 9],
    harvestTip: "Coupe les feuilles au fur et à mesure, garde quelques ombelles pour les graines.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: 2, frostSensitive: true },
  }),
  plant({
    id: "lemon-balm", name: "Mélisse", label: "la mélisse", emoji: "🫖", category: "aromatic",
    sunlight: ["partial", "shade", "sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 6,
    pitch: "Son parfum citronné fait des merveilles en tisane, et son nom vient du grec « abeille ».",
    sowMonths: [4, 5], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [5, 6, 7, 8, 9],
    harvestTip: "Coupe les tiges à mi-hauteur avant la floraison pour une seconde récolte.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -10, frostSensitive: false },
  }),
  plant({
    id: "lemon-verbena", name: "Verveine citronnelle", label: "la verveine", emoji: "🍵", category: "aromatic",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "medium", perennial: true, melliferous: true, goals: ["aromatics"], potLiters: 12,
    pitch: "Le parfum de citron le plus intense du balcon, à rentrer à l’abri quand il gèle.",
    sowMonths: [], plantMonths: [5, 6], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Cueille les feuilles au fil de l’été, fais-les sécher pour l’hiver.",
    care: { ...REGULAR, heatThresholdC: 35, frostThresholdC: 3, frostSensitive: true },
  }),

  plant({
    id: "tarragon", name: "Estragon", label: "l’estragon", emoji: "🐉", category: "aromatic",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: false, goals: ["aromatics"], potLiters: 6,
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
    id: "chervil", name: "Cerfeuil", label: "le cerfeuil", emoji: "🥣", category: "aromatic",
    sunlight: ["partial", "shade"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["aromatics"], potLiters: 3,
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
    id: "savory", name: "Sarriette", label: "la sarriette", emoji: "🏔️", category: "aromatic",
    sunlight: ["sunny"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 3,
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
    id: "shiso", name: "Shiso", label: "le shiso", emoji: "🍣", category: "aromatic",
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: true, goals: ["aromatics"], potLiters: 4,
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
    id: "lemongrass", name: "Citronnelle", label: "la citronnelle", emoji: "🎋", category: "aromatic",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: false, goals: ["aromatics"], potLiters: 15,
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
    id: "stevia", name: "Stévia", label: "la stévia", emoji: "🍬", category: "aromatic",
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "medium", perennial: true, melliferous: true, goals: ["aromatics"], potLiters: 4,
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
    id: "hyssop", name: "Hysope", label: "l’hysope", emoji: "💙", category: "aromatic",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 6,
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
    id: "wild-garlic", name: "Ail des ours", label: "l’ail des ours", emoji: "🐻", category: "aromatic",
    sunlight: ["shade", "partial"], minSpace: "planter", difficulty: "medium", perennial: true, melliferous: true, goals: ["aromatics"], potLiters: 8,
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

  // --- Légumes-fruits -------------------------------------------------------
  plant({
    id: "cherry-tomato", name: "Tomates cerises", label: "les tomates cerises", emoji: "🍅", category: "fruiting-vegetable",
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
    id: "chili", name: "Piment", label: "le piment", emoji: "🌶️", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "medium", perennial: false, melliferous: false, goals: [], potLiters: 10,
    pitch: "Compact et décoratif, il aime la chaleur des balcons plein sud.",
    sowMonths: [2, 3], plantMonths: [5, 6], harvestMonths: [8, 9, 10],
    harvestTip: "Coupe les fruits avec leur queue, à l’aide de ciseaux, pour ne pas abîmer la plante.",
    care: { ...REGULAR, heatThresholdC: 35, frostThresholdC: 8, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
  }),
  plant({
    id: "strawberry", name: "Fraisier", label: "les fraisiers", emoji: "🍓", category: "small-fruit",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 4,
    pitch: "Une variété remontante donne des fraises de mai jusqu’aux premiers froids.",
    sowMonths: [], plantMonths: [3, 4, 8, 9], harvestMonths: [5, 6, 7, 8, 9],
    harvestTip: "Cueille les fraises bien rouges le matin, avec leur petite collerette verte.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -8, frostSensitive: false },
    extraTasks: [customTask({ id: "runners", type: "pruning", title: "Aujourd’hui, coupe les stolons des fraisiers.", instruction: "Supprime les longs filaments qui partent du pied, sauf si tu veux de nouveaux plants.", minutes: 3, months: [6, 7, 8] })],
  }),
  plant({
    id: "zucchini", name: "Courgette", label: "la courgette", emoji: "🎃", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "terrace", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 40,
    pitch: "Généreuse et spectaculaire, elle demande un grand bac mais nourrit tout l’été.",
    sowMonths: [4, 5], plantMonths: [5, 6], harvestMonths: [7, 8, 9],
    harvestTip: "Récolte les courgettes jeunes, à 15-20 cm : elles sont plus tendres et la plante produit plus.",
    care: { ...THIRSTY, heatThresholdC: 32, frostThresholdC: 8, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9],
  }),
  plant({
    id: "eggplant", name: "Aubergine", label: "l’aubergine", emoji: "🍆", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: false, melliferous: false, goals: [], potLiters: 20,
    pitch: "Une variété naine donne de jolis fruits si ton balcon est bien chaud.",
    sowMonths: [2, 3], plantMonths: [5, 6], harvestMonths: [8, 9],
    harvestTip: "Coupe le fruit quand sa peau est brillante ; terne, il devient amer.",
    care: { ...REGULAR, heatThresholdC: 35, frostThresholdC: 10, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9],
  }),
  plant({
    id: "dwarf-bean", name: "Haricots nains", label: "les haricots", emoji: "🫘", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 10,
    pitch: "Semés en mai, ils se récoltent deux mois plus tard, sans tuteur.",
    sowMonths: [5, 6, 7], plantMonths: [], harvestMonths: [7, 8, 9],
    harvestTip: "Cueille les gousses avant que les grains ne gonflent, tous les deux ou trois jours.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: 8, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9],
  }),
  plant({
    id: "pea", name: "Petits pois", label: "les petits pois", emoji: "🟢", category: "fruiting-vegetable",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 10,
    pitch: "Ils aiment la fraîcheur du printemps et grimpent sur un simple filet.",
    sowMonths: [2, 3, 4], plantMonths: [], harvestMonths: [5, 6],
    harvestTip: "Récolte les cosses bien pleines mais encore vertes et lisses.",
    care: { ...REGULAR, heatThresholdC: 26, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6],
  }),
  plant({
    id: "mini-cucumber", name: "Concombre mini", label: "le concombre", emoji: "🥒", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: false, melliferous: true, goals: ["bees"], potLiters: 20,
    pitch: "Palissé contre une rambarde, il donne des petits fruits croquants tout l’été.",
    sowMonths: [4, 5], plantMonths: [5, 6], harvestMonths: [7, 8, 9],
    harvestTip: "Coupe les concombres à 10-15 cm, avant qu’ils ne jaunissent.",
    care: { ...THIRSTY, heatThresholdC: 32, frostThresholdC: 10, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9],
  }),

  plant({
    id: "dwarf-tomato", name: "Tomates naines", label: "les tomates naines", emoji: "🪴", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["tomatoes"], potLiters: 8,
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
    ],
  }),
  plant({
    id: "sweet-pepper", name: "Poivron", label: "le poivron", emoji: "🫑", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "medium", perennial: false, melliferous: false, goals: [], potLiters: 12,
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
    id: "physalis", name: "Physalis", label: "les physalis", emoji: "🏮", category: "fruiting-vegetable",
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
    id: "pole-bean", name: "Haricots à rames", label: "les haricots à rames", emoji: "🪜", category: "fruiting-vegetable",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 15,
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
    id: "cucamelon", name: "Concombre à la souris", label: "le concombre à la souris", emoji: "🐭", category: "fruiting-vegetable",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: [], potLiters: 10,
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
    id: "mini-melon", name: "Melon", label: "le melon", emoji: "🍈", category: "fruiting-vegetable",
    sunlight: ["sunny"], minSpace: "terrace", difficulty: "medium", perennial: false, melliferous: true, goals: ["bees"], potLiters: 30,
    pitch: "Sur une terrasse brûlante, un melon palissé peut donner quatre à six fruits parfumés.",
    sowMonths: [4, 5], plantMonths: [5, 6], harvestMonths: [8, 9],
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

  // --- Légumes-feuilles -----------------------------------------------------
  plant({
    id: "cut-lettuce", name: "Salade à couper", label: "la salade", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["partial", "shade", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["zero-waste"], potLiters: 4,
    pitch: "Elle repousse plusieurs fois : parfaite pour récolter sans gaspiller.",
    sowMonths: [3, 4, 5, 6, 7, 8, 9], plantMonths: [], harvestMonths: [4, 5, 6, 7, 8, 9, 10, 11],
    harvestTip: "Coupe les feuilles à 3 cm du sol : elles repousseront pour une nouvelle récolte.",
    care: { ...THIRSTY, heatThresholdC: 27, frostThresholdC: -3, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
  }),
  plant({
    id: "arugula", name: "Roquette", label: "la roquette", emoji: "🥗", category: "leafy-vegetable",
    sunlight: ["partial", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["zero-waste"], potLiters: 3,
    pitch: "Prête à croquer trois semaines après le semis, avec un petit goût poivré.",
    sowMonths: [3, 4, 5, 8, 9], plantMonths: [], harvestMonths: [4, 5, 6, 9, 10, 11],
    harvestTip: "Récolte les feuilles jeunes, avant la floraison qui les rend piquantes.",
    care: { ...THIRSTY, heatThresholdC: 27, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 8, 9, 10, 11],
  }),
  plant({
    id: "spinach", name: "Épinards", label: "les épinards", emoji: "💪", category: "leafy-vegetable",
    sunlight: ["partial", "shade"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: ["zero-waste"], potLiters: 6,
    pitch: "Ils préfèrent la fraîcheur et se plaisent sur les balcons peu ensoleillés.",
    sowMonths: [3, 4, 8, 9], plantMonths: [], harvestMonths: [4, 5, 6, 10, 11],
    harvestTip: "Coupe les grandes feuilles extérieures en laissant le cœur produire.",
    care: { ...REGULAR, heatThresholdC: 25, frostThresholdC: -6, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 8, 9, 10, 11],
  }),
  plant({
    id: "chard", name: "Blettes", label: "les blettes", emoji: "🌈", category: "leafy-vegetable",
    sunlight: ["partial", "sunny"], minSpace: "balcony", difficulty: "easy", perennial: false, melliferous: false, goals: ["zero-waste"], potLiters: 15,
    pitch: "Des côtes colorées qui se récoltent feuille à feuille de l’été jusqu’à l’hiver.",
    sowMonths: [4, 5, 6], plantMonths: [5, 6], harvestMonths: [6, 7, 8, 9, 10, 11],
    harvestTip: "Coupe les feuilles extérieures à la base, le cœur continuera à en produire.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10, 11],
  }),
  plant({
    id: "lambs-lettuce", name: "Mâche", label: "la mâche", emoji: "❄️", category: "leafy-vegetable",
    sunlight: ["partial", "shade", "sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: ["zero-waste"], potLiters: 4,
    pitch: "La salade de l’hiver : semée à la rentrée, elle se récolte quand le reste du balcon dort.",
    sowMonths: [8, 9, 10], plantMonths: [], harvestMonths: [10, 11, 12, 1, 2, 3],
    harvestTip: "Coupe les rosettes entières au ras de la terre.",
    care: { ...REGULAR, heatThresholdC: 25, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [8, 9, 10, 11, 3],
  }),
  plant({
    id: "kale", name: "Chou kale", label: "le chou kale", emoji: "🥦", category: "leafy-vegetable",
    sunlight: ["sunny", "partial"], minSpace: "balcony", difficulty: "easy", perennial: false, melliferous: false, goals: ["zero-waste"], potLiters: 15,
    pitch: "Il résiste au froid et devient même plus doux après les premières gelées.",
    sowMonths: [4, 5, 6], plantMonths: [5, 6, 7], harvestMonths: [9, 10, 11, 12, 1, 2],
    harvestTip: "Récolte les feuilles du bas en remontant, le chou continue de grandir.",
    care: { ...REGULAR, heatThresholdC: 28, frostThresholdC: -12, frostSensitive: false },
    wateringMonths: [5, 6, 7, 8, 9, 10],
  }),

  plant({
    id: "garden-cress", name: "Cresson alénois", label: "le cresson", emoji: "💧", category: "leafy-vegetable",
    sunlight: ["partial", "shade", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["zero-waste"], potLiters: 1,
    pitch: "Semé lundi, dégusté le week-end : la récolte la plus rapide du balcon.",
    sowMonths: [3, 4, 5, 6, 7, 8, 9, 10], plantMonths: [], harvestMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
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
    id: "sorrel", name: "Oseille", label: "l’oseille", emoji: "🥚", category: "leafy-vegetable",
    sunlight: ["partial", "shade", "sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: false, goals: ["zero-waste"], potLiters: 6,
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
    id: "purslane", name: "Pourpier", label: "le pourpier", emoji: "🌵", category: "leafy-vegetable",
    sunlight: ["sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["zero-waste"], potLiters: 3,
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
    id: "pak-choi", name: "Pak choï", label: "le pak choï", emoji: "🥢", category: "leafy-vegetable",
    sunlight: ["partial", "sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 6,
    pitch: "Le chou chinois express : récolté en six semaines, délicieux sauté au wok.",
    sowMonths: [4, 5, 8, 9], plantMonths: [], harvestMonths: [5, 6, 9, 10, 11],
    harvestTip: "Récolte la rosette entière ou quelques feuilles à la fois, avant qu’il ne monte en fleurs.",
    care: { ...THIRSTY, heatThresholdC: 27, frostThresholdC: -4, frostSensitive: false },
    wateringMonths: [4, 5, 6, 8, 9, 10, 11],
    varieties: [
      { id: "mei-qing", name: "Mei Qing Choi", note: "Mini pak choï de 15 cm, lent à monter en graines : le plus sûr en jardinière." },
      { id: "joi-choi", name: "Joi Choi", note: "Côtes blanches charnues et bonne résistance à la chaleur." },
    ],
  }),
  plant({
    id: "mizuna", name: "Mizuna", label: "la mizuna", emoji: "🍱", category: "leafy-vegetable",
    sunlight: ["partial", "shade", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["zero-waste"], potLiters: 3,
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
    id: "microgreens", name: "Micro-pousses", label: "les micro-pousses", emoji: "🌱", category: "leafy-vegetable",
    sunlight: ["partial", "shade", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["zero-waste"], potLiters: 1,
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

  // --- Racines --------------------------------------------------------------
  plant({
    id: "radish", name: "Radis", label: "les radis", emoji: "🔴", category: "root",
    sunlight: ["partial", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 3,
    pitch: "Une récolte en quatre semaines qui donne confiance dès le premier essai.",
    sowMonths: [3, 4, 5, 6, 7, 8, 9], plantMonths: [], harvestMonths: [4, 5, 6, 7, 8, 9, 10],
    harvestTip: "Arrache-les dès qu’ils ont la taille d’une bille : trop gros, ils deviennent creux.",
    care: { ...THIRSTY, heatThresholdC: 28, frostThresholdC: -4, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    wateringInstruction: "Les radis doivent pousser vite : garde la terre fraîche, sans la détremper.",
    extraTasks: [customTask({ id: "thin", type: "pruning", title: "Aujourd’hui, éclaircis les radis.", instruction: "Garde les pousses les plus vigoureuses, espacées de 3 à 4 cm.", minutes: 3, months: [3, 4, 5, 6, 7, 8, 9], doneTitle: "Radis éclaircis, journée gagnée.", doneText: "Tes jeunes plants ont maintenant plus de place pour grossir." })],
  }),
  plant({
    id: "round-carrot", name: "Carottes rondes", label: "les carottes", emoji: "🥕", category: "root",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "medium", perennial: false, melliferous: false, goals: [], potLiters: 10,
    pitch: "Les variétés rondes, comme « Marché de Paris », se contentent de 20 cm de terre.",
    sowMonths: [3, 4, 5, 6, 7], plantMonths: [], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Tire doucement sur le feuillage après avoir arrosé : la carotte vient toute seule.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  }),
  plant({
    id: "spring-onion", name: "Oignons botte", label: "les oignons botte", emoji: "🧅", category: "root",
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["zero-waste"], potLiters: 3,
    pitch: "Replante la base d’un oignon du commerce : il repousse en quelques jours.",
    sowMonths: [3, 4, 5, 8, 9], plantMonths: [3, 4, 5, 6, 7, 8, 9], harvestMonths: [5, 6, 7, 8, 9, 10],
    harvestTip: "Coupe les tiges vertes à 2 cm du bulbe : elles repousseront.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  }),

  plant({
    id: "beetroot", name: "Betterave", label: "les betteraves", emoji: "🟣", category: "root",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: ["zero-waste"], potLiters: 10,
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
    id: "turnip", name: "Navets", label: "les navets", emoji: "⚪", category: "root",
    sunlight: ["partial", "sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 8,
    pitch: "Les navets primeurs se récoltent en deux mois, au printemps comme à l’automne.",
    sowMonths: [3, 4, 8, 9], plantMonths: [], harvestMonths: [5, 6, 10, 11],
    harvestTip: "Récolte-les petits, à 4-5 cm de diamètre, avant qu’ils ne deviennent fibreux.",
    care: { ...THIRSTY, heatThresholdC: 27, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 8, 9, 10, 11],
    varieties: [
      { id: "milan", name: "Milan rouge", note: "Navet plat à collet violet, très précoce et peu exigeant en profondeur." },
      { id: "tokyo", name: "Tokyo Cross", note: "Petit navet blanc de 5 cm, tendre et prêt en 40 jours." },
    ],
  }),
  plant({
    id: "garlic", name: "Ail", label: "l’ail", emoji: "🧄", category: "root",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 8,
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
    id: "potato", name: "Pommes de terre en sac", label: "les pommes de terre", emoji: "🥔", category: "root",
    sunlight: ["sunny", "partial"], minSpace: "terrace", difficulty: "easy", perennial: false, melliferous: false, goals: [], potLiters: 40,
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

  // --- Fleurs ---------------------------------------------------------------
  plant({
    id: "nasturtium", name: "Capucines", label: "les capucines", emoji: "🧡", category: "flower",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 5,
    pitch: "Des fleurs colorées et comestibles, qui attirent les abeilles et éloignent les pucerons des tomates.",
    sowMonths: [4, 5, 6], plantMonths: [5, 6], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Cueille fleurs et jeunes feuilles pour tes salades : elles ont un goût poivré.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: 3, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
    extraTasks: [customTask({ id: "deadhead", type: "pruning", title: "Aujourd’hui, observe les fleurs des capucines.", instruction: "Retire une fleur fanée pour encourager les nouvelles et laisse les abeilles butiner.", minutes: 2, months: [6, 7, 8, 9, 10], doneTitle: "Capucines observées, journée gagnée.", doneText: "Ton balcon reste accueillant pour les pollinisateurs." })],
  }),
  plant({
    id: "calendula", name: "Soucis", label: "les soucis", emoji: "🌼", category: "flower",
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 3,
    pitch: "Des fleurs orange du printemps à l’automne, qui se ressèment toutes seules.",
    sowMonths: [3, 4, 5, 9], plantMonths: [4, 5], harvestMonths: [5, 6, 7, 8, 9, 10, 11],
    harvestTip: "Cueille les fleurs épanouies : leurs pétales colorent salades et infusions.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: -3, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10],
  }),
  plant({
    id: "lavender", name: "Lavande", label: "la lavande", emoji: "💜", category: "flower",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 10,
    pitch: "Un parfum de vacances, une floraison qui bourdonne tout l’été, et très peu d’eau.",
    sowMonths: [], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [6, 7, 8],
    harvestTip: "Coupe les épis quand les premières fleurs s’ouvrent, pour les faire sécher tête en bas.",
    care: { ...DROUGHT, wateringIntervalHours: 120, heatThresholdC: 38, frostThresholdC: -12, frostSensitive: false },
    wateringInstruction: "La lavande déteste l’humidité : arrose seulement si la terre est sèche sur 5 cm.",
    extraTasks: [customTask({ id: "trim", type: "pruning", title: "Aujourd’hui, taille la lavande.", instruction: "Après la floraison, coupe les tiges fanées et un tiers du feuillage, sans toucher au vieux bois.", minutes: 5, months: [8, 9] })],
  }),
  plant({
    id: "cosmos", name: "Cosmos", label: "les cosmos", emoji: "🌸", category: "flower",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 8,
    pitch: "Légers et graciles, ils fleurissent sans relâche de juillet aux gelées.",
    sowMonths: [4, 5], plantMonths: [5, 6], harvestMonths: [7, 8, 9, 10],
    harvestTip: "Coupe quelques tiges fleuries pour un bouquet : la plante n’en fleurira que plus.",
    care: { ...REGULAR, heatThresholdC: 34, frostThresholdC: 3, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
  }),
  plant({
    id: "borage", name: "Bourrache", label: "la bourrache", emoji: "⭐", category: "flower",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 10,
    pitch: "Ses fleurs bleues en étoile sont parmi les plus visitées par les abeilles.",
    sowMonths: [3, 4, 5, 6], plantMonths: [], harvestMonths: [6, 7, 8, 9],
    harvestTip: "Cueille les fleurs pour décorer tes plats : elles ont un léger goût de concombre.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: -3, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9],
  }),
  plant({
    id: "marigold", name: "Œillets d’Inde", label: "les œillets d’Inde", emoji: "🏵️", category: "flower",
    sunlight: ["sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees", "tomatoes"], potLiters: 2,
    pitch: "Les compagnons des tomates : leur odeur tient à distance certains ravageurs.",
    sowMonths: [3, 4, 5], plantMonths: [5, 6], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Retire les fleurs fanées pour prolonger la floraison jusqu’en octobre.",
    care: { ...REGULAR, heatThresholdC: 34, frostThresholdC: 3, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9, 10],
  }),
  plant({
    id: "dwarf-sunflower", name: "Tournesol nain", label: "le tournesol", emoji: "🌻", category: "flower",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 8,
    pitch: "Un vrai soleil en pot, et ses graines nourrissent les oiseaux à l’automne.",
    sowMonths: [4, 5, 6], plantMonths: [], harvestMonths: [7, 8, 9],
    harvestTip: "Laisse sécher la fleur sur pied, puis offre les graines aux mésanges.",
    care: { ...REGULAR, heatThresholdC: 35, frostThresholdC: 3, frostSensitive: true },
    wateringMonths: [5, 6, 7, 8, 9],
  }),
  plant({
    id: "viola", name: "Violas et pensées", label: "les violas", emoji: "🎨", category: "flower",
    sunlight: ["partial", "shade", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 2,
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
    id: "zinnia", name: "Zinnias", label: "les zinnias", emoji: "🌺", category: "flower",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 6,
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
    id: "phacelia", name: "Phacélie", label: "la phacélie", emoji: "🌀", category: "flower",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 6,
    pitch: "La plante préférée des abeilles : ses fleurs bleues bourdonnent six semaines après le semis.",
    sowMonths: [3, 4, 5, 6, 7, 8, 9], plantMonths: [], harvestMonths: [5, 6, 7, 8, 9, 10],
    harvestTip: "Laisse-la fleurir, puis coupe-la au ras du sol et pose-la sur la terre : elle nourrit le pot.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: -6, frostSensitive: false },
    varieties: [
      { id: "tanacetifolia", name: "Phacelia tanacetifolia", note: "Engrais vert et fleur mellifère à la fois : elle régénère la terre d’une jardinière fatiguée." },
    ],
  }),
  plant({
    id: "cornflower", name: "Bleuets", label: "les bleuets", emoji: "💠", category: "flower",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 5,
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
    id: "sweet-alyssum", name: "Alysse odorante", label: "l’alysse", emoji: "🤍", category: "flower",
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
    id: "sweet-pea", name: "Pois de senteur", label: "les pois de senteur", emoji: "🎀", category: "flower",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 10,
    pitch: "Une liane parfumée qui fleurit la rambarde tout le printemps. Attention : ses graines ne se mangent pas.",
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
    id: "hardy-geranium", name: "Géranium vivace", label: "le géranium vivace", emoji: "🌷", category: "flower",
    sunlight: ["shade", "partial"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 8,
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
    id: "tall-verbena", name: "Verveine de Buenos Aires", label: "la verveine de Buenos Aires", emoji: "🦋", category: "flower",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 12,
    pitch: "De hautes tiges légères couronnées de violet, véritable aimant à papillons jusqu’en octobre.",
    sowMonths: [3, 4], plantMonths: [4, 5], harvestMonths: [7, 8, 9, 10],
    harvestTip: "Laisse les tiges sèches en hiver : les oiseaux mangent les graines, et tu couperas au printemps.",
    care: { ...DROUGHT, heatThresholdC: 38, frostThresholdC: -8, frostSensitive: false },
    varieties: [
      { id: "bonariensis", name: "Verbena bonariensis", note: "1 m de haut mais très aérienne : elle laisse passer la vue et le vent." },
      { id: "lollipop", name: "Lollipop", note: "Version naine de 60 cm, plus adaptée à une jardinière exposée au vent." },
    ],
  }),

  // --- Petits fruits -------------------------------------------------------
  plant({
    id: "dwarf-raspberry", name: "Framboisier nain", label: "le framboisier", emoji: "🍇", category: "small-fruit",
    sunlight: ["sunny", "partial"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 20,
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
    id: "blueberry", name: "Myrtillier", label: "le myrtillier", emoji: "🫐", category: "small-fruit",
    sunlight: ["partial", "sunny"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: true, goals: ["bees"], potLiters: 25,
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
    id: "redcurrant", name: "Groseillier", label: "le groseillier", emoji: "🍒", category: "small-fruit",
    sunlight: ["partial", "shade", "sunny"], minSpace: "balcony", difficulty: "easy", perennial: true, melliferous: true, goals: ["bees"], potLiters: 20,
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
    id: "lemon-tree", name: "Citronnier", label: "le citronnier", emoji: "🍋", category: "small-fruit",
    sunlight: ["sunny"], minSpace: "balcony", difficulty: "medium", perennial: true, melliferous: true, goals: [], potLiters: 30,
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
    id: "dwarf-fig", name: "Figuier nain", label: "le figuier", emoji: "🟤", category: "small-fruit",
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
];

const BY_ID = new Map(PLANT_CATALOG.map((entry) => [entry.id, entry]));

export function getCatalogPlant(id: string): CatalogPlant | undefined {
  return BY_ID.get(id);
}

/** Tâches pertinentes pour un mois donné (1-12). */
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
  experience?: string;
  sunlight?: string;
  space?: string;
  goals?: string[];
  skipped?: boolean;
};

/** La plante que l'utilisateur a en tête quand il coche un objectif. */
const GOAL_FLAGSHIPS: Record<GoalTag, string[]> = {
  tomatoes: ["cherry-tomato"],
  aromatics: ["basil", "mint"],
  bees: ["lavender"],
  "zero-waste": ["cut-lettuce"],
};

const DEFAULT_PICKS = ["basil", "mint", "radish", "nasturtium", "cut-lettuce", "chives"];

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
  const beginner = answers.experience === "beginner";
  const month = options.month;

  return PLANT_CATALOG
    .filter((entry) => !exclude.has(entry.id) && fitsSunlight(entry, sunlight) && fitsSpace(entry, space))
    .map((entry) => {
      // Une plante qui coche plusieurs objectifs ne doit pas passer devant celle que l'utilisateur a demandée.
      const matches = entry.goals.filter((goal) => goals.has(goal)).length;
      let score = matches > 0 ? 10 + (matches - 1) * 3 : 0;
      if ([...goals].some((goal) => GOAL_FLAGSHIPS[goal as GoalTag]?.includes(entry.id))) score += 8;
      if (entry.difficulty === "easy") score += beginner ? 6 : 2;
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
