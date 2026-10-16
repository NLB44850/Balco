/**
 * Une astuce de conservation pour tout récolter avant le froid (chantier « Plante hors saison », étape 3), seulement
 * quand deux sources la confirment (docs/sources-conservation.md, recherche web du 15 octobre 2026). Pas d'astuce
 * pour le shiso : les sources se contredisent. Jamais de basilic dans l'huile hors du congélateur (botulisme).
 */
export type ConservationTip = { tip: string; sources: string[] };

export const CONSERVATION: Record<string, ConservationTip> = {
  basil: {
    tip: "Hache-le sous l’huile d’olive, en bac à glaçons, au congélateur.",
    sources: ["https://www.jardiner-malin.fr/fiche/conserver-basilic-automne.html", "https://www.promessedefleurs.com/conseil-plantes-jardin/tutoriel/comment-recolter-et-conserver-le-basilic/"],
  },
  "cherry-tomato": {
    tip: "Fais mûrir les vertes au chaud, en carton, avec une pomme.",
    sources: ["https://www.jardiner-malin.fr/fiche/comment-faire-murir-tomates-vertes.html", "https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/comment-faire-murir-les-derniers-fruits-et-legumes-du-potager/"],
  },
  "dwarf-tomato": {
    tip: "Fais mûrir les vertes au chaud, en carton, avec une pomme.",
    sources: ["https://www.jardiner-malin.fr/fiche/comment-faire-murir-tomates-vertes.html", "https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/comment-faire-murir-les-derniers-fruits-et-legumes-du-potager/"],
  },
  chili: {
    tip: "Enfile les piments sur un fil, au sec et aéré.",
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/tutoriel/comment-faire-secher-ses-piments/", "https://www.jardiner-malin.fr/fiche/piment-d-espelette.html"],
  },
  "sweet-pepper": {
    tip: "Congèle-le en lanières crues, sans le blanchir.",
    sources: ["https://www.jardiner-malin.fr/fiche/legumes-qui-se-congelent-le-mieux.html", "https://www.gammvert.fr/conseils-idees/entretien-des-pieds-de-poivrons"],
  },
  eggplant: {
    tip: "Congèle-la en rondelles blanchies, à plat puis en sachet.",
    sources: ["https://www.gammvert.fr/conseils-idees/secret-de-conservation-12-les-aubergines", "https://www.gerbeaud.com/fruit-legume-de-saison/aubergine.php"],
  },
  zucchini: {
    tip: "Congèle-la en rondelles blanchies 1 à 2 minutes, à plat.",
    sources: ["https://www.gammvert.fr/conseils-idees/comment-congeler-la-courgette", "https://www.gerbeaud.com/maison-pratique/congelation-des-courgettes-methodes,1948.html"],
  },
  "dwarf-bean": {
    tip: "Blanchis-les 4 à 5 minutes, sèche-les, puis congèle-les.",
    sources: ["https://www.gammvert.fr/conseils-idees/comment-congeler-vos-haricots-verts", "https://www.gerbeaud.com/jardin/fiches/conserver-haricots-verts,1443.html"],
  },
  "pole-bean": {
    tip: "Blanchis-les 4 à 5 minutes, sèche-les, puis congèle-les.",
    sources: ["https://www.gammvert.fr/conseils-idees/comment-congeler-vos-haricots-verts", "https://www.gerbeaud.com/jardin/fiches/conserver-haricots-verts,1443.html"],
  },
  physalis: {
    tip: "Garde-les dans leur calice, au sec : plusieurs semaines.",
    sources: ["https://kokopelli-semences.fr/fr/page/reussir-la-culture-des-physalis", "https://www.promessedefleurs.com/conseil-plantes-jardin/fichefamille/physalis-semis-culture-recolte/"],
  },
  tomatillo: {
    tip: "Garde-les dans leur calice, au sec et aéré.",
    sources: ["https://www.jardiner-malin.fr/fiche/potager/tomatillo.html", "https://www.fermedesaintemarthe.com/en/blogs/comment-reussir-la-culture-de/reussir-la-culture-des-tomatillos"],
  },
  "mini-cucumber": {
    tip: "Ne le congèle pas : fais-en des pickles au vinaigre.",
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/pickles-legumes/", "https://www.quechoisir.org/conseils-conservation-des-aliments-quand-faut-il-les-jeter-n9595/"],
  },
  nasturtium: {
    tip: "Mets les graines vertes au vinaigre, comme des câpres.",
    sources: ["https://kokopelli-semences.fr/fr/page/reussir-la-culture-de-la-capucine", "https://www.promessedefleurs.com/conseil-plantes-jardin/tutoriel/comment-utiliser-la-capucine-en-cuisine/"],
  },
  dill: {
    tip: "Cisèle-le en bac à glaçons, au congélateur, sans le sécher.",
    sources: ["https://www.promessedefleurs.com/conseil-plantes-jardin/ficheconseil/conserver-secher-aneth/", "https://www.truffaut.com/aneth-varietes-plantation-culture.html"],
  },
};

export const conservationTip = (catalogId: string) => CONSERVATION[catalogId]?.tip ?? null;
