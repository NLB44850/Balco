/**
 * Les plantes toxiques ou irritantes du catalogue : ce qu'il faut savoir avant de l'installer, quand des enfants ou
 * des animaux passent sur le balcon. Affiché en orange (« à surveiller ») dans le catalogue, sur la fiche de la
 * plante, dans le détail de ses gestes et dans ses pas-à-pas (retour du 23/10 : « mets mieux en avant les
 * avertissements »).
 *
 * Sources : recherche web du 23 octobre 2026 (extraits des résultats). Seules les plantes dont la toxicité est
 * confirmée par une fiche de référence (ASPCA, jardin botanique, centre antipoison) ou par deux sites sont ici ; le
 * jasmin étoilé (sources contraires) et le muscari (aucune source trouvée) n'y sont pas.
 */
import type { CatalogPlant } from "./catalog";

export type PlantWarning = {
  /** En tête de la carte, court : « Feuilles toxiques ». */
  title: string;
  /** Ce qu'il faut faire, au tutoiement. */
  text: string;
  sources: string[];
};

export const WARNINGS: Record<string, PlantWarning> = {
  rhubarb: {
    title: "Feuilles toxiques",
    text: "Seules les tiges se mangent : coupe les feuilles et mets-les au compost, loin des enfants et des animaux.",
    sources: ["https://www.gardena.com/be-fr/actualites-jardin/magazine-jardin/rhubarbe---legume-ou-fruit/", "https://www.futura-sciences.com/maison/questions-reponses/jardinage-planter-pied-rhubarbe-18285/", "https://www.petpoisonhelpline.com/poison/rhubarb/"],
  },
  "morning-glory": {
    title: "Graines toxiques",
    text: "Garde les graines hors de portée des enfants et des animaux, et ne les sème pas dans un pot de légumes.",
    sources: ["https://www.jardiner-malin.fr/fiche/ipomea.html", "https://www.truffaut.com/ipomee-plantation-entretien.html"],
  },
  "sweet-pea": {
    title: "Graines toxiques",
    text: "Ses gousses ressemblent à des petits pois, mais elles ne se mangent pas.",
    sources: ["https://garden.rcplondon.ac.uk/Plant/Details/1761", "https://en.wikipedia.org/wiki/Lathyrism"],
  },
  tulip: {
    title: "Toxique pour les chats",
    text: "Surtout le bulbe : garde les bulbes hors de portée, et l’eau du vase aussi.",
    sources: ["https://aspca.org/node/5470", "https://www.petscare.com/fr/news/post/tulips-toxic-to-cats-guide"],
  },
  daffodil: {
    title: "Bulbe et feuilles toxiques",
    text: "Ne confonds pas le bulbe avec un oignon, et garde-le hors de portée des enfants et des animaux.",
    sources: ["https://www.demotivateur.fr/maison/ces-plantes-toxiques-dangereuses-qui-s-invitent-dans-nos-jardins-35190", "https://plantentuinmeise.be/cms_files/File/PLANTES%20TOXIQUES_web__txtFR.pdf"],
  },
  hellebore: {
    title: "Toute la plante est toxique",
    text: "Garde-la hors de portée des enfants et des animaux, et mets des gants pour la toucher.",
    sources: ["https://plantentuinmeise.be/cms_files/File/PLANTES%20TOXIQUES_web__txtFR.pdf", "https://www.jardiner-malin.fr/fiche/hellebore-noir.html"],
  },
  clematis: {
    title: "Sève irritante",
    text: "Toxique pour les chats et les chiens ; mets des gants pour la tailler.",
    sources: ["https://www.aspca.org/node/4767", "https://www.molenbeek.irisnet.be/fr/fichiers/environnement-energie/Molenbeautiful/molenbeautiful-annexe-1-fr.pdf"],
  },
  honeysuckle: {
    title: "Baies toxiques",
    text: "Ses petites baies ne se mangent pas : garde-les hors de portée des enfants et des animaux.",
    sources: ["https://www.chien.com/sante/chevrefeuille-chien-428-17097.php", "https://www.molenbeek.irisnet.be/fr/fichiers/environnement-energie/Molenbeautiful/molenbeautiful-annexe-1-fr.pdf"],
  },
  oleander: {
    title: "Très toxique",
    text: "Toute la plante : feuilles, tiges et fleurs. Mets des gants pour la tailler, et garde-la hors de portée des enfants et des animaux.",
    sources: ["https://www.truffaut.com/nerium-oleander-pot-15l-1032818.html", "https://espacepourlavie.ca/carnet-horticole/nerium"],
  },
  hydrangea: {
    title: "Toxique pour les animaux",
    text: "Surtout les feuilles et les boutons : garde-le hors de portée des chats et des chiens qui mâchonnent.",
    sources: ["https://www.chien.com/sante/plante-toxique-chien-428.php", "https://www.santevet.com/?p=35402"],
  },
};

export const warningOf = (entry: Pick<CatalogPlant, "id">): PlantWarning | null => WARNINGS[entry.id] ?? null;
