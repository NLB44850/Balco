# Chantier « une app vivante toute l'année » : état des lieux et plan

*Rédigé le 8 octobre 2026 à partir de `docs/brief-toute-l-annee.md` et du code de `main` (après la PR #32).
Rien n'est codé : le plan et les réponses aux questions attendent la validation du porteur.*

## 1. État des lieux (le code fait foi)

### Aujourd'hui (`app/(tabs)/index.tsx`, `lib/garden/today.ts`)

Ordre actuel de haut en bas : en-tête, carte de simulation météo (version de test), carte d'arrivée, bandeau
« Météo de Paris par défaut », bandeaux météo, barre « Ton balcon · … », carte vacances, carte « Tout est fait »,
liste du jour (gestes faits en bas, donc **sous** la carte « Tout est fait »), « Activer les rappels », carte
« C'est le moment 🌱 » (envies du printemps, mars-avril), « Idée du mois », « Tes plantes ».

Quand il n'y a rien à faire :
- **Balcon avec des plantes, rien de dû** : carte 🌿 « Rien à faire aujourd'hui · Tes plantes n'ont besoin de rien.
  Balco te préviendra si la météo change. » + « Voir ma semaine ». L'écran n'est donc **pas vide** : la carte
  « Ton balcon se repose » (A1) remplacera celle-ci.
- **Tout est fait** : « Tout est fait pour aujourd'hui » (ou « prêt pour la nuit » après 17 h).
- **Balcon vide** : « Ajoute ta première plante » + 3 plantes de saison ; ni Idée du mois, ni « Tes plantes ».
- Un « Ton pot est libre » laissé de côté reste replié sous la carte (ligne « pas urgente »).

### Dates, climat, notifications, Nora

- **Aucune simulation de date.** « Maintenant » est lu à 96 endroits (`new Date()` / `Date.now()`), dont 39 valeurs
  par défaut dans `lib/`. Il faut d'abord un « maintenant » unique, que la simulation pourra remplacer. Modèle à
  suivre : la simulation météo (`hooks/use-weather-simulation.ts`, active seulement avec
  `EXPO_PUBLIC_WEATHER_SIMULATION=1`, absente de l'app publiée).
- **Climat** : 5 zones (`lib/plants/climate.ts`) dont « de montagne » (pas « montagnard »), au-dessus de 800 m.
  Le décalage (`adaptToClimate`) ne touche que les **mois de printemps (février-juin) des plantes frileuses**
  (−1 mois en méditerranéen, +1 en montagne). Rien n'est décalé à l'automne. Pour l'automne, on dispose en revanche
  du mois des premières gelées par zone (`firstFrostMonth` : octobre en montagne et en continental, novembre ailleurs,
  décembre en méditerranéen).
- **Notifications** : `scheduleDatedReminder` (même mécanisme que la notification des envies du printemps le 1ᵉʳ mars)
  convient pour une notification unique le 18 novembre, à l'heure choisie (qui ne tombe jamais dans la plage calme).
- **Nora** ne s'ouvre pas avec une question pré-remplie : à ajouter (petit relais comme la photo vers Observer).
- **« Ce qu'il te faut »** avec « J'ai déjà » et le partage existe pour tous les pas-à-pas (semer, planter, rempoter,
  terre du dessus, éclaircir, pincer, sortir les plants). Le guide ignore le climat de la ville (détail à corriger
  au passage).
- **Envies du printemps** : une simple liste de plantes (sans date), synchronisée.

### Badges (`lib/garden/garden-logic.ts`, Moi = `app/(tabs)/profile.tsx`)

| Badge | Condition exacte |
|---|---|
| Premier Pot | 1 plante **actuellement** sur le balcon |
| Ami des Abeilles | 3 plantes mellifères **actuellement** sur le balcon (58 mellifères au catalogue) |
| Zéro Gâchis d'Eau | 5 « conseils météo suivis » (tout geste venu d'une alerte, **y compris les arrosages évités sous la pluie, notés tout seuls**) |
| Bio-Défenseur | 5 « inspections » (en réalité tout geste de type observation : **aussi les semis, plantations, sorties des plants, analyses Observer et arrosages évités**) |
| Du Balcon à l'Assiette | 1 récolte |
| Main Verte | 7 jours suivis **de suite (la série en cours)** |

Écarts avec le brief et le principe « rien ne se perd » :
1. **Les badges ne sont pas enregistrés** : ils sont recalculés à chaque affichage. Main Verte disparaît dès que la
   série casse ; Premier Pot et Ami des Abeilles disparaissent si on retire les plantes. Aucune date d'obtention.
2. **Le téléphone ne garde que les 1 000 derniers gestes** (le serveur en renvoie 1 000 aussi) : les « premières
   fois » anciennes peuvent sortir du calcul pour un utilisateur très actif. Il faut enregistrer ce qui est acquis.
3. **La cause d'une alerte suivie n'est pas notée** (gel, chaleur, orage, vent) : seul le titre permet de la deviner.
   Gel et vent le même jour sur la même plante s'écrasent (même identifiant). Les badges « Canicule maîtrisée » ou
   « Protégé du gel » ont besoin de la cause : on la notera pour les gestes à venir, et on la retrouvera par le titre
   pour les anciens.
4. **Aucune floraison n'est notée** nulle part : l'herbier « fleurie pour la première fois » n'est pas vérifiable
   aujourd'hui (voir question 9).
5. **Fête manquée** : un badge débloqué par un arrosage évité (noté tout seul) ou par « Fait » dans une notification
   n'est jamais fêté.
6. Moi : grille de 2 colonnes, cases grises « · » avec « 2 / 5 », toucher = « Encore N pour le débloquer ».
7. Les réponses de fin de saison (« Tout récolté ? », « Ta saison est finie ? ») restent sur le téléphone.

Données utilisables : chaque geste est daté et rattaché à sa plante (y compris les plantes retirées) ; récoltes par
plante (première récolte de chaque plante calculable) ; semis et plantations (`calendar-sow`, `calendar-plant`,
`:start`) ; arrosages évités sous la pluie (litres calculés) ; alertes suivies ; jours suivis ; catégorie
(aromatique, fleur, petit fruit…), mellifère, semis au chaud par plante.

### Catalogue face aux astuces et à la Sainte-Catherine

- **À planter en novembre** (9) : ail (plein soleil, jardinière), ail des ours (ombre), violas (rebord), framboisier,
  groseillier, cassissier, myrtillier, mûres sans épines (balcon, 20 à 30 L), kiwaï (terrasse, 40 L).
  Les **fraisiers ne se plantent pas en novembre** dans le calendrier (mars, avril, août, septembre) : à exclure.
  Sur un rebord de fenêtre, seuls les violas conviennent ; en jardinière, l'ail (si plein soleil) et l'ail des ours.
- Astuces qui contredisent le calendrier ou le catalogue :
  - `dec-rebord` : persil (récolte mai-novembre) et ciboulette (mars-octobre) ne se récoltent pas en décembre ;
  - `nov-romarin` : la sauge se récolte d'avril à octobre (romarin et thym toute l'année, d'accord) ;
  - `mar-terre-dessus` dit 3 cm, le geste de l'app dit « Change les 5 cm de terre du dessus » ;
  - `jan-micropousses` : à relier aux micro-pousses (radis, roquette, moutarde ne se sèment pas en janvier en pot) ;
  - « tomates » et « salades » ne sont pas des plantes du catalogue (tomates cerises, tomates naines ; salade à couper,
    laitue pommée…) ; `mai-saints-glace` cite la courgette, qui demande une terrasse ;
  - `mai-saints-glace` et `avr-nuits-claires` : mi-mai ne vaut pas en montagne (gelées jusqu'à début juin) ni en
    méditerranéen (mi-mars).
- Le paillage n'existe pas comme geste (seulement dans le plan des vacances et des conseils).
- Badge d'hiver « Semis au chaud : une aromatique semée à l'intérieur » : aucune aromatique ne se sème au chaud
  avant mars dans le calendrier (en février : piment, poivron ; toute l'année : micro-pousses).

## 2. Plan proposé (une étape = un commit testé, puis validation sur le téléphone)

Différence avec l'ordre du brief : la Sainte-Catherine passe **avant** les astuces et les paliers, pour tenir
l'échéance du 15 novembre sans dépendre de la vérification des 100 astuces.

1. **Simulation de date** : un « maintenant » unique pour toute l'app, « Faire comme si on était le… » dans
   Réglages → Version de test (absent de l'app publiée).
2. **Badges acquis gardés** : chaque badge obtenu est enregistré avec sa date (téléphone + sauvegarde), les badges
   déjà obtenus sont repris ; la cause des alertes suivies est notée ; fête aussi pour un badge gagné hors
   d'Aujourd'hui.
3. **Aujourd'hui toute l'année** : « Ton balcon se repose », ordre des cartes, au plus deux cartes en plus.
4. **« À anticiper »** : 3 à 6 semaines devant (plantes du balcon et envies du printemps), feuille avec « Ce qu'il
   te faut ».
5. **Mécanisme d'événements** décrit par des données + ouverture de Nora avec une question pré-remplie.
6. **La Sainte-Catherine** : carte, page, actions, protection, version climat froid, notification du 18/11, badge,
   bilan. E2e. → **à tester sur le téléphone vers le 1ᵉʳ novembre.**
7. **Banque d'astuces** : vérification des 50 sur deux sources, complément à ~100, document soumis au porteur
   (pas de code).
8. **Carte « Astuce de saison »** une fois les astuces validées.
9. **Paliers** Graine / Pousse / Fleur et nouveaux badges permanents.
10. **Badges de saison** avec millésime.
11. **Herbier**.
12. **Moi refait** : « Presque là », saison en cours, herbier, collection.
13. **Vérifications complètes** (tests, e2e, accords), mise à jour de `CLAUDE.md` et du récapitulatif.

## 3. Décisions du porteur (8 octobre)

1. Au plus 2 cartes en plus sous la liste d'Aujourd'hui, priorité événement > à anticiper > astuce > Idée du mois ;
   la carte « C'est le moment » des envies du printemps compte comme « à anticiper ».
2. Une nouvelle astuce par semaine, toute l'année.
3. Nouveau palier ou nouvelle carte d'herbier : petite animation, pas de plein écran.
4. Sainte-Catherine visible du 18 au 30 novembre.
5. Actions de la Sainte-Catherine : framboisier, groseillier, cassissier, myrtillier, mûres sans épines, ail, kiwaï
   (terrasse), violas et ail des ours, selon soleil et place ; pas de fraisiers. La liste s'intitule
   **« Ce qui se plante maintenant »** (pas seulement du bois).
6. Paliers : Ami des abeilles 3 / 6 / 10, récoltes 1 / 10 / 50, alertes suivies 1 / 5 / 15, jours suivis 7 / 30 / 100,
   **plantes accueillies 1 / 5 / 15 (les plantes retirées comptent)**.
7. Les badges obtenus sont figés dès l'étape 2, avec **un recalcul unique** à partir de l'historique disponible pour
   rendre les badges déjà mérités.
8. Bio-Défenseur ne compte que les vraies observations (analyses Observer, gestes « Observe »).
9. Herbier des fleurs : bouton « Elle a fleuri » sur la fiche, **seulement pour les plantes à fleurs pendant leurs
   mois de floraison**.
10. Paillage : conseil avec « C'est fait » sur la page de l'événement, compté pour « Paré pour l'hiver ».
11. Saisons des badges aux dates fixes (1ᵉʳ décembre, 1ᵉʳ mars, 1ᵉʳ juin, 1ᵉʳ septembre) ; en hiver, « un semis
    au chaud » (piment, poivron, micro-pousses…) au lieu d'une aromatique.
12. Sainte-Catherine avant les astuces.

Ajouts du porteur :
- **A.** Simulation de date : une seule horloge commune, d'abord pour ce lot seulement (calendrier, événements,
  badges, astuces, À anticiper). Impossible à activer dans l'app publiée.
- **B.** Plan B : si l'étape 1 prend du retard, faire les étapes 5 et 6 avant les étapes 3 et 4. L'échéance du
  15 novembre passe en premier.
- **C.** Les badges acquis (et leur date) sont inclus dans la sauvegarde du compte.
- **D.** Champ « climats » dans les astuces (réservée à certains climats, ou date adaptée au climat) ; toutes les
  corrections d'astuces relevées plus haut sont appliquées.

Le porteur autorise à enchaîner les étapes.

## 4. Avancement (codé le 8 octobre, validé sur le téléphone le 9 octobre)

Branche `ccr-71709eb8-bxzttf` (session Claude Code du 8 octobre), un commit par étape :

1. **Simulation de date** : `lib/clock.ts` (`now()`), `hooks/use-date-simulation.ts` ; Réglages → Version de test →
   « Date simulée » (raccourcis 18 nov., 25 nov., 1er déc., 15 janv., 1er mars…, ± 1 jour / 1 semaine) ; carte
   « 🧪 Date simulée » sur Aujourd'hui. Suivie par Aujourd'hui, Saisons, Moi, Ma semaine, la fiche, le guide, le
   catalogue et les gestes cochés ; la météo et les notifications restent à l'heure réelle.
2. **Badges acquis gardés** : carnet `lib/garden/awards.ts` (clé → date), sur le téléphone
   (`balco.progress.awards.v1`) et dans la sauvegarde (`reminder_profiles.awardsJson`, migration 0017) ; recalcul
   unique depuis l'historique ; un badge gagné hors d'Aujourd'hui est fêté à l'ouverture d'Aujourd'hui (après le
   message du bas) ; cause des alertes dans l'identifiant du geste (`lib/reminders/alert-cause.ts`).
3. **« Ton balcon se repose »** et **cartes en plus** (`lib/garden/today-cards.ts`).
4. **« À anticiper »** (`lib/garden/anticipate.ts`, `components/today/anticipate-card.tsx`).
5. **Événements** décrits par des données (`lib/events/events.ts`), Nora avec une question écrite (`question`).
6. **Sainte-Catherine** : carte, page `app/event/[id].tsx`, notification du 18/11, badge, bilan
   (`docs/sources-evenements.md`).
7. **Banque d'astuces** : 99 astuces, `lib/tips/bank.ts`, détail et sources dans `docs/astuces.md`.
8. **Carte « Astuce de la semaine »** (`lib/tips/tips.ts`, `hooks/use-tip-of-the-week.ts`).
9. **Paliers** Graine / Pousse / Fleur (`computeBadges` dans garden-logic) : 8 badges permanents.
10. **Badges de saison** (`lib/garden/season-badges.ts`) : 4 par saison, avec millésime.
11. **Herbier** (`lib/garden/herbarium.ts`) et « Elle a fleuri ? » sur la fiche des fleurs.
12. **Moi refait** : Presque là, saison en cours, herbier, tous les badges (`lib/garden/collection.ts`).
13. Vérifications : 605 tests, 58 parcours de bout en bout (17 à 20 nouveaux), bundle Android construit.

**Ajouté le 8 octobre, à sa demande (« d'autres événements en plus de la Sainte-Catherine »)** : les trois autres
temps forts prévus par le brief, dans `lib/events/events.ts` (sources : `docs/sources-evenements.md`, e2e
`21-temps-forts`) :
- **Prépare ton printemps** (12-31 janvier) : « À garder pour le printemps » (plantes semées ou plantées en mars-avril,
  bouton « Garder » → envies du printemps + notification du 1er mars), « Lave tes pots vides » ; badge en gardant une
  plante ; bilan « Tu as N plantes en tête pour le printemps ».
- **Les Saints de glace** (4-20 mai, climats océanique, tempéré, continental) : carte en compte à rebours (« Dans
  3 jours… »), puis « Feu vert » après le 13 mai, ou « Pas encore : du gel est annoncé » ; plantes frileuses à installer ;
  badge pour une plante frileuse plantée après le 13 mai.
- **Balcon en vacances** (1-15 juillet) : « Paille tes pots pour l'été » avec « C'est fait » (badge), lien « Préparer mon
  départ » vers le mode vacances.
Le mécanisme accepte maintenant : climats, texte de carte selon le moment, plantes « à garder » ou « à planter »,
plantes frileuses seulement, lien vers un écran, badge par plantation, geste ou envie.

Choix faits en codant (acceptés par le porteur le 9 octobre, « tout est OK ») :
- **Badges permanents** : « Zéro gâchis d'eau » compte maintenant les arrosages évités sous la pluie (5 / 20 / 50) ;
  « Paré à tout » (nouveau) les alertes gel, chaleur, vent ou orage suivies ; « Bio-défenseur » 5 / 15 / 40
  observations ; « Semeur » (nouveau) 1 / 5 / 15 semis ou plantations. Titres sans majuscules décoratives.
- **Badges de saison** : printemps Premiers semis (3), Balcon fleuri (2 mellifères ajoutées), Première récolte du
  printemps, Pots au large (1 rempotage ou terre neuve) ; été Économe en eau (3 jours de pluie sans arroser),
  Canicule maîtrisée (3 alertes chaleur), Récoltes d'été (5), Balcon suivi (14 jours de suite) ; automne Paré pour
  l'hiver (1 geste de protection, dont le paillage de la Sainte-Catherine), Graines du printemps (2 envies), Sainte-
  Catherine, Récoltes d'automne (3) ; hiver Protégé du gel (1 alerte gel), Semis au chaud (1 semis), Récolte d'hiver,
  Pots protégés (2 gestes de protection ; une série de jours ne prouve rien l'hiver, sans arrosage à faire).
- **Une grande fête par jour** : un nouveau badge gagné le même jour qu'une autre grande fête se dit d'un mot.
- **Sainte-Catherine sans compte** : « Demander à Nora » ouvre Nora, qui demande d'abord de se connecter.
- **Astuces** : « plants » = plante du balcon nécessaire ; « about » = plantes citées en idée (« Sème des radis »).

## 5. Validation et suite (9 octobre)

Le porteur a tout testé sur son téléphone avec la date simulée (cartes des quatre temps forts, badges, astuces,
« À anticiper », Moi) : « tout est OK ». Reste pour ce chantier :
1. **Fusionner dans `main`** : PR depuis `ccr-71709eb8-bxzttf` (la migration 0017 s'applique toute seule au
   démarrage du serveur, `server/migrate.mjs` dans le Dockerfile).
2. **Dans le prochain APK** : vérifier la vraie notification d'un temps fort (la date simulée ne déclenche pas les
   notifications ; avec l'APK, la Sainte-Catherine envoie la sienne le 18 novembre à l'heure des rappels).
3. **En vrai, à la date** : regarder la carte de la Sainte-Catherine le 18 novembre (sans date simulée), puis le
   bilan le 1ᵉʳ décembre.

## 6. Grande carte d'arrivée des temps forts (9 octobre, à sa demande « en mode waouh »)

Fusionné dans `main` (PR #33), puis : à la première ouverture d'Aujourd'hui pendant un temps fort, une grande carte en
plein écran s'ouvre un instant après l'arrivée (`components/today/event-intro.tsx`) : ce qui tombe du ciel selon
l'événement (feuilles et châtaignes à la Sainte-Catherine, pousses et fleurs en janvier, flocons et tomates aux Saints
de glace, soleils l'été), l'emoji qui se balance, la citation, le texte du moment, un bouton (« Voir ce qui se plante »,
« Choisir mes plantes », « Voir quand planter », « Préparer mon balcon ») qui ouvre la page, et « Plus tard ».
Une fois par édition (`eventIntroDue`, clé `<id>:<année>:intro`), pas pendant les vacances ni si la carte a été fermée ;
la carte compacte reste ensuite dans la liste ; les badges à fêter attendent qu'elle soit fermée. Pour la revoir en
test : Réglages → Version de test → Date simulée → « Revoir les grandes cartes des temps forts ».
Validée sur son téléphone le 9 octobre (« c'est parfait ») : une seule fois par temps fort (pas de seconde grande carte au
« Feu vert » des Saints de glace).

