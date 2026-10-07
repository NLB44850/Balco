# Balco : à lire au début de chaque discussion

Balco est une app de jardinage sur balcon, en français (Expo SDK 54, React Native 0.81, expo-router,
serveur Express + tRPC + Drizzle/MySQL). Ce fichier résume où en est le projet et comment travailler
avec son porteur. Détails : `docs/feuille-de-route.md` (demande d'origine, état, ordre de travail),
`docs/deploiement.md` (Codespaces, APK), `docs/synchro-et-rappels.md`. Récap à coller dans le chat Claude
(claude.ai) : `docs/recap-pour-claude.md`, à mettre à jour avec le récap ci-dessous quand l'état change.

## Travailler avec le porteur du projet

- Il parle français et n'est pas développeur : réponses en français, simples, avec des étapes
  numérotées et les commandes exactes à copier.
- Il teste chaque étape sur son téléphone avant de passer à la suivante. Terminer chaque livraison par
  ce qu'il doit taper et ce qu'il doit regarder.
- Ne jamais lui demander de coller un secret (EXPO_TOKEN, clé Anthropic, mots de passe) dans la
  discussion : il les tape lui-même dans le terminal du Codespace (`export EXPO_TOKEN=…`).
- Branche de travail : `claude/eloquent-gates-g7xc6x`. Commits en français, poussés sur cette branche.

## Tester sur le téléphone

Tout se passe dans son GitHub Codespace (pas de Docker sur son PC).

1. `git pull` puis `bash scripts/codespace-demarrer.sh` (nettoie le cache Docker, reconstruit, démarre,
   rend le port 3000 public).
2. **Le plus rapide, sans build** : ouvrir dans Chrome sur le téléphone
   `https://cautious-broccoli-q7x6wq46pxp434pj-3000.app.github.dev` (l'app web servie par le serveur,
   simulation météo activée ; pas de notifications). Code de connexion :
   `docker compose logs app | grep "login code"`.
3. **APK (notifications)** : `rm -f package-lock.json`, `export EXPO_TOKEN=…`, puis
   `EAS_SKIP_AUTO_FINGERPRINT=1 npx eas-cli build --platform android --profile test`. La file d'attente
   EAS gratuite peut durer longtemps : ne pas relancer.
4. **Quotas IA pour tester** (1 analyse et 5 questions par mois en gratuit, `lib/plans.ts`) : dans le Codespace,
   `echo "AI_FREE_SCANS_PER_MONTH=30" >> .env` (et `AI_FREE_QUESTIONS_PER_MONTH=100`), puis
   `bash scripts/codespace-demarrer.sh`. Chaque analyse reste facturée sur sa clé Anthropic.
5. Expo Go ne marche pas : son téléphone a Expo Go SDK 57, le projet est en SDK 54. Et `expo start
   --tunnel` échoue avec un jeton robot (EXPO_TOKEN aussi présent dans son `.env`).

## Vérifier avant de pousser (dans la session Claude)

- `pnpm -s check`, `pnpm -s lint`, puis `TEST_DATABASE_URL=mysql://balco:balco@localhost:3306/balco_cal npx vitest run`
  (MariaDB locale : `service mariadb start` si elle s'est arrêtée, `apt-get install -y mariadb-server` si elle manque,
  puis `DATABASE_URL=… npx drizzle-kit migrate` ; 524 tests à ce jour). Dans un conteneur
  neuf : `apt-get install -y mariadb-server`, `service mariadb start`, créer la base `balco_cal` et l'utilisateur
  `balco`/`balco`, puis `pnpm -s build && DATABASE_URL=mysql://balco:balco@localhost:3306/balco_cal node dist/migrate.mjs`.
- `npx expo export --platform android` pour s'assurer que le bundle Android se construit.
- **Tests de bout en bout** (à lancer quand le porteur le demande, et avant chaque grosse évolution) :
  `bash scripts/e2e.sh` (≈ 4 min : construit l'app web avec la simulation météo, migre la base, démarre
  le vrai serveur sur le port 3100, lance Playwright). `bash scripts/e2e.sh meteo` pour un seul fichier,
  `E2E_SKIP_BUILD=1` pour ne pas reconstruire. Scénarios dans `e2e/` (44 aujourd'hui, avec un faux service d'IA pour Observer et Nora) : parcours
  (onboarding, écrans, cocher/Annuler, fête, catalogue, fiche d'une nouvelle plante, feuille du bas qui se ferme,
  suggestions de saison, Saisons rangé par type), météo (pluie + eau économisée, gel + Saisons,
  orage, vent, canicule, « Pas aujourd'hui », retour météo réelle), compte (code de connexion lu dans
  `dist/e2e-server.log`, balcon retrouvé sur un 2ᵉ téléphone, le 1ᵉʳ prévenu « sauvegardé depuis un autre téléphone ») et vacances, rempotage (`10-rempotage`), gestes de suite (`11-gestes-de-suite`), Nora quand la connexion se coupe (`12-nora-erreur`), Saisons en octobre (`13-saisons-octobre`), après-récolte (`14-apres-recolte`). Open-Meteo est simulé
  (`e2e/helpers.ts`, `mockWeather`), le balcon est posé dans le stockage (`seedBalcony`). Les cases à
  cocher s'appellent « Marquer comme fait : <titre> ». Échecs : captures dans `dist/e2e-results/`.
- Rendu web : `npx expo export --platform web`, serveur `node dist/standalone/index.mjs` avec
  `WEB_DIR`, faux Open-Meteo et Playwright (Chromium dans `/opt/pw-browsers/chromium`). Attention :
  `page.clock.setFixedTime` fige les animations `FadeIn`/`PopIn` (écrans vides sur la capture).

## Design (refonte en cours, maquette « Balco, règles d'expérience »)

Trois règles, inspirées de Too Good To Go, Spotify, Uber et Airbnb : moins d'efforts, clarté
visuelle, retour immédiat.

- **Police Onest** partout : importer `Text` et `TextInput` depuis `@/components/ui/typography`
  (jamais depuis `react-native`), qui choisit le fichier Onest selon `fontWeight`.
- **Un seul vert de marque** `#1F7A4D`. Orange `#D2642A` pour « à surveiller » et la chaleur, bleu
  `#2F6FB3` pour le gel. Pas de dégradés décoratifs, pas de petits titres en majuscules.
- **La lumière du balcon en fond** : `components/today/balcony-sky.tsx` (ombres peintes de la
  rambarde, d'une plante grimpante et d'un pot par plante ; selon l'heure et la météo ; pluie sur la
  vitre, orage…). Logique pure dans `lib/garden/sky.ts`. Les autres onglets utilisent
  `components/light-screen.tsx` (variante discrète) avec la lumière partagée par
  `lib/garden/sky-store.ts`. Les ombres se repeignent avec `scripts/art/ombres-balcon.mjs`.
- **Composants communs** : `components/screen-header.tsx` (grand titre, contexte, avatar vers Moi),
  `components/ui/glass.ts` (cartes en verre), `components/today/*` (ligne à cocher, feuille du bas,
  message « Annuler »). La feuille du bas (`bottom-sheet.tsx`) ne dépasse jamais l'écran (contenu qui
  défile à l'intérieur, ne pas y remettre de ScrollView vertical), se ferme par le fond, le « × » ou en
  glissant vers le bas.
- **4 onglets** : Aujourd'hui, Balcon, Saisons (fichier `calendar.tsx`), Nora. « Moi »
  (`profile.tsx`) s'ouvre par l'avatar, « Observer » (`scanner.tsx`) depuis Nora et Balcon.

## Où on en est

**Nouvelle conversation ? Tout est validé sur son téléphone et fusionné dans `main` : l'onboarding et le pas-à-pas
pour planter (PR https://github.com/NLB44850/Balco/pull/28, 06/10), puis le rempotage (R1 à R3), les 11 pas-à-pas
(`docs/pas-a-pas.md`), Nora qui récupère sa réponse perdue et Saisons corrigé (PR https://github.com/NLB44850/Balco/pull/29,
07/10). Validé sur son téléphone le 08/10 : accords des textes, après-récolte et laitue pommée (point 5), PR https://github.com/NLB44850/Balco/pull/30 vers `main` ouverte le 08/10.
Ensuite : fin de saison des annuelles (quand il le dira), l'APK (point 1). Récap pour claude.ai :
`docs/recap-pour-claude.md` + captures `docs/captures/` (refaites par `bash scripts/captures.sh`, spec
`e2e/captures.spec.ts` sautée sans `CAPTURES=1`).**

**Récap pour reprendre (07/10)** : ce bloc fait foi ; les paragraphes plus bas sont l'historique (certains
décrivent un état ancien, par exemple Saisons « à cocher » ou une fête plein écran à chaque récolte).

Fait et fusionné dans `main` (PR #27 le 06/10) : tout le MVP décrit plus bas (rappels, calendrier, Nora qui se
souvient, progression, vacances, catalogue de 100 plantes avec photos, refonte visuelle, audit coûts et charge)
et les 10 étapes du test utilisateur du 04/10 (détail dans « Historique des listes de travail »).

**À faire, dans l'ordre** (une étape = un commit testé, puis validation du porteur sur son téléphone) :
1. **Revérifier sur l'APK** (construit le 06/10, à refaire avec la correction) : l'aperçu de la photo dans Observer
   (`expo-image`), l'appareil photo depuis Aujourd'hui, les notifications, Balcon à deux cartes par ligne.
2. **Refonte de l'onboarding : chantier en cours, plan validé le 06/10.** Tout est dans
   **`docs/chantier-onboarding.md`** (état des lieux vérifié, plan en 8 étapes A1, A2, A3, B1 à B4, C1, C2, et les
   8 décisions prises). **Validé et fusionné dans `main` (PR #28, 06/10)** ; reste à revoir sur l'APK (rappels et position).
   Ce qui en reste dans le code : `seasonalStarters` (plantes de saison), `lib/reminders/activate.ts`,
   `components/city-picker.tsx` + bandeau « Météo de Paris par défaut », `GardenPlant.toPlant` (« à planter »,
   migration 0015, `startActivity`, événement `<id>:start`), `app/welcome.tsx` (`onboardingSteps`, `arrivalCard`,
   relance `/welcome?again=1`), `lib/ai/greeting.ts` (prénom demandé par Nora). Plus aucune demande de position
   d'office (`use-local-weather.ts`). Ne pas reposer les questions déjà tranchées.
3. **Pas-à-pas pour planter + fin de l'accueil : validé et fusionné dans `main` (PR #28, 06/10).**
   Tout est dans **`docs/chantier-pas-a-pas.md`** (ses 12 choix, avancement étape par étape). Dans le code :
   catalogue « Déjà sur mon balcon / À planter » (`addChoices`), hiver (`lib/plants/indoor.ts`, `springWishes`,
   `lib/garden/spring.ts`, carte « C'est le moment » en mars), « Rappelle-moi samedi » (`lib/garden/postpone.ts`),
   données de plantation des 100 plantes (`lib/plants/planting.ts`, sources par plante), gestes de suite
   (`lib/garden/follow-ups.ts` : éclaircir, sortir les plants, pincer), 22 illustrations
   (`components/guide/illustrations.tsx`, revue dans Réglages → Version de test), guide `app/guide/[catalogId].tsx`
   (logique `lib/plants/guide.ts`).
4. **Rempotage selon le besoin** (**R1, R2, R3 et les pas-à-pas des gestes de suite validés le 07/10**), 3 étapes :
   1) rythme par vivace vérifié sur le web (menthe chaque année, lavande tous les 2 ans, agrumes et petits fruits 2-3
   ans…) et jamais la première saison (≈ un an dans son pot, compté depuis la plantation notée) ; les autres années,
   geste « Change les 5 cm de terre du dessus » (surfaçage, validé) ; 2) signe à vérifier (« Des racines sortent par
   les trous ? L'eau ressort tout de suite ? Rempote… ») + « Pas besoin cette année », volume du pot retenu et pot
   suivant proposé (≈ +1/3) ; 3) pas-à-pas illustré du rempotage (« Ce qu'il te faut », démêler les racines…).
   R1 fait : `lib/plants/repotting.ts` (37 vivaces, sources) donne `repotMonths` ; `potCareFor` (`lib/plants/calendar.ts`) :
   rien avant 10 mois dans le pot, « Rempote… » quand le rythme est atteint, sinon « Change la terre du dessus du
   thym » (`topdress`, événement `<id>:calendar-topdress:<mois>`, ne remet pas le compteur à zéro) ; `potHistory`
   (garden-logic) : dans son pot depuis le dernier rempotage, sinon la plantation notée, sinon l'arrivée. Corrigé au
   passage : Saisons ne transmettait pas l'état « à planter » (`calendar.tsx`).
   R2 fait : description de « Rempote… » = signe de la plante (`REPOTTING[id].sign`, sinon `GENERIC_REPOT_SIGN`) + pot
   suivant (`potSizes` : pot conseillé × 4/3 par rempotage noté, `potHistory().repots`, largeur en cm `potWidthCm`) ;
   « Pas besoin cette année » dans la feuille du bas d'Aujourd'hui = mise en sommeil locale `repot:<id>` jusqu'au
   1ᵉʳ janvier (`lib/garden/repot-skip.ts`, `repotSkippedUntil` du `CalendarSubject`, lu par `use-day-plan` et Saisons) :
   la terre du dessus prend le relais. Corrigé : un rempotage ou une terre neuve noté ce mois-ci reste affiché coché
   (`lastRepot` / `lastTopdress` dans `potCareFor`), au lieu de disparaître.
   R3 fait : modèles de guide `repot` et `topdress` (`lib/plants/guide.ts`, `potCareActivity` dans calendar.ts), route
   `/guide/<id>?plantId=…&task=repot|topdress` (« C'est rempoté » / « Terre changée » cochent le geste du mois) ; entrées :
   « Pas à pas » dans la feuille du bas d'Aujourd'hui et « Comment la rempoter › » dans la fiche ; 3 dessins
   (`roots-out`, `loosen-roots`, `scrape-top`, 25 en tout). Document lisible de tous les pas-à-pas : `docs/pas-a-pas.md`
   Puis (06/10, à sa demande) pas-à-pas des gestes de suite : modèles `thin`, `pinch` (deux variantes : bout des tiges,
   ou « couper » pour fleurs / stolons / touffe rabattue, `pinchesTip`), `outdoors` (s'habituer au dehors une semaine,
   puis rempoter chaque plant) ; `guideTaskOf(activity)` donne la tâche du guide d'un geste ; route `task=thin|pinch|
   outdoors` (le geste vient de `followUpsFor`, « C'est éclairci / pincé », « Plants installés ») ; entrées : feuille du
   bas d'Aujourd'hui et lien de la fiche ; dessin `two-shoots` (26 en tout).
5. **Accords et après-récolte (validés le 08/10)**, plan validé avec lui :
   - Accords : `gender` / `plural` de chaque plante (valent pour `label`), outil `lib/plants/grammar.ts` (`byForm`,
     `subjectPronoun`, `objectPronoun`, `objectBefore`, `agree`, `bareName`, `possessive`, `partitive`), utilisé par les
     pas-à-pas, gestes de suite, « Installe-le », signe de rempotage, étapes de « Sa progression », liens de la fiche
     (`guideLinkText`). Test `tests/grammar.test.ts` : chaque modèle aux 4 formes (`PHRASES`). Tout nouveau texte qui
     parle de la plante passe par cet outil.
   - Après-récolte : `lib/plants/harvest-once.ts` (11 plantes avec la laitue, crosnes retirés le 08/10, `harvestOnceDays` du catalogue, 21 j par défaut ; durées
     prudentes tirées de tailles limites, les sources ne donnent pas de durée) ; logique `lib/garden/harvest-end.ts`
     (question due à min(1ʳᵉ récolte de la saison + durée, fin des mois de récolte), une seule fois : jour gardé
     `harvest-asked:<id>:<jour>` ; « Oui » = `harvest-done:<id>`, dans les `ReminderSnooze` du téléphone) ; `planDay` :
     source `harvest-end` (question ou « Ton pot est libre », seule ligne de la plante, plus d'arrosage ni de rappel) ;
     feuille `components/free-pot-sheet.tsx` (`useFreePot`, Aujourd'hui et fiche) ; message du bas avec « Oui » à la
     place de « Annuler » (`actionLabel` de `ToastMessage`). Ressemer = même plante (`restartPlant` : `archiveSeason`
     renomme `<id>:start`, `:thin`, `:outdoors`, `:pinch` en `…:<date>`, puis « à planter »). Pot vide ou autre plante :
     `removePlant` ; les plantes retirées (`pastPlants` du contexte) comptent dans `computeStats`, `weekSummary` et
     `celebrationFor`. E2e `14-apres-recolte`. Décidé le 08/10 : feuille fermée sans choisir = la ligne « Ton pot est
     libre » reste le jour du « Oui », puis passe dans les gestes pas urgents repliés (`freePotIsQuiet`, `quiet` de
     `TodayItem`, pas comptée dans ce qui reste à faire) ; réponses gardées sur le téléphone pour l'instant (à
     synchroniser avant publication, `docs/avant-publication.md` § 4).
   - Mois de semis revus le 08/10 avec 2 semenciers au moins (sa règle) : navet + juillet, chou-rave mars–juin,
     oignons botte mars et août–sept., pak choï juil.–sept. (récolte sept.–nov.) ; détail dans `docs/sources-calendrier.md`.
   - Laitue pommée ajoutée (`head-lettuce`, 101 plantes, calendrier vérifié dans `docs/sources-calendrier.md`, récoltée
     en une fois, 14 j), photo ajoutée le 08/10 (Wikimedia, CC BY 2.0, vue sur son téléphone). Pour une prochaine plante : candidates dans le
     Codespace, choix dans `choix.json`, puis `bash scripts/photos/ajouter-photo.sh <id>` (télécharge, allège si
     `convert` existe, refait l'index, pousse ; sinon alléger dans la session : `convert … -resize '800x800>' -strip -quality 74`).
   - Étape suivante, après sa validation : fin de saison des annuelles (« Ta saison de basilic est finie ? »).
6. **Mémoire de Nora sur plusieurs jours** : il doit encore faire le test sur 2-3 jours (retour à recueillir).
7. **Tester sans Codespace** (proposé, pas encore demandé) : version web hébergée qui se met à jour seule et APK
   construit par une action GitHub (EXPO_TOKEN qu'il enregistre lui-même dans les secrets du dépôt).
8. **À la publication** (pas encore décidée) : notifications serveur Android (FCM), reports « Dans 3 h »
   synchronisés avec le serveur, photos des plantes sur le serveur, paiement Balco+ (RevenueCat ; les textes
   disent « Bientôt »), Expo 54 → 57, politique de confidentialité, fiche et compte Play Store
   (`docs/avant-publication.md`).
9. **Version suivante** (feuille de route) : suivi photo d'une plante dans le temps, balcon visuel (plan,
   emplacement, exposition), récoltes et recettes, défis communautaires.

Fait (validé sur son téléphone) :
- Rappels intelligents (priorité 1) : messages clairs, Fait / Dans 3 h / Pas aujourd'hui, alertes
  météo groupées, simulation météo, notification de test.
- Calendrier local (priorité 2) : rempotage, climat de la ville, alertes, vue par saison.
- Refonte étape 1 (accueil en liste à cocher, feuille de détail, « Annuler », fond lumineux) et
  étape 2 (4 onglets, même style partout, police Onest).
- Refonte étape 3 : Balcon en grille de cartes photo, fiche plante « photo d'abord » (photo datée,
  pastilles, prochain geste en un bouton, tes photos, historique). Photos gardées **sur l'appareil
  seulement** (`lib/garden/photos*.ts`, `photo-files.ts` / `photo-files.web.ts`) ; sans photo, l'emoji
  de la plante sur fond vert pâle (`components/plant-picture.tsx`).
- **Refonte étape 4** : écran « Ma semaine » (`app/week.tsx`, logique `lib/garden/week.ts` : 7 jours,
  gestes, récoltes, photos, plante la plus soignée), ouvert par « Voir ma semaine » sur « Tout est
  fait » (Aujourd'hui, Saisons) et depuis Moi. Saisons en liste à cocher avec feuille du bas et
  « Annuler » (seul le mois en cours se coche). Nora : questions prêtes tirées des plantes et de la
  saison (`lib/ai/quick-questions.ts`). Moi : « Ma semaine », niveau et badges seulement.
- **Réglages à part** (`app/settings.tsx`, roue crantée de Moi) : prénom, expérience, soleil, espace,
  envies (en pastilles, enregistrés tout de suite via `updateOnboarding`), rappels, sauvegarde, compte,
  simulation météo.
- **Onboarding refait** (`app/welcome.tsx`, choix dans `lib/garden/onboarding.ts`) : lumière du
  balcon, prénom facultatif, une question par écran qui avance toute seule, puis « Tes premières
  plantes » (3 cochées d'office) et « Créer mon balcon ».
- **Connexion** (`app/login.tsx`) et **catalogue** (`app/garden/add.tsx`) au même style : lumière du
  balcon, code en 6 cases (connexion dès le 6ᵉ chiffre) ; catalogue en liste avec « + » immédiat et
  « Annuler », fiche du catalogue dans la feuille du bas, bouton « Voir mon balcon » fixe.
- Filigrane du balcon : les ombres gardent une force minimale (`SHADOW_FLOOR` dans
  `components/today/balcony-sky.tsx`) pour rester visibles par temps couvert, pluie ou la nuit.
  Catalogue : « Voir mon balcon » dans une barre sous la liste (pas en surimpression).

- **Photos d'exemple des plantes** (Wikimedia Commons, libres de droits) : `assets/plants/<id>.jpg`
  (100, ~8 Mo), crédits dans `assets/plants/credits.json`, index généré `components/plant-stock-photos.ts`
  (`node scripts/photos/generer-index.mjs`). `PlantPicture` montre ta photo, sinon la photo d'exemple,
  sinon l'emoji ; `CatalogPicture` pour le catalogue, l'accueil et l'onboarding ; fiche plante avec
  « Photo d'exemple » + « Ajoute ta photo ». Écran `app/credits.tsx` (Réglages → Crédits photos).
  Téléchargement par `scripts/photos/telecharger-photos.mjs`, **à lancer dans le Codespace** (le
  réseau de la session Claude bloque Wikimedia) : candidates, `--encore`, puis `--final` (choix.json).
  Après un `--final`, recompresser en 800 px (qualité ~74) : Wikimedia renvoie des images plus lourdes.
- Emojis : l'emoji exact de la plante, sinon un emoji végétal générique (plus d'objets sans rapport).
- **Observer refait** (`app/(tabs)/scanner.tsx`) au style de l'app : zone photo claire, « Prendre une photo » /
  « Choisir dans ma galerie », conseils en liste, résultat sans majuscules. Repart de zéro quand on quitte
  l'écran (onglet caché resté monté), sauf analyse en cours. **Bouton appareil photo sur Aujourd'hui** (à
  côté de l'avatar) : prend la photo tout de suite puis ouvre Observer prêt à analyser (relais
  `lib/ai/pending-photo.ts`) ; sans compte ou sans analyse restante, ouvre Observer qui explique.
- **Priorité 5, mode vacances** (`app/vacation.tsx`, logique pure `lib/garden/vacation.ts`, hook
  `hooks/use-vacation.ts`) : dates en chips + boutons −/+, « Quelqu'un passera arroser ? » ; plan de
  départ à cocher selon plantes, saison et durée (récolte, paillis, réserve d'eau, soucoupe, gel…) ;
  liste pour le proche (rythme d'arrosage par plante, message partagé via `Share`, sinon affiché à
  copier) ou astuces d'humidité. Les dates vivent dans les réglages des rappels (`settings.vacation`,
  synchronisés, colonne `vacationJson`) : rappels du téléphone et du serveur muets pendant l'absence,
  notification « Bon retour » le lendemain, carte sur Aujourd'hui (départ / vacances / retour). Entrées :
  Moi, Réglages → Rappels, carte d'accueil. Nora connaît les dates.

Livré, à valider sur son téléphone :
- (Validé le 30/09 : Nora qui se souvient, la bonne ville, le geste Engrais.)
- **Alerte pluie sur Aujourd'hui** (corrigée le 30/09) : « N'arrose pas » s'affiche aussi pour une
  plante jamais arrosée dans l'app ; la liste du jour montre les conseils même notifications coupées
  (navigateur) ; une fois cochée (« Compris »), l'arrosage n'est plus reproposé ce jour-là.
- **Priorité 3, Nora qui se souvient** : carte « Nora se souvient de toi » dans Nora (feuille
  `components/nora/memory-sheet.tsx`) : niveau (= l'expérience de l'onboarding, la même que dans
  Réglages), 9 préférences à cocher, faits retenus en discutant avec « Oublier » / « Tout oublier ».
  Nora répond en JSON `{ answer, remember, forget }` (`server/ai/claude.ts`) ; ce qu'elle retient
  s'affiche sous sa réponse. Faits et préférences : table `nora_memories` (`server/ai/memory-store.ts`,
  logique pure `lib/ai/memory.ts`). Contexte : les 90 derniers jours résumés plante par plante et par
  type de geste (`summarizeHistory` dans `server/ai/context.ts`, depuis l'étape 2 de l'audit). Question prête « Fais le point sur mes plantes ».
  **Sur plusieurs jours** (04/10) : chaque fait retenu est daté pour Nora (« (retenu le 3 juillet) »,
  `noteDate`), et le prompt lui dit de vérifier un fait ancien plutôt que de le tenir pour acquis. La
  conversation est datée (`at` sur chaque message, `lib/ai/conversation.ts`) : séparateurs « Aujourd'hui /
  Hier / Lundi 28 septembre » à l'écran (`withDaySeparators`), et seuls les échanges des 2 derniers jours
  partent vers Nora (`conversationForNora`) ; au-delà, elle s'appuie sur ce qu'elle a retenu.
- **Geste « Engrais »** (type `fertilizing`) : 26 plantes gourmandes seulement (`lib/plants/fertilizing.ts` :
  légumes-fruits tous les 14 j de juin à septembre, légumes-feuilles et fleurs tous les 21 j, petits
  fruits tous les 30 j au printemps…), engrais organique uniquement. Geste espacé (`everyDays`) : sur
  l'accueil seulement quand il est dû (`spacedTaskDue`, compté depuis l'arrivée de la plante), et il
  passe alors avant la rotation ; dans Saisons avec l'étiquette « ENGRAIS » et son rythme ; Nora connaît
  le dernier engrais et le rythme conseillé.
- **Priorité 4, progression** (logique pure `lib/garden/progress.ts`) : dans Ma semaine, eau
  économisée (« N'arrose pas » suivis × ~20 % du pot ; sur l'accueil, « Compris » sur une alerte pluie
  note désormais l'arrosage évité) et récoltes à venir ; carte « Sa progression » dans la fiche plante
  (stade, 8 semaines en barres, étapes marquantes ; **validée** le 04/10 ; depuis le 04/10, une jeune plante n'est jugée que sur
  les semaines depuis son arrivée : `trackedWeeks`, `careWeeksLabel` « Soignée 4 semaines sur 5 depuis son
  arrivée », pas de barre avant) ; `celebrationFor` remplace le message après un
  geste quand il débloque un badge, un niveau, une série ou une première récolte (Aujourd'hui,
  Saisons, fiche plante).
- **Petites victoires en grand** (01/10, demande « pas d'effet waouh ») : chaque coche (`TodayRow`) fait
  rebondir le rond avec une onde, 8 petites feuilles et un flash vert pâle sur la ligne. `celebrationFor`
  renvoie maintenant `{ kind, emoji, title, detail }` et fête aussi **chaque récolte** (pas seulement la
  première) ; la fête s'affiche en plein écran (`components/today/celebration.tsx`, `useCelebration` :
  confettis aux couleurs de l'app, carte au centre, se ferme seule en ~3 s ou d'une touche), et le
  message habituel avec « Annuler » reste en bas (les litres d'eau économisés ne sont plus cachés).
- **Suggestions de saison** (02/10, logique pure `lib/plants/suggestions.ts`) : dans Saisons (vue par
  mois, balcon non vide), sous la liste, carte « À semer ou planter en octobre »
  (`components/seasonal-suggestions.tsx`) : 4 plantes adaptées au soleil, à l'espace, aux envies et au
  climat, sans celles déjà sur le balcon ; « Récolte … · dernier mois / facile » ; « + » immédiat avec
  « Annuler », feuille du bas (semis, plantation, récolte, pot) ; mois calme → « reprennent en … ».
  Lien « Voir toutes les plantes d'octobre » → catalogue avec la pastille « À semer en octobre »
  (`/garden/add?month=10`). Le catalogue n'applique pas le décalage de climat (pas de météo chargée).
  Sur **Aujourd'hui**, ligne « Idée du mois » sous la liste du jour (la 1ʳᵉ suggestion, « + » avec
  « Annuler », toucher la ligne ouvre Saisons) ; cachée pendant les vacances et balcon vide.
  **Les suggestions tournent chaque jour** (à sa demande, « que l'app ne paraisse pas figée ») : tirage
  du jour (`seed: dayKey(now)`) parmi les 12 mieux adaptées, stable dans la journée, et l'Idée du mois
  d'Aujourd'hui est toujours la 1ʳᵉ suggestion de Saisons.
  **Saisons rangé par type de geste** (04/10, à sa demande « liste trop longue ») : une ligne par type
  (`groupActivities`, `activityGroupTitle`, `activityGroupSummary` dans `lib/plants/calendar.ts` : « À récolter
  · 5 plantes », « Entretien · 3 gestes », Engrais à part), « 2 sur 5 faits · menthe, thym… » ; la ligne ouvre
  une feuille du bas où l'on coche chaque plante (« Annuler » et fête s'affichent par-dessus grâce à
  `overlay` de `BottomSheet`). Un type d'une seule plante reste une ligne à cocher ; le filtre par plante
  garde le détail. **Aujourd'hui reste une ligne par plante** (choix du porteur). Vue « Par saison » : mois à
  venir seulement pour la saison en cours, et suggestions de la saison (`seasonSuggestions`, « En novembre ·
  … »). Plus de « Plante … » pour une plante déjà sur le balcon (`addedAt` du `CalendarSubject`, option
  `now`), sauf arrivée ce mois-ci (achetée, ajoutée depuis une suggestion) ; vaut pour Saisons et
  l'accueil (`seasonalToDo`). **Validé** sur son téléphone le 04/10.
- **Calendrier de culture vérifié** (02/10, à sa demande « quelles sont tes sources ») : les 100 plantes
  comparées à 2-3 pages de semenciers / sites de jardinage (recherche web, repère Paris, culture en pot ;
  un mois n'est changé que si 2 sources concordent) : 35 mois corrigés (récoltes prolongées, semis plus
  larges…). Sources et semis au chaud dans `lib/plants/sowing.ts`, document lisible
  `docs/sources-calendrier.md`. **Semis au chaud** (`indoorSowMonths`) : « Sème le basilic au chaud »
  + explication (godets à l'intérieur, 18-22 °C, plants dehors en …) dans Saisons, Aujourd'hui,
  suggestions et fiches (« Semis : mars–mai (au chaud à l'intérieur en mars–avril) »). Le réseau de la
  session laisse passer la recherche web (WebSearch) mais pas l'ouverture des pages (WebFetch, curl).

**Audit de scalabilité et de coûts (02/10, plan validé)** : 11 étapes, une par commit (plan dans la
discussion du 02/10, résumé technique dans un document Claude). Bloc A coût IA (1 modèles par usage +
max_tokens, 2 contexte de Nora allégé, 3 `lib/plans.ts` + nouveaux quotas 1/5 gratuit et 20/100
Balco+, 4 budget `AI_MONTHLY_BUDGET_USD` + rapport de coûts), 5 état des lieux avant publication
(SDK, achats intégrés, FCM), bloc B offre (6 droits Balco+, 7 prix fondateur), bloc C charge
(8 pool + limite IP en base, 9 cron par lots + verrou, 10 purge, 11 cache météo serveur). Choix du
porteur : un compte gratuit garde la sauvegarde de son jardin sur un appareil (multi-appareils =
Balco+) ; budget IA 30 $ en test, pas de coupure si la variable est vide ; rapport de coûts par script
et route réservée à `role = admin`. Balco+ sera payant (offre commerciale Open-Meteo à prévoir).
- Étape 1 faite : `BALCO_AI_MODEL_PHOTO` (défaut `claude-opus-5`) et `BALCO_AI_MODEL_CHAT` (défaut
  `claude-sonnet-5`), repli `BALCO_AI_MODEL` ; `AI_MAX_TOKENS_PHOTO=2000`, `AI_MAX_TOKENS_CHAT=1500` ;
  `fallbacks` seulement pour les modèles qui l'acceptent (`requestSettings`, `server/ai/claude.ts`).
- Étape 2 faite : Nora reçoit 8 messages (`MAX_HISTORY_TURNS`) et 90 jours d'historique agrégé
  (`HISTORY_DAYS`, une seule note en clair par plante) ; prompt système toujours en cache.
- Étape 3 faite : `lib/plans.ts` (`PLANS`, `planOf`, `can`) : quotas IA 1/5 gratuit, 20/100 Balco+,
  droits `serverReminders`, `weatherPushAlerts`, `cloudBackup` (gratuit aussi), `multiDeviceSync`
  (appliqués à l'étape 6). Message de quota au singulier (« ton analyse offerte »).
- Étape 4 faite : budget `AI_MONTHLY_BUDGET_USD` (`server/ai/budget.ts` : grille `DEFAULT_PRICES` +
  `AI_PRICES_JSON`, modèle inconnu au prix fort, dépense relue au plus une fois par minute) ; 80 % →
  pause des gratuits, 100 % → pause pour tous, message dans Nora, Observer et le bouton photo
  (`ai.status.paused`), ligne `[ai] budget … atteint` dans les journaux. Colonne `cacheWriteTokens`
  (migration 0009) ; réponses coupées : jetons comptés dans le budget, pas dans le quota. Rapport :
  route `/api/admin/ai-costs` (navigateur, `role = admin`), `ai.costReport`, script
  `pnpm exec tsx scripts/couts-ia.ts`.
- Étape 5 faite (bloc A validé sur téléphone le 02/10) : état des lieux `docs/avant-publication.md` :
  FCM d'abord (clé de compte de service dans EAS, `google-services.json` en variable fichier EAS), puis
  Expo 54 → 55 → 56 → 57 (56 casse les imports `@react-navigation/*` de `haptic-tab.tsx` et
  `icon-symbol.tsx`, rend `copy()` d'`expo-file-system` asynchrone dans `photo-files.ts`), puis achats
  intégrés avec RevenueCat (droit `plus`, webhook `POST /api/webhooks/revenuecat` → `users.plan`).
- Étape 6 faite : droits Balco+ appliqués. Rappels serveur et push météo réservés à Balco+
  (`recalculateUserReminders` → `reason: "plan"`, cron filtré par forfait, envoi annulé si le compte est
  repassé gratuit) ; la synchro renvoie `access` et l'app ne s'inscrit aux push qu'en Balco+ (sinon
  désinscription, rappels locaux). Gratuit = sauvegarde depuis un seul appareil (`users.syncDeviceId`,
  migration 0010, `lib/sync/device-id.ts`) : la connexion sur un téléphone le prend (`claimDevice`),
  l'ancien reçoit `CONFLICT` → statut `other-device`, Réglages « Sauvegarder depuis ce téléphone »
  (`claimThisDevice`). Pour tester Balco+ : `UPDATE users SET plan = 'plus'` (docs/deploiement.md).
  Validé sur téléphone le 02/10.
- Étape 7 faite : prix fondateur sans paiement. Colonne `users.founderSince` (migration 0011, date du
  premier abonnement, gardée si le compte repasse gratuit), `FOUNDER_OFFER` (500 places,
  `BALCO_FOUNDER_SEATS`, produit `balco_plus_fondateur`) et `founderSeatsLeft` dans `lib/plans.ts`,
  `server/founder.ts` (`founderOffer`, `grantFounderPrice` : place vérifiée et prise en une requête).
  La synchro renvoie `access.founder` ; Réglages → Compte le mentionne. Test : `UPDATE users SET plan =
  'plus', founderSince = NOW()`.
- Bloc B validé sur téléphone le 04/10.
- Étape 8 faite : pool mysql2 réglable (`DB_POOL_SIZE`, 10 par défaut, `poolSize()` dans `server/db.ts`,
  attente au lieu d'échec). Limite de 20 demandes de code par heure et par IP comptée dans MySQL
  (table `rate_limits`, migration 0012, fenêtres d'une heure, IP en empreinte SHA-256) :
  `server/rate-limit.ts` (`hitRateLimit`, `purgeRateLimits` pour l'étape 10, repli en mémoire sans base).
- Étape 9 faite : cron des rappels (`runScheduledReminders`, `server/reminders.ts`) : météo d'abord, une
  fois par zone ~1 km (`weatherZone`, 4 appels à la fois), puis comptes par lots (`mapWithConcurrency`,
  `server/concurrency.ts`, `REMINDERS_CONCURRENCY` = 20) ; verrou en base `job_locks` (migration 0013,
  `server/job-lock.ts`, 30 min de durée de vie) → second passage `{ skipped: "already_running" }` ;
  ligne `[reminders] passage en … ms : … comptes, … zones météo…` dans les journaux.
- Étape 10 faite : purge quotidienne (`server/purge.ts`, `runDailyPurge` appelée par le cron des rappels ;
  verrou `daily-purge` de 23 h jamais relâché = « déjà fait aujourd'hui », relâché si échec) : rappels
  dont `validUntil` a plus de 30 j, `login_codes` de plus de 24 h, `ai_requests` de plus de 13 mois,
  `rate_limits` de plus de 24 h ; par paquets de 5 000 ; index ajoutés (migration 0014). Les tests de
  purge utilisent une date passée (2026-03) pour ne pas effacer les lignes des autres tests.
- Étape 11 faite : météo de l'app servie par le serveur, `GET /api/weather?latitude=&longitude=` (route
  Express plutôt que tRPC : cache HTTP et simulable dans les e2e) ; `server/weather-cache.ts` : zone
  arrondie au centième (~1 km), 30 min (`WEATHER_CACHE_MINUTES`), appels simultanés partagés, échec non
  gardé, 5 000 zones au plus, 60 nouvelles zones par heure et par IP. App : `lib/weather/forecast-client.ts`
  (`loadForecastPayload`, partagé par Aujourd'hui et Saisons, 10 min sur le téléphone, `force` au
  rafraîchissement, repli direct sur Open-Meteo si le serveur ne répond pas ou sans adresse d'API).
  `mockWeather` (e2e) simule aussi `/api/weather`. Alias `@/` ajouté dans `vitest.config.ts`.
  **Bloc C terminé** (étapes 8 à 11), validé sur téléphone le 04/10. **Audit terminé** : PR
  https://github.com/NLB44850/Balco/pull/14 (étapes 7 à 11) fusionnée dans `main` le 04/10.


**Historique des listes de travail** (toutes terminées et fusionnées dans `main`) :
- Liste du 30/09 : eau économisée, petites victoires, alertes météo, catalogue à 100 plantes avec photos
  d'exemple, suggestions selon le mois. Pour ajouter une plante : recherche dans `PLANTS` du script,
  `AWAITING_PHOTO` dans `tests/stock-photos.test.ts`, candidates / `choix.json` / `--final`, recompression
  800 px qualité 74 (`convert -resize '800x800>' -strip -quality 74`), `node scripts/photos/generer-index.mjs`.
- **Retours du test utilisateur du 04/10, 10 étapes, toutes validées le 06/10**, PR
  https://github.com/NLB44850/Balco/pull/27 fusionnée le 06/10. Ce qui en reste dans le code :
  1. Plan du jour unique `lib/garden/day-plan.ts` (`planDay`, `GESTURE_ORDER`, état `good`/`watch`/`weather`/`new`),
     lu par Aujourd'hui, Balcon, la fiche et les pastilles via `hooks/use-day-plan.ts` (`ready` avant d'afficher).
  2. Titres d'action (« Arrose le basilic ») + « Enfonce ton doigt : sèche sur N cm ? Arrose. » (`soilCheckText`).
  3. `layoutTodayList` (`lib/garden/today.ts`) : arrosages regroupés dès 2 (« Vérifie la terre de N plantes »,
     feuille du bas), engrais / entretien repliés au-delà de 5 lignes (`MAX_TODAY_LINES`).
  4. Alertes météo en bandeau (`components/today/weather-banner.tsx`, `splitTodayList`) : gel, orage, vent,
     chaleur = « C'est fait » ; pluie = bandeau sans bouton, arrosage évité compté tout seul (`rainSavingsToLog`),
     notification « N'arrose pas » plus envoyée une fois lue. « Dans 3 h » / « Pas aujourd'hui » dans la feuille.
  5. Aujourd'hui : 1ᵉʳ geste **à faire** par plante, le suivant prend sa place, gestes faits cochés en bas.
     Saisons en lecture seule (« Ton calendrier : ce qui t'attend… », « Le faire sur Aujourd'hui ») mais montre ce
     qui est fait (`activityDoneSoFar`, « ✓ Faite aujourd'hui »). Décocher un geste issu d'un conseil météo réveille
     le conseil (`wakeSnoozeFor`).
  6. Moi = chiffres de `weekSummary` (comme Ma semaine) ; Idée du mois « Dernier mois pour la planter · récolte de
     mai à septembre » (`lastChanceText`, `monthSpan`) ; e2e de cohérence `e2e/4-coherence.spec.ts`.
  7. Série de jours suivis `followedDays` (garden-logic) : un jour compte si chaque plante dont l'arrosage était dû
     a été arrosée ou couverte par la pluie, ou s'il n'y avait rien à arroser ; le reste = bonus. Arrosage évité :
     ni geste ni points. Phrase d'explication dans Ma semaine.
  8. Fêtes : plein écran seulement pour un nouveau badge ou la 1ʳᵉ récolte d'une plante, une fois par jour
     (`Celebration.big`, `celebrationStyle`, jour gardé dans `balco.celebration.last-big-day.v1`) ; sinon un mot
     devant le message du bas (`withCheer`). Case « photo » masquée à 0 dans Ma semaine.
  9. Observer sans compte : `server/ai/guest.ts` (1 analyse par appareil sur un an, 3 par réseau et par jour,
     `AI_GUEST_SCANS_PER_NETWORK_PER_DAY`), routes publiques `ai.guestStatus` / `ai.diagnoseGuest` (budget IA,
     `userId = 0`, rendue si échec) ; « Garde ce diagnostic » + « Créer mon compte gratuit », carte « Exemple de
     résultat ». Web : `lib/ai/camera-interrupt.ts` explique quand Chrome recharge la page pendant la photo. E2e :
     faux service d'IA `e2e/fake-anthropic.mjs`, `e2e/5-observer.spec.ts`.
  10. Offre en bénéfices : `plusBenefits`, `freeBenefits`, `plusQuotaHint` (`lib/plans.ts`) dans Réglages → Compte
      et les messages de quota ; bouton « Créer mon compte ou me connecter ».
  Après la fusion : Observer affiche la photo avec `expo-image` (zone vide sur Android avec l'Image de React
  Native, vu dans l'APK du 06/10) ; **à revérifier dans le prochain APK**.
- **Erreur de Nora « Failed to execute 'json' on 'Response' »** (vue le 07/10, question du 05/10) : réponse vide du
  transfert de port du Codespace (serveur qui redémarre ou délai dépassé), pas une erreur du serveur. Corrigé :
  `lib/ai/error-text.ts` (`aiErrorText` garde les messages du serveur, remplace ceux du navigateur ; `noticeText`
  réécrit les anciennes notices), bouton « Réessayer » sur la dernière notice de Nora, Observer idem ; question à
  Nora limitée à 40 s par essai et un seul nouvel essai (`CHAT_TIMEOUT_MS`, `server/ai/claude.ts`).
  Puis (07/10, « c'est trompeur, la requête fonctionne quand même ») : le serveur répondait bien, seule la réponse se
  perdait. Chaque question porte un `requestId` ; `server/ai/answer-cache.ts` (`answerOnce`, 15 min, en mémoire)
  rend la même réponse à la même question (en cours ou faite) sans la décompter ni la facturer deux fois ; l'app
  redemande en silence après 2, 4 et 8 s (`askRecovering`, `isConnectionLost`) avant d'afficher « La réponse de Nora
  s'est perdue en route… Réessayer ». E2e `12-nora-erreur` (réponse vidée après passage au serveur).
- **Saisons, retours du 07/10** : la carte climat dit le repère de gel du moment (`frostNote` dans
  `lib/plants/climate.ts` : « premières gelées vers fin novembre » d'août aux premières gelées, « plus de gel à
  craindre avant l'automne » l'été, sinon « gelées possibles jusqu'à début avril » ; `firstFrost`/`firstFrostMonth`
  par zone). Suggestions : quand tout ce qui convient est déjà sur le balcon (`allOwned`), « Tout ce qui se sème ou
  se plante ce mois-ci et convient à ton balcon y est déjà » ; le lien du catalogue reste sur le mois affiché.
- Réponses données au porteur, à ne pas reproposer : l'app ne copie pas les photos dans la galerie du téléphone
  (« on laisse comme ça », 06/10) ; IDE sur mobile = ouvrir le Codespace dans Chrome (« Open in browser »).

Points à ne pas oublier (à proposer au porteur au bon moment, noté le 30/09) :
- Encore à valider sur son téléphone : la mémoire de Nora sur plusieurs jours (« Sa progression » et les
  petites victoires sont validées).
- **Branche fusionnée dans `main`** : PR #1 (02/10, jusqu'à l'étape 6 de l'audit), #14 (04/10, étapes 7
  à 11), #15 (04/10, mises à jour Dependabot), #22 (04/10, Saisons rangé par type, progression, Nora datée), #27 (06/10, les 10 étapes du test utilisateur), #28 (06/10, accueil refait et pas-à-pas pour planter) et #29 (07/10, rempotage, 11 pas-à-pas, Nora, Saisons). Le travail continue
  sur `claude/eloquent-gates-g7xc6x` ; proposer une nouvelle PR vers `main` à la fin de chaque bloc validé. (La session clone le dépôt en partiel : `git fetch --unshallow` avant
  toute comparaison d'historique avec `main`.)
- **Maintenance** (02/10, fusionné dans `main` par https://github.com/NLB44850/Balco/pull/2 et copié sur
  la branche) : `.github/dependabot.yml` (dépendances chaque lundi, groupées ; pas de montée mineure ou
  majeure des paquets liés au SDK Expo) et `.github/workflows/maintenance.yml` (issue « Maintenance »
  le 1er du mois, bilan annuel en février ; pnpm lu depuis `packageManager`).
  **Mises à jour Dependabot faites le 04/10** (une PR groupée depuis la branche) : correctifs et mineures
  (tRPC 11.19, drizzle-orm 0.45, zod 4.6, Playwright 1.63, esbuild 0.28…, paquets Expo alignés sur
  `node_modules/expo/bundledNativeModules.json` car `expo install --fix` ne joint pas le site d'Expo depuis
  la session), Express 5, dotenv 18, concurrently 10, actions checkout 7 / setup-node 7 / pnpm 6.
  Refusés : React 19.1.9 (doit rester 19.1.0, version exacte du moteur de React Native 0.81) et
  tailwind-merge 3 (Tailwind 4 seulement, NativeWind 4 reste sur Tailwind 3) ; ignorés dans `dependabot.yml`.
  **Deuxième vague (04/10, PR #16 à #21)** : repris @anthropic-ai/sdk 0.131, reanimated 4.1.7,
  react-native-web 0.21.3, tailwind-merge 2.6.1, cross-env 10, upload-artifact 7 ; refusés et ajoutés aux
  exclusions de `dependabot.yml` : react-native 0.81.6 (version exacte du SDK), babel-preset-expo et
  eslint-config-expo 57 (suivent le SDK), @types/node 26 (le serveur est en Node 22). Les tâches planifiées de
  GitHub tournent sur `main` (le cron des rappels reste inactif tant que la variable `BALCO_API_URL`
  n'est pas définie sur GitHub).
- Avant la publication sur le Play Store : politique de confidentialité et mentions (données du
  compte, position, photos, questions envoyées à l'IA d'Anthropic), fiche Play Store, compte
  développeur Google, et prévoir la montée de version d'Expo (SDK 54 vieillit).
- Coûts : surveiller les heures gratuites du Codespace et la facture Anthropic (quotas IA).
