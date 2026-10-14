/**
 * Étape 8b du chantier « Pots et balcon » : le traitement naturel dans les réponses d'Observer.
 *
 * Observer (l'IA) ne fait que reconnaître le problème (`problem`, un identifiant de cette liste) ; le traitement
 * affiché est écrit ici, vérifié sur au moins 2 sources (docs/sources-traitements.md). Règles :
 * - les gestes à la main d'abord, une recette seulement quand elle est simple et sûre ;
 * - la dose la plus basse donnée par les sources (savon noir : 1 cuillère à soupe par litre au plus) ;
 * - jamais de produit chimique, aucune marque ; écartés aussi : huile de neem (pas autorisée pour le jardin amateur
 *   en France), bouillie bordelaise (cuivre qui s'accumule dans la terre), anti-limaces en granulés ;
 * - « Pas mieux dans 10 jours ? » : montrer la plante en jardinerie.
 */

export type ProblemId = "aphids" | "scale" | "spider-mites" | "whitefly" | "powdery-mildew" | "late-blight" | "slugs" | "caterpillars" | "fungus-gnats";

export type NaturalRemedy = {
  id: ProblemId;
  /** « pucerons » : le nom du problème, en minuscules (« Traitement naturel : pucerons »). */
  name: string;
  /** Pour l'IA : à quoi on le reconnaît sur une photo. */
  signs: string;
  /** Les gestes, dans l'ordre (à la main d'abord). */
  steps: string[];
  /** Une recette simple et sûre, s'il y en a une. */
  recipe?: string;
  /** Ce qui vaut pour ce problème en plus des précautions communes. */
  caution?: string;
};

export const NATURAL_REMEDIES: Record<ProblemId, NaturalRemedy> = {
  aphids: {
    id: "aphids",
    name: "pucerons",
    signs: "petits insectes verts, noirs ou gris serrés au bout des tiges ou sous les feuilles, feuilles collantes ou recroquevillées",
    steps: [
      "Écrase-les entre tes doigts ou chasse-les d'un jet d'eau, surtout sous les feuilles.",
      "Coupe les pointes couvertes de pucerons.",
      "Recommence tous les 3 ou 4 jours tant qu'il en reste.",
    ],
    recipe: "S'il en reste : 1 cuillère à soupe de savon noir liquide dans 1 litre d'eau, pas plus. Vaporise le soir, sur les pucerons et sous les feuilles.",
    caution: "Laisse faire les coccinelles : leurs larves mangent les pucerons.",
  },
  scale: {
    id: "scale",
    name: "cochenilles",
    signs: "petits amas blancs cotonneux ou petites carapaces brunes collées aux tiges et sous les feuilles, miellat collant",
    steps: [
      "Retire-les une à une avec un coton-tige trempé dans de l'alcool (70 ou 90°, en pharmacie).",
      "Rince ensuite les feuilles à l'eau claire.",
      "Isole la plante des autres et recommence chaque semaine : elles reviennent souvent.",
    ],
    caution: "Les cochenilles cotonneuses sont tenaces : il faut souvent plusieurs passages.",
  },
  "spider-mites": {
    id: "spider-mites",
    name: "araignées rouges",
    signs: "feuilles piquetées de petits points pâles, qui jaunissent, fines toiles sous les feuilles, par temps chaud et sec",
    steps: [
      "Éloigne-la des autres plantes : ces acariens passent de l'une à l'autre.",
      "Douche le dessous des feuilles, puis vaporise de l'eau matin et soir : ils détestent l'humidité.",
      "Coupe les feuilles les plus abîmées.",
    ],
  },
  whitefly: {
    id: "whitefly",
    name: "mouches blanches",
    signs: "petites mouches blanches qui s'envolent quand on touche la plante, larves plates sous les feuilles",
    steps: [
      "Secoue la plante et accroche un piège jaune englué juste au-dessus.",
      "Retire les feuilles du bas couvertes de larves.",
    ],
    recipe: "Si elles restent : 1 cuillère à soupe de savon noir liquide dans 1 litre d'eau, pas plus. Vaporise le soir sous les feuilles, tous les 4 ou 5 jours.",
  },
  "powdery-mildew": {
    id: "powdery-mildew",
    name: "oïdium (le blanc)",
    signs: "feutrage blanc ou gris comme de la farine sur les feuilles",
    steps: [
      "Coupe les feuilles blanches et jette-les à la poubelle, pas au compost.",
      "Arrose au pied, jamais sur les feuilles, et laisse de l'air autour de la plante.",
    ],
    recipe: "Au début : 5 g de bicarbonate de soude (une cuillère à café rase) dans 1 litre d'eau. Vaporise les feuilles le soir, une fois par semaine et après la pluie.",
    caution: "Le bicarbonate freine la maladie, il ne guérit pas les feuilles déjà blanches.",
  },
  "late-blight": {
    id: "late-blight",
    name: "mildiou",
    signs: "taches brunes qui s'étendent vite sur les feuilles, duvet blanc dessous par temps humide, tiges ou fruits qui brunissent (tomate surtout)",
    steps: [
      "Coupe tout de suite les feuilles tachées et jette-les à la poubelle, pas au compost.",
      "Arrose au pied, le matin, sans mouiller les feuilles.",
      "Mets le pot à l'abri de la pluie, avec de l'air autour.",
      "Nettoie tes ciseaux entre deux plantes.",
    ],
    caution: "Aucun remède naturel ne guérit le mildiou : si toute la plante est atteinte, retire-la.",
  },
  slugs: {
    id: "slugs",
    name: "limaces et escargots",
    signs: "feuilles trouées ou mangées depuis le bord, traces brillantes de bave",
    steps: [
      "Ramasse-les le soir, à la lampe, après la tombée de la nuit.",
      "Pose une tuile ou une planche près des pots : retourne-la le matin et ramasse ce qui s'y cache.",
      "Arrose le matin plutôt que le soir.",
    ],
  },
  caterpillars: {
    id: "caterpillars",
    name: "chenilles",
    signs: "feuilles dévorées, parfois jusqu'aux nervures, chenilles ou petits œufs jaunes groupés sous les feuilles",
    steps: [
      "Ramasse les chenilles à la main.",
      "Regarde sous les feuilles et retire les œufs groupés.",
      "Pour les choux et salades, un voile anti-insectes empêche les papillons de pondre.",
    ],
  },
  "fungus-gnats": {
    id: "fungus-gnats",
    name: "moucherons du terreau",
    signs: "petits moucherons noirs qui volent autour du pot et de la terre humide",
    steps: [
      "Laisse sécher le dessus de la terre entre deux arrosages et vide la soucoupe.",
      "Couvre la terre d'une fine couche de sable ou de gravier.",
      "Plante un piège jaune englué au ras de la terre pour attraper les adultes.",
    ],
  },
};

export const PROBLEM_IDS = Object.keys(NATURAL_REMEDIES) as ProblemId[];

/** Les précautions communes, sous chaque traitement naturel. */
export const REMEDY_PRECAUTIONS = [
  "Essaie d'abord sur une feuille et attends un jour.",
  "Jamais en plein soleil ni par forte chaleur : le soir, c'est mieux.",
  "Ne force pas la dose, même naturel.",
];
/** Pour une plante qu'on mange. */
export const REMEDY_EDIBLE_NOTE = "Rince bien avant de manger.";
export const REMEDY_EXPERT_NOTE = "Pas mieux dans 10 jours ? Montre-la en jardinerie.";

export function remedyFor(problem: string | null | undefined): NaturalRemedy | null {
  return problem && Object.hasOwn(NATURAL_REMEDIES, problem) ? NATURAL_REMEDIES[problem as ProblemId] : null;
}

/** Pour l'IA d'Observer : un problème par ligne, avec ses signes. */
export function problemGuide() {
  return PROBLEM_IDS.map((id) => `${id} : ${NATURAL_REMEDIES[id].name} (${NATURAL_REMEDIES[id].signs})`).join("\n");
}

/**
 * Le texte libre « Solution naturelle » d'Observer est écarté s'il parle d'un produit qu'on ne conseille pas
 * (chimique, cuivre, soufre, neem, granulés anti-limaces, eau de Javel…). Mieux vaut rien qu'un conseil risqué.
 */
const UNSAFE_REMEDY_WORDS = [
  /insecticide/i, /fongicide/i, /pesticide/i, /herbicide/i, /d[ée]sherbant/i, /phyto/i, /synth[èe]se/i, /chimique/i,
  /bouillie bordelaise/i, /cuivre/i, /soufre/i, /neem/i, /pyr[èe]thr/i, /rot[ée]none/i, /m[ée]tald[ée]hyde/i,
  /granul[ée]s? anti/i, /anti-?limaces?/i, /javel/i, /glyphosate/i, /sulfate/i,
];
export function isUnsafeRemedyText(text: string) {
  return UNSAFE_REMEDY_WORDS.some((pattern) => pattern.test(text));
}
