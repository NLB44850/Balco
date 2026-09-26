import type { MaintenanceTaskType } from "../reminders/reminder-engine";

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

type PlantInput = Omit<CatalogPlant, "tasks"> & { extraTasks?: CareTask[]; wateringMonths?: Month[]; wateringInstruction?: string };

function plant({ extraTasks = [], wateringMonths, wateringInstruction, ...data }: PlantInput): CatalogPlant {
  const activeMonths = wateringMonths ?? GROWING_SEASON;
  return {
    ...data,
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
    id: "mint", name: "Menthe", label: "la menthe", emoji: "🌱", category: "aromatic",
    sunlight: ["shade", "partial", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics"], potLiters: 5,
    pitch: "Robuste et parfumée, elle démarre très bien dans un petit contenant, même à l’ombre.",
    sowMonths: [], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [4, 5, 6, 7, 8, 9, 10],
    harvestTip: "Coupe les tiges au-dessus d’une paire de feuilles : elle repartira de plus belle.",
    care: { ...THIRSTY, heatThresholdC: 30, frostThresholdC: -10, frostSensitive: false },
    extraTasks: [customTask({ id: "pinch", type: "pruning", title: "Aujourd’hui, pince la menthe.", instruction: "Coupe les extrémités juste au-dessus d’une paire de feuilles pour la faire ramifier.", minutes: 2, months: [5, 6, 7, 8] })],
  }),
  plant({
    id: "parsley", name: "Persil", label: "le persil", emoji: "🌿", category: "aromatic",
    sunlight: ["partial", "shade", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["aromatics", "zero-waste"], potLiters: 3,
    pitch: "Il se récolte presque toute l’année et repousse après chaque coupe.",
    sowMonths: [3, 4, 5, 6, 7, 8], plantMonths: [4, 5, 9], harvestMonths: [5, 6, 7, 8, 9, 10, 11],
    harvestTip: "Coupe les tiges extérieures à la base, le cœur continuera à produire.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10, 11],
  }),
  plant({
    id: "chives", name: "Ciboulette", label: "la ciboulette", emoji: "🌱", category: "aromatic",
    sunlight: ["sunny", "partial", "shade"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 2,
    pitch: "Increvable, elle revient chaque printemps et ses fleurs mauves attirent les abeilles.",
    sowMonths: [3, 4, 5], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [3, 4, 5, 6, 7, 8, 9, 10],
    harvestTip: "Coupe les brins à 3 cm du sol, ils repoussent en quelques jours.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  }),
  plant({
    id: "thyme", name: "Thym", label: "le thym", emoji: "🌿", category: "aromatic",
    sunlight: ["sunny"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 3,
    pitch: "Il adore le soleil et oublie volontiers tes arrosages : parfait pour les balcons brûlants.",
    sowMonths: [4, 5], plantMonths: [3, 4, 5, 9, 10], harvestMonths: WHOLE_YEAR,
    harvestTip: "Coupe quelques rameaux, sans jamais tailler dans le bois dénudé.",
    care: { ...DROUGHT, heatThresholdC: 36, frostThresholdC: -12, frostSensitive: false },
    wateringInstruction: "Le thym craint l’excès d’eau : arrose seulement si la terre est sèche sur 4 cm.",
    extraTasks: [customTask({ id: "trim", type: "pruning", title: "Aujourd’hui, taille légèrement le thym.", instruction: "Après la floraison, rabats les tiges d’un tiers pour garder une touffe compacte.", minutes: 5, months: [7, 8] })],
  }),
  plant({
    id: "rosemary", name: "Romarin", label: "le romarin", emoji: "🌿", category: "aromatic",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 10,
    pitch: "Un arbuste méditerranéen qui fleurit dès la fin de l’hiver, une aubaine pour les pollinisateurs.",
    sowMonths: [], plantMonths: [3, 4, 5, 9, 10], harvestMonths: WHOLE_YEAR,
    harvestTip: "Prélève des brins de 10 cm à l’extrémité des branches.",
    care: { ...DROUGHT, heatThresholdC: 38, frostThresholdC: -5, frostSensitive: true },
    wateringInstruction: "Le romarin craint l’excès d’eau : arrose seulement si la terre est sèche sur 4 cm.",
  }),
  plant({
    id: "coriander", name: "Coriandre", label: "la coriandre", emoji: "🌿", category: "aromatic",
    sunlight: ["partial", "sunny"], minSpace: "windowsill", difficulty: "medium", perennial: false, melliferous: true, goals: ["aromatics"], potLiters: 4,
    pitch: "Fraîche et citronnée, elle pousse vite au printemps et à la fin de l’été.",
    sowMonths: [3, 4, 5, 8, 9], plantMonths: [], harvestMonths: [5, 6, 7, 9, 10],
    harvestTip: "Coupe les feuilles extérieures régulièrement pour retarder la montée en graines.",
    care: { ...REGULAR, heatThresholdC: 27, frostThresholdC: -3, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 7, 8, 9, 10],
  }),
  plant({
    id: "sage", name: "Sauge officinale", label: "la sauge", emoji: "🌿", category: "aromatic",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 8,
    pitch: "Feuillage velouté, fleurs bleues adorées des bourdons, et presque aucun entretien.",
    sowMonths: [4, 5], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [4, 5, 6, 7, 8, 9, 10],
    harvestTip: "Cueille les jeunes feuilles au sommet des tiges.",
    care: { ...DROUGHT, heatThresholdC: 36, frostThresholdC: -10, frostSensitive: false },
  }),
  plant({
    id: "oregano", name: "Origan", label: "l’origan", emoji: "🌿", category: "aromatic",
    sunlight: ["sunny", "partial"], minSpace: "windowsill", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 3,
    pitch: "L’herbe de la pizza, couverte de petites fleurs roses que les abeilles adorent.",
    sowMonths: [4, 5], plantMonths: [3, 4, 5, 9], harvestMonths: [5, 6, 7, 8, 9, 10],
    harvestTip: "Coupe les tiges juste avant la floraison, c’est là qu’elles sont les plus parfumées.",
    care: { ...DROUGHT, heatThresholdC: 35, frostThresholdC: -12, frostSensitive: false },
  }),
  plant({
    id: "dill", name: "Aneth", label: "l’aneth", emoji: "🌿", category: "aromatic",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["aromatics", "bees"], potLiters: 6,
    pitch: "Un feuillage plumeux au goût anisé, et des ombelles jaunes qui attirent les insectes utiles.",
    sowMonths: [4, 5, 6], plantMonths: [], harvestMonths: [6, 7, 8, 9],
    harvestTip: "Coupe les feuilles au fur et à mesure, garde quelques ombelles pour les graines.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: 2, frostSensitive: true },
  }),
  plant({
    id: "lemon-balm", name: "Mélisse", label: "la mélisse", emoji: "🍋", category: "aromatic",
    sunlight: ["partial", "shade", "sunny"], minSpace: "planter", difficulty: "easy", perennial: true, melliferous: true, goals: ["aromatics", "bees"], potLiters: 6,
    pitch: "Son parfum citronné fait des merveilles en tisane, et son nom vient du grec « abeille ».",
    sowMonths: [4, 5], plantMonths: [3, 4, 5, 9, 10], harvestMonths: [5, 6, 7, 8, 9],
    harvestTip: "Coupe les tiges à mi-hauteur avant la floraison pour une seconde récolte.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -10, frostSensitive: false },
  }),
  plant({
    id: "lemon-verbena", name: "Verveine citronnelle", label: "la verveine", emoji: "🍋", category: "aromatic",
    sunlight: ["sunny"], minSpace: "planter", difficulty: "medium", perennial: true, melliferous: true, goals: ["aromatics"], potLiters: 12,
    pitch: "Le parfum de citron le plus intense du balcon, à rentrer à l’abri quand il gèle.",
    sowMonths: [], plantMonths: [5, 6], harvestMonths: [6, 7, 8, 9, 10],
    harvestTip: "Cueille les feuilles au fil de l’été, fais-les sécher pour l’hiver.",
    care: { ...REGULAR, heatThresholdC: 35, frostThresholdC: 3, frostSensitive: true },
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
    id: "zucchini", name: "Courgette", label: "la courgette", emoji: "🥒", category: "fruiting-vegetable",
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
    id: "pea", name: "Petits pois", label: "les petits pois", emoji: "🫛", category: "fruiting-vegetable",
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
    id: "arugula", name: "Roquette", label: "la roquette", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["partial", "sunny"], minSpace: "windowsill", difficulty: "easy", perennial: false, melliferous: false, goals: ["zero-waste"], potLiters: 3,
    pitch: "Prête à croquer trois semaines après le semis, avec un petit goût poivré.",
    sowMonths: [3, 4, 5, 8, 9], plantMonths: [], harvestMonths: [4, 5, 6, 9, 10, 11],
    harvestTip: "Récolte les feuilles jeunes, avant la floraison qui les rend piquantes.",
    care: { ...THIRSTY, heatThresholdC: 27, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 8, 9, 10, 11],
  }),
  plant({
    id: "spinach", name: "Épinards", label: "les épinards", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["partial", "shade"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: ["zero-waste"], potLiters: 6,
    pitch: "Ils préfèrent la fraîcheur et se plaisent sur les balcons peu ensoleillés.",
    sowMonths: [3, 4, 8, 9], plantMonths: [], harvestMonths: [4, 5, 6, 10, 11],
    harvestTip: "Coupe les grandes feuilles extérieures en laissant le cœur produire.",
    care: { ...REGULAR, heatThresholdC: 25, frostThresholdC: -6, frostSensitive: false },
    wateringMonths: [3, 4, 5, 6, 8, 9, 10, 11],
  }),
  plant({
    id: "chard", name: "Blettes", label: "les blettes", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["partial", "sunny"], minSpace: "balcony", difficulty: "easy", perennial: false, melliferous: false, goals: ["zero-waste"], potLiters: 15,
    pitch: "Des côtes colorées qui se récoltent feuille à feuille de l’été jusqu’à l’hiver.",
    sowMonths: [4, 5, 6], plantMonths: [5, 6], harvestMonths: [6, 7, 8, 9, 10, 11],
    harvestTip: "Coupe les feuilles extérieures à la base, le cœur continuera à en produire.",
    care: { ...REGULAR, heatThresholdC: 30, frostThresholdC: -5, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9, 10, 11],
  }),
  plant({
    id: "lambs-lettuce", name: "Mâche", label: "la mâche", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["partial", "shade", "sunny"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: false, goals: ["zero-waste"], potLiters: 4,
    pitch: "La salade de l’hiver : semée à la rentrée, elle se récolte quand le reste du balcon dort.",
    sowMonths: [8, 9, 10], plantMonths: [], harvestMonths: [10, 11, 12, 1, 2, 3],
    harvestTip: "Coupe les rosettes entières au ras de la terre.",
    care: { ...REGULAR, heatThresholdC: 25, frostThresholdC: -15, frostSensitive: false },
    wateringMonths: [8, 9, 10, 11, 3],
  }),
  plant({
    id: "kale", name: "Chou kale", label: "le chou kale", emoji: "🥬", category: "leafy-vegetable",
    sunlight: ["sunny", "partial"], minSpace: "balcony", difficulty: "easy", perennial: false, melliferous: false, goals: ["zero-waste"], potLiters: 15,
    pitch: "Il résiste au froid et devient même plus doux après les premières gelées.",
    sowMonths: [4, 5, 6], plantMonths: [5, 6, 7], harvestMonths: [9, 10, 11, 12, 1, 2],
    harvestTip: "Récolte les feuilles du bas en remontant, le chou continue de grandir.",
    care: { ...REGULAR, heatThresholdC: 28, frostThresholdC: -12, frostSensitive: false },
    wateringMonths: [5, 6, 7, 8, 9, 10],
  }),

  // --- Racines --------------------------------------------------------------
  plant({
    id: "radish", name: "Radis", label: "les radis", emoji: "🌸", category: "root",
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

  // --- Fleurs ---------------------------------------------------------------
  plant({
    id: "nasturtium", name: "Capucines", label: "les capucines", emoji: "🌼", category: "flower",
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
    id: "borage", name: "Bourrache", label: "la bourrache", emoji: "💙", category: "flower",
    sunlight: ["sunny", "partial"], minSpace: "planter", difficulty: "easy", perennial: false, melliferous: true, goals: ["bees"], potLiters: 10,
    pitch: "Ses fleurs bleues en étoile sont parmi les plus visitées par les abeilles.",
    sowMonths: [3, 4, 5, 6], plantMonths: [], harvestMonths: [6, 7, 8, 9],
    harvestTip: "Cueille les fleurs pour décorer tes plats : elles ont un léger goût de concombre.",
    care: { ...REGULAR, heatThresholdC: 32, frostThresholdC: -3, frostSensitive: false },
    wateringMonths: [4, 5, 6, 7, 8, 9],
  }),
  plant({
    id: "marigold", name: "Œillets d’Inde", label: "les œillets d’Inde", emoji: "🌼", category: "flower",
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
};

export function searchCatalog(query: string, category?: PlantCategory): CatalogPlant[] {
  const normalized = normalize(query);
  return PLANT_CATALOG.filter((entry) => {
    if (category && entry.category !== category) return false;
    if (!normalized) return true;
    return [entry.name, entry.label, ...(SEARCH_ALIASES[entry.id] ?? [])].some((term) => normalize(term).includes(normalized));
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
