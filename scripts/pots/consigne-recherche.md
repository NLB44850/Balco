# Mission : fiches « Spécial Pot » (app de jardinage sur balcon Balco, en français)

Pour CHAQUE plante de ta liste, trouve par recherche web (outil WebSearch ; WebFetch et curl sont bloqués,
travaille avec les extraits des résultats) les valeurs de culture EN POT suivantes, et vérifie CHAQUE valeur
sur AU MOINS 2 sources différentes (sites de semenciers, jardineries, sites de jardinage reconnus en
français de préférence : jardiner-malin.fr, promessedefleurs.com, gerbeaud.com, rustica.fr, gammvert.fr,
truffaut.com, willemsefrance.fr, graines-baumaux.fr, fermedesaintemarthe.com, jardinage.ooreka.fr,
binette-et-cornichon.com, aujardin.info, detente-jardin.com, plantezcheznous.com, etc.). Fais 2 à 3
recherches ciblées par plante, par ex. « <plante> en pot profondeur », « <plante> en pot taille du pot litres
terreau », « <plante> en pot engrais quand ».

Valeurs à donner :
1. `depthCm` : profondeur MINIMALE de terre (cm) pour cultiver la plante en pot. Nombre entier.
2. `liters` : volume MINIMAL du pot (litres) pour UN pied (grandes plantes) ou, pour les plantes semées en
   ligne ou en touffe (radis, mâche, salade à couper, micro-pousses, ciboulette…), pour un pot qui donne une
   récolte utile. Dis dans `forWhat` à quoi correspond le volume (« 1 pied », « un rang de 10 radis »,
   « une touffe »…). Si les sources donnent un diamètre, convertis (pot rond ≈ 0,5 L pour 10 cm de diamètre,
   2 L pour 15 cm, 5 L pour 20 cm, 10 L pour 25-26 cm, 15 L pour 30 cm, 25-30 L pour 35-40 cm, 40 L pour 45 cm).
3. `soil` : UN type parmi :
   - "universal" : terreau universel ou potager classique ;
   - "rich" : terreau potager enrichi de compost ou de fumier (plantes gourmandes) ;
   - "draining" : terreau mélangé de sable ou de gravier, très drainant (méditerranéennes, plantes qui
     craignent l'eau stagnante) ;
   - "light" : terreau léger et meuble, sans cailloux ni fumier frais (racines : carottes, radis, betteraves…) ;
   - "acid" : terre de bruyère ou terreau pour plantes acidophiles ;
   - "citrus" : terreau spécial agrumes / méditerranéen ;
   - "seed" : terreau de semis fin (micro-pousses).
   Et `soilTip` : UN conseil court au tutoiement, verbe en tête, MOINS DE 12 MOTS, ou null
   (ex. « Ajoute un tiers de sable : il déteste l'eau qui stagne. »).
4. `feeding` : l'engrais en pot, organique uniquement (jamais de produit chimique) :
   - `need` : "none" (n'en veut pas ou presque : aromatiques méditerranéennes, capucines, légumineuses…),
     "light" (un peu de compost ou d'engrais organique au printemps ou à la plantation, c'est tout),
     "regular" (engrais organique à intervalles réguliers pendant la saison) ;
   - `everyDays` : intervalle en jours si "regular" (ex. 14), sinon null ;
   - `from` : quand commencer, en quelques mots (« dès la floraison », « à la plantation », « au printemps »,
     « dès l'apparition des premiers fruits »…), null si "none" ;
   - `months` : mois (1 à 12) où l'on nourrit, repère Paris, culture en pot ; [] si "none" ;
   - `kind` : type d'engrais organique conseillé en quelques mots (« engrais liquide pour tomates »,
     « purin d'ortie dilué », « compost en surface », « engrais pour terre de bruyère »…), null si "none".

Règles :
- Une valeur n'est retenue que si 2 sources au moins concordent (même valeur ou fourchettes qui se
  recouvrent ; prends alors une valeur prudente, plutôt du côté le plus grand pour profondeur et volume).
  Si les sources divergent ou si tu n'en trouves qu'une, donne quand même la valeur la plus prudente, mets
  `confidence: "low"` et explique dans `note`.
- `confidence` : "high" (sources concordantes), "medium" (nuances entre sources), "low" (une seule source ou
  désaccord).
- `sources` : les URL réellement consultées dans les résultats (2 à 4), qui donnent bien les valeurs.
  N'invente JAMAIS d'URL ni de valeur : si tu ne trouves rien, dis-le dans `note`.
- `note` : une phrase en français sur les nuances (ou "").
- Pas de nom de marque dans les textes.

Écris le résultat avec l'outil Write dans le fichier JSON indiqué, sous la forme d'un tableau :
[{ "id": "basil", "name": "Basilic", "depthCm": 20, "liters": 3, "forWhat": "1 pied",
   "soil": "rich", "soilTip": null,
   "feeding": { "need": "regular", "everyDays": 30, "from": "dès la mi-juin", "months": [6,7,8], "kind": "engrais liquide organique à demi-dose" },
   "confidence": "high", "sources": ["https://…", "https://…"], "note": "" }, …]
(les valeurs de l'exemple sont fictives). Garde les `id` exactement comme donnés. Vérifie à la fin que le
fichier est un JSON valide (par ex. `node -e "JSON.parse(require('fs').readFileSync('<fichier>','utf8'))"`)
et qu'il contient toutes les plantes de ta liste. Réponds ensuite en 5 lignes au plus : nombre de plantes,
celles en confiance "low".
