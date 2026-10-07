/**
 * Les plantes qui se récoltent en une fois : une fois tout arraché, le pot est libre (radis, carottes,
 * betteraves, ail…). Pour chacune, combien de jours on a pour tout récolter après la première récolte
 * avant que ça se gâte (le radis devient creux et piquant, la carotte ligneuse, l'ail se conserve mal).
 *
 * Sources (recherche web du 7 octobre 2026, extraits) : elles donnent une taille limite ou un signe
 * (« avant 8 cm », « quand la moitié des feuilles a jauni ») plutôt qu'une durée ; les jours sont une
 * valeur prudente tirée de ces signes. Les mois pour ressemer ou replanter sont ceux du calendrier
 * (`sowMonths`, `plantMonths`), déjà vérifiés sur deux sources (docs/sources-calendrier.md).
 */
export type HarvestOnce = {
  /** Jours pour tout récolter après la première récolte notée. */
  harvestDays: number;
  /** D'où vient le chiffre, en une ligne. */
  note: string;
  sources: string[];
};

/** Faute de durée connue : trois semaines. */
export const DEFAULT_HARVEST_DAYS = 21;

export const HARVEST_ONCE: Record<string, HarvestOnce> = {
  radish: {
    harvestDays: 7,
    note: "Prêt en 18 à 30 jours ; laissé en terre, il devient creux, fendu et piquant.",
    sources: ["https://www.jardiner-malin.fr/fiche/radis.html", "https://www.futura-sciences.com/maison/questions-reponses/jardin-vos-radis-deviennent-ils-piquants-immangeables-24869/"],
  },
  "round-carrot": {
    harvestDays: 21,
    note: "60 à 80 jours après le semis ; au-delà, le cœur devient ligneux.",
    sources: ["https://www.jardiner-malin.fr/fiche/carotte-en-pot.html", "https://www.truffaut.com/"],
  },
  beetroot: {
    harvestDays: 21,
    note: "À récolter à 6-8 cm (une balle de tennis) ; plus grosse, elle devient fibreuse.",
    sources: ["https://www.jardiner-malin.fr/actu/betterave-recolte-taille.html", "https://www.castorama.fr/"],
  },
  "head-lettuce": {
    harvestDays: 14,
    note: "À couper dès que la pomme est ferme : chaque jour de plus la rapproche de la montée en graine (plus vite l'été).",
    sources: ["https://www.jardiner-malin.fr/fiche/laitue-monte-graine.html", "https://www.truffaut.com/salade-varietes-plantation-culture.html"],
  },
  turnip: {
    harvestDays: 14,
    note: "À récolter avant 8 cm ; plus gros, il devient creux.",
    sources: ["https://www.jardiner-malin.fr/fiche/navet.html", "https://www.larousse.fr/archives/agricole/page/389"],
  },
  kohlrabi: {
    harvestDays: 14,
    note: "8 à 10 semaines après le semis ; au-delà d'une balle de tennis, il devient filandreux.",
    sources: ["https://www.hornbach.ch/projets/planter-des-choux-raves/", "https://www.castorama.fr/"],
  },
  "spring-onion": {
    harvestDays: 21,
    note: "On les arrache au fur et à mesure ; l'été, ils montent en graine.",
    sources: ["https://www.truffaut.com/oignon-blanc-paris-504327.html", "https://www.agrobio-bretagne.org/"],
  },
  garlic: {
    harvestDays: 7,
    note: "Récolté en une fois quand la moitié des feuilles a jauni ; trop tard, il se conserve mal.",
    sources: ["https://draaf.occitanie.agriculture.gouv.fr/", "https://occitanie.chambre-agriculture.fr/"],
  },
  potato: {
    harvestDays: 7,
    note: "On vide le sac en une fois, quand le feuillage fane.",
    sources: ["https://www.futura-sciences.com/", "https://www.cnipt.fr/"],
  },
  oca: {
    harvestDays: 30,
    note: "Tubercules arrachés quand le feuillage gèle, de la Toussaint à janvier.",
    sources: ["https://www.jardiner-malin.fr/fiche/oca-du-perou.html", "https://www.futura-sciences.com/"],
  },
  "pak-choi": {
    harvestDays: 7,
    note: "45 à 60 jours après le semis ; il monte vite en graine avec la chaleur.",
    sources: ["https://www.jardiner-malin.fr/fiche/pak-choi.html", "https://www.consoglobe.com/"],
  },
};
