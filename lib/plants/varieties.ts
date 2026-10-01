import type { PlantVariety } from "./catalog";

/** Variétés conseillées pour les plantes historiques du catalogue (les nouvelles déclarent les leurs dans catalog.ts). */
export const PLANT_VARIETIES: Record<string, PlantVariety[]> = {
  basil: [
    { id: "grand-vert", name: "Grand vert", note: "Le classique à grandes feuilles parfumées, vigoureux dans un pot de 3 L au soleil." },
    { id: "fin-vert-nain", name: "Fin vert nain", note: "Petite boule de 20 cm aux feuilles fines : tient sur un rebord de fenêtre." },
    { id: "pourpre", name: "Pourpre", note: "Feuillage violet décoratif au goût plus doux, joli mêlé aux fleurs en jardinière." },
    { id: "thai", name: "Thaï", note: "Notes anisées et fleurs mauves ornementales, supporte bien la chaleur d’un balcon plein sud.", kind: "original" },
    { id: "cannelle", name: "Cannelle", note: "Tiges pourpres et parfum de cannelle épicée, superbe en pot au soleil.", kind: "original" },
  ],
  mint: [
    { id: "verte", name: "Menthe verte", note: "La menthe douce du taboulé, très tolérante à la mi-ombre et au pot seul." },
    { id: "poivree", name: "Menthe poivrée", note: "Goût frais et puissant pour les tisanes, repousse sans fin après chaque coupe." },
    { id: "marocaine", name: "Menthe marocaine", note: "La menthe du thé à la menthe, plus compacte et moins envahissante que la verte." },
    { id: "chocolat", name: "Menthe chocolat", note: "Tiges brunes et parfum de chocolat à la menthe : une curiosité pour les desserts.", kind: "original" },
  ],
  parsley: [
    { id: "geant-d-italie", name: "Géant d’Italie", note: "Persil plat au goût prononcé, productif même à la mi-ombre dans un pot profond.", kind: "heirloom" },
    { id: "frise-vert-fonce", name: "Frisé vert foncé", note: "Touffe dense et décorative, plus résistante au froid pour des récoltes tardives." },
    { id: "commun", name: "Commun", note: "Persil plat simple et rustique, le plus facile à faire lever en jardinière." },
  ],
  chives: [
    { id: "commune", name: "Commune", note: "Increvable en petit pot, ses pompons mauves régalent les abeilles au printemps." },
    { id: "staro", name: "Staro", note: "Tiges épaisses et vigoureuses, plus productive pour des coupes fréquentes." },
    { id: "de-chine", name: "Ciboulette de Chine", note: "Feuilles plates au goût d’ail doux et fleurs blanches en fin d’été.", kind: "original" },
  ],
  thyme: [
    { id: "commun", name: "Thym commun", note: "Le thym de Provence, sobre en eau : parfait au soleil brûlant d’une rambarde." },
    { id: "citron", name: "Thym citron", note: "Parfum citronné délicieux sur le poisson, port compact de 20 cm en coupe." },
    { id: "serpolet", name: "Serpolet", note: "Rampant et couvre-sol, il déborde joliment d’une jardinière et fleurit rose." },
  ],
  rosemary: [
    { id: "officinal", name: "Officinal", note: "Port dressé et floraison bleue précoce, supporte le vent et la sécheresse en bac." },
    { id: "rampant", name: "Rampant", note: "Branches qui retombent en cascade : superbe en bord de balconnière ou de muret." },
    { id: "pointe-du-raz", name: "Pointe du Raz", note: "Sélection bretonne très rustique, idéale pour les balcons exposés au froid." },
  ],
  coriander: [
    { id: "calypso", name: "Calypso", note: "Monte à graines très tard, ce qui prolonge les récoltes de feuilles en pot." },
    { id: "leisure", name: "Leisure", note: "Feuillage abondant et lente à fleurir, à semer en succession tout l’été." },
    { id: "confetti", name: "Confetti", note: "Feuilles fines comme l’aneth au goût de coriandre, touffe compacte et originale.", kind: "original" },
  ],
  sage: [
    { id: "officinale", name: "Officinale", note: "Feuilles argentées au parfum intense, très résistante à la sécheresse en pot." },
    { id: "pourpre", name: "Pourpre", note: "Jeunes feuilles violacées décoratives, aussi goûteuse que la sauge classique." },
    { id: "tricolore", name: "Tricolore", note: "Panachée de crème, rose et vert : plus compacte, elle égaye une jardinière." },
  ],
  oregano: [
    { id: "grec", name: "Grec", note: "L’origan le plus parfumé pour la pizza, adore le plein soleil et la chaleur." },
    { id: "compact", name: "Compact", note: "Coussin de 15 cm qui tient dans un petit pot sans jamais s’étaler." },
    { id: "dore", name: "Doré", note: "Feuillage jaune lumineux au goût doux, joli en bordure de bac aromatique." },
  ],
  dill: [
    { id: "fernleaf", name: "Fernleaf", note: "Variété naine de 45 cm qui ne verse pas au vent, lente à monter en graines." },
    { id: "bouquet", name: "Bouquet", note: "Feuillage et ombelles généreux, à tuteurer légèrement sur un balcon venté." },
  ],
  "lemon-balm": [
    { id: "commune", name: "Commune", note: "Parfum citronné pour tisanes, pousse volontiers à la mi-ombre dans un pot de 5 L." },
    { id: "aurea", name: "Aurea", note: "Feuilles panachées d’or plus décoratives, à abriter du soleil brûlant de l’après-midi." },
  ],
  "lemon-verbena": [
    { id: "citronnelle", name: "Verveine citronnelle", note: "Pas de vraie sélection à chercher : un grand bac au soleil et un abri l’hiver suffisent." },
  ],
  "cherry-tomato": [
    { id: "minibel", name: "Minibel", note: "Naine de 30 à 40 cm sans tuteur, couverte de petites tomates rouges sucrées." },
    { id: "tumbling-tom", name: "Tumbling Tom", note: "Port retombant de 30 cm : parfaite en suspension ou en bord de jardinière." },
    { id: "red-robin", name: "Red Robin", note: "Minuscule plant de 25 cm pour un rebord de fenêtre, fruits précoces et nombreux." },
    { id: "sweet-100", name: "Sweet 100", note: "Grande et très productive en grappes : un bac de 20 L et un solide tuteur." },
    { id: "poire-jaune", name: "Poire jaune", note: "Petites tomates jaunes en forme de poire, cultivées depuis le XVIIIᵉ siècle : tuteur et bac de 20 L.", kind: "heirloom" },
    { id: "black-cherry", name: "Black Cherry", note: "Tomates cerises pourpre-noir au goût riche des tomates anciennes, très productives.", kind: "original" },
  ],
  chili: [
    { id: "bird-s-eye", name: "Bird’s Eye", note: "Plant compact couvert de minuscules piments très forts, à l’aise en petit pot." },
    { id: "jalapeno", name: "Jalapeño", note: "Piment charnu moyennement fort, productif dans un pot de 7 L en plein soleil." },
    { id: "espelette", name: "d’Espelette", note: "Saveur fruitée et douce du Pays basque, plant de 60 cm à placer contre un mur chaud.", kind: "heirloom" },
    { id: "cayenne", name: "Cayenne", note: "Longs piments fins très piquants, faciles à sécher en guirlande en fin d’été." },
    { id: "habanada", name: "Habanada", note: "Le parfum fruité de l’habanero sans le feu : sélection récente, plant de 60 cm en pot.", kind: "new" },
    { id: "aji-charapita", name: "Ají Charapita", note: "Piment du Pérou gros comme un petit pois, très parfumé, sur un buisson touffu.", kind: "original" },
  ],
  strawberry: [
    { id: "mara-des-bois", name: "Mara des Bois", note: "Remontante au goût de fraise des bois, produit de juin aux gelées en jardinière." },
    { id: "charlotte", name: "Charlotte", note: "Remontante très parfumée et vigoureuse, charmante en pot suspendu ou tour à fraises." },
    { id: "gariguette", name: "Gariguette", note: "Fruits allongés précoces et sucrés, une seule belle récolte au printemps." },
    { id: "reine-des-vallees", name: "Reine des Vallées", note: "Fraisier des quatre saisons sans stolons, supporte la mi-ombre d’un balcon nord.", kind: "heirloom" },
    { id: "pineberry", name: "Pineberry", note: "Fraise blanche à grains rouges au goût d’ananas : plante un fraisier classique à côté.", kind: "original" },
  ],
  zucchini: [
    { id: "patio-star", name: "Patio Star", note: "Sélection compacte sans coureurs pour un bac de 30 L, fruits verts réguliers." },
    { id: "ronde-de-nice", name: "Ronde de Nice", note: "Fruits ronds à récolter petits pour les farcir, plant généreux à cueillir souvent.", kind: "heirloom" },
    { id: "verte-non-coureuse-d-italie", name: "Verte non coureuse d’Italie", note: "Port en touffe qui reste groupé, précoce et productive en grand bac." },
  ],
  eggplant: [
    { id: "ophelia", name: "Ophelia", note: "Mini-aubergines en grappes sur un plant de 60 cm, adaptée à un pot de 15 L." },
    { id: "blanche-ronde-a-oeuf", name: "Blanche ronde à œuf", note: "Petits fruits blancs en forme d’œuf, aussi décoratifs que bons, plant compact.", kind: "original" },
    { id: "barbentane", name: "Barbentane", note: "Classique provençale précoce à fruits longs, pour un balcon bien chaud et abrité.", kind: "heirloom" },
  ],
  "dwarf-bean": [
    { id: "purple-teepee", name: "Purple Teepee", note: "Gousses violettes portées au-dessus du feuillage, faciles à repérer et à cueillir.", kind: "original" },
    { id: "contender", name: "Contender", note: "Haricot nain précoce et rustique, productif même dans une jardinière de 20 cm." },
    { id: "delinel", name: "Delinel", note: "Filets extra-fins sans fil, touffe compacte à récolter tous les deux jours." },
    { id: "roquencourt", name: "Roquencourt", note: "Haricot beurre nain jaune, ancien et rustique : cueille avant que les grains ne marquent.", kind: "heirloom" },
  ],
  pea: [
    { id: "petit-provencal", name: "Petit Provençal", note: "Pois nain de 40 cm très précoce, pousse sans rames dans une jardinière." },
    { id: "norli", name: "Norli", note: "Mangetout nain aux cosses tendres, à grignoter cru dès la cueillette." },
    { id: "carouby-de-maussane", name: "Carouby de Maussane", note: "Mangetout grimpant d’1,5 m et fleurs violettes : pour habiller un treillage.", kind: "heirloom" },
    { id: "shiraz", name: "Shiraz", note: "Mangetout aux cosses pourpres et fleurs bicolores, sélection récente de 75 cm.", kind: "new" },
  ],
  "mini-cucumber": [
    { id: "iznik", name: "Iznik", note: "Mini-concombres snack sans amertume, plant compact adapté à un pot de 15 L." },
    { id: "mini-munch", name: "Mini Munch", note: "Petits fruits croquants de 10 cm, à palisser sur un treillis contre un mur." },
    { id: "fin-de-meaux", name: "Fin de Meaux", note: "Cornichon classique à confire, très productif si on cueille les fruits petits.", kind: "heirloom" },
    { id: "lemon", name: "Concombre citron", note: "Fruits ronds et jaunes comme un citron, doux et croquants, cultivé depuis 1894.", kind: "heirloom" },
  ],
  "cut-lettuce": [
    { id: "feuille-de-chene-blonde", name: "Feuille de chêne blonde", note: "Repousse après chaque coupe et tolère la mi-ombre, lente à monter en graines.", kind: "heirloom" },
    { id: "lollo-rossa", name: "Lollo Rossa", note: "Feuilles frisées rouges très décoratives, jolies en jardinière mêlée aux fleurs." },
    { id: "salad-bowl", name: "Salad Bowl", note: "Rosette de feuilles tendres à cueillir une à une pendant des semaines." },
    { id: "feuille-de-chene-rouge", name: "Feuille de chêne rouge", note: "Version bronze, plus résistante à la chaleur pour les semis d’été." },
  ],
  arugula: [
    { id: "cultivee", name: "Cultivée", note: "Levée en quelques jours, feuilles tendres prêtes en trois semaines en jardinière." },
    { id: "sauvage", name: "Sauvage", note: "Plus piquante et vivace, elle repousse des mois après chaque coupe dans son pot." },
  ],
  spinach: [
    { id: "matador", name: "Matador", note: "Feuilles lisses et épaisses, lente à monter : la plus simple en jardinière." },
    { id: "monstrueux-de-viroflay", name: "Monstrueux de Viroflay", note: "Grandes feuilles très productives, à semer en fin d’été pour l’automne.", kind: "heirloom" },
    { id: "geant-d-hiver", name: "Géant d’hiver", note: "Très résistant au froid, il se récolte tout l’hiver sur un balcon abrité." },
  ],
  chard: [
    { id: "bright-lights", name: "Bright Lights", note: "Côtes jaunes, roses et rouges : un légume aussi décoratif qu’une fleur en bac." },
    { id: "rhubarb-chard", name: "Rhubarb Chard", note: "Côtes rouge vif et feuilles cloquées, à cueillir jeunes pour les salades.", kind: "original" },
    { id: "lucullus", name: "Lucullus", note: "Poirée verte vigoureuse à côtes larges, supporte bien la mi-ombre." },
  ],
  "lambs-lettuce": [
    { id: "verte-de-cambrai", name: "Verte de Cambrai", note: "Petites rosettes rustiques et goûteuses, à semer en septembre en jardinière.", kind: "heirloom" },
    { id: "coquille-de-louviers", name: "Coquille de Louviers", note: "Feuilles en cuillère très résistantes au froid, pour des récoltes d’hiver.", kind: "heirloom" },
    { id: "vit", name: "Vit", note: "Pousse rapide et feuilles vert brillant, la plus productive en petit volume." },
  ],
  kale: [
    { id: "nero-di-toscana", name: "Nero di Toscana", note: "Feuilles bleu-noir cloquées, port dressé qui prend peu de place au sol.", kind: "heirloom" },
    { id: "vert-demi-nain-frise", name: "Vert demi-nain frisé", note: "Chou frisé compact de 40 cm, très rustique pour des récoltes tout l’hiver." },
    { id: "redbor", name: "Redbor", note: "Feuilles frisées pourpres spectaculaires, aussi belles que bonnes en bac.", kind: "original" },
  ],
  radish: [
    { id: "cherry-belle", name: "Cherry Belle", note: "Radis rond rouge prêt en quatre semaines, ne demande que 10 cm de terre." },
    { id: "flamboyant", name: "Flamboyant", note: "Demi-long rouge à bout blanc, croquant et doux, lent à devenir creux." },
    { id: "de-18-jours", name: "De 18 jours", note: "Le plus rapide de tous, parfait pour initier les enfants en jardinière.", kind: "heirloom" },
    { id: "oeuf-de-paques", name: "Œuf de Pâques", note: "Mélange de radis ronds blancs, roses, rouges et violets : la jardinière la plus gaie.", kind: "original" },
    { id: "rose-de-chine", name: "Rose de Chine", note: "Radis d’automne rose à chair blanche, à semer en août pour l’arrière-saison.", kind: "heirloom" },
  ],
  "round-carrot": [
    { id: "marche-de-paris", name: "Marché de Paris", note: "Carotte ronde et sucrée qui se contente de 15 cm de terreau en pot.", kind: "heirloom" },
    { id: "parmex", name: "Parmex", note: "Petites boules orange régulières, précoces et faciles en jardinière peu profonde." },
    { id: "rondo", name: "Rondo", note: "Ronde et lisse, elle supporte mieux les terreaux lourds que les carottes longues." },
  ],
  "spring-onion": [
    { id: "white-lisbon", name: "White Lisbon", note: "Oignon blanc à croissance rapide, à récolter en botte deux mois après le semis." },
    { id: "ishikura", name: "Ishikura", note: "Ciboule japonaise à longs fûts blancs qui ne forme pas de bulbe, coupe après coupe." },
    { id: "ciboule-commune", name: "Ciboule commune", note: "Vivace et rustique, elle reste en pot des années et se divise facilement." },
  ],
  nasturtium: [
    { id: "tom-pouce", name: "Tom Pouce", note: "Capucine naine en coussin de 25 cm, fleurs vives pour un pot ou une jardinière." },
    { id: "alaska", name: "Alaska", note: "Feuilles marbrées de crème et port compact, décorative même sans fleurs." },
    { id: "empress-of-india", name: "Empress of India", note: "Fleurs rouge sang et feuillage sombre, naine et généreuse tout l’été.", kind: "heirloom" },
  ],
  calendula: [
    { id: "fiesta-gitana", name: "Fiesta Gitana", note: "Souci nain de 30 cm aux fleurs doubles, parfait en balconnière." },
    { id: "indian-prince", name: "Indian Prince", note: "Fleurs orange foncé à revers acajou, lumineuses sur un balcon mi-ombragé." },
    { id: "pacific-beauty", name: "Pacific Beauty", note: "Longues tiges de 50 cm pour les bouquets, fleurit jusqu’aux premières gelées." },
  ],
  lavender: [
    { id: "hidcote", name: "Hidcote", note: "Lavande compacte de 40 cm aux épis violet foncé, idéale dans un pot de 10 L." },
    { id: "munstead", name: "Munstead", note: "Naine et très rustique, fleurit tôt et résiste aux balcons froids et ventés." },
    { id: "papillon", name: "Lavande papillon", note: "Épis surmontés de bractées en ailes, très florifère mais à protéger des fortes gelées." },
  ],
  cosmos: [
    { id: "sonata", name: "Sonata", note: "Cosmos nain de 60 cm qui ne verse pas au vent, floraison blanche et rose continue." },
    { id: "cosmic-orange", name: "Cosmic Orange", note: "Cosmos sulfureux compact aux fleurs orange, supporte la chaleur et la sécheresse." },
    { id: "sensation", name: "Sensation", note: "Le grand classique d’1,2 m pour un bac profond à l’abri du vent." },
  ],
  borage: [
    { id: "officinale", name: "Officinale", note: "Fleurs bleues comestibles adorées des abeilles, se ressème d’elle-même en bac." },
    { id: "blanche", name: "Blanche", note: "Même générosité avec des fleurs blanches, plus lumineuse sur un balcon ombragé." },
  ],
  marigold: [
    { id: "bonanza", name: "Bonanza", note: "Œillet d’Inde nain de 25 cm aux fleurs doubles, parfait au pied des tomates." },
    { id: "naughty-marietta", name: "Naughty Marietta", note: "Fleurs simples jaunes à cœur acajou, très mellifères et florifères tout l’été." },
    { id: "lemon-gem", name: "Lemon Gem", note: "Tagète à feuilles fines au parfum citronné, coussin de petites fleurs jaunes." },
  ],
  "dwarf-sunflower": [
    { id: "big-smile", name: "Big Smile", note: "Tournesol de 40 cm à fleur jaune vif, fleurit vite dans un pot de 5 L." },
    { id: "pacino", name: "Pacino", note: "Tiges ramifiées de 40 cm portant plusieurs fleurs, sélectionné pour la culture en pot." },
    { id: "teddy-bear", name: "Teddy Bear", note: "Fleurs doubles en pompon duveteux sur 60 cm, très apprécié des enfants.", kind: "original" },
  ],
};
