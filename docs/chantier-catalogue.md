# Chantier « Catalogue balcon et terrasse » (21/10)

Sa demande du 21/10 : « augmenter le catalogue de plantes possibles sur balcon, terrasse ». Ses choix : **toutes les
familles** (arbres fruitiers en pot, grimpantes, arbustes et graminées, bulbes / hiver / plantes grasses) **et des
légumes**, **environ 30 plantes**. Aujourd'hui : 101 plantes, dont 4 seulement pour terrasse, aucun arbre fruitier
(hors citronnier et figuier), aucune grimpante d'ornement, aucun bulbe.

## Les 32 plantes proposées (à valider)

| Famille | Plantes |
|---|---|
| Bulbes, hiver, plantes grasses (8) | tulipe, narcisse (jonquille), muscari, crocus, bruyère d'hiver, hellébore (rose de Noël), joubarbe, sedum |
| Arbres fruitiers en pot (6) | olivier, pommier colonnaire, pêcher nain, cerisier nain, kumquat, grenadier |
| Grimpantes (6) | jasmin étoilé, clématite, passiflore, vigne en pot, chèvrefeuille, ipomée (volubilis, à semer) |
| Arbustes et graminées (6) | hortensia, rosier (buisson ou miniature), laurier-rose, érable du Japon, bambou non traçant (Fargesia), graminée légère (Stipa) |
| Légumes (6) | fève, patate douce, potimarron (grimpant), artichaut, rhubarbe, fenouil bulbe |

Pour chaque plante, comme pour les 101 autres : calendrier vérifié sur 2 sources au moins (sa règle), fiche « Spécial
Pot », variétés pour le pot, seuil de froid (frileuses), rempotage (vivaces), famille, accords des phrases, photo libre
de droits avec son crédit.

## Ce qui change dans l'app

1. **Trois nouvelles catégories** dans le catalogue : « Arbres fruitiers », « Grimpantes », « Arbustes et
   feuillages ». Bulbes et fleurs d'hiver vont dans « Fleurs », les légumes dans leurs catégories actuelles.
2. **Plantes qu'on ne cueille pas** (`bloomOnly` dans `lib/plants/catalog.ts`, `hasHarvest`) : pas de geste
   « Récolte » chaque jour, ni dans Saisons, Ma semaine, les vacances, les consignes du voisin ou les questions de Nora ;
   leurs mois de « récolte » sont la floraison (pastille « 🌸 Floraison » de la fiche, comme toutes les fleurs). Pour
   le bambou, l'érable, la graminée (livraison 4) : la pastille dira la belle saison.
3. **Bulbes** : plantés en automne, fleurs au printemps, puis « Laisse jaunir les feuilles » avant de couper. Tulipe :
   à replanter chaque automne en pot ; narcisse, muscari, crocus : reviennent chaque année.
4. **Gros pots** (30 à 60 L) : la fiche rappelle le poids (calculateur « Poids de tes pots » déjà en place).
5. **Photos** : le réseau de la session Claude bloque Wikimedia et le Codespace n'est plus utilisé. Nouveau bouton
   GitHub « Chercher les photos des plantes » : il télécharge les photos candidates sur la branche, Claude choisit,
   puis un 2ᵉ passage garde les photos choisies, allégées, avec leurs crédits.

## Livraisons (une à la fois, testée sur son téléphone)

1. **Bulbes, hiver, plantes grasses** en premier : c'est la saison pour planter les bulbes (octobre-novembre). Avec le
   bouton des photos et les plantes « sans récolte ».
2. **Arbres fruitiers** (plantation de novembre à mars) et nouvelles catégories.
3. **Grimpantes et légumes.**
4. **Arbustes et graminées.**

## Avancement

- 21/10 : plan validé (« OK, lance la livraison 1 »).
- 21/10, **livraison 1 codée** (109 plantes) : tulipes, narcisses, muscaris, crocus, bruyère d'hiver, hellébore,
  joubarbe, sédum d'automne. Sources dans `docs/sources-calendrier.md` (dernière partie). Bulbes : pas-à-pas « plante
  un bulbe », arrosés seulement à la plantation et au printemps, au repos l'été ; tous les 2-3 ans (tulipes : chaque
  automne, bulbes neufs) « Rempote… » ouvre un pas-à-pas propre aux bulbes (même pot, terre neuve). Un geste par
  plante : couper les fleurs fanées (bulbes), tailler la bruyère, vieilles feuilles de l'hellébore (avec des gants),
  rosette fanée de la joubarbe, tiges sèches du sédum. Photos par le bouton GitHub « Photos des plantes »
  (`.github/workflows/photos.yml`, se lance seul quand `scripts/photos/` change). Sainte-Catherine propose aussi
  bruyère, crocus, muscaris, hellébore. PR #66, à valider sur son téléphone.
- 21/10, son retour : « il ajoute la plante puis la retire, double vibration ». Cause : le serveur en ligne (pas
  encore à jour avant la fusion) ignore une plante du catalogue qu'il ne connaît pas, et la synchro effaçait du
  téléphone toute plante absente de la réponse du serveur. Corrigé (`applySnapshot`, `unsyncedPlants`) : une plante
  que le serveur n'a pas reste sur le téléphone et repart à la synchro suivante (le serveur ne supprime jamais de
  plante). La double vibration est celle de « succès » d'Android, la même partout dans l'app. Fiche du catalogue :
  « 🌸 Floraison » pour les fleurs.
- 21/10, son retour : « les tulipes restent » (synchro OK). Puis « comment savoir quand les planter ? Il n'y a que
  la floraison ». Ajouté : pastilles « 📅 Semis … » / « 📅 Plantation … » sur la fiche tant que la plante est à
  planter, et toujours « 📅 Plantation » pour un bulbe (replanté à l'automne) ; `startPills` (lib/plants/guide.ts).
- 21/10 : **livraison 1 validée sur son téléphone** (« c'est tout bon »). PR #66 à fusionner (le serveur ne connaît
  les nouvelles plantes qu'après la fusion).
- 21/10 : PR #66 fusionnée dans `main`.
- 21/10, **livraison 2 codée** (115 plantes) : olivier, pommier colonnaire, pêcher nain, cerisier nain, kumquat,
  grenadier, dans la nouvelle catégorie « Arbres fruitiers » (`fruit-tree`) avec le citronnier et le figuier nain.
  Kumquat et grenadier rangés parmi les frileuses (choix pour l'hiver « le rentrer », `cold-hardiness.ts`) ; olivier
  rustique vers -5 °C (alertes gel, « Prépare l'abri » de novembre à février). Gestes : tailles, éclaircir les fruits
  (pommier, pêcher), cloque du pêcher à la bouillie bordelaise (novembre et février), filet du cerisier. Pas de geste
  « gel sur les fleurs » chaque jour en mars-avril (trop répétitif) : à faire plus tard par une alerte météo.
  Sainte-Catherine propose aussi pommier, cerisier et pêcher. PR #67, à valider sur son téléphone.
- Idée notée : dire sur la fiche quand une plante est toxique (tulipes, narcisses, hellébore) pour les chats et les
  enfants ; pas de champ pour ça aujourd'hui.
- 23/10, « on peut continuer avec la livraison 3 » : **livraison 3 codée** (127 plantes). Nouvelle catégorie
  « Grimpantes » : jasmin étoilé, clématite, passiflore, chèvrefeuille, ipomées (fleurs, sans geste « Récolte »,
  geste « guide les tiges » au printemps) et vigne en pot (récolte, taille à 2 bourgeons, éclaircir les grappes).
  Légumes : fèves (pincer la tête contre les pucerons noirs), patate douce et fenouil (récoltés en une fois),
  potimarron (sur treillage), artichaut et rhubarbe (vivaces ; feuilles de rhubarbe toxiques, écrit sur la fiche).
  Les grimpantes à fleurs sont des fleurs partout (`isFlower` de catalog.ts : pastille « Floraison », « Elle a
  fleuri », pas de remède « comestible » dans Observer) ; le soir de gel, « Dernière nuit pour tes ipomées » au lieu
  de « Cueille ». Deux familles ajoutées pour la rotation : liseron (ipomées, patate douce), oseille (oseille,
  rhubarbe). Photos : le filtre du script écartait « Passiflora » (contient « flora ») ; corrigé. Sources dans
  `docs/sources-calendrier.md` (dernière partie). Ajoutée à la PR #67, à valider sur son téléphone.
- 23/10, son retour : « mets mieux en avant les avertissements et illustre les nouveaux gestes dans le pas-à-pas ».
  **Avertissements** (`lib/plants/warnings.ts`, carte orange `components/plant-warning.tsx`) : rhubarbe, ipomées,
  pois de senteur, tulipes, narcisses, hellébore, clématite, chèvrefeuille (sources vérifiées ; jasmin étoilé et
  muscari écartés faute de sources sûres). Visibles dans la liste du catalogue (« ⚠️ Toxique »), sa fiche, la question
  du « + », la fiche plante (sous les pastilles), le détail d'un geste qui touche la plante et les pas-à-pas ; plus
  dans le texte de présentation. **7 pas-à-pas d'entretien en images** (`lib/plants/care-guides.ts`, 11 dessins) :
  guider les tiges (grimpantes, potimarron avec son filet, pois de senteur), tailler une grimpante, tailler la vigne
  (deux bourgeons), éclaircir les grappes, couper la tige à fleurs de la rhubarbe, butter (fenouil, pommes de terre),
  protéger du froid (olivier, jasmin, artichaut). Ouverts par « Pas à pas, en images » dans le détail du geste sur
  Aujourd'hui, ou par la fiche pendant les mois du geste ; le dernier bouton coche le geste. Détail dans
  `docs/pas-a-pas.md` (§ 14).
- 23/10, son retour : « je ne vois pas le pas-à-pas comment protéger du froid, j'ai pourtant mis la simulation gel »
  (artichaut). Deux causes : la fiche ne proposait le pas-à-pas que pendant les mois du geste (novembre à février),
  et la simulation « Gel » (-3 °C) ne concerne pas l'artichaut (alerte sous -5 °C). Corrigé : la fiche propose les
  pas-à-pas d'entretien du mois et du mois suivant, et « Protéger du froid » dès qu'un gel est annoncé pour la plante
  (`careGuidesNow`) ; l'alerte gel d'Aujourd'hui ouvre « Protéger l'artichaut du froid, pas à pas » pour les plantes
  qui restent dehors (`frostGuideFor`) ; nouvelle simulation « Grand froid » (-8 °C). E2e `37-proteger-du-froid`.
- 23/10, sa question : « cette règle a été appliquée uniquement à l'artichaut ? ». Vérifié plante par plante : « Protéger
  du froid » valait pour l'olivier, le jasmin étoilé et l'artichaut ; il manquait le romarin et la passiflore, qui
  restent dehors et reçoivent les alertes gel. Ajoutés (`frostGuideFor` : toute vivace sensible au gel qui n'est pas
  une frileuse à rentrer). Les frileuses ont déjà leur pas-à-pas « Rentrer » (choix pour l'hiver). La règle « ce mois-ci
  et le mois prochain » de la fiche vaut pour les 7 pas-à-pas d'entretien et toutes les plantes.
- 23/10 (22 h), son retour avec un potimarron ajouté : 1) « Vent fort : mets le potimarron à l'abri, rafales jusqu'à
  92 km/h » alors que le vent était retombé : le moteur prenait le maximum des rafales de toute la journée, celles du
  matin comprises ; il ne regarde plus que les 12 prochaines heures (`safetyDecision` de `reminder-engine.ts`, vaut
  aussi pour le serveur). 2) « Guider les tiges » introuvable en octobre (geste de juin à août) : la fiche montre
  maintenant tous les pas-à-pas d'entretien de la plante, ceux du moment d'abord, les autres avec « À faire en
  juin–août » (`plantCareGuides`). E2e dans `37-proteger-du-froid`.
