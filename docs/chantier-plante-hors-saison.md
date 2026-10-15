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

- Étape 1 codée le 15/10, à valider : `lib/plants/cold-hardiness.ts` (`COLD_TENDER`, `isColdTender`, `canComeIndoors`),
  sources plante par plante dans `docs/sources-froid.md`, test `tests/cold-hardiness.test.ts`. 36 frileuses (toute la
  liste des alertes gel sauf le romarin, rustique en pot protégé, et les micro-pousses, semées toute l'année), 65
  rustiques. Rentrer : 10 « oui, passe l'hiver » (citronnelle, verveine citronnelle, stévia, sauge ananas, piment,
  poivron, physalis, concombre à la souris, dahlia, citronnier : `place` « fenêtre lumineuse » ou « au frais hors
  gel »), 4 « quelques semaines de plus » (basilic, shiso, les deux tomates), le reste « non ». Les sources donnent rarement
  une température de nuit : 22 seuils sur 36 sont des estimations (seuil des alertes gel du catalogue).
  Validée le 15/10 (« Étape 1 validée »). Questions posées avec le tableau, sans réponse : on a pris les propositions
  par défaut (alertes gel du catalogue inchangées ; vivaces frileuses « À rentrer avant l'hiver » ; dahlia rentré
  après le gel qui noircit le feuillage ; oca sans « Fin de saison » en octobre). Les questions étaient : seuils des alertes gel du catalogue à aligner ou non ; plantes
  vivaces frileuses (citronnier, dahlia…) : « Fin de saison » ou un autre mot ; dahlia et oca, cas à part (attendre
  que le gel noircisse le feuillage).
- Étape 2 validée le 15/10 (« Étape 2 validée ») : `lib/garden/off-season.ts` (`offSeasonOf`), ton gris `rest` dans
  `lib/garden/day-plan.ts` (`calmStatus` : à la place de « Nouvelle » ou « En forme », jamais à la place d'une alerte).
  Règles : une annuelle (frileuse, ou qui finit au fil des cueillettes) est en « Fin de saison » après son dernier mois
  de récolte de l'été ou de l'automne, et en janvier-février ; une frileuse dès ce dernier mois, à partir de septembre
  (tomates, aubergine en octobre). Une vivace frileuse est « À rentrer avant l'hiver » d'octobre à février. Une plante
  sans aucun geste ce mois-ci est « Au repos jusqu'en mars » (mois où ses gestes reprennent, un mois plus tôt dans le
  Midi, un mois plus tard en montagne : estimation Balco, `restUntil`). Récoltées en une fois, micro-pousses, oca :
  pas concernées. Le catalogue le dit sur la carte « Déjà sur mon balcon », en gris (plus d'orange) et dans le message
  après l'ajout. L'accueil (« déjà des plantes ») ajoute les plantes installées : même état. Ses gestes restent (la
  question « Ta saison de basilic est finie ? » garde sa place). Tests `tests/off-season.test.ts`, e2e `29-hors-saison`.
- Étape 3 codée le 15/10, à valider :
  - Choix gardé sur la plante, donc dans la sauvegarde du compte : `GardenPlant.winter` (`lib/garden/winter-plan.ts` :
    `harvest`, `indoors` ou `outside`, avec le jour), colonne `winterJson` (migration 0019), synchro testée.
  - Logique `lib/garden/winter-choice.ts` : concerne une frileuse en fin de saison ou à rentrer avant l'hiver (étape 2).
    Réponses dans l'ordre : « Tout récolter » (annuelles seulement), « Le rentrer à l'intérieur » (seulement si
    l'étape 1 dit oui ou quelques semaines), « Le laisser dehors ». Textes accordés (« Ton basilic n'aime pas le froid.
    Que veux-tu faire ? », « Il souffre quand les nuits passent sous 10 °C. », estimation dite quand il le faut).
  - Aujourd'hui : « Décide pour ton basilic avant le froid » le premier jour (jour gardé `winter-asked:<id>:<jour>`),
    puis seulement quand une nuit sous son seuil est annoncée dans les 3 jours (`coldNightAhead`, minimales de la météo
    sur 4 jours : `nights` du `WeatherSnapshot`, `forecast_days` 4 sur le téléphone et le serveur). Dès deux plantes :
    « Prépare 2 plantes pour le froid » (groupe `winter`), une feuille du bas pour choisir plante par plante.
  - Fiche : la carte avec les trois réponses tant que rien n'est choisi, puis « Pour l'hiver : le rentrer à
    l'intérieur » et « Changer d'avis ».
  - Harmonisé avec « Ta saison … est finie ? » (jamais deux questions) : sans réponse, la question de fin de saison
    attend ; « Tout récolter » → « Ton basilic est-il tout récolté ? » chaque jour, avec l'astuce de conservation
    (`lib/plants/conservation.ts`, 14 plantes, sources `docs/sources-conservation.md`), puis « Ton pot est libre » ;
    « Le laisser dehors » → rien jusqu'au soir de gel (« Récolte tout ton basilic avant cette nuit »), puis « Ta saison
    de basilic est finie ? » le lendemain ; « Le rentrer » → plus de question, et l'alerte gel ne dit plus « récolte
    tout » mais « protège » (`careProfileFor`), en attendant l'étape 4.
  - Version de test : simulation météo « Nuit fraîche » (9 °C, sous le seuil du basilic, au-dessus de son alerte gel).
  - Tests `tests/winter-choice.test.ts` ; les anciens tests sur une frileuse en automne lui donnent « Le laisser dehors »,
    ceux de « Ta saison … est finie ? » sans gel portent sur la bourrache (rustique) ; e2e `30-choix-hiver`.
