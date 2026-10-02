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

## 5. Scanner et Nora (IA)

1. Crée une clé API sur https://console.anthropic.com et renseigne-la dans `ANTHROPIC_API_KEY`. Sans clé, l'app affiche « bientôt disponible » à la place du scanner et de Nora.
2. **Fixe une limite de dépense mensuelle** dans la console Anthropic : c'est le vrai garde-fou si quelque chose tourne mal.
3. Les quotas se règlent avec `AI_FREE_*` et `AI_PLUS_*`. Par défaut, un compte gratuit a droit à 3 analyses et 15 questions par mois, un compte Balco+ à 40 analyses et 300 questions. Les refus et les pannes ne sont pas décomptés.

4. **Un modèle par usage** : le diagnostic photo utilise `BALCO_AI_MODEL_PHOTO` (défaut `claude-opus-5`, le plus précis), les questions à Nora `BALCO_AI_MODEL_CHAT` (défaut `claude-sonnet-5`, 2,5 fois moins cher). `BALCO_AI_MODEL` sert de repli commun si l'une des deux est vide. Le repli automatique en cas de refus du modèle (`fallbacks: "default"`) n'est envoyé qu'aux modèles qui l'acceptent (Claude Opus 5, Opus 5.5, Sonnet 5.5, Fable 5.1).
6. **Contexte de Nora allégé** : à chaque question, Nora reçoit les 8 derniers messages de la conversation et un résumé des 90 derniers jours du jardin (par plante : nombre de gestes par type, dernière fois, gestes pas notés, dernier geste en clair). Les instructions fixes restent en tête de requête, en cache de prompt : les questions suivantes les relisent à 10 % du prix.
5. **Plafond de sortie** : `AI_MAX_TOKENS_PHOTO=2000` et `AI_MAX_TOKENS_CHAT=1500` (réflexion du modèle comprise). Une réponse coupée par ce plafond n'est pas décomptée et laisse dans les journaux du serveur une ligne `[ai] scan truncated at max_tokens=…` (ou `chat`) : si elle revient souvent, relève la valeur.

**Coût estimé** (prix Anthropic au 25/09/2026, par million de jetons : Claude Opus 5 à 5 $ en entrée et 25 $ en sortie, Claude Sonnet 5 à 2 $ et 10 $). Ce sont des ordres de grandeur, à vérifier sur les vrais chiffres :

| | Modèle par défaut | Par appel | Compte gratuit au maximum | Compte Balco+ au maximum |
|---|---|---|---|---|
| Analyse photo | `claude-opus-5` | ≈ 0,05 $ | 3 → 0,15 $ | 40 → 2 $ |
| Question à Nora | `claude-sonnet-5` | ≈ 0,012 $ | 15 → 0,18 $ | 300 → 3,60 $ |

Chaque appel est enregistré dans la table `ai_requests` (jetons consommés, modèle, statut), ce qui permet de mesurer le coût réel :

```sql
SELECT kind, model, COUNT(*) AS appels, SUM(inputTokens) AS entree, SUM(outputTokens) AS sortie
FROM ai_requests WHERE status = 'ok' AND createdAt >= DATE_FORMAT(NOW(), '%Y-%m-01') GROUP BY kind, model;
```

À noter : Claude Opus 5.5 (`claude-opus-5-5`, 4 $ et 20 $) et Claude Sonnet 5.5 (`claude-sonnet-5-5`, 2 $ et 10 $) sont les versions les plus récentes ; Opus 5.5 coûte 20 % de moins qu'Opus 5. Pour en changer, il suffit de régler `BALCO_AI_MODEL_PHOTO` ou `BALCO_AI_MODEL_CHAT`, après avoir comparé la qualité sur un échantillon de vraies photos et de vraies questions.

Pour faire passer un compte en Balco+ en attendant les achats intégrés : `UPDATE users SET plan = 'plus' WHERE email = '…';`

## 6. Publier les apps iOS et Android

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

## 7. Avant de soumettre aux stores

- **Politique de confidentialité** en ligne (exigée par Apple et Google). Elle doit indiquer que Balco stocke l'adresse e-mail, les plantes, l'historique des gestes et la ville utilisée pour la météo.
- La **suppression de compte** est dans l'app (Profil → Supprimer mon compte), comme l'exige Apple.
- **IA** : indique dans la politique de confidentialité que les photos et les questions sont envoyées à Anthropic pour l'analyse. Balco ne conserve pas les photos.
- **Météo** : l'API gratuite d'Open-Meteo est réservée à un usage non commercial. Dès que l'app est payante, prends l'offre commerciale (clé API).

## Développement local

```bash
pnpm install
cp .env.example .env     # DATABASE_URL vers un MySQL local ; SMTP_URL vide = codes affichés dans la console du serveur
pnpm build && pnpm db:migrate
pnpm dev                 # API sur :3000, app web sur :8081
```

### Tester dans GitHub Codespaces (sans Docker sur son PC)

Dans un Codespace, les conteneurs n'arrivent parfois pas à se joindre (`connect ETIMEDOUT` dans `docker compose logs app`). Lance alors Balco avec la variante prévue pour ça :

```bash
docker compose down
docker compose -f docker-compose.yml -f docker-compose.codespaces.yml up -d --build
```

Pour la suite, une seule commande fait tout (nettoyage du cache Docker, qui s'abîme souvent quand le Codespace s'arrête, démarrage, attente du serveur, port public) :

```bash
bash scripts/codespace-demarrer.sh
```

Ouvre ensuite le port 3000 depuis l'onglet « Ports ». Les codes de connexion s'affichent avec `docker compose logs app | grep "login code"`.

**Voir l'app sur le téléphone sans build** : l'adresse du port 3000 (`https://<codespace>-3000.app.github.dev`) ouvre aussi l'app web. Dans Chrome sur le téléphone, elle se comporte comme l'app (écrans, animations, simulation météo dans « Moi »), sauf les notifications. Menu ⋮ → « Ajouter à l'écran d'accueil » pour l'ouvrir en plein écran.

### Version de test Android (APK, sans Play Store)

Expo Go ne gère plus les notifications sur Android : pour tester les rappels, construis la version de test.

```bash
export EXPO_TOKEN=…            # jeton créé sur https://expo.dev/settings/access-tokens
npx eas-cli build --platform android --profile test
```

Le profil `test` de `eas.json` pointe vers le serveur du Codespace (port 3000 en public). À la fin, EAS donne un lien et un QR code pour télécharger l'APK sur le téléphone.
