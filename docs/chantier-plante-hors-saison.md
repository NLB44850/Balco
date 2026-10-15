# Chantier « Plante hors saison » (validé avec le porteur le 15/10)

Problème de départ : un basilic ajouté en octobre affiche « Nouvelle · Rien à faire ». C'est faux : il souffre dès que
les nuits passent sous 10 °C environ et meurt au premier gel. À l'inverse, un thym ajouté en octobre n'a vraiment rien
à faire. Ce chantier avance une partie de « rentrer une plante pour l'hiver » (prévu pour la version suivante).

Une étape = un commit testé, validée sur son téléphone avant la suivante. Demande de fusion vers `main` quand il valide.

## Règles à respecter partout

- Une ligne par plante au plus sur Aujourd'hui, regroupée dès deux plantes.
- L'orange reste réservé aux vrais soucis : ici tout est en neutre.
- Textes au tutoiement, verbe en tête, moins de 12 mots ; boutons à l'infinitif.
- Accords (ton/ta/tes, le/la/les) par `lib/plants/grammar.ts`.
- Chaque valeur de jardinage vérifiée sur deux sources (`docs/sources-*.md`), sinon affichée comme estimation.
- Pas de nouveau module du téléphone sans le prévenir.
- Tout fait partie de la sauvegarde du compte.

## Étape 1 : les données des 101 plantes

- Pour chaque plante : rustique ou frileuse (on repart de la liste des alertes gel, `care.frostSensitive`) ; pour les
  frileuses, la température de nuit sous laquelle elle souffre ; et si la rentrer à l'intérieur vaut la peine :
  « oui, elle passe l'hiver » (piment, physalis), « quelques semaines de plus » (basilic) ou « non ».
- Tableau résumé montré au porteur avant de coder la suite.

## Étape 2 : un état juste dès l'ajout hors saison

- Au catalogue (« Déjà sur mon balcon ») et dans l'accueil (« déjà des plantes ») :
  - plante frileuse hors saison : « Fin de saison », en neutre ;
  - plante rustique au repos : « Au repos jusqu'en mars » (le bon mois selon la plante et le climat de la ville), en
    neutre.
- Plus jamais « Nouvelle · Rien à faire » pour ces cas.
- Le Balcon, la fiche et Aujourd'hui disent la même chose.

## Étape 3 : le choix en trois réponses

- Sur la fiche d'une plante frileuse en fin de saison, une carte une seule fois : « Ton basilic n'aime pas le froid.
  Que veux-tu faire ? »
  1. « Tout récolter » : reprend « Tout récolté ? » puis « Ton pot est libre », avec une astuce de conservation
     vérifiée (feuilles congelées dans l'huile, en glaçons…) quand elle existe pour la plante.
  2. « La rentrer à l'intérieur » : étape 4. Pas proposé si l'étape 1 dit « non ».
  3. « La laisser dehors » : rien ne change, Balco prévient le soir du gel avec « Ta saison est finie ? ».
- Sur Aujourd'hui, une ligne « Décide pour ton basilic avant le froid » (dès deux plantes : « Prépare 3 plantes pour le
  froid »). Sans réponse, elle revient seulement quand une nuit sous le seuil est annoncée.
- Harmonisé avec « Ta saison est finie ? » : jamais deux cartes qui disent la même chose pour une plante.

## Étape 4 : « La rentrer à l'intérieur »

- Quand : la ligne « Rentre ton basilic » apparaît dès qu'une nuit sous le seuil de la plante est annoncée dans les
  3 jours. Tant que les nuits restent douces, elle attend. Pas d'aller-retour dedans / dehors selon la météo.
- Pas-à-pas illustré facultatif, 4 écrans au plus : vérifie les pucerons sous les feuilles, vide la soucoupe, choisis
  la fenêtre la plus lumineuse, éloigne-la du radiateur.
- Une fois cochée, état « À l'intérieur » (neutre, petite icône de maison) :
  - pluie, gel, vent et chaleur ne comptent plus pour elle (comme le balcon couvert), pas d'eau économisée ;
  - arrosage moins fréquent (rythme vérifié sur deux sources, sinon estimation Balco) ; toujours « Sèche sur 2 cm ?
    Arrose » ;
  - pas d'engrais jusqu'au printemps ;
  - sur la fiche, une ligne « La remettre dehors » pour annuler.
- Pour les plantes « quelques semaines de plus », sur la fiche : « À l'intérieur, il tiendra souvent quelques semaines
  de plus. »

## Étape 5 : la sortie au printemps

- Au feu vert des Saints de glace pour la ville : ligne « Ressors ton basilic » (dès deux plantes : « Ressors 3
  plantes »).
- Pas-à-pas court : l'habituer quelques jours (d'abord à l'ombre quelques heures, puis au soleil), vérifié sur deux
  sources.
- Une fois cochée, la plante reprend son état et ses rappels normaux.

## Avancement

- Étape 1 : en cours (15/10).
