# Chantier « Retours des captures » (14/10)

Retours du porteur sur les 16 captures du 14/10 (`docs/captures/`). Une étape = un commit testé, validée sur son
téléphone avant la suivante. Pour chaque étape, on cherche aussi le même défaut ailleurs dans l'app.

## Étape 1 : consignes pour le voisin (faite le 14/10, à valider)

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

## Étape 2 : « Ton pot est libre » après les radis

- Contradiction : « Ressemer des radis » juste au-dessus de « Pas de la famille du chou », alors que le radis en fait
  partie.
- Décision : quand la plante récoltée est d'une famille à éviter, garder « Ressemer des radis » avec le sous-titre
  « Dans un autre pot, ou avec une terre neuve ». Le texte sur la famille ne vaut que pour les idées « à la place ».

## Étape 3 : le sens de « À surveiller »

- L'orange garde son sens d'alerte : « À surveiller » seulement pour un vrai souci (forte chaleur, problème vu par
  Observer, pot trop petit, plante en retard de soin depuis plusieurs jours).
- Un arrosage ou une récolte du jour ne change pas le statut : « En forme », le geste en sous-titre.
- Le compteur du Balcon (« 5 plantes · 4 à surveiller ») suit la même règle.
- Lister les cas exacts qui passent en orange et les faire valider avant de coder.

## Étape 4 : taille choisie ou taille conseillée

- Pas de taille choisie : « Pot conseillé : … » sur la fiche (le toucher ouvre le choix). Taille choisie : « Pot de … ».
- La taille conseillée de chaque fiche doit tomber dans la bonne catégorie (petit, moyen, grand, jardinière), partout :
  fiche, poids, arrosage, liste de courses (le basilic affichait « Pot de 20 cm », limite du moyen, mais compté petit).

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
