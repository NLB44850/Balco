# Mettre Balco en ligne

Balco ne dépend plus d'aucune plateforme. Il faut quatre choses :

1. **un hébergeur** qui fait tourner l'image Docker (l'API et l'app web sont dans le même conteneur) ;
2. **une base MySQL 8** ;
3. **un service d'envoi d'e-mails (SMTP)** pour les codes de connexion ;
4. **les comptes développeur Apple (99 $/an) et Google Play (25 $ une fois)** pour publier les apps.

## 1. Choisir où héberger

| Option | Pour qui | Base MySQL |
|---|---|---|
| **VPS + `docker compose`** (OVH, Scaleway, Hetzner, dès ~5 €/mois) | Le moins cher, tout sous contrôle | Incluse dans `docker-compose.yml` |
| **Clever Cloud** (hébergeur français) | Pas de serveur à gérer, données en France | MySQL managé |
| **Railway / Render / Fly.io** | Démarrage le plus rapide | Add-on MySQL |

Pour commencer, le VPS avec `docker compose` suffit largement.

## 2. Envoi des e-mails

Crée un compte chez un fournisseur SMTP. **Brevo** (français) est gratuit jusqu'à 300 e-mails par jour. Mailjet, OVH ou Scaleway TEM marchent aussi. Vérifie ton domaine chez le fournisseur (enregistrements SPF et DKIM), sinon les codes finiront en spam.

```
SMTP_URL=smtps://LOGIN:CLE_SMTP@smtp-relay.brevo.com:465
MAIL_FROM=Balco <bonjour@ton-domaine.fr>
```

## 3. Lancer le serveur

Sur un VPS :

```bash
git clone … && cd Balco
cp .env.example .env        # remplir JWT_SECRET, CRON_SECRET, SMTP_URL, mots de passe MySQL
docker compose up -d --build
```

Mets ensuite un reverse proxy HTTPS devant le port 3000 (Caddy le fait en deux lignes, certificat compris) :

```
api.ton-domaine.fr {
  reverse_proxy localhost:3000
}
```

Sur une plateforme (Clever Cloud, Railway…), déploie le `Dockerfile` du dépôt et renseigne les mêmes variables. Les migrations de la base s'appliquent toutes seules à chaque démarrage.

Vérification : `https://api.ton-domaine.fr/api/health` doit répondre `{"ok":true,…}`, et `https://api.ton-domaine.fr` affiche l'app web.

> En production, le serveur **refuse de démarrer** si `JWT_SECRET` fait moins de 32 caractères, ou si `DATABASE_URL` ou `SMTP_URL` manque. Le message d'erreur dit ce qu'il faut corriger.

## 4. Rappels météo automatiques

Il faut appeler `POST /api/scheduled/reminders` toutes les heures à la minute 31, avec l'en-tête `Authorization: Bearer <CRON_SECRET>`. Deux possibilités :

- **le cron de l'hébergeur**, le plus précis : `31 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://api.ton-domaine.fr/api/scheduled/reminders` ;
- **GitHub Actions**, déjà prêt (`.github/workflows/reminders-cron.yml`) : ajoute la variable `BALCO_API_URL` et le secret `CRON_SECRET` dans les réglages du dépôt.

## 5. Publier les apps iOS et Android

1. Choisis l'**identifiant de l'app** (ex. `fr.ton-domaine.balco`). Il est définitif après la première publication. Renseigne-le dans `APP_BUNDLE_ID`.
2. `npm i -g eas-cli`, puis `eas login` et `eas init` : note l'identifiant de projet dans `EAS_PROJECT_ID`. C'est nécessaire aux notifications push.
3. Remplace `https://api.votre-domaine.fr` par ta vraie adresse dans `eas.json`.
4. `eas build --platform all --profile production`, puis `eas submit`.

### Se connecter avec Apple (obligatoire sur iOS dès qu'un autre fournisseur est proposé)

- Portail Apple Developer → Identifiers → ton app → active **Sign in with Apple**.
- Côté serveur : `APPLE_AUDIENCES=fr.ton-domaine.balco` (l'identifiant de l'app).

### Se connecter avec Google (facultatif)

- Google Cloud Console → Identifiants → crée trois « ID client OAuth » (iOS, Android, Web).
- App : `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
- Serveur : `GOOGLE_CLIENT_IDS=<ios>,<android>,<web>`.

Tant que ces variables sont vides, le bouton correspondant n'apparaît pas : la connexion par e-mail fonctionne seule.

## 6. Avant de soumettre aux stores

- **Politique de confidentialité** en ligne (exigée par Apple et Google). Elle doit indiquer que Balco stocke l'adresse e-mail, les plantes, l'historique des gestes et la ville utilisée pour la météo.
- La **suppression de compte** est dans l'app (Profil → Supprimer mon compte), comme l'exige Apple.
- **Météo** : l'API gratuite d'Open-Meteo est réservée à un usage non commercial. Dès que l'app est payante, prends l'offre commerciale (clé API).

## Développement local

```bash
pnpm install
cp .env.example .env     # DATABASE_URL vers un MySQL local ; SMTP_URL vide = codes affichés dans la console du serveur
pnpm build && pnpm db:migrate
pnpm dev                 # API sur :3000, app web sur :8081
```
