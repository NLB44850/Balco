/**
 * Les plantes frileuses face au froid de l'automne (chantier « Plante hors saison », docs/chantier-plante-hors-saison.md).
 *
 * Une plante frileuse souffre dès que les nuits fraîchissent, bien avant le gel : sa saison dehors finit. Pour chacune,
 * la température de nuit sous laquelle elle souffre, et si la rentrer à l'intérieur vaut la peine. Toutes les autres
 * plantes du catalogue sont rustiques : elles passent l'hiver dehors, au repos.
 *
 * Sources : recherche web du 15 octobre 2026 (extraits des résultats), détail plante par plante dans
 * docs/sources-froid.md. Une valeur confirmée par une seule source, ou reprise des seuils du catalogue faute de
 * mieux, est marquée `estimate` : l'app la dit « estimation Balco ».
 */
import type { CatalogPlant } from "./catalog";

/**
 * La rentrer vaut-elle la peine ?
 * - `winters` : elle passe l'hiver à l'abri et repart au printemps (piment, citronnier) ;
 * - `weeks` : elle tient seulement quelques semaines de plus (basilic, tomates) ;
 * - `no` : inutile, sa saison est finie.
 */
export type IndoorVerdict = "winters" | "weeks" | "no";

/** Où la garder : `light` près d'une fenêtre lumineuse, maison tempérée ; `cool` hors gel au frais (5 à 12 °C), presque au sec. */
export type IndoorPlace = "light" | "cool";

export type ColdTender = {
  /** Nuit (°C) sous laquelle elle souffre ou cesse de pousser. */
  nightC: number;
  /** Seuil confirmé par une seule source, ou repris du catalogue : affiché comme estimation. */
  nightEstimate?: true;
  indoor: IndoorVerdict;
  /** Verdict « à l'intérieur » confirmé par une seule source. */
  indoorEstimate?: true;
  place?: IndoorPlace;
  /** Ce qui compte pour elle, en une ligne. */
  note: string;
  sources: string[];
};

/** Les plantes frileuses : toutes les autres sont rustiques. */
export const COLD_TENDER: Record<string, ColdTender> = {
  // --- Aromatiques ----------------------------------------------------------
  basil: {
    nightC: 10, indoor: "weeks", indoorEstimate: true, place: "light",
    note: "Ralentit sous 10-12 °C, noircit et dépérit vers 5 °C. Rentré, il survit sans vraiment pousser.",
    sources: ["https://www.jardiner-malin.fr/fiche/basilic.html", "https://www.jardiner-malin.fr/fiche/basilic-en-pot.html", "https://luberon.fr/luberon/parc-naturel-regional/flore/annu+basilic-dans-le-luberon+2334.html", "https://www.synonyme-du-mot.com/les-articles/ou-mettre-son-basilic-lhiver"],
  },
  dill: {
    nightC: 2, nightEstimate: true, indoor: "no",
    note: "Annuelle qui craint le gel et se ressème ; les sources ne donnent pas de seuil de nuit.",
    sources: ["https://www.futura-sciences.com/planete/definitions/botanique-aneth-20089/", "https://www.croq-kilos.com/actus/5-erreurs-a-eviter-quand-on-plante-de-laneth-dans-son-jardin"],
  },
  shiso: {
    nightC: 5, nightEstimate: true, indoor: "weeks", indoorEstimate: true, place: "light",
    note: "Feuilles jusqu'à 5 °C, disparaît en hiver ; rentré hors gel, la récolte se prolonge un peu.",
    sources: ["https://www.jardiner-malin.fr/fiche/potager/shiso.html", "https://www.futura-sciences.com/planete/definitions/botanique-shiso-21068/"],
  },
  lemongrass: {
    nightC: 10, indoor: "winters", place: "cool",
    note: "Feuillage abîmé sous 10 °C, gélive vers -1 °C ; hiverne au frais (5-10 °C), presque au sec.",
    sources: ["https://www.jardiner-malin.fr/fiche/citronnelle.html", "https://www.torontomastergardeners.ca/askagardener/lemongrass/", "https://kokopelli-semences.fr/en/p/lemongrass-2-organic-plants"],
  },
  "lemon-verbena": {
    nightC: 3, nightEstimate: true, indoor: "winters", place: "cool",
    note: "Supporte environ -5 °C ; en pot, hiverne hors gel en véranda ou serre froide, perd ses feuilles.",
    sources: ["https://www.jardiner-malin.fr/fiche/verveine-citronnelle-bienfaits-plantation-entretien.html", "https://www.truffaut.com/verveine-citronnelle-ctr-2-5-litres-320100.html", "https://shireplants.co.uk/aloysia-citrodora-lemon-verbena"],
  },
  stevia: {
    nightC: 5, nightEstimate: true, indoor: "winters", place: "cool",
    note: "Feuillage perdu vers -5 °C ; hiverne hors gel, au clair, tiges coupées, arrosée très peu.",
    sources: ["https://www.truffaut.com/stevia-varietes-culture-utilisation.html", "https://www.futura-sciences.com/maison/questions-reponses/jardinage-reussir-culture-stevia-15968/", "https://www.jardiner-malin.fr/fiche/stevia.html"],
  },
  "pineapple-sage": {
    nightC: 0, nightEstimate: true, indoor: "winters", place: "cool",
    note: "Ne résiste pas sous -7 °C ; en pot, à rentrer hors gel, sans eau dans la soucoupe.",
    sources: ["https://www.aroma-zone.com/page/sauge-ananas-salvia-elegans-definitions-proprietes-et-bienfaits", "https://www.truffaut.com/sauge-ananas-ctr-1-litre-117143.html", "https://www.jardiner-malin.fr/fiche/sauge-en-pot.html"],
  },
  // --- Légumes-fruits -------------------------------------------------------
  "cherry-tomato": {
    nightC: 10, indoor: "weeks", indoorEstimate: true, place: "light",
    note: "Sous 10 °C la nuit, plus rien ne mûrit sur pied ; garder le pied tout l'hiver n'est pas conseillé.",
    sources: ["https://www.gammvert.fr/conseils-idees/comment-cultiver-les-tomates-sous-serre", "https://jardinerfacile.fr/les-tomates-encore-vertes-a-ramasser-avant-les-premieres-gelees-ce-qu-il-faut-poser-dans-le-cageot-pour-qu-elles-rougissent-quand-meme/", "https://edito.seloger.com/node/21509"],
  },
  "dwarf-tomato": {
    nightC: 10, indoor: "weeks", indoorEstimate: true, place: "light",
    note: "Comme les tomates cerises : plus rien ne mûrit sous 10 °C la nuit.",
    sources: ["https://www.gammvert.fr/conseils-idees/comment-cultiver-les-tomates-sous-serre", "https://jardinerfacile.fr/les-tomates-encore-vertes-a-ramasser-avant-les-premieres-gelees-ce-qu-il-faut-poser-dans-le-cageot-pour-qu-elles-rougissent-quand-meme/"],
  },
  chili: {
    nightC: 13, indoor: "winters", place: "light",
    note: "Nuits pas sous 13 °C ; en pot, il passe l'hiver près d'une fenêtre et vit plusieurs années.",
    sources: ["https://www.gammvert.fr/conseils-idees/entretien-des-pieds-de-piment", "https://kokopelli-semences.fr/fr/page/reussir-la-culture-du-poivron-et-du-piment", "https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/cultiver-des-poivrons-et-des-piments-en-pot/"],
  },
  "sweet-pepper": {
    nightC: 10, indoor: "winters", place: "light",
    note: "Limite 10 °C la nuit ; vivace de 3-4 ans, il garde ses feuilles près d'une fenêtre.",
    sources: ["https://www.gammvert.fr/conseils-idees/entretien-des-pieds-de-poivrons", "https://www.gerbeaud.com/jardin/fiches/poivrons-vivaces-conserver-plusieurs-annees,3211.html", "https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/cultiver-des-poivrons-et-des-piments-en-pot/"],
  },
  eggplant: {
    nightC: 12, nightEstimate: true, indoor: "no",
    note: "La croissance s'arrête sous 12 °C ; aucune source ne conseille de l'hiverner.",
    sources: ["https://www.techno-science.net/glossaire-definition/Aubergine.html", "https://www.truffaut.com/aubergine-varietes-plantation-culture.html", "https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/aubergine-culture-recolte-semis/"],
  },
  physalis: {
    nightC: 5, nightEstimate: true, indoor: "winters", place: "cool",
    note: "Meurt aux premières vraies gelées ; taillé, il hiverne à 5-10 °C, motte à peine humide.",
    sources: ["https://www.gerbeaud.com/jardin/fiches/coqueret-du-perou-semis-culture-recolte.php", "https://www.truffaut.com/jardin-dans-le-sac-coqueret-du-perou-100-graines-physalis-peruviana.html", "https://www.hornbach.ch/projets/planter-les-physalis/"],
  },
  tomatillo: {
    nightC: 7, nightEstimate: true, indoor: "no",
    note: "Craint le froid, succombe aux premières gelées ; cultivé en annuelle.",
    sources: ["https://www.jardiner-malin.fr/fiche/potager/tomatillo.html", "https://www.fermedesaintemarthe.com/en/blogs/comment-reussir-la-culture-de/reussir-la-culture-des-tomatillos"],
  },
  okra: {
    nightC: 15, indoor: "no",
    note: "S'arrête sous 15 °C ; annuelle sous nos climats.",
    sources: ["https://www.gerbeaud.com/jardin/fiches/gombo-culture,1704.html", "https://www.jardiner-malin.fr/fiche/gombo.html"],
  },
  zucchini: {
    nightC: 10, indoor: "no",
    note: "Il lui faut au moins 8-10 °C pour se développer ; très sensible au gel.",
    sources: ["https://gers.chambre-agriculture.fr/fileadmin/user_upload/Occitanie/067_Inst-Gers/documents/agriculturebiologique/Bulletins_techniques/maraichage/CDA31-fiche_courge-10-2022-.pdf", "https://www.agrobio-bretagne.org/wp-content/uploads/2010/09/Courgettes.pdf", "https://www.truffaut.com/plants-courgettes-mix-barquette-3-plants-547589.html"],
  },
  "mini-cucumber": {
    nightC: 12, indoor: "no",
    note: "Ne pousse plus sous 12 °C ; craint le gel.",
    sources: ["https://correze.chambre-agriculture.fr/fileadmin/user_upload/National/FAL_commun/publications/Nouvelle-Aquitaine/Guide_plants_bio_FichesTechniques_9legumes_2013.pdf", "https://www.futura-sciences.com/maison/questions-reponses/jardin-concombre-plantation-culture-entretien-9308/"],
  },
  cucamelon: {
    nightC: 6, nightEstimate: true, indoor: "winters", place: "cool",
    note: "Racines tubérisées : feuillage mort coupé, le pot hiverne au frais hors gel, presque au sec.",
    sources: ["https://savvygardening.com/cucamelon-tubers/", "https://hort.extension.wisc.edu/articles/mouse-melon-or-mexican-sour-cucumber-melothria-scabra/"],
  },
  "west-indian-gherkin": {
    nightC: 8, nightEstimate: true, indoor: "no",
    note: "Gélif, vivace chez lui mais cultivé en annuelle ; pas de seuil de nuit trouvé.",
    sources: ["https://www.fermedesaintemarthe.com/en/products/concombre-des-antilles-ab", "https://www.truffaut.com/graines-de-concombre-des-antilles-cucumis-anguria-le-sachet-de-100-graines-environ-1g.html"],
  },
  "mini-melon": {
    nightC: 12, indoor: "no",
    note: "Il lui faut plus de 12 °C pour pousser (15 °C la nuit selon certains) ; gélif.",
    sources: ["https://www.jardiner-malin.fr/fiche/melon-hiver-noel.html", "https://cucurbit.info/?p=246", "https://www.jardiner-malin.fr/fiche/culture-melon.html"],
  },
  "dwarf-bean": {
    nightC: 10, indoor: "no",
    note: "Pas de croissance sous 10 °C ; très sensible au gel.",
    sources: ["https://www.bricomarche.com/p/haricot-nain-a-filet-triomphe-de-farcy/3211500010988", "https://www.consoglobe.com/?p=338163", "https://genebanks.cgiar.org/resources/publications/beans-fr"],
  },
  "pole-bean": {
    nightC: 10, indoor: "no",
    note: "Même espèce que le haricot nain : pas de croissance sous 10 °C.",
    sources: ["https://www.futura-sciences.com/maison/questions-reponses/jardin-reussir-culture-haricots-verts-22562/", "https://www.consoglobe.com/?p=338163"],
  },
  "yardlong-bean": {
    nightC: 10, nightEstimate: true, indoor: "no",
    note: "Plante de chaleur, limite basse vers 10 °C ; annuelle.",
    sources: ["https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=10835"],
  },
  // --- Légumes-feuilles -----------------------------------------------------
  purslane: {
    nightC: 6, nightEstimate: true, indoor: "no",
    note: "Annuelle d'été, récoltée jusqu'aux premières gelées.",
    sources: ["https://www.truffaut.com/pourpier-semis-culture-recolte.html", "https://www.jardiner-malin.fr/fiche/pourpier.html"],
  },
  "nz-spinach": {
    nightC: 2, nightEstimate: true, indoor: "no",
    note: "Craint le froid, récoltée jusqu'aux premières gelées.",
    sources: ["https://www.futura-sciences.com/planete/definitions/botanique-tetragone-21040/", "https://www.bricomarche.com/p/tetragone-cornue/3211500008787"],
  },
  "malabar-spinach": {
    nightC: 15, nightEstimate: true, indoor: "no",
    note: "Grimpante tropicale : 15 °C au moins pour pousser, gèle à 0 °C ; sans serre, l'hiverner ne vaut guère la peine.",
    sources: ["https://www.jardiner-malin.fr/fiche/baselle.html", "https://hartley-botanic.co.uk/magazine/basella-or-tropical-spinach/"],
  },
  "ice-plant": {
    nightC: 3, nightEstimate: true, indoor: "no",
    note: "Gélive, cultivée en annuelle, récoltée jusqu'en octobre.",
    sources: ["https://www.jardiner-malin.fr/fiche/ficoide.html", "https://www.fermedesaintemarthe.com/en/products/ficoide-glaciale-nt"],
  },
  // --- Racines --------------------------------------------------------------
  potato: {
    nightC: 1, nightEstimate: true, indoor: "no",
    note: "Le gel brûle le feuillage ; récoltée l'été, il n'y a rien à hiverner.",
    sources: ["https://www.plantdepommedeterre.org/en/maladie-ravageur/frost-or-cold-damage/", "https://www.gammvert.fr/conseils-idees/entretien-des-pommes-de-terre"],
  },
  oca: {
    nightC: 0, nightEstimate: true, indoor: "no",
    note: "Ses tubercules grossissent en automne : on la protège des premières gelées et on récolte quand le feuillage a gelé.",
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/oca-du-perou-culture-plantation-recolte/", "https://www.gerbeaud.com/jardin/fiches/oca-du-perou,1170.html", "https://www.gammvert.fr/conseils-idees/planter-l-oca-du-perou"],
  },
  // --- Fleurs ---------------------------------------------------------------
  nasturtium: {
    nightC: 3, nightEstimate: true, indoor: "no",
    note: "Gélive, disparaît dès les premières gelées ; on la ressème.",
    sources: ["https://www.aujardin.info/plantes/capucine.php", "https://www.promessedefleurs.com/annuelles/graines-de-fleurs/graines-de-fleurs-par-variete/graines-de-capucines/capucine-grimpante-en-mel.html"],
  },
  cosmos: {
    nightC: 3, nightEstimate: true, indoor: "no",
    note: "Ne supporte pas les gelées, cultivé en annuelle.",
    sources: ["https://www.jardiland.com/conseils-idees/cosmos-varietes-plantation-entretien", "https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/cosmos-semis-et-plantation/"],
  },
  marigold: {
    nightC: 3, nightEstimate: true, indoor: "no",
    note: "Gèle au premier coup de froid ; toute protection est inutile.",
    sources: ["https://www.truffaut.com/cultiver-oeillet-inde-tagete.html", "https://www.aujardin.info/plantes/oeillet_d_inde.php"],
  },
  "dwarf-sunflower": {
    nightC: 3, nightEstimate: true, indoor: "no",
    note: "Gélif, cultivé en annuelle.",
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/tournesol-semis-plantation-entretien/", "https://www.truffaut.com/soleil-tournesol-nain-jaune-big-smile-765252.html"],
  },
  zinnia: {
    nightC: 10, nightEstimate: true, indoor: "no",
    note: "Ne se développe pas par temps froid, retiré après les premières gelées.",
    sources: ["https://www.gerbeaud.com/jardin/fiches/zinnia.php", "https://www.jardiner-malin.fr/fiche/zinnia.html"],
  },
  dahlia: {
    nightC: 0, indoor: "winters", place: "cool",
    note: "Attendre que le gel noircisse le feuillage, couper à 10-15 cm, rentrer le pot au sec hors gel (5-8 °C), sans arroser.",
    sources: ["https://www.gerbeaud.com/jardin/fiches/fp_dahlias_hivernage.php3", "https://www.aujardin.info/fiches/dahlias-cannas-glaieuls-gestes-essentiels-avant-premieres-gelees.php", "https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/dahlia-en-pot/"],
  },
  // --- Petits fruits --------------------------------------------------------
  "lemon-tree": {
    nightC: 5, indoor: "winters", place: "cool",
    note: "À rentrer dès 5 °C ; hiverne au clair, entre 5 et 12 °C, loin d'une pièce chauffée.",
    sources: ["https://www.jardiner-malin.fr/fiche/hivernage-citronnier.html", "https://www.truffaut.com/comment-planter-tailler-entretenir-citronnier.html", "https://www.jardiland.com/conseils-idees/hivernage-entretien-agrumes-hiver"],
  },
  kumquat: {
    nightC: 3, nightEstimate: true, indoor: "winters", place: "cool",
    note: "À rentrer avant les nuits froides (-2 °C en pot, fruits abîmés dès -4 °C) ; hiverne au clair, entre 5 et 12 °C.",
    sources: ["https://www.truffaut.com/cultiver-kumquat.html", "https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/cultiver-le-kumquat/", "https://www.jardiner-malin.fr/fiche/resistance-au-gel-des-agrumes-en-hiver.html"],
  },
  pomegranate: {
    nightC: 0, nightEstimate: true, indoor: "winters", place: "cool",
    note: "À rentrer aux premières nuits de gel ; hiverne au frais et au clair, sans feuilles : un peu de froid l'aide à refleurir.",
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/grenadier-en-pot-plantation-taille-arrosage/", "https://www.gammvert.fr/conseils/conseils-de-jardinage/entretien-du-grenadier-en-bac"],
  },
  // --- Livraison 3 (23/10) : grimpantes et légumes ----------------------------------------------------------
  "morning-glory": {
    nightC: 5, nightEstimate: true, indoor: "no",
    note: "Annuelle gélive : elle fleurit jusqu'aux premières gelées, puis on la ressème au printemps.",
    sources: ["https://www.jardiner-malin.fr/fiche/ipomea.html", "https://www.futura-sciences.com/maison/questions-reponses/jardinage-annuelles-grimpantes-semer-printemps-22433/"],
  },
  "sweet-potato": {
    nightC: 10, indoor: "no",
    note: "Il lui faut au moins 10 °C ; on vide le pot quand les feuilles jaunissent, avant le gel.",
    sources: ["https://www.futura-sciences.com/maison/questions-reponses/jardinage-demarrer-culture-patates-douces-18577/", "https://www.truffaut.com/patate-douce-bonita-pot-diametre-10-5-cm-546962.html"],
  },
  "kuri-squash": {
    nightC: 10, nightEstimate: true, indoor: "no",
    note: "Craint le gel comme toutes les courges : on récolte les fruits avant les premières gelées.",
    sources: ["https://www.jardiner-malin.fr/fiche/potimarron.html", "https://www.truffaut.com/planter-potimarron.html"],
  },
};

/**
 * Plantes que les alertes gel protègent (`care.frostSensitive`) mais qui ne sont pas frileuses au sens de ce
 * chantier : elles passent l'hiver dehors, pot protégé, ou se cultivent toute l'année.
 */
export const NOT_COLD_TENDER: Record<string, string> = {
  rosemary: "Rustique en pot jusque vers -10 °C, pot protégé (voile, pied paillé) : il reste dehors.",
  microgreens: "Semées toute l'année, à l'intérieur l'hiver : pas de fin de saison.",
  "olive-tree": "Tient en pot jusque vers -5 °C : il reste dehors, pot isolé, et ne s'abrite que quand le froid dure.",
  "star-jasmine": "La souche tient vers -10 °C, le feuillage souffre dès -5 °C : il reste dehors, pied paillé et pot isolé.",
  passionflower: "Repart de la souche après un hiver froid : dehors, pied paillé ; à rentrer hors gel seulement si le froid passe souvent sous -8 °C.",
  artichoke: "Vivace qui reste dehors : feuilles coupées, pied paillé et pot isolé, voile quand il gèle fort.",
  oleander: "Tient vers -5 °C en pot, pot isolé et voile ; si le froid dure, se rentre au frais et au clair (5 à 15 °C).",
};

export const coldTenderOf = (entry: Pick<CatalogPlant, "id">): ColdTender | undefined => COLD_TENDER[entry.id];

/** Frileuse : souffre au froid avant le gel, sa saison dehors finit à l'automne. */
export const isColdTender = (entry: Pick<CatalogPlant, "id">) => entry.id in COLD_TENDER;

/** La rentrer vaut-elle la peine (« oui, elle passe l'hiver » ou « quelques semaines de plus ») ? */
export const canComeIndoors = (entry: Pick<CatalogPlant, "id">) => (COLD_TENDER[entry.id]?.indoor ?? "no") !== "no";
