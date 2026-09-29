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
4. Expo Go ne marche pas : son téléphone a Expo Go SDK 57, le projet est en SDK 54. Et `expo start
   --tunnel` échoue avec un jeton robot (EXPO_TOKEN aussi présent dans son `.env`).

## Vérifier avant de pousser (dans la session Claude)

- `pnpm -s check`, `pnpm -s lint`, puis `TEST_DATABASE_URL=mysql://balco:balco@localhost:3306/balco_cal npx vitest run`
  (MariaDB locale : `service mariadb start` si elle s'est arrêtée ; 258 tests à ce jour).
- `npx expo export --platform android` pour s'assurer que le bundle Android se construit.
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
  message « Annuler »).
- **4 onglets** : Aujourd'hui, Balcon, Saisons (fichier `calendar.tsx`), Nora. « Moi »
  (`profile.tsx`) s'ouvre par l'avatar, « Observer » (`scanner.tsx`) depuis Nora et Balcon.

## Où on en est

Fait (validé sur son téléphone) :
- Rappels intelligents (priorité 1) : messages clairs, Fait / Dans 3 h / Pas aujourd'hui, alertes
  météo groupées, simulation météo, notification de test.
- Calendrier local (priorité 2) : rempotage, climat de la ville, alertes, vue par saison.
- Refonte étape 1 (accueil en liste à cocher, feuille de détail, « Annuler », fond lumineux) et
  étape 2 (4 onglets, même style partout, police Onest).

À faire, dans l'ordre :
1. **Refonte étape 3** : Balcon et fiche plante « photo d'abord » (comme une annonce Airbnb : ta
   photo datée, pastilles soleil / pot / depuis combien de temps, le prochain geste en un bouton,
   l'historique dessous) ; tes photos à la place des emojis ; point de couleur d'état.
2. **Refonte étape 4** : Saisons, Nora et Moi sur le même modèle (écran « Tout est fait » avec
   « Voir ma semaine », bilan).
3. Priorité 3, Nora qui se souvient (niveau, préférences, historique complet).
4. Priorité 4, progression (bilan hebdomadaire, progression par plante).
5. Priorité 5, mode vacances.
6. À la publication : notifications serveur sur Android (Firebase/FCM) ; synchroniser les reports
   (« Dans 3 h ») avec le serveur.
