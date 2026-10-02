# Balco : à lire au début de chaque discussion

Balco est une app de jardinage sur balcon, en français (Expo SDK 54, React Native 0.81, expo-router,
serveur Express + tRPC + Drizzle/MySQL). Ce fichier résume où en est le projet et comment travailler
avec son porteur. Détails : `docs/feuille-de-route.md` (demande d'origine, état, ordre de travail),
`docs/deploiement.md` (Codespaces, APK), `docs/synchro-et-rappels.md`.

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
  puis `DATABASE_URL=… npx drizzle-kit migrate` ; 363 tests à ce jour). Dans un conteneur
  neuf : `apt-get install -y mariadb-server`, `service mariadb start`, créer la base `balco_cal` et l'utilisateur
  `balco`/`balco`, puis `pnpm -s build && DATABASE_URL=mysql://balco:balco@localhost:3306/balco_cal node dist/migrate.mjs`.
- `npx expo export --platform android` pour s'assurer que le bundle Android se construit.
- **Tests de bout en bout** (à lancer quand le porteur le demande, et avant chaque grosse évolution) :
  `bash scripts/e2e.sh` (≈ 4 min : construit l'app web avec la simulation météo, migre la base, démarre
  le vrai serveur sur le port 3100, lance Playwright). `bash scripts/e2e.sh meteo` pour un seul fichier,
  `E2E_SKIP_BUILD=1` pour ne pas reconstruire. Scénarios dans `e2e/` (18 aujourd'hui) : parcours
  (onboarding, écrans, cocher/Annuler, fête, catalogue, fiche d'une nouvelle plante, feuille du bas qui se ferme,
  suggestions de saison), météo (pluie + eau économisée, gel + Saisons,
  orage, vent, canicule, « Pas aujourd'hui », retour météo réelle), compte (code de connexion lu dans
  `dist/e2e-server.log`, balcon retrouvé sur un 2ᵉ téléphone, le 1ᵉʳ prévenu « sauvegardé depuis un autre téléphone ») et vacances. Open-Meteo est simulé
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
- **Geste « Engrais »** (type `fertilizing`) : 26 plantes gourmandes seulement (`lib/plants/fertilizing.ts` :
  légumes-fruits tous les 14 j de juin à septembre, légumes-feuilles et fleurs tous les 21 j, petits
  fruits tous les 30 j au printemps…), engrais organique uniquement. Geste espacé (`everyDays`) : sur
  l'accueil seulement quand il est dû (`spacedTaskDue`, compté depuis l'arrivée de la plante), et il
  passe alors avant la rotation ; dans Saisons avec l'étiquette « ENGRAIS » et son rythme ; Nora connaît
  le dernier engrais et le rythme conseillé.
- **Priorité 4, progression** (logique pure `lib/garden/progress.ts`) : dans Ma semaine, eau
  économisée (« N'arrose pas » suivis × ~20 % du pot ; sur l'accueil, « Compris » sur une alerte pluie
  note désormais l'arrosage évité) et récoltes à venir ; carte « Sa progression » dans la fiche plante
  (stade, 8 semaines en barres, étapes marquantes) ; `celebrationFor` remplace le message après un
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


À faire, dans l'ordre (liste du porteur, 30/09) :
1. Eau économisée (simulation pluie → « N'arrose pas » → toast litres → Ma semaine, bloc 💧) :
   **validé** le 02/10.
2. Petites victoires : refaites le 01/10 (animation à chaque coche, fête plein écran, chaque récolte
   fêtée). **Validé** (« c'est top »).
3. Alertes météo : vérifiées le 01/10 (tests de bout en bout). Corrigé : canicule sans alerte pour une
   plante jamais arrosée dans l'app ; « Arrose … si besoin » en double sous l'alerte chaleur, pendant un
   orage ou une fois arrosé ; Saisons montrait encore une alerte déjà traitée. **Validé** le 01/10.
4. Catalogue agrandi le 01/10 : **100 plantes** (27 nouvelles : agastache, livèche, plante huître, sauge
   ananas, tomatillo, gombo, haricot kilomètre, concombre des Antilles, épinard-fraise, arroche,
   tétragone, baselle, claytone, ficoïde glaciale, moutarde de Chine, chou-rave, poireau perpétuel, oca,
   crosnes, œillet mignardise, dahlias nains, mufliers, fuchsia rustique, fraisier des bois, kiwaï,
   cassissier, mûres sans épines), des variétés anciennes, originales et récentes ajoutées aux plantes
   existantes, variétés en pastilles dans la fiche du catalogue. (Le filtre « Anciennes & originales » et
   les mentions Ancienne / Originale / Nouveauté ont été retirés le 02/10 à sa demande : « ça n'apporte rien ».) **Photos d'exemple** : 100 sur 100 le 02/10. **Validé**, ainsi que la
   feuille du bas corrigée le 02/10 (« × », glisser vers le bas, jamais plus haute que l'écran).
   Pour une nouvelle plante : recherche dans `PLANTS` du script, `AWAITING_PHOTO` dans
   `tests/stock-photos.test.ts`, puis candidates / `choix.json` / `--final`, recompression en 800 px
   qualité 74 (`convert -resize '800x800>' -strip -quality 74`) et `node scripts/photos/generer-index.mjs`.
5. Suggestions selon le mois : livrées le 02/10 dans Saisons, le catalogue et Aujourd'hui (« Idée du
   mois », à sa demande), **à valider** sur son téléphone.
6. À la publication : notifications serveur sur Android (Firebase/FCM) ; synchroniser les reports
   (« Dans 3 h ») avec le serveur ; envoyer les photos des plantes sur le serveur (stockage d'images)
   pour les retrouver sur un autre téléphone.

Points à ne pas oublier (à proposer au porteur au bon moment, noté le 30/09) :
- Encore à valider sur son téléphone : la carte « Sa progression » de la fiche plante et les petites
  victoires (priorité 4), la mémoire de Nora sur plusieurs jours.
- **Branche fusionnée dans `main`** le 02/10 (https://github.com/NLB44850/Balco/pull/1, jusqu'à l'étape 6
  de l'audit). Le travail continue sur `claude/eloquent-gates-g7xc6x` ; proposer une nouvelle PR vers `main`
  à la fin de chaque bloc validé. (La session clone le dépôt en partiel : `git fetch --unshallow` avant
  toute comparaison d'historique avec `main`.)
- **Maintenance** (02/10, fusionné dans `main` par https://github.com/NLB44850/Balco/pull/2 et copié sur
  la branche) : `.github/dependabot.yml` (dépendances chaque lundi, groupées ; pas de montée mineure ou
  majeure des paquets liés au SDK Expo) et `.github/workflows/maintenance.yml` (issue « Maintenance »
  le 1er du mois, bilan annuel en février ; pnpm lu depuis `packageManager`). Les tâches planifiées de
  GitHub tournent sur `main` (le cron des rappels reste inactif tant que la variable `BALCO_API_URL`
  n'est pas définie sur GitHub).
- Avant la publication sur le Play Store : politique de confidentialité et mentions (données du
  compte, position, photos, questions envoyées à l'IA d'Anthropic), fiche Play Store, compte
  développeur Google, et prévoir la montée de version d'Expo (SDK 54 vieillit).
- Coûts : surveiller les heures gratuites du Codespace et la facture Anthropic (quotas IA).
