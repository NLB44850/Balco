# Balco en ligne tout seul : Railway, APK par GitHub, mises à jour sans réinstaller

Décidé le 9 octobre : **Railway** pour le serveur, l'app web et la base ; **version de test** en ligne (simulation
météo et date simulée gardées) ; **Brevo** pour les e-mails des codes de connexion ; **mises à jour sans réinstaller**
(EAS Update). La publication sur le Play Store viendra après (`docs/avant-publication.md`).

Une fois en place, plus besoin du Codespace pour tester :

| Quand… | Ce qui se passe tout seul | Où le voir |
|---|---|---|
| une demande de fusion est fusionnée dans `main` | Railway reconstruit et redémarre le serveur et l'app web (3 à 6 min) | Railway → service Balco → Deployments |
| même moment | GitHub publie le nouveau code de l'app pour l'APK de test | GitHub → onglet Actions → « Publier une mise à jour » |
| tu rouvres Balco sur ton téléphone | « Nouvelle version de Balco… Redémarrer » | Réglages → tout en bas : « mise à jour du 10 octobre à 14 h 32 » |
| chaque heure | les rappels météo du serveur (comptes Balco+) | GitHub → Actions → « Rappels météo » |

Un **nouvel APK** n'est nécessaire que lorsque Claude change la version de l'app (nouveau module du téléphone, nouvelle
permission) : il le dira, et il suffira d'appuyer sur un bouton (partie 4).

Règle d'or : **ne colle jamais une clé ou un mot de passe dans la discussion avec Claude**. Tu les tapes toi-même
dans Railway, Brevo ou GitHub.

---

## Partie 1 · Brevo, pour envoyer les codes de connexion (10 min)

1. Crée un compte gratuit sur https://www.brevo.com (300 e-mails par jour offerts).
2. **Expéditeur** : menu en haut à droite → *Senders, Domains & Dedicated IPs* → *Senders* → *Add a sender*. Mets ton
   adresse e-mail, valide le lien reçu.
3. **Clé SMTP** : menu → *SMTP & API* → onglet *SMTP* → *Generate a new SMTP key*. Note trois choses (sans les
   envoyer à personne) : le **serveur** `smtp-relay.brevo.com`, le **login** (de la forme `8a1b2c001@smtp-brevo.com`)
   et la **clé** affichée une seule fois.
4. Prépare la valeur `SMTP_URL` en remplaçant le `@` du login par `%40` :

   ```
   smtp://8a1b2c001%40smtp-brevo.com:LA_CLE@smtp-relay.brevo.com:587
   ```

   (Si la clé contient un `+`, un `/` ou un `@`, remplace-les par `%2B`, `%2F`, `%40`.)

Les premiers codes peuvent arriver dans les **indésirables** : un expéditeur Gmail ou Outlook envoyé par Brevo est
moins bien reconnu. Avant la publication, on prendra une adresse sur un nom de domaine (`docs/avant-publication.md`).

## Partie 2 · Railway, le serveur en ligne (20 min)

1. Crée un compte sur https://railway.com avec **« Login with GitHub »**, puis prends le forfait **Hobby** (5 $ par
   mois, carte bancaire ; 5 $ de consommation inclus, Balco en test devrait rester dedans ou tout près).
2. **New Project** → **Deploy from GitHub repo** → autorise Railway sur le dépôt **NLB44850/Balco** → choisis-le.
   Railway trouve tout seul le fichier `railway.json` et le `Dockerfile`. Le premier déploiement va échouer : c'est
   normal, les réglages ne sont pas encore là.
3. **La base de données** : dans le projet, **+ Create** (ou *New*) → **Database** → **MySQL**.
4. **Les réglages du serveur** : clique sur le service **Balco** → onglet **Variables** → **Raw Editor**, colle ce
   bloc, puis remplace chaque `…` (tu tapes toi-même les valeurs secrètes) :

   ```
   DATABASE_URL=${{MySQL.MYSQL_URL}}
   JWT_SECRET=…
   CRON_SECRET=…
   SMTP_URL=…
   MAIL_FROM=Balco <ton.adresse@exemple.fr>
   ANTHROPIC_API_KEY=…
   AI_MONTHLY_BUDGET_USD=30
   AI_FREE_SCANS_PER_MONTH=30
   AI_FREE_QUESTIONS_PER_MONTH=100
   EXPO_PUBLIC_WEATHER_SIMULATION=1
   ```

   - `DATABASE_URL` : laisse tel quel, Railway remplace `${{MySQL.MYSQL_URL}}` par l'adresse de la base.
   - `JWT_SECRET` et `CRON_SECRET` : deux longues suites de caractères différentes. Pour en fabriquer une, tape dans
     le terminal du Codespace `openssl rand -hex 32` et copie le résultat. **Garde `CRON_SECRET` de côté** : il resservira
     dans GitHub (partie 3).
   - `SMTP_URL` : la valeur préparée à la partie 1 ; `MAIL_FROM` : l'expéditeur validé chez Brevo.
   - `ANTHROPIC_API_KEY` : ta clé Anthropic (la même que dans le `.env` du Codespace).
   - `EXPO_PUBLIC_WEATHER_SIMULATION=1` : l'app web garde la simulation météo et la date simulée (version de test).

   **Update Variables** : Railway redéploie.
5. **L'adresse** : service Balco → **Settings** → **Networking** → **Generate Domain**. Si Railway demande un port,
   garde celui qu'il propose (sinon 3000). Tu obtiens une adresse comme `https://balco-production-1234.up.railway.app`.
   Cette adresse n'est pas secrète : tu peux la donner à Claude.
6. **Vérifier** : ouvre `https://TON-ADRESSE/api/health` → `{"ok":true,…}`. Puis `https://TON-ADRESSE` sur ton
   téléphone : l'app web, avec un compte à créer (le code arrive par e-mail).

Si le déploiement échoue : onglet **Deployments** → le dernier → **View logs**. Une ligne
`Invalid production configuration` dit quelle variable manque.

Les données (compte, plantes) de ce nouveau serveur partent de zéro : ton balcon reste sur ton téléphone, et il se
sauvegarde sur le nouveau serveur dès que tu te connectes avec ton e-mail.

## Partie 3 · GitHub, les réglages des automatismes (5 min)

1. **Jeton Expo** : sur https://expo.dev → ton avatar → **Account settings** → **Access tokens** → **Create token**
   (nom : `github`). Copie-le.
2. Sur GitHub, dépôt **NLB44850/Balco** → **Settings** → **Secrets and variables** → **Actions** :
   - onglet **Secrets** → **New repository secret** : `EXPO_TOKEN` = le jeton Expo ; puis `CRON_SECRET` = le même
     que dans Railway ;
   - onglet **Variables** → **New repository variable** : `BALCO_API_URL` = l'adresse Railway (sans `/` à la fin).

Les rappels météo du serveur se lancent alors chaque heure (workflow « Rappels météo »).

## Partie 4 · Le dernier APK à installer à la main

1. GitHub → onglet **Actions** → à gauche **« Construire l'APK de test »** → **Run workflow** → **Run workflow**.
2. Au bout d'une minute, ouvre l'exécution : le **résumé** donne le lien de la construction sur expo.dev. La file
   d'attente gratuite d'Expo peut durer longtemps : ne relance pas.
3. Quand c'est prêt, ouvre ce lien sur ton téléphone, télécharge et installe l'APK **par-dessus** l'ancien (tes
   plantes restent). Il parle au serveur Railway, plus au Codespace.
4. Dans l'app : Réglages → Compte → connecte-toi avec ton e-mail (code reçu par Brevo).

À partir de là, chaque fusion dans `main` arrive sur le téléphone sans réinstaller : rouvre Balco, attends quelques
secondes, « Nouvelle version de Balco » → **Redémarrer**.

## Pour Claude (technique)

- `railway.json` : construction par le `Dockerfile`, santé `/api/health`, redémarrage si plantage. Railway passe les
  variables du service en arguments de construction : `EXPO_PUBLIC_WEATHER_SIMULATION` arrive dans l'app web.
  Migrations au démarrage (`server/migrate.mjs`). `PORT` est fourni par Railway.
- `expo-updates` : `runtimeVersion: { policy: "appVersion" }`, `updates.url` = `https://u.expo.dev/<projectId>`,
  `checkAutomatically: "NEVER"` : c'est `AppUpdater` (`hooks/use-app-updates.tsx`, monté dans `app/_layout.tsx`) qui
  vérifie à l'ouverture et au retour dans l'app, télécharge et propose de redémarrer. Réglages affiche la date de la
  mise à jour en cours (`currentUpdateDate`, `versionText`).
- **Changer `version` dans `app.config.ts`** (1.0.0 → 1.0.1) dès qu'on ajoute un module natif, une permission ou un
  plugin : sinon une mise à jour JavaScript arriverait sur un APK qui n'a pas le module et planterait. Puis demander au
  porteur de lancer « Construire l'APK de test ».
- `eas.json` : profil `test` = canal `test`, adresse remplacée par `vars.BALCO_API_URL` dans le workflow
  (`.github/workflows/apk.yml`, `EAS_NO_VCS=1` pour envoyer le fichier modifié) ; profil `codespace` = l'ancien
  profil de test vers le Codespace (canal `codespace`, sans mises à jour).
- `.github/workflows/update.yml` : `eas update --channel test` à chaque push sur `main` qui touche l'app (pas les
  documents, le serveur seul ni les tests), avec `EXPO_PUBLIC_API_BASE_URL` = `BALCO_API_URL` et la simulation météo.
  Ne fait rien tant que `EXPO_TOKEN` ou `BALCO_API_URL` manquent.
