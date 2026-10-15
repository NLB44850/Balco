# Chantier « Retours des captures » (14/10)

Retours du porteur sur les 16 captures du 14/10 (`docs/captures/`). Une étape = un commit testé, validée sur son
téléphone avant la suivante. Pour chaque étape, on cherche aussi le même défaut ailleurs dans l'app.

## Étape 1 : consignes pour le voisin (validée le 14/10)

- Le rythme de chaque plante suit les passages du voisin (avant : « passage tous les 3 jours », mais « tomates : 4 L
  tous les 4 jours »). Maintenant : « Tomates cerises : environ 4 L à chaque passage, si la terre est sèche », ou
  « un passage sur deux / trois / quatre », « de temps en temps, seulement si la terre est sèche » au-delà.
- Une plante qui a besoin d'eau plus souvent que les passages (par forte chaleur) le dit : « s'il fait plus de 30 °C,
  passe plus souvent pour le basilic si tu peux (chaque jour) ».
- L'écran Mode vacances dit quand passer, et chaque plante y suit le même rythme.
- Pas de majuscule après les deux-points : « À récolter : cueille-les… ». Même défaut corrigé ailleurs (outil
  `afterColon` de `lib/plants/grammar.ts`) : « Ajouté : menthe… », « À planter : lavande… », « Gardée pour le
  printemps : tomates cerises », « Vérifie le pot : basilic », « Nouvelle carte dans ton herbier : thym »,
  « Nora a retenu : … », note d'Observer dans l'historique.
- Code : `lib/garden/helper-note.ts` (`helperPlantWatering(item, visitEvery)`), `app/vacation.tsx`.

## Étape 2 : « Ton pot est libre » après les radis (validée le 14/10)

- Contradiction : « Ressemer des radis » juste au-dessus de « Pas de la famille du chou », alors que le radis en fait
  partie.
- Décision : quand la plante récoltée est d'une famille à éviter, garder « Ressemer des radis » avec le sous-titre
  « Dans un autre pot, ou avec une terre neuve ». Le texte sur la famille ne vaut que pour les idées « à la place ».
- Fait : `restartDetail` (`lib/garden/harvest-end.ts`) ; une plante seule de sa famille (micro-pousses…) garde « Dans le
  même pot, avec son pas-à-pas. ». Vaut aussi pour la fin de saison (même feuille). Ailleurs, rien d'autre ne propose
  de ressemer dans le même pot.
- Vu en testant (14/10, balcon à l'ombre, radis en petit pot, ciboulette déjà là) : aucune idée « à la place ». Corrigé
  (`replantIdeas`) : ce mois-ci, puis le mois suivant, puis une plante déjà sur le balcon (« Déjà sur ton balcon · … »)
  plutôt que rien ; s'il ne reste vraiment rien, lien « Voir les plantes de mai › » vers le catalogue du mois.
- Vu aussi : radis cochés dans la feuille des récoltes, puis « Oui » : la feuille du pot libre s'empilait sur celle des
  récoltes (Android). La feuille des récoltes se replie d'abord (`app/(tabs)/index.tsx`).

## Étape 3 : le sens de « À surveiller » (validée le 15/10)

- L'orange garde son sens d'alerte : « À surveiller » seulement pour un vrai souci (forte chaleur, problème vu par
  Observer, pot trop petit, plante en retard de soin depuis plusieurs jours).
- Un arrosage ou une récolte du jour ne change pas le statut : « En forme », le geste en sous-titre.
- Le compteur du Balcon (« 5 plantes · 4 à surveiller ») suit la même règle.
- Lister les cas exacts qui passent en orange et les faire valider avant de coder.
- Validé le 14/10 (« ok, tout me va »), codé dans `statusOf` (`lib/garden/day-plan.ts`), avec un mot précis :
  1. « Forte chaleur », « Orage annoncé », « Coup de vent » : alerte pas encore traitée ;
  2. « Problème vu par Observer » : dernière analyse « À surveiller » ou « Besoin de soins » de moins de 14 jours
     (`OBSERVER_PROBLEM_DAYS`), sauf nouvelle analyse qui va bien ; le verdict est gardé dans l'identifiant de
     l'analyse (`scanEventId`, `scan:<plante>:<ms>:<état>`) ;
  3. « Pot trop petit » (ou « trop peu profond ») : seulement pour une taille choisie ;
  4. « Pas arrosée depuis N jours » : 3 jours de retard ou plus sur son rythme (`LATE_WATERING_DAYS`) ; jamais arrosée
     dans l'app : compté depuis son arrivée ou sa mise en terre (vu en testant le 14/10).
- Bleu : « Gel annoncé » (compté) et « Pluie annoncée » (plus comptée). Compteur du Balcon = `status.worry`.
- Un arrosage ou une récolte du jour : « En forme ». E2e `27-a-surveiller`.

## Étape 4 : taille choisie ou taille conseillée (faite le 15/10, à valider)

- Pas de taille choisie : « Pot conseillé : … » sur la fiche (le toucher ouvre le choix). Taille choisie : « Pot de … ».
- La taille conseillée de chaque fiche doit tomber dans la bonne catégorie (petit, moyen, grand, jardinière), partout :
  fiche, poids, arrosage, liste de courses (le basilic affichait « Pot de 20 cm », limite du moyen, mais compté petit).
- Vérifié sur les 101 fiches (test `tests/pot-sheet.test.ts`). Fait :
  1. Bornes des tailles : « Petit (jusqu’à 20 cm) », « Moyen (21 à 30 cm) », « Grand (31 à 40 cm) » ; la largeur haute
     (`SIZE_MAX_WIDTH`) range une largeur partout : 11 plantes à 20 cm sont petites, 3 à 40 cm sont grandes (elles
     étaient « bac »). Une profondeur peut faire monter d'une taille (fraisier : 20 cm de large, 25 de profondeur, moyen).
  2. `potLabel` : « Pot conseillé : petit (jusqu’à 20 cm) » ou « Pot moyen (21 à 30 cm) » ; « Pot conseillé : bac de
     45 cm ou plus » au-delà (courgette). Fiche (pastille qui ouvre le choix), poids des pots, liste de courses.
  3. Taille pas notée = taille conseillée partout : rythme d'arrosage (avant : celui d'un pot moyen), poids du pot vide,
     ligne de la liste de courses ; le volume reste celui de la fiche (arrosage, poids, terreau).
  4. Vu en testant (15/10) : le catalogue notait d'office la taille conseillée (« Ton pot : Grand » sur le gombo, comme
     un choix). Plus de taille notée à l'ajout (`addPlant`) : message « Ajouté : menthe · pot conseillé : moyen (21 à
     30 cm) » (`advisedPotPhrase`), carte « Vérifie le pot » : « Pot conseillé : … » et « Pots conseillés par Balco :
     c'est bien ça ? ». Les plantes déjà ajoutées gardent la taille notée à l'époque (on ne sait pas la distinguer
     d'un vrai choix) : la changer sur la fiche si besoin.

## Étape 5 : finitions des textes

- Cartes du Balcon : « Ta photo » devient « Ajouter une photo ».
- Liste de courses : plus aucun sous-titre coupé par « … » ; « En version organique » devient « utilisable en
  agriculture biologique ».
- Fiche plante : un seul format de durée (semaines, puis mois après 8 semaines).

## Étape 6 : réponse de Nora

- « Réponse de Nora : ta plante va bien, arrose quand la terre est sèche. » : dire d'abord si c'est la réponse simulée
  ou une vraie réponse. Un texte de secours ne dit jamais que tout va bien (« Nora ne peut pas répondre pour l'instant,
  réessaie dans un moment »), et la question n'est pas décomptée.

## Étape 7 : billes d'argile au fond des pots

- Revérifier sur deux sources sérieuses (notées dans `docs/sources-*.md`). Si ce n'est pas confirmé : « Vérifie que ton
  pot a un trou au fond », retirer les billes de la liste de courses, revoir « Pour alléger ». Montrer les textes au
  porteur avant de les changer.

## Bug vu pendant le test de l'étape 1 (14/10)

- Catalogue ouvert depuis Balcon, clavier ouvert (recherche « Men ») : toucher la plante ouvrait la fiche sous la barre
  d'état (le « × » caché) avec la barre « Voir mon balcon » par-dessus. Corrigé dans la feuille du bas commune
  (`components/today/bottom-sheet.tsx`) : le clavier est fermé et la feuille attend qu'il soit parti avant de monter.
  Vaut pour toutes les feuilles (catalogue, Nora, Réglages…).

## Idée notée le 15/10, à étudier par le porteur (pas codée)

- Une plante hors saison, comme un basilic en octobre (question « Ta saison est finie ? » déjà répondue « Pas
  encore »), n'a plus aucun geste : la fiche dit « Nouvelle · Aucun soin noté » puis « Rien à faire aujourd'hui,
  Basilic se repose ». C'est bizarre : elle vit encore, et elle pourrait continuer à l'intérieur (redoux).
- Piste : un état « Fin de saison » plutôt que « Nouvelle », et une option « La rentrer à l'intérieur » (arrosage
  d'intérieur, rebord de fenêtre lumineux). Rejoint « rentrer une plante pour l'hiver » de la version suivante
  (piment, poivron, physalis, décidé le 08/10). À décider avec lui avant de coder.
