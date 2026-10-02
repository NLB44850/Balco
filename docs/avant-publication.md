# Avant la publication : état des lieux

État au 2 octobre 2026 (étape 5 de l'audit de scalabilité et de coûts). Trois chantiers sont à mener
avant de publier Balco sur le Play Store et l'App Store : monter la version d'Expo, brancher les
achats intégrés de Balco+, activer les notifications Android en production. Aucun n'est codé ici :
ce document liste ce qu'ils impliquent et l'ordre conseillé.

## En résumé

| Chantier | Pourquoi | Effort estimé | Bloquant pour publier ? |
|---|---|---|---|
| Expo SDK 54 → 57 | SDK 54 a un an ; la dernière version est la 57.0.26. Google Play exigera Android 16 (API 36) pour toute mise à jour à partir du 31 août 2026 : SDK 54 le cible déjà, mais l'exigence monte chaque année. | 3 montées successives, 1 à 2 jours chacune avec les tests | Non aujourd'hui, oui d'ici un an |
| Achats intégrés Balco+ | Sans eux, `users.plan` ne passe jamais à `plus` : l'offre payante n'existe pas. | 4 à 6 jours (produits dans les stores, écran d'abonnement, webhook, tests) | Oui, pour vendre Balco+ |
| Notifications Android (FCM) | Sans clé Firebase, le serveur ne peut pas envoyer de push sur Android ; les rappels locaux du téléphone marchent déjà. | Une demi-journée, surtout de la configuration | Oui, pour les rappels serveur de Balco+ |

Ordre conseillé : **FCM d'abord** (court, et nécessaire pour tester les rappels Balco+ de l'étape 6),
**puis la montée d'Expo** (avant d'ajouter une bibliothèque native comme celle des achats), **puis
les achats intégrés** sur la version d'Expo à jour. Les comptes développeur (Google Play 25 $ une
fois, Apple 99 $ par an) sont nécessaires pour les deux derniers.

## 1. Monter Expo SDK 54 → 57

Expo conseille de ne jamais sauter de version : on passe par 55, puis 56, puis 57, avec les tests
et un essai sur téléphone à chaque fois. Commande de chaque montée : `npx expo install expo@^55 --fix`
(puis `^56`, puis `^57`), puis `npx expo-doctor`.

| Version | Ce qui change | Ce que ça demande dans Balco |
|---|---|---|
| **55** (React Native 0.83, React 19.2) | Ancienne architecture supprimée, l'option `newArchEnabled` disparaît. Expo Router 7. | Retirer `newArchEnabled: true` de `app.config.ts` (Balco est déjà sur la nouvelle architecture). Vérifier NativeWind 4 et Reanimated 4. |
| **56** (React Native 0.85, Hermes v1 par défaut) | Expo Router remplace React Navigation par ses propres composants : les imports `@react-navigation/*` cassent. `copy()` et `move()` d'`expo-file-system` deviennent asynchrones. `@expo/vector-icons` est remplacé par `@react-native-vector-icons/*`. `expo/fetch` devient le `fetch` par défaut. iOS 16.4 minimum. | Réécrire `components/haptic-tab.tsx` et `components/ui/icon-symbol.tsx` (imports React Navigation et icônes) et retirer `@react-navigation/*` de `package.json`. Ajouter `await` dans `lib/garden/photo-files.ts` (`copy`). Vérifier les appels Open-Meteo et tRPC avec le nouveau `fetch`. |
| **57** (React Native 0.86) | Montée annoncée sans rupture. Corrige une forte hausse de mémoire sur Android avec Hermes v1 et Reanimated (version 57.0.17 et suivantes). | Rien de connu. Ne pas rester sur 56 à cause de la mémoire. |

Bonus : une fois en SDK 57, l'app s'ouvrira dans **Expo Go** sur le téléphone du porteur (Expo Go
SDK 57), sans attendre un APK.

À vérifier à chaque montée : `pnpm -s check`, `pnpm -s lint`, les tests Vitest, `bash scripts/e2e.sh`,
`npx expo export --platform android`, puis un APK de test.

Sources : [Expo SDK 55](https://expo.dev/changelog/sdk-55), [Expo SDK 56](https://expo.dev/changelog/sdk-56),
[Expo SDK 57](https://expo.dev/changelog/sdk-57), [Expo SDK 54](https://expo.dev/changelog/sdk-54) (cible
Android 16), [exigence Google Play API 36](https://foresightmobile.com/blog/complete-guide-to-android-app-publishing-in-2026).

## 2. Achats intégrés Balco+

### Choix conseillé : RevenueCat

RevenueCat gère l'abonnement des deux stores avec un seul code, vérifie les reçus et prévient le
serveur par webhook. Gratuit jusqu'à 2 500 $ de revenus mensuels, puis 1 % au-delà. Les achats
natifs (sans intermédiaire) éviteraient ce 1 %, mais demandent de vérifier soi-même les reçus Apple
et Google et de suivre les renouvellements : beaucoup plus de code à maintenir pour un projet seul.

Commissions des stores, en plus : 15 % pour un petit développeur (programme Small Business d'Apple,
moins d'un million de dollars par an) ; sur Google Play, 15 % pour les abonnements dans l'Espace
économique européen (10 % + 5 % de frais de facturation). Les barèmes de Google ont changé le
30 juin 2026 : à revérifier dans la console avant de fixer le prix.

### Étapes

1. **Comptes** : compte développeur Google Play et Apple Developer ; contrat « Paid Apps » et coordonnées
   bancaires dans App Store Connect ; profil de paiement dans la Play Console.
2. **Produits dans les stores** : un groupe d'abonnement « Balco+ » avec une formule mensuelle et une
   annuelle, mêmes identifiants des deux côtés (par exemple `balco_plus_mensuel`, `balco_plus_annuel`).
   Le **prix fondateur** (étape 7 de l'audit) : une offre de lancement des stores ou un produit à part
   (`balco_plus_fondateur`) réservé aux premiers abonnés.
3. **RevenueCat** : un projet avec les deux apps (identifiant `APP_BUNDLE_ID`), un droit (« entitlement »)
   `plus` qui regroupe les produits, une offre (« offering ») par défaut.
4. **App** :
   - ajouter `react-native-purchases` (code natif : APK de développement, pas Expo Go) ;
   - `Purchases.configure` au démarrage avec la clé publique de la plateforme ;
   - `Purchases.logIn(<identifiant du compte Balco>)` après la connexion, `logOut` à la déconnexion : l'achat
     est rattaché au compte, donc retrouvé sur un autre téléphone ;
   - un écran « Balco+ » (avantages, prix lus dans l'offre, bouton S'abonner, « Restaurer mes achats »,
     lien de gestion de l'abonnement, mentions légales) ouvert depuis Moi, les messages de quota et la pause
     du budget ;
   - sur le web, pas d'achat au départ (RevenueCat propose aussi Stripe, à voir plus tard).
5. **Serveur** :
   - une route `POST /api/webhooks/revenuecat`, protégée par un secret dans l'en-tête `Authorization`
     (`REVENUECAT_WEBHOOK_SECRET`) ;
   - une table `subscription_events` (identifiant de l'événement unique : un même événement reçu deux fois
     ne compte qu'une fois) ;
   - mise à jour de `users.plan` : `plus` sur `INITIAL_PURCHASE`, `RENEWAL`, `UNCANCELLATION`,
     `PRODUCT_CHANGE` ; `free` sur `EXPIRATION` ; rien sur `CANCELLATION` (l'abonné garde Balco+ jusqu'à la
     fin de la période payée) ; `BILLING_ISSUE` laisse le délai de grâce du store ;
   - une vérification de rattrapage (API REST de RevenueCat) à la connexion ou une fois par jour, au cas où
     un webhook se perdrait ;
   - colonnes utiles : date de fin de l'abonnement, produit, prix fondateur.
6. **Tests** : comptes testeurs des deux stores (achats gratuits, renouvellements accélérés), puis
   abonnement, résiliation, expiration et restauration sur un vrai téléphone ; tests Vitest du webhook.
7. **Obligations** : conditions générales de vente, droit de rétractation, politique de confidentialité
   à jour (données du compte, position, photos, questions envoyées à l'IA d'Anthropic), suppression du
   compte depuis l'app (déjà faite) et lien de suppression dans la fiche Play Store.

Sources : [RevenueCat et React Native](https://www.revenuecat.com/platform/react-native-in-app-purchases),
[événements du webhook](https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields),
[abonnements avec Expo et RevenueCat](https://expo.dev/blog/how-to-build-seamless-subscriptions-with-expo-and-revenuecat),
[tarif de RevenueCat](https://costbench.com/software/subscription-billing/revenuecat/),
[programme Small Business d'Apple](https://adapty.io/blog/app-store-small-business-program/),
[commissions des stores en 2026](https://earnroutes.com/guides/app-store-google-play-developer-fees/).

## 3. Notifications Android en production (FCM)

Aujourd'hui, le serveur envoie ses rappels par Expo Push (`server/reminders.ts`) et l'app obtient un
jeton avec le projet EAS (`lib/sync/push-token.ts`). Sur Android, Expo Push passe par Firebase Cloud
Messaging (protocole FCM v1) : sans clé Firebase, les push du serveur n'arrivent pas. Les rappels
locaux, programmés par le téléphone, marchent déjà sans Firebase.

1. Créer un projet Firebase (gratuit) et y ajouter une app Android avec le même identifiant que
   `APP_BUNDLE_ID` (à fixer définitivement avant : il ne change plus après la première publication).
2. Télécharger `google-services.json`, le déclarer dans `app.config.ts` (`android.googleServicesFile`).
   Le garder hors du dépôt : le fournir à EAS comme variable de type fichier
   (`eas env:create --name GOOGLE_SERVICES_JSON --type file …`) et lire son chemin dans `app.config.ts`.
3. Dans Firebase, Paramètres du projet → Comptes de service → « Générer une nouvelle clé privée » (fichier
   JSON, à garder secret).
4. Envoyer cette clé à EAS : `eas credentials` → Android → production → Google Service Account →
   « Manage your Google Service Account Key for Push Notifications (FCM V1) » → téléverser la clé.
   À refaire pour le profil `test` si l'APK de test doit recevoir les push.
5. Construire un nouvel APK, vérifier que le jeton arrive dans `device_push_tokens`, puis lancer le cron
   des rappels (`POST /api/scheduled/reminders`) et vérifier la notification sur le téléphone.
6. iOS, pour mémoire : avec le compte Apple Developer, `eas credentials` crée la clé APNs ; rien à changer
   dans le code.

Sources : [clé de compte de service FCM v1 (Expo)](https://docs.expo.dev/push-notifications/fcm-credentials/),
[envoyer avec Expo Push](https://docs.expo.dev/push-notifications/sending-notifications/).
