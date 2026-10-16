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
  - Retour du 16/10 (connecté à son compte) : le choix disparaissait aussitôt (« Décide… » revenait, « Ton pot est
    libre » ne venait pas). Cause : le serveur en ligne n'a pas encore la colonne `winterJson` (il n'est mis à jour
    qu'à la fusion) et la synchro remplaçait la plante par sa copie sans `winter`. Corrigé dans `applySnapshot`
    (`lib/sync/sync-logic.ts`) : pour la même modification (même date des deux côtés), la copie du téléphone fait foi.
- Étape 3 validée le 16/10 (« C'est bon, tu peux passer à l'étape 4 »).
- Étape 4 codée le 16/10, à valider :
  - « Rentre ton basilic » (`lib/garden/indoors.ts`) : choisie pour rentrer, pas encore rentrée, et une nuit sous son
    seuil annoncée dans les 3 jours (ou sous le seuil d'alerte gel du catalogue ce soir) ; sinon rien, pas
    d'aller-retour. Dès deux plantes : « Rentre 2 plantes » (groupe `indoors`). Cocher la ligne la rentre (« Annuler »
    possible) ; la toucher ouvre le pas-à-pas.
  - Pas-à-pas `task=indoors` (`lib/plants/guide.ts`) : 4 écrans (pucerons, soucoupe, fenêtre la plus lumineuse ou pièce
    fraîche hors gel, loin du radiateur), dahlia en 3 (tiges à 15 cm, soucoupe, au sec hors gel), 3 nouveaux dessins
    (`leaf-underside`, `empty-saucer`, `away-radiator`, 29 en tout), bouton « C'est rentré » ; documenté dans
    `docs/pas-a-pas.md` § 12.
  - « 🏠 À l'intérieur » (`winter.indoorsAt`, dans la sauvegarde) : ton gris ; profil `indoors` du moteur de rappels (ni
    pluie, ni gel, ni vent, ni chaleur, donc pas d'eau économisée ; vaut aussi pour le serveur) ; arrosage tout l'hiver
    à son rythme d'intérieur (`indoorWatering` : au frais tous les 14 jours, vérifié pour le citronnier ; près d'une
    fenêtre deux fois moins souvent que dehors, estimation ; dahlia au sec), pas d'engrais ni de coach Balco+.
  - Fiche : carte « 🏠 À l'intérieur depuis le 2 novembre » avec ses soins d'hiver, « À l'intérieur, il tiendra souvent
    quelques semaines de plus. » pour basilic, shiso, tomates, et « Le remettre dehors » (annule la rentrée, le choix
    reste : Balco redira quand la rentrer). Avant la rentrée : « Pour l'hiver : le rentrer à l'intérieur », le lien
    « Comment le rentrer, pas à pas » et « Changer d'avis ».
  - Choisie pour rentrer : plus d'alerte « Nuit fraîche : protège le basilic » (la ligne « Rentre » la remplace).
  - Tests `tests/indoors.test.ts`, e2e `31-rentrer`. Sources de l'arrosage d'hiver : `docs/sources-froid.md`.
  - Validée le 16/10 (« parcours simple d'utilisation et de compréhension »), avec un retour : « Abrite le citronnier »
    restait dans Saisons une fois le citronnier rentré. Les gestes d'hiver des fiches (`shelter` du citronnier, de la
    citronnelle et de la stévia, `store-tubers` du dahlia, `isWinterShelterTask` de `lib/plants/calendar.ts`) ne
    s'affichent plus, ni dans Saisons ni sur Aujourd'hui, dès qu'on a choisi de rentrer la plante (`bringsIndoors` du
    `CalendarSubject`) ; ils restent pour une plante laissée dehors ou sans choix.

- Étape 5 validée le 16/10 (« c'est parfait »), chantier terminé et fusionné dans `main` (PR #54) : « Ressors ton basilic » (`lib/garden/spring-out.ts`).
  - Feu vert : le 14 mai (lendemain des Saints de glace) en climat océanique, tempéré ou continental, comme la carte du
    temps fort ; 15 avril dans le Midi et 15 juin en montagne, en estimation Balco (pas de source par région).
  - Et pas de nuit sous le seuil de la plante annoncée dans les 3 jours (10 °C pour le basilic, sources : nuits
    au-dessus de 10 à 12 °C) : sinon la ligne attend. Dès deux plantes : « Ressors 2 plantes ».
  - Pas-à-pas `task=spring` en 3 écrans (ombre et abri du vent quelques heures, un peu plus chaque jour, puis au
    soleil après une semaine environ), dahlia en 2 ; bouton « C'est ressorti » ; `docs/pas-a-pas.md` § 13, sources
    dans `docs/sources-froid.md` § « Au printemps ».
  - Cochée (Aujourd'hui, fiche ou pas-à-pas) : le choix pour l'hiver s'efface, la plante reprend son état, ses
    rappels, l'engrais et les alertes gel ; message « Ton basilic : de retour dehors, Balco reprend ses rappels ».
  - Ajouté pour que l'hiver suivant marche : un choix sans rentrée (« tout récolter », « la laisser dehors », « la
    rentrer » pas fait) ne vaut que jusqu'au 1er mars qui le suit (`currentWinterPlan`, appliqué par `resolvePlants`,
    aussi côté serveur). La question revient donc l'automne suivant, et une plante jamais rentrée n'a plus de « Rentre
    ton basilic » au printemps. Une plante rentrée garde son choix jusqu'à sa sortie.
  - Tests `tests/spring-out.test.ts`, e2e `33-ressortir`.
  - Retour du 16/10 (« je ne peux pas tester, alerte coup de vent même quand je simule ») : les simulations modifient
    la vraie météo, qui en octobre garde son vent et ses nuits fraîches. Nouvelle simulation « Nuits douces » (14 °C
    la nuit, sans vent ni pluie, `lib/weather/simulation.ts`) pour tester la sortie avec une date simulée en mai.
  - Retour du 16/10 (« il a fallu que je fasse le pas-à-pas pour que l'action soit prise en compte ; le pas-à-pas doit
    être facultatif ») : sur la fiche, la carte « Pour l'hiver : le rentrer à l'intérieur » a son bouton « C'est
    rentré », sans attendre la nuit froide ; elle s'affiche dès qu'un choix est fait (plus seulement en fin de saison).
    Sur Aujourd'hui, cocher la ligne suffisait déjà ; « Ressors » a son bouton « C'est ressorti » sur la fiche.
  - Retour du 16/10 (citronnier et tomates : « le bouton C'est rentré ne s'affiche pas au même endroit car j'ai aussi
    l'alerte météo ; garde cette cohérence pour toutes les plantes ») : sur la fiche, tout ce qui touche à l'hiver est
    dans une seule carte, toujours juste sous les pastilles, avant le geste du jour, dans le même ordre pour toutes
    les plantes : ce qui est choisi, ce qui presse (« Nuit sous 10 °C annoncée : rentre-les aujourd'hui. », ou au
    printemps « Feu vert des Saints de glace : ressors-le. »), le bouton (« C'est rentré » / « C'est ressorti »), le
    pas-à-pas facultatif, puis « Changer d'avis » (ou « Le remettre dehors »). La carte « Aujourd'hui » ne reprend plus
    ces gestes (décider, rentrer, ressortir) et garde les alertes météo. E2e « même place pour toutes » (`31-rentrer`).
  - Retour du 16/10 (basilic : « d'un côté il me demande ce que je veux faire, de l'autre il me dit que mon pot est
    libre ») : quand le pot est libre (saison finie, tout récolté), la fiche ne pose plus la question de l'hiver et
    n'affiche plus de choix pour l'hiver ; seule reste « Ton pot est libre ». E2e dans `30-choix-hiver`.

## En plus : la fiche plante condensée (16/10, à sa demande)

Question du porteur : « trop d'informations sur la fiche plante ? » Maquettes avant / après montrées, validées avec
« replie la croissance également ». Rien n'est supprimé, le détail s'ouvre en touchant (`app/garden/[id].tsx`) :

1. Photo moins haute (72 % de la largeur, 320 points au plus, au lieu de 105 % et 460).
2. Légende des couleurs : dans une feuille du bas, en touchant l'état (« En forme ⓘ »).
3. Pas-à-pas : un seul s'affiche en lien comme avant ; dès deux, « Pas-à-pas · 2 guides › » ouvre la liste (le geste
   du jour en premier). « Il a fleuri ? » reste à part : c'est un geste à noter, pas un pas-à-pas.
4. Coach d'arrosage en offre gratuite : une ligne qui ouvre l'écran Balco+ (`components/watering-coach-card.tsx`).
5. Spécial pot : plus de ligne « Ton pot » en double avec la pastille ; la carte du pot se touche pour changer la taille.
6. Variété : une ligne sous Terreau et Engrais (`extraRows` de `PotSheetCard`), le choix dans une feuille du bas.
7. « Récolte : juin à octobre » passe dans les pastilles du haut ; l'historique montre les 5 derniers jours avec un
   geste, sans les photos (déjà dans « Tes photos »), puis « Voir tout l'historique (N gestes) ».
8. Sa progression repliée : le stade et ses chiffres ; la toucher déplie le détail, les semaines et les étapes.

Pour un basilic suivi depuis 5 semaines, la fiche passe d'environ 4 écrans un tiers à moins de 3. E2e `32-fiche-condensee`.

