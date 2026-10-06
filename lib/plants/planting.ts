/**
 * Comment semer ou planter chaque plante, en pot : profondeur, graines par trou, plants par pot, écart, levée,
 * délai avant la première récolte (ou floraison), éclaircissage et pincement. Base du pas-à-pas pour planter
 * (« Ce qu'il te faut », les étapes, « Et après ? ») et des gestes de suite.
 *
 * Vérifié le 6 octobre 2026 par recherche web (2 sources concordantes au moins, culture en pot, repère Paris) ;
 * quand les sources divergeaient, la fourchette couvre les deux. Détail des choix : docs/sources-calendrier.md.
 * Généré une fois puis relu ; à corriger à la main au besoin.
 */

export type Planting = {
  /** Profondeur de semis en cm (0 : graine posée en surface) ; null si la plante ne se sème pas. */
  sowDepthCm: number | null;
  /** Graines par trou (0 : semis en ligne fine ou à la volée) ; null si pas de semis. */
  seedsPerHole: number | null;
  /** Plants à garder dans un pot du volume conseillé (0 : semis dense coupé jeune). */
  perPot: number;
  /** Écart entre deux plants, en cm (0 : semis dense). */
  spacingCm: number;
  /** Jours avant que les pousses sortent. */
  germinationDays: [number, number] | null;
  /** Semaines du semis à la première récolte (ou floraison). */
  harvestWeeksFromSowing: [number, number] | null;
  /** Semaines de la plantation d'un plant à la première récolte (ou floraison). */
  harvestWeeksFromPlanting: [number, number] | null;
  /** Éclaircir après la levée : arracher les pousses en trop. */
  thinning: boolean;
  /** Pincer, étêter, couper les stolons… quand c'est vraiment utile (phrase au tutoiement). */
  pinching: string | null;
  sources: string[];
};

export const PLANTING: Record<string, Planting> = {
  "basil": {
    sowDepthCm: 0.3, seedsPerHole: 3, perPot: 1, spacingCm: 25,
    germinationDays: [5, 15], harvestWeeksFromSowing: [6, 10], harvestWeeksFromPlanting: [3, 5],
    thinning: true, pinching: "Pince la tige au-dessus de la 3ᵉ ou 4ᵉ paire de feuilles, puis coupe les fleurs dès qu'elles apparaissent.",
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/tutoriel/semis-basilic/", "https://tous-au-potager.fr/semis-basilic/", "https://www.truffaut.com/semis-basilic-conseil.html", "https://www.tomlejardinier.com/cultiver-son-potager/basilic"],
  },
  "mint": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 30,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [4, 8],
    thinning: false, pinching: "Coupe le bout des tiges au-dessus d'une paire de feuilles pour qu'elle reste touffue.",
    sources: ["https://www.truffaut.com/menthe-varietes-plantation-entretien.html", "https://www.jardiland.com/conseils-idees/menthe-plantation-entretien-recolte", "https://www.tomlejardinier.com/cultiver-son-potager/menthe"],
  },
  "parsley": {
    sowDepthCm: 1, seedsPerHole: 3, perPot: 3, spacingCm: 10,
    germinationDays: [14, 28], harvestWeeksFromSowing: [10, 13], harvestWeeksFromPlanting: [3, 5],
    thinning: true, pinching: null,
    sources: ["https://kokopelli-semences.fr/fr/page/reussir-la-culture-du-persil", "https://www.jardiner-malin.fr/fiche/persil.html", "https://www.tomlejardinier.com/cultiver-son-potager/persil"],
  },
  "chives": {
    sowDepthCm: 0.5, seedsPerHole: 6, perPot: 1, spacingCm: 20,
    germinationDays: [10, 25], harvestWeeksFromSowing: [8, 13], harvestWeeksFromPlanting: [3, 6],
    thinning: false, pinching: null,
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/ciboulette-planter-semer-diviser/", "https://potagermaestro.fr/culture-ciboulette-jardin-pot-guide-complet/", "https://www.tomlejardinier.com/que-faire-au-potager/tache/semer-la-ciboulette"],
  },
  "thyme": {
    sowDepthCm: 0, seedsPerHole: 3, perPot: 1, spacingCm: 25,
    germinationDays: [14, 25], harvestWeeksFromSowing: [12, 16], harvestWeeksFromPlanting: [4, 8],
    thinning: true, pinching: "Après la floraison, coupe les tiges d'un tiers pour garder une touffe dense.",
    sources: ["https://www.quand-semer.fr/planter-thym/", "https://main-verte-marion.fr/quand-et-comment-reussir-un-semis-de-thym/", "https://www.guidedejardinage.com/semer-thym-recolte/"],
  },
  "rosemary": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 60,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [4, 8],
    thinning: false, pinching: null,
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/cultiver-un-romarin-en-pot-taille-du-romarin-planter-du-romarin/", "https://www.jardiner-malin.fr/fiche/romarin-en-pot.html", "https://www.tomlejardinier.com/cultiver-son-potager/romarin"],
  },
  "coriander": {
    sowDepthCm: 1, seedsPerHole: 3, perPot: 3, spacingCm: 10,
    germinationDays: [10, 21], harvestWeeksFromSowing: [6, 10], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://kokopelli-semences.fr/fr/page/reussir-la-culture-de-la-coriandre", "https://www.autonomiejardin.com/autour-du-jardin/au-potager/coriandre/", "https://www.tomlejardinier.com/cultiver-son-potager/coriandre"],
  },
  "sage": {
    sowDepthCm: 1, seedsPerHole: 3, perPot: 1, spacingCm: 40,
    germinationDays: [10, 25], harvestWeeksFromSowing: [9, 16], harvestWeeksFromPlanting: [4, 8],
    thinning: true, pinching: "Au printemps, pince le bout des jeunes tiges pour qu'elle se ramifie.",
    sources: ["https://www.lasemencebio.com/sauge/233-semences-bio-reproductibles-sauge-officinale-bio.html", "https://www.semaille.com/fr/vivaces-et-bisannuelles/292-sauge-officinale-5415166001115.html", "https://www.fermedesaintemarthe.com/en/blogs/comment-reussir-la-culture-de/reussir-la-culture-de-la-sauge"],
  },
  "oregano": {
    sowDepthCm: 0, seedsPerHole: 5, perPot: 1, spacingCm: 25,
    germinationDays: [10, 20], harvestWeeksFromSowing: [13, 17], harvestWeeksFromPlanting: [4, 8],
    thinning: true, pinching: null,
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/origan-semis-culture-recolte/", "https://www.semaille.com/fr/vivaces-et-bisannuelles/285-origan-commun-5415166000965.html", "https://jardinzone.fr/aromatiques/origan/"],
  },
  "dill": {
    sowDepthCm: 1, seedsPerHole: 3, perPot: 2, spacingCm: 25,
    germinationDays: [7, 14], harvestWeeksFromSowing: [4, 8], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://kokopelli-semences.fr/fr/page/reussir-la-culture-de-l-aneth", "https://www.truffaut.com/aneth-varietes-plantation-culture.html", "https://www.tomlejardinier.com/cultiver-son-potager/aneth"],
  },
  "lemon-balm": {
    sowDepthCm: 0, seedsPerHole: 4, perPot: 1, spacingCm: 40,
    germinationDays: [10, 30], harvestWeeksFromSowing: [7, 20], harvestWeeksFromPlanting: [3, 6],
    thinning: true, pinching: "Fin juin, rabats-la de moitié pour une 2ᵉ récolte de feuilles tendres.",
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/melisse-semis-plantation-culture/", "https://www.graines-semences.com/plantes-aromatiques-et-medicinales/265-melisse-officinale-150-graines-5420000009837.html", "https://www.gerbeaud.com/jardin/fiches/melisse.php", "https://www.jardiner-malin.fr/fiche/melisse-citronnelle.html"],
  },
  "lemon-verbena": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 50,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [8, 13],
    thinning: false, pinching: "En été, pince le bout des tiges pour qu'elle se ramifie.",
    sources: ["https://www.jardiner-malin.fr/fiche/verveine-citronnelle-bienfaits-plantation-entretien.html", "https://www.gerbeaud.com/jardin/fiches/verveine-citronnelle.php", "https://www.lapousseverte.fr/2021/06/04/verveine-citronnelle-conseils-jardinage-pour-votre-plante/"],
  },
  "tarragon": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 35,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [3, 8],
    thinning: false, pinching: null,
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/estragon-en-pot/", "https://www.jardiner-malin.fr/fiche/estragon.html", "https://www.autonomiejardin.com/autour-du-jardin/au-potager/estragon/"],
  },
  "chervil": {
    sowDepthCm: 0.5, seedsPerHole: 0, perPot: 5, spacingCm: 10,
    germinationDays: [8, 15], harvestWeeksFromSowing: [4, 8], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://www.gerbeaud.com/jardin/fiches/cerfeuil.php", "https://www.jardiner-malin.fr/fiche/cerfeuil-semis-recolte.html", "https://www.fermedesaintemarthe.com/en/blogs/comment-reussir-la-culture-de/reussir-la-culture-du-cerfeuil-commun-et-frise"],
  },
  "savory": {
    sowDepthCm: 0.5, seedsPerHole: 3, perPot: 1, spacingCm: 25,
    germinationDays: [8, 28], harvestWeeksFromSowing: [13, 16], harvestWeeksFromPlanting: [4, 8],
    thinning: true, pinching: null,
    sources: ["https://www.lasemencebio.com/sarriette/232-semences-bio-reproductibles-sarriette-vivace-bio.html", "https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/sarriette-semis-culture-recolte/", "https://jardinzone.fr/aromatiques/sarriette/", "https://www.jardiner-malin.fr/fiche/sarriette-commune.html"],
  },
  "shiso": {
    sowDepthCm: 0, seedsPerHole: 3, perPot: 1, spacingCm: 30,
    germinationDays: [7, 21], harvestWeeksFromSowing: [7, 12], harvestWeeksFromPlanting: [3, 6],
    thinning: true, pinching: "Quand la plante fait 20 cm, pince le bout des tiges pour qu'elle se ramifie.",
    sources: ["https://www.un-jardin-bio.com/le-shiso-ou-perilla/", "https://www.semaille.com/fr/annuelles/271-perilla-pourpre-ou-shiso-5415166000569.html", "https://www.jardiner-malin.fr/fiche/potager/shiso.html", "https://www.graines-et-bio.fr/blog/article/semis-de-shiso"],
  },
  "lemongrass": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 50,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [12, 17],
    thinning: false, pinching: null,
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/cultiver-citronnelle-pot/", "https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/citronnelle-semis-culture-recolte/", "https://www.lovethegarden.com/fr-fr/guides-des-culture/comment-faire-pousser-et-entretenir-de-la-citronnelle"],
  },
  "stevia": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 40,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [6, 10],
    thinning: false, pinching: "Pince le bout des tiges au début de la croissance pour qu'elle buissonne, et coupe les boutons de fleurs en été.",
    sources: ["https://www.truffaut.com/stevia-varietes-culture-utilisation.html", "https://www.compo.be/fr/conseil/plantes/herbes-aromatiques-fruits-legumes/stevia", "https://www.algoflash.fr/conseils-et-inspirations/portraits-de-plantes/jardin-comestible/stevia"],
  },
  "hyssop": {
    sowDepthCm: 0.3, seedsPerHole: 3, perPot: 1, spacingCm: 35,
    germinationDays: [14, 28], harvestWeeksFromSowing: [16, 24], harvestWeeksFromPlanting: [6, 12],
    thinning: true, pinching: null,
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/hysope-hyssopus-officinale-semis-plantation-culture-bienfaits/", "https://www.papypotager.fr/plantes/hysope", "https://www.lasemencebio.com/hysope/565-HYSOPE-officinale-Bio.html", "https://www.senteursduquercy.com/content/94-hyssopus-guide-de-culture-taille-et-avantages-des-hysopes-en-jardin"],
  },
  "wild-garlic": {
    sowDepthCm: 0.5, seedsPerHole: 3, perPot: 4, spacingCm: 15,
    germinationDays: [120, 200], harvestWeeksFromSowing: [52, 104], harvestWeeksFromPlanting: [20, 52],
    thinning: false, pinching: null,
    sources: ["https://www.truffaut.com/ail-des-ours.html", "https://www.jardiner-malin.fr/fiche/ail-des-ours.html", "https://www.lasemencebio.com/ail-des-ours/626-ail-des-ours-graines-bio.html", "https://monbalconpotager.com/cultiver-ail-des-ours-balcon/"],
  },
  "agastache": {
    sowDepthCm: 0, seedsPerHole: 3, perPot: 1, spacingCm: 40,
    germinationDays: [7, 20], harvestWeeksFromSowing: [16, 22], harvestWeeksFromPlanting: [6, 12],
    thinning: true, pinching: null,
    sources: ["https://pensezsauvage.org/graines_bio_d_aromatiques/agastache", "https://www.tomlejardinier.com/cultiver-son-potager/agastache", "https://www.graines-et-bio.fr/blog/article/semis-de-lagastache-anisee"],
  },
  "lovage": {
    sowDepthCm: 1, seedsPerHole: 3, perPot: 1, spacingCm: 50,
    germinationDays: [10, 20], harvestWeeksFromSowing: [26, 52], harvestWeeksFromPlanting: [6, 12],
    thinning: true, pinching: null,
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/liveche-ache-des-montagnes-semer-planter-cultiver/", "https://www.papypotager.fr/plantes/liveche", "https://jardin-secrets.com/liveche.html", "https://www.graines-bocquet.fr/955-ache-de-montagne-celeri-perpetuel.html"],
  },
  "oyster-plant": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 30,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [6, 12],
    thinning: false, pinching: null,
    sources: ["https://www.jardiner-malin.fr/fiche/mertensia-maritima-plante-huitre.html", "https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/mertensia-maritima-semis-culture-recolte/", "https://www.alsagarden.com/blog/mertensia-maritima-plante-comestible-gout-huitre-de-la-graine-a-lasiette/"],
  },
  "pineapple-sage": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 50,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [4, 8],
    thinning: false, pinching: "Jusqu'en juillet, pince le bout des tiges pour une touffe plus dense.",
    sources: ["https://www.aujardin.info/plantes/salvia-elegans.php", "https://www.plantearomatique.com/content/79-sauge-ananas", "https://www.picturethisai.com/fr/care/Salvia_elegans.html"],
  },
  "cherry-tomato": {
    sowDepthCm: 0.5, seedsPerHole: 2, perPot: 1, spacingCm: 50,
    germinationDays: [5, 11], harvestWeeksFromSowing: [14, 20], harvestWeeksFromPlanting: [8, 12],
    thinning: true, pinching: "Enlève quelques gourmands si le plant devient trop touffu, et étête fin août pour faire mûrir les dernières grappes.",
    sources: ["https://kokopelli-semences.fr/fr/page/cultiver-les-tomates-cerises-en-pot", "https://www.jardiner-malin.fr/fiche/tomate-cerise.html", "https://www.feuilles-et-balcon.fr/potager-balcon/legumes-fruits/tomates-cerises-en-pot/", "https://www.jardiland.com/conseils-idees/planter-tomates-cerises"],
  },
  "chili": {
    sowDepthCm: 0.5, seedsPerHole: 2, perPot: 1, spacingCm: 40,
    germinationDays: [7, 21], harvestWeeksFromSowing: [20, 26], harvestWeeksFromPlanting: [9, 13],
    thinning: true, pinching: "Pince la pointe de la tige quand le plant fait 15 à 20 cm, pour qu'il se ramifie.",
    sources: ["https://www.mondojardin.fr/astuces-faire-pousser-piments/", "https://www.tomlejardinier.com/cultiver-son-potager/piment", "https://www.terrevivante.org/contenu/culture-piment-varietes-plantation-entretien-recolte/", "https://www.inferno-peppers.fr/cultiver-piment-en-pot"],
  },
  "strawberry": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 25,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [8, 40],
    thinning: false, pinching: "Coupe les stolons au fur et à mesure pour garder la force du pied.",
    sources: ["https://www.gammvert.fr/conseils-idees/fraisier", "https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/fraisier-planter-tailler-et-entretenir/", "https://www.jardiner-malin.fr/fiche/fraisier.html", "https://dcm-info.fr/hobby/conseils/planter-et-entretenir-les-fraisiers-tout-ce-que-vous-devez-savoir"],
  },
  "zucchini": {
    sowDepthCm: 2, seedsPerHole: 2, perPot: 1, spacingCm: 80,
    germinationDays: [5, 10], harvestWeeksFromSowing: [8, 10], harvestWeeksFromPlanting: [6, 10],
    thinning: true, pinching: null,
    sources: ["https://kokopelli-semences.fr/fr/page/reussir-la-culture-de-la-courgette", "https://www.comptoirdesjardins.fr/content/courgettes.html", "https://www.gammvert.fr/conseils-idees/la-recolte-de-la-courgette", "https://www.jardiner-malin.fr/fiche/courgette.html"],
  },
  "eggplant": {
    sowDepthCm: 0.5, seedsPerHole: 2, perPot: 1, spacingCm: 50,
    germinationDays: [8, 21], harvestWeeksFromSowing: [20, 23], harvestWeeksFromPlanting: [8, 13],
    thinning: true, pinching: "Pince la tige principale au-dessus du 2ᵉ bouquet de fleurs et garde 2 ou 3 branches.",
    sources: ["https://kokopelli-semences.fr/fr/page/reussir-la-culture-de-l-aubergine", "https://potagermaestro.fr/aubergine-en-pot-guide-semis-plantation-recolte/", "https://www.comptoirdesjardins.fr/content/aubergines.html", "https://www.jardiner-malin.fr/fiche/quand-comment-tailler-aubergine.html"],
  },
  "dwarf-bean": {
    sowDepthCm: 3, seedsPerHole: 4, perPot: 6, spacingCm: 10,
    germinationDays: [5, 10], harvestWeeksFromSowing: [7, 10], harvestWeeksFromPlanting: null,
    thinning: false, pinching: null,
    sources: ["https://www.jardiner-malin.fr/fiche/cultiver-haricot-en-pot.html", "https://www.tomlejardinier.com/cultiver-son-potager/haricot", "https://www.comptoirdesjardins.fr/content/haricots.html"],
  },
  "pea": {
    sowDepthCm: 3, seedsPerHole: 3, perPot: 10, spacingCm: 5,
    germinationDays: [8, 20], harvestWeeksFromSowing: [12, 14], harvestWeeksFromPlanting: null,
    thinning: false, pinching: null,
    sources: ["https://www.comptoirdesjardins.fr/content/petits-pois.html", "https://www.potagerfruitier.com/potager/petits-pois/semis", "https://lepotagerautonome.fr/culture-des-petits-pois-semis-a-recolte/"],
  },
  "mini-cucumber": {
    sowDepthCm: 2, seedsPerHole: 2, perPot: 1, spacingCm: 50,
    germinationDays: [5, 10], harvestWeeksFromSowing: [10, 13], harvestWeeksFromPlanting: [7, 10],
    thinning: true, pinching: "Pince la tige principale au-dessus de la 4ᵉ feuille pour faire pousser des branches qui portent les fruits.",
    sources: ["https://www.comptoirdesjardins.fr/content/concombres.html", "https://www.tomlejardinier.com/cultiver-son-potager/concombre", "https://www.labonnegraine.com/pourquoi-et-comment-tailler-les-concombres-au-potager.htm", "https://kokopelli-semences.fr/fr/page/reussir-la-culture-du-concombre"],
  },
  "dwarf-tomato": {
    sowDepthCm: 0.5, seedsPerHole: 2, perPot: 1, spacingCm: 40,
    germinationDays: [7, 14], harvestWeeksFromSowing: [16, 20], harvestWeeksFromPlanting: [8, 12],
    thinning: true, pinching: null,
    sources: ["https://kokopelli-semences.fr/fr/page/cultiver-les-tomates-cerises-en-pot", "https://www.jardiner-malin.fr/fiche/tomate-cerise.html", "https://www.feuilles-et-balcon.fr/potager-balcon/legumes-fruits/tomates-cerises-en-pot/", "https://www.cahorsjuinjardins.fr/comment-planter-tomates-pot/"],
  },
  "sweet-pepper": {
    sowDepthCm: 0.5, seedsPerHole: 2, perPot: 1, spacingCm: 40,
    germinationDays: [7, 15], harvestWeeksFromSowing: [20, 26], harvestWeeksFromPlanting: [8, 12],
    thinning: true, pinching: "Enlève la toute première fleur, au centre du plant, pour qu'il fasse plus de branches.",
    sources: ["https://jardinerfacile.fr/poivron-reussir-sa-culture-pas-a-pas/", "https://www.tomlejardinier.com/cultiver-son-potager/poivron", "https://www.comptoirdesjardins.fr/content/poivrons-piments.html", "https://potagermaestro.fr/faq-culture-poivron-guide-complet-semis-recolte/"],
  },
  "physalis": {
    sowDepthCm: 0.5, seedsPerHole: 2, perPot: 1, spacingCm: 60,
    germinationDays: [7, 21], harvestWeeksFromSowing: [20, 24], harvestWeeksFromPlanting: [12, 14],
    thinning: true, pinching: "Pince le bout de la tige du jeune plant pour qu'il se ramifie.",
    sources: ["https://kokopelli-semences.fr/fr/page/reussir-la-culture-des-physalis", "https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/physalis-semis-culture-recolte/", "https://www.fermedesaintemarthe.com/en/blogs/comment-reussir-la-culture-de/reussir-la-culture-du-physalis-ou-coqueret-du-perou", "https://www.unpotagerbiosurmonbalcon.fr/blog/cultiver-physalis-pot-balcon/"],
  },
  "pole-bean": {
    sowDepthCm: 3, seedsPerHole: 4, perPot: 4, spacingCm: 15,
    germinationDays: [5, 10], harvestWeeksFromSowing: [10, 13], harvestWeeksFromPlanting: null,
    thinning: false, pinching: "Pince la tête des tiges quand elles arrivent en haut du tuteur.",
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/comment-cultiver-des-haricots-en-pot/", "https://www.comptoirdesjardins.fr/content/haricots.html", "https://www.terrevivante.org/contenu/cultiver-haricots-verts-rames/", "https://www.willemsefrance.fr/blogs/nos-guides-de-jardinage/guide-complet-pour-planter-et-entretenir-les-haricots-a-rame"],
  },
  "cucamelon": {
    sowDepthCm: 1, seedsPerHole: 2, perPot: 1, spacingCm: 40,
    germinationDays: [7, 10], harvestWeeksFromSowing: [10, 12], harvestWeeksFromPlanting: [8, 10],
    thinning: true, pinching: "Pince le bout des tiges pour qu'elles se ramifient.",
    sources: ["https://www.gerbeaud.com/jardin/fiches/cucamelon-melothria-scabra,2099.html", "https://www.aujardin.info/plantes/melothria-scabra.php", "https://www.jardiner-malin.fr/fiche/cucamelon.html"],
  },
  "mini-melon": {
    sowDepthCm: 2, seedsPerHole: 2, perPot: 1, spacingCm: 80,
    germinationDays: [5, 10], harvestWeeksFromSowing: [14, 18], harvestWeeksFromPlanting: [10, 12],
    thinning: true, pinching: "Quand le plant a 4 feuilles, pince au-dessus de la 2ᵉ pour obtenir deux tiges.",
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/melon-semer-planter-cultiver/", "https://www.gerbeaud.com/jardin/fiches/semer-melons,1160.html", "https://www.comptoirdesjardins.fr/content/melons-pasteques.html"],
  },
  "tomatillo": {
    sowDepthCm: 0.5, seedsPerHole: 2, perPot: 1, spacingCm: 60,
    germinationDays: [5, 21], harvestWeeksFromSowing: [18, 22], harvestWeeksFromPlanting: [10, 12],
    thinning: true, pinching: null,
    sources: ["https://www.fermedesaintemarthe.com/en/blogs/comment-reussir-la-culture-de/reussir-la-culture-des-tomatillos", "https://www.johnnyseeds.com/growers-library/vegetables/tomatillos/tomatillo-key-growing-information.html", "https://www.semaille.com/fr/physalis/799-physalis-tomatillo-5415166013521.html"],
  },
  "okra": {
    sowDepthCm: 1, seedsPerHole: 2, perPot: 1, spacingCm: 50,
    germinationDays: [5, 14], harvestWeeksFromSowing: [14, 18], harvestWeeksFromPlanting: [8, 10],
    thinning: true, pinching: null,
    sources: ["https://www.gerbeaud.com/jardin/fiches/gombo-culture,1704.html", "https://jardinage.pagesjaunes.fr/plante/voir/593/gombo", "https://www.snhf.org/fiche-plante/gombo/"],
  },
  "yardlong-bean": {
    sowDepthCm: 3, seedsPerHole: 3, perPot: 3, spacingCm: 20,
    germinationDays: [5, 12], harvestWeeksFromSowing: [8, 13], harvestWeeksFromPlanting: null,
    thinning: false, pinching: "Pince la tête des tiges quand elles arrivent en haut du tuteur.",
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/haricot-kilometre-semer-cultiver-recolter/", "http://www.homejardin.com/haricot_kilometre/dolichos_sesquipedalis_ou_vigna_sesquipedalis.html", "https://grainesqin.com/blog/culture-haricot-kilometre/"],
  },
  "west-indian-gherkin": {
    sowDepthCm: 1, seedsPerHole: 2, perPot: 1, spacingCm: 50,
    germinationDays: [5, 10], harvestWeeksFromSowing: [12, 16], harvestWeeksFromPlanting: [8, 11],
    thinning: true, pinching: null,
    sources: ["https://www.semaille.com/fr/concombre/430-concombre-des-antilles-5415166006004.html", "https://www.gerbeaud.com/jardin/fiches/concombre-antilles,1908.html", "https://plandejardin-jardinbiologique.com/semis-concombre-des-antilles.html"],
  },
  "cut-lettuce": {
    sowDepthCm: 0.5, seedsPerHole: 0, perPot: 6, spacingCm: 8,
    germinationDays: [4, 10], harvestWeeksFromSowing: [4, 8], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://www.jardipartage.fr/laitue-a-couper/", "https://www.lovethegarden.com/fr-fr/guides-de-culture/planter-salade", "https://www.toutvert.fr/salade-en-jardiniere-semer-cultiver-recolter/"],
  },
  "arugula": {
    sowDepthCm: 1, seedsPerHole: 0, perPot: 6, spacingCm: 8,
    germinationDays: [5, 10], harvestWeeksFromSowing: [4, 8], harvestWeeksFromPlanting: null,
    thinning: true, pinching: "Coupe les tiges à fleurs dès qu'elles montent, pour garder des feuilles tendres.",
    sources: ["https://www.jardiner-malin.fr/fiche/culture-roquette-semer-recolter.html", "https://www.fermedesaintemarthe.com/en/blogs/comment-reussir-la-culture-de/reussir-la-culture-de-la-roquette", "https://potagermaestro.fr/culture-roquette-guide-complet-semis-recolte/"],
  },
  "spinach": {
    sowDepthCm: 2, seedsPerHole: 0, perPot: 4, spacingCm: 10,
    germinationDays: [5, 15], harvestWeeksFromSowing: [6, 8], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://www.gammvert.fr/conseils-idees/semer-les-epinards", "https://www.comptoirdesjardins.fr/content/epinards.html", "https://www.tomlejardinier.com/cultiver-son-potager/epinard"],
  },
  "chard": {
    sowDepthCm: 1.5, seedsPerHole: 2, perPot: 2, spacingCm: 25,
    germinationDays: [7, 14], harvestWeeksFromSowing: [8, 12], harvestWeeksFromPlanting: [5, 8],
    thinning: true, pinching: null,
    sources: ["https://www.tomlejardinier.com/cultiver-son-potager/blette", "https://www.terrevivante.org/contenu/cultiver-blette-poiree-semis-entretien-recolte/", "https://jardinage.pagesjaunes.fr/plante/voir/212/blette"],
  },
  "lambs-lettuce": {
    sowDepthCm: 0.5, seedsPerHole: 0, perPot: 10, spacingCm: 8,
    germinationDays: [7, 15], harvestWeeksFromSowing: [8, 12], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/mache-semis-culture-recolte/", "https://www.compo.be/fr/conseil/plantes/herbes-aromatiques-fruits-legumes/mache", "https://monbalconpotager.com/planter-mache/"],
  },
  "kale": {
    sowDepthCm: 1, seedsPerHole: 2, perPot: 1, spacingCm: 45,
    germinationDays: [5, 10], harvestWeeksFromSowing: [12, 16], harvestWeeksFromPlanting: [8, 10],
    thinning: true, pinching: null,
    sources: ["https://www.tomlejardinier.com/cultiver-son-potager/chou-kale", "https://www.un-jardin-bio.com/culture-du-chou-kale/", "https://www.sememoi.com/fr/legumes/chou-kale"],
  },
  "garden-cress": {
    sowDepthCm: 0.5, seedsPerHole: 0, perPot: 0, spacingCm: 0,
    germinationDays: [2, 5], harvestWeeksFromSowing: [1, 3], harvestWeeksFromPlanting: null,
    thinning: false, pinching: null,
    sources: ["https://www.jardiner-malin.fr/fiche/potager/cresson-alenois.html", "https://www.lasemencebio.com/cresson/28-semences-bio-reproductibles-cresson-alenois.html", "https://www.promessedefleurs.com/potager/graines-potageres/graines-de-salades/cresson-alenois.html"],
  },
  "sorrel": {
    sowDepthCm: 0.5, seedsPerHole: 3, perPot: 1, spacingCm: 25,
    germinationDays: [10, 15], harvestWeeksFromSowing: [8, 13], harvestWeeksFromPlanting: [3, 6],
    thinning: true, pinching: "Coupe les tiges à fleurs dès qu'elles apparaissent, pour garder des feuilles.",
    sources: ["https://www.fermedesaintemarthe.com/en/blogs/comment-reussir-la-culture-de/reussir-la-culture-de-loseille", "https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/culture-oseille-en-pot/", "https://www.lasemencebio.com/potageres/271-semences-bio-reproductibles-oseille-commune-bio.html"],
  },
  "purslane": {
    sowDepthCm: 0.2, seedsPerHole: 0, perPot: 3, spacingCm: 15,
    germinationDays: [7, 20], harvestWeeksFromSowing: [5, 8], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://www.terrevivante.org/contenu/pourpier-semer-entretenir-recolter/", "https://www.truffaut.com/pourpier-semis-culture-recolte.html", "https://www.magellan-bio.fr/informations-graines-semences-bio/653-quand-recolter-le-pourpier-"],
  },
  "pak-choi": {
    sowDepthCm: 1, seedsPerHole: 3, perPot: 1, spacingCm: 30,
    germinationDays: [4, 8], harvestWeeksFromSowing: [4, 9], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://www.jardiner-malin.fr/fiche/pak-choi.html", "https://www.tomlejardinier.com/cultiver-son-potager/pak-choi", "https://fermesaintjust.fr/pak-choi-au-potager-semis-recolte-et-cuisine-rapide"],
  },
  "mizuna": {
    sowDepthCm: 1, seedsPerHole: 3, perPot: 2, spacingCm: 20,
    germinationDays: [5, 20], harvestWeeksFromSowing: [5, 8], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://www.gerbeaud.com/jardin/fiches/mizuna,1724.html", "https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/mizuna-semer-cultiver/"],
  },
  "microgreens": {
    sowDepthCm: 0, seedsPerHole: 0, perPot: 0, spacingCm: 0,
    germinationDays: [2, 4], harvestWeeksFromSowing: [1, 3], harvestWeeksFromPlanting: null,
    thinning: false, pinching: null,
    sources: ["https://troquetaplante.com/comment-cultiver-micropousses/", "https://micropousses.eu/guide-complet-micropousses-debutant-2026/", "https://neopouss.com/micropousses-une-croissance-rapide/", "https://wiki.myfood.eu/docs/cultiver-ses-micropousses"],
  },
  "strawberry-spinach": {
    sowDepthCm: 0.5, seedsPerHole: 3, perPot: 2, spacingCm: 25,
    germinationDays: [5, 12], harvestWeeksFromSowing: [8, 10], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://www.gerbeaud.com/jardin/fiches/epinard-fraise,1696.html", "https://plandejardin-jardinbiologique.com/epinard-fraise-semis-culture-bio.html", "https://jardinage.pagesjaunes.fr/plante/voir/1064/epinard-fraise"],
  },
  "orach": {
    sowDepthCm: 1, seedsPerHole: 3, perPot: 1, spacingCm: 30,
    germinationDays: [10, 20], harvestWeeksFromSowing: [7, 9], harvestWeeksFromPlanting: null,
    thinning: true, pinching: "Pince les épis de fleurs dès qu'ils pointent pour garder des feuilles tendres.",
    sources: ["https://www.gerbeaud.com/jardin/fiches/arroche.php", "https://www.tomlejardinier.com/cultiver-son-potager/arroche", "https://www.fermedesaintemarthe.com/en/blogs/comment-reussir-la-culture-de/reussir-la-culture-de-l-arroche"],
  },
  "nz-spinach": {
    sowDepthCm: 1.5, seedsPerHole: 3, perPot: 1, spacingCm: 50,
    germinationDays: [10, 21], harvestWeeksFromSowing: [8, 13], harvestWeeksFromPlanting: [4, 6],
    thinning: true, pinching: "Pince le bout des tiges après 4 feuilles pour qu'elle se ramifie.",
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/tetragone-semis-culture-recolte/", "https://www.fermedesaintemarthe.com/products/tetragone-cornue-ab", "https://www.gerbeaud.com/jardin/fiches/tetragone-epinard-nouvelle-zelande-semis-culture,2630.html", "https://www.plantezcheznous.com/fiches-pratiques/tetragone-cornue-sa-fiche-culture/"],
  },
  "malabar-spinach": {
    sowDepthCm: 1, seedsPerHole: 2, perPot: 1, spacingCm: 30,
    germinationDays: [10, 21], harvestWeeksFromSowing: [9, 10], harvestWeeksFromPlanting: [4, 6],
    thinning: true, pinching: "Pince le bout des tiges vers 25 cm pour qu'elle se ramifie.",
    sources: ["https://jardinage.pagesjaunes.fr/astuce/voir/623259/baselle", "https://grainesqin.com/produit/graines-baselle-verte/", "http://www.jardinagebio.net/baselle-culture-de-baselle/"],
  },
  "winter-purslane": {
    sowDepthCm: 0.5, seedsPerHole: 0, perPot: 3, spacingCm: 10,
    germinationDays: [6, 15], harvestWeeksFromSowing: [8, 12], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://www.gerbeaud.com/jardin/fiches/claytone-cuba-pourpier-hiver,1793.html", "https://www.lasemencebio.com/pourpier/572-POURPIER-WINTERPOSTLEIN-Claytone-de-Cuba-Bio.html", "https://potagermaestro.fr/claytone-cuba-culture-semis-recolte-pourpier-hiver/"],
  },
  "ice-plant": {
    sowDepthCm: 0, seedsPerHole: 3, perPot: 1, spacingCm: 30,
    germinationDays: [10, 21], harvestWeeksFromSowing: [8, 10], harvestWeeksFromPlanting: [4, 6],
    thinning: true, pinching: null,
    sources: ["https://www.gerbeaud.com/jardin/fiches/ficoide-glaciale,2113.html", "https://www.graines-bocquet.fr/2141-ficoide-glaciale.html", "http://www.homejardin.com/ficoide_glaciale/mesembryanthemum_crystallinum.html"],
  },
  "mustard-greens": {
    sowDepthCm: 1, seedsPerHole: 3, perPot: 1, spacingCm: 30,
    germinationDays: [4, 8], harvestWeeksFromSowing: [6, 12], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://www.plantezcheznous.com/fiches-pratiques/moutarde-de-chine-ou-moutarde-brune/", "https://grainesqin.com/blog/culture-moutarde/"],
  },
  "kohlrabi": {
    sowDepthCm: 1, seedsPerHole: 3, perPot: 1, spacingCm: 25,
    germinationDays: [7, 12], harvestWeeksFromSowing: [8, 10], harvestWeeksFromPlanting: [5, 8],
    thinning: true, pinching: null,
    sources: ["https://www.gerbeaud.com/jardin/fiches/chou-rave.php", "https://www.tomlejardinier.com/cultiver-son-potager/chou-rave", "https://potagermaestro.fr/culture-chou-rave-guide-complet-plantation-recolte/"],
  },
  "perpetual-leek": {
    sowDepthCm: null, seedsPerHole: null, perPot: 3, spacingCm: 12,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [12, 16],
    thinning: false, pinching: null,
    sources: ["https://www.gerbeaud.com/jardin/fiches/poireau-perpetuel,1138.html", "https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/culture-poireau-perpetuel/", "https://potager-perpetuel.fr/fiche-culture-poireau-perpetuel/"],
  },
  "radish": {
    sowDepthCm: 1, seedsPerHole: 0, perPot: 10, spacingCm: 4,
    germinationDays: [3, 7], harvestWeeksFromSowing: [3, 6], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://kokopelli-semences.fr/fr/page/reussir-la-culture-du-radis", "https://www.gammvert.fr/conseils-idees/semer-les-radis", "https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/le-radis-semer-cultiver-recolter/"],
  },
  "round-carrot": {
    sowDepthCm: 0.5, seedsPerHole: 0, perPot: 20, spacingCm: 4,
    germinationDays: [12, 25], harvestWeeksFromSowing: [10, 12], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://www.lasemencebio.com/carotte/188-semences-bio-reproductibles-carotte-ronde-marche-de-paris-3760110661320.html", "https://www.tomlejardinier.com/cultiver-son-potager/carotte", "https://www.comptoir-des-graines.fr/graines-de-carotte-ronde-hative-de-paris-p-2294.html"],
  },
  "spring-onion": {
    sowDepthCm: 1, seedsPerHole: 0, perPot: 8, spacingCm: 5,
    germinationDays: [10, 15], harvestWeeksFromSowing: [6, 10], harvestWeeksFromPlanting: [4, 8],
    thinning: true, pinching: null,
    sources: ["https://www.gammvert.fr/conseils-idees/cultiver-la-cebette", "https://www.jardiner-malin.fr/fiche/oignon-blanc-ou-nouveau-culture.html", "https://www.horticulteur.net/cebettes/"],
  },
  "beetroot": {
    sowDepthCm: 2, seedsPerHole: 1, perPot: 3, spacingCm: 12,
    germinationDays: [8, 12], harvestWeeksFromSowing: [10, 20], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://www.jardiner-malin.fr/fiche/betterave.html", "https://www.lasemencebio.com/blog/la-betterave-semis-culture-recolte/", "https://www.tomlejardinier.com/cultiver-son-potager/betterave"],
  },
  "turnip": {
    sowDepthCm: 1, seedsPerHole: 0, perPot: 4, spacingCm: 10,
    germinationDays: [4, 10], harvestWeeksFromSowing: [6, 12], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://www.comptoirdesjardins.fr/content/navets.html", "https://www.jardiner-malin.fr/fiche/navet-primeur-printemps.html", "https://www.terrevivante.org/contenu/culture-navet-semer-entretenir-recolter/"],
  },
  "garlic": {
    sowDepthCm: null, seedsPerHole: null, perPot: 4, spacingCm: 12,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [18, 39],
    thinning: false, pinching: null,
    sources: ["https://conseils-jardin.willemsefrance.fr/ail-du-potager/", "https://www.jardin.guide/planter-ail/", "https://www.lovethegarden.com/fr-fr/guides-de-culture/planter-ail"],
  },
  "potato": {
    sowDepthCm: null, seedsPerHole: null, perPot: 2, spacingCm: 25,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [10, 14],
    thinning: false, pinching: null,
    sources: ["https://mon-potager.com/pommes-terre-sac-tour-methode/", "https://www.jardiland.com/conseils-idees/pomme-de-terre-plantation-culture-recolte"],
  },
  "oca": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 40,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [26, 32],
    thinning: false, pinching: null,
    sources: ["https://www.gerbeaud.com/jardin/fiches/oca-du-perou,1170.html", "https://www.jardiner-malin.fr/fiche/oca-du-perou.html", "https://www.gammvert.fr/conseils-idees/planter-l-oca-du-perou"],
  },
  "crosne": {
    sowDepthCm: null, seedsPerHole: null, perPot: 3, spacingCm: 15,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [30, 40],
    thinning: false, pinching: null,
    sources: ["https://www.jardiner-malin.fr/fiche/potager/crosne-du-japon.html", "https://www.gammvert.fr/conseils-idees/planter-et-cultiver-les-crosnes", "https://www.aujardin.info/plantes/crosne.php"],
  },
  "nasturtium": {
    sowDepthCm: 2, seedsPerHole: 3, perPot: 1, spacingCm: 30,
    germinationDays: [7, 15], harvestWeeksFromSowing: [8, 12], harvestWeeksFromPlanting: [3, 6],
    thinning: true, pinching: null,
    sources: ["https://kokopelli-semences.fr/fr/page/reussir-la-culture-de-la-capucine", "https://jardinage.pagesjaunes.fr/plante/voir/46/capucine", "https://lepotagerdolivier.com/guide-complet-sur-la-capucine-semis-culture-et-recolte"],
  },
  "calendula": {
    sowDepthCm: 1, seedsPerHole: 2, perPot: 1, spacingCm: 25,
    germinationDays: [7, 14], harvestWeeksFromSowing: [8, 10], harvestWeeksFromPlanting: [3, 6],
    thinning: true, pinching: null,
    sources: ["https://kokopelli-semences.fr/fr/page/reussir-la-culture-du-souci-calendula", "https://www.gerbeaud.com/jardin/fiches/souci-varietes-semis-culture-entretien,3052.html", "https://www.jardiner-malin.fr/fiche/souci-fleur.html"],
  },
  "lavender": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 40,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [6, 40],
    thinning: false, pinching: null,
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/lavande-en-pot/", "https://www.jardin-et-moi.fr/articles/lavande-pot-jardin-planter-tailler-entretenir", "https://jardinage.pagesjaunes.fr/plante/voir/19/lavande"],
  },
  "cosmos": {
    sowDepthCm: 0.5, seedsPerHole: 2, perPot: 2, spacingCm: 25,
    germinationDays: [6, 21], harvestWeeksFromSowing: [11, 13], harvestWeeksFromPlanting: [4, 8],
    thinning: true, pinching: "Pince la pointe quand le plant a 5-6 feuilles (10-15 cm) pour qu'il se ramifie.",
    sources: ["https://kokopelli-semences.fr/fr/page/reussir-la-culture-des-cosmos", "https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/cosmos-semis-et-plantation/", "https://www.jardiland.com/conseils-idees/cosmos-varietes-plantation-entretien-association", "https://lafabriqueasachets.com/cosmos/"],
  },
  "borage": {
    sowDepthCm: 1, seedsPerHole: 2, perPot: 1, spacingCm: 30,
    germinationDays: [7, 15], harvestWeeksFromSowing: [6, 8], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://kokopelli-semences.fr/fr/page/reussir-la-culture-de-la-bourrache", "https://www.lasemencebio.com/fleurs/4-semences-bio-reproductibles-bourrache-officinale-bio.html", "https://www.autourdupotager.com/bourrache/", "https://fermesaintjust.fr/bourrache-au-potager-les-bonnes-associations-et-distances"],
  },
  "marigold": {
    sowDepthCm: 0.5, seedsPerHole: 2, perPot: 1, spacingCm: 20,
    germinationDays: [3, 21], harvestWeeksFromSowing: [8, 11], harvestWeeksFromPlanting: [2, 8],
    thinning: true, pinching: "Pince la tige quand le plant mesure une dizaine de centimètres pour avoir plus de fleurs.",
    sources: ["https://www.gerbeaud.com/jardin/fiches/oeillet-inde.php", "https://www.truffaut.com/cultiver-oeillet-inde-tagete.html", "https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/oeillet-dinde-tagete-semis-plantation-entretien/", "https://dunefleur-alautre.fr/oeillet-inde-semis-plantation-culture-entretien/"],
  },
  "dwarf-sunflower": {
    sowDepthCm: 2.5, seedsPerHole: 2, perPot: 1, spacingCm: 30,
    germinationDays: [7, 15], harvestWeeksFromSowing: [8, 12], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://lafabriqueasachets.com/tournesol/", "https://www.interflora.fr/blog/tournesol-en-pot/", "https://www.promessedefleurs.com/annuelles/graines-de-fleurs/graines-de-fleurs-par-variete/graines-de-tournesol/tournesols-nain-teddy-bear-helianthus-annuus.html", "https://www.jardiner-malin.fr/fiche/tournesol.html"],
  },
  "viola": {
    sowDepthCm: 0.3, seedsPerHole: 2, perPot: 1, spacingCm: 15,
    germinationDays: [10, 21], harvestWeeksFromSowing: [12, 18], harvestWeeksFromPlanting: [1, 4],
    thinning: true, pinching: null,
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/pensees-viola-culture-semis-plantation-entretien/", "http://www.homejardin.com/pensee/viola.html", "https://www.jardiner-malin.fr/fiche/pensee.html", "https://www.truffaut.com/pensee-plantation-entretien.html"],
  },
  "zinnia": {
    sowDepthCm: 0.5, seedsPerHole: 2, perPot: 2, spacingCm: 20,
    germinationDays: [7, 10], harvestWeeksFromSowing: [6, 9], harvestWeeksFromPlanting: [3, 6],
    thinning: true, pinching: "Pince la pointe quand la tige atteint 10-15 cm pour avoir plus de fleurs.",
    sources: ["https://vilmorin-jardin.fr/plantes-et-fleurs/decouvrir-le-zinnia/", "https://www.gerbeaud.com/jardin/fiches/zinnia.php", "https://www.jardiner-malin.fr/fiche/zinnia.html"],
  },
  "phacelia": {
    sowDepthCm: 1, seedsPerHole: 0, perPot: 3, spacingCm: 15,
    germinationDays: [7, 20], harvestWeeksFromSowing: [6, 8], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://jardiner-malin.fr/fiche/la-phacelie-un-formidable-engrais-vert.html/amp", "https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/phacelie-engrais-vert-semer/", "https://kokopelli-semences.fr/fr/page/reussir-la-culture-de-la-phacelie", "https://www.grainesdelegumes.fr/graines-de-fleurs-phacelia/"],
  },
  "cornflower": {
    sowDepthCm: 0.5, seedsPerHole: 3, perPot: 2, spacingCm: 20,
    germinationDays: [7, 21], harvestWeeksFromSowing: [10, 12], harvestWeeksFromPlanting: null,
    thinning: true, pinching: null,
    sources: ["https://www.promessedefleurs.com/annuelles/graines-de-fleurs/graines-de-fleurs-par-variete/graines-de-centaurees/graines-de-centaurea-cyanus-bleuet-sauvage.html", "https://www.meillandrichardier.com/centauree-bleuet-double-bleue.html", "https://www.tomlejardinier.com/cultiver-son-potager/bleuet", "https://www.lasemencebio.com/bleuet/15-semences-bio-reproductibles-bleuet-des-champs-bio.html"],
  },
  "sweet-alyssum": {
    sowDepthCm: 0, seedsPerHole: 0, perPot: 1, spacingCm: 15,
    germinationDays: [7, 15], harvestWeeksFromSowing: [8, 10], harvestWeeksFromPlanting: [2, 4],
    thinning: true, pinching: "Après la première floraison, rabats la touffe d'un tiers pour la relancer.",
    sources: ["https://www.gerbeaud.com/jardin/fiches/alysse.php", "https://www.boutique-vegetale.com/p/alysse-odorante-carpet-of-snow-alyssum-maritimum", "https://jardinerbio.com/alysse-plantation-entretien/", "https://www.willemsefrance.fr/products/graines-alysse-odorant"],
  },
  "sweet-pea": {
    sowDepthCm: 2, seedsPerHole: 3, perPot: 3, spacingCm: 20,
    germinationDays: [7, 21], harvestWeeksFromSowing: [12, 16], harvestWeeksFromPlanting: [6, 10],
    thinning: false, pinching: "Pince la pointe au-dessus de la 2ᵉ paire de feuilles pour qu'il se ramifie.",
    sources: ["https://www.gammvert.fr/conseils-idees/pois-de-senteur", "https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/pois-de-senteur-plantation-culture-entretien-et-utilisation/", "https://www.algoflash.fr/conseils-et-inspirations/portraits-de-plantes/jardin-ornemental/pois-de-senteur", "https://www.lovethegarden.com/fr-fr/guides-de-culture/planter-pois-de-senteur"],
  },
  "hardy-geranium": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 35,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [4, 10],
    thinning: false, pinching: null,
    sources: ["https://www.meillandrichardier.com/geraniums-vivaces-conseils-plantation-taille-entretien", "https://www.jardiner-malin.fr/fiche/geranium-vivace-exposition-planter.html", "https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/comment-planter-les-geraniums-vivaces/"],
  },
  "tall-verbena": {
    sowDepthCm: 0.2, seedsPerHole: 0, perPot: 1, spacingCm: 40,
    germinationDays: [10, 30], harvestWeeksFromSowing: [14, 20], harvestWeeksFromPlanting: [6, 10],
    thinning: true, pinching: null,
    sources: ["https://www.willemsefrance.fr/products/verveine-de-buenos-aires-1", "https://www.aujardin.info/plantes/verbena-bonariensis.php", "https://www.jardiner-malin.fr/fiche/verveine-de-buenos-aires.html", "https://www.graines-semences.com/fleurs/2525-verveine-de-buenos-aires-1500-graines-5420000014084.html"],
  },
  "pinks": {
    sowDepthCm: 0.5, seedsPerHole: 2, perPot: 1, spacingCm: 25,
    germinationDays: [7, 14], harvestWeeksFromSowing: [26, 30], harvestWeeksFromPlanting: [8, 30],
    thinning: true, pinching: null,
    sources: ["https://www.graines-bocquet.fr/950-oeillet-vivace-mignardise-simple-varie.html", "https://www.jardiner-malin.fr/fiche/oeillet-mignardise.html", "https://jardinage.pagesjaunes.fr/astuce/voir/623459/oeillet-mignardise"],
  },
  "dahlia": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 30,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [8, 13],
    thinning: false, pinching: "Quand la tige a 3-4 paires de feuilles, pince la pointe pour qu'il se ramifie.",
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/dahlia-en-pot/", "https://www.jardiner-malin.fr/fiche/dahlia.html", "https://www.fermedesaintemarthe.com/en/blogs/comment-reussir-la-culture-de/reussir-la-culture-du-dahlias", "https://www.autonomiejardin.com/autour-du-jardin/fleurs-au-jardin/dahlia/"],
  },
  "snapdragon": {
    sowDepthCm: 0, seedsPerHole: 0, perPot: 1, spacingCm: 20,
    germinationDays: [10, 20], harvestWeeksFromSowing: [14, 20], harvestWeeksFromPlanting: [4, 8],
    thinning: true, pinching: "Pince la pointe quand le plant mesure 10-15 cm pour qu'il se ramifie.",
    sources: ["https://www.gerbeaud.com/jardin/fiches/muflier.php", "https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/muflier-gueule-de-loup-semis-plantation-entretien/", "https://www.truffaut.com/muflier-semis-plantation-entretien.html", "http://www.homejardin.com/muflier/antirrhinum_majus.html"],
  },
  "fuchsia": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 40,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [4, 8],
    thinning: false, pinching: "Quand une jeune tige a 3-4 paires de feuilles, pince la pointe ; arrête fin juin.",
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/fuchsia-plantation-taille-culture-et-entretien/", "https://www.jardiner-malin.fr/fiche/fuchsia-planter-floraison.html", "https://www.truffaut.com/fuchsia-varietes-plantation-entretien.html", "https://curiositesflorales.fr/fuchsia-pot-entretien-arrosage-hivernage/"],
  },
  "dwarf-raspberry": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 60,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [16, 60],
    thinning: false, pinching: null,
    sources: ["https://www.jardiner-malin.fr/fiche/framboisier-en-pot.html", "https://fr-fr.bakker.com/products/framboisier-nain-et-compact-non-remontant-beaute-rubis-%C2%AE", "https://www.willemsefrance.fr/products/framboisier-nain-sweet-sister"],
  },
  "blueberry": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 80,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [16, 70],
    thinning: false, pinching: null,
    sources: ["https://www.gerbeaud.com/jardin/fiches/myrtillier-myrtille-plantation-culture,1341.html", "https://www.gammvert.fr/conseils-idees/planter-des-myrtilles", "https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/myrtillier-planter-tailler-entretenir/", "https://www.leaderplant.com/blog/cultiver-des-myrtilles"],
  },
  "redcurrant": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 100,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [30, 90],
    thinning: false, pinching: null,
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/groseillier-planter-tailler-et-entretenir/", "https://www.jardipartage.fr/plantation-groseiller/", "https://ciref-agriculture.fr/groseillier-en-pot-culture-sur-terrasse-ou-balcon/"],
  },
  "lemon-tree": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 100,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [26, 52],
    thinning: false, pinching: null,
    sources: ["https://www.gerbeaud.com/jardin/fiches/citronnier-des-4-saisons,1586.html", "https://www.lubera.fr/journal/recolte-des-citrons-p1586", "https://www.gammvert.fr/conseils-idees/comment-rempoter-un-citronnier", "https://www.lepotiron.fr/potiblog/nos-fiches/fruits/le-citron/culture-citronnier/"],
  },
  "dwarf-fig": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 100,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [16, 70],
    thinning: false, pinching: null,
    sources: ["https://fr-fr.bakker.com/products/figuier-nain-ficcolino", "https://www.georgesdelbard.com/product/figuier-nain-figality", "https://www.leaderplant.com/acheter-figuier-gustis-ficcolino-14724.html", "https://www.shop-ramette.fr/blog/plants-fruitiers/comment-planter-tailler-entretenir-figuier.html"],
  },
  "woodland-strawberry": {
    sowDepthCm: 0, seedsPerHole: 0, perPot: 1, spacingCm: 25,
    germinationDays: [14, 42], harvestWeeksFromSowing: [16, 26], harvestWeeksFromPlanting: [6, 30],
    thinning: true, pinching: null,
    sources: ["https://vilmorin-jardin.fr/entretien-et-recolte/semis-de-fraises-guide-complet/", "https://www.graines-semences.com/legumes/55-fraisier-mignonette-des-bois-4-saisons-200-graines-5420000007543.html", "https://www.fermedesaintemarthe.com/en/products/fraisier-des-quatre-saisons-nt", "https://jardinerfacile.fr/fraisier-semis-plantation-entretien-et-recolte/"],
  },
  "kiwiberry": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 200,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [60, 160],
    thinning: false, pinching: null,
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/actinidia-arbre-a-kiwi-planter-tailler-recolter/", "https://www.jardipartage.fr/kiwi-issai/", "http://www.homejardin.com/kiwai/actinidia_arguta.html", "https://jardinage.pagesjaunes.fr/astuce/voir/659475/kiwai"],
  },
  "blackcurrant": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 100,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [30, 90],
    thinning: false, pinching: null,
    sources: ["https://www.jardiner-malin.fr/fiche/cassissier-en-pot.html", "https://www.truffaut.com/comment-planter-tailler-entretenir-cassissier.html", "https://www.gerbeaud.com/jardin/fiches/cassissier.php", "https://maisonduvegetal.com/guide-cassissier/cultiver-un-cassissier-en-pot/"],
  },
  "thornless-blackberry": {
    sowDepthCm: null, seedsPerHole: null, perPot: 1, spacingCm: 100,
    germinationDays: null, harvestWeeksFromSowing: null, harvestWeeksFromPlanting: [30, 70],
    thinning: false, pinching: null,
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/murier-ronce-planter-tailler-et-entretenir/", "https://www.jardiner-malin.fr/fiche/mures-murier.html", "https://plantandstories.com/en/blogs/plantes-exterieur-jardin/murier-sans-epines-ronce-plantation-taille-recolte-guide", "https://lepotagerdupic.fr/cultiver-les-mures/"],
  },
};
