# Publier Balco sur le Play Store

Décisions du 18/10 : **Android seulement**, **gratuit d'abord** (Balco+ reste « Bientôt »), **compte développeur
personnel**, Brevo gratuit (300 e-mails par jour), nom technique **`fr.balco.app`**.

## Deux applis sur le téléphone

- **Balco de test** (`com.app.balco`) : l'APK du bouton « Construire l'APK de test », avec la « Version de test »
  (simulation météo, date simulée…). Mises à jour à chaque fusion (canal `test`).
- **Balco du Play Store** (`fr.balco.app`) : le fichier `.aab` du bouton « Construire la version Play Store », sans
  outils de test. C'est une autre appli : on retrouve son balcon en se connectant avec son compte.

Les deux parlent pour l'instant au même serveur Railway (`BALCO_API_URL`).

## Version 1.1.0 (18/10)

Icône des notifications, polices intégrées, position approximative seulement, appli allégée (R8). Ce sont des
changements natifs : les mises à jour ne vont plus qu'aux APK 1.1.0. **Construire un nouvel APK de test après la
fusion.**

## Ce que fait le porteur (une seule fois)

1. **Railway** : retirer la variable `EXPO_PUBLIC_WEATHER_SIMULATION` du service (l'app web publique n'a pas à
   proposer la simulation). Les APK de test gardent la leur (eas.json).
2. **Compte Google Play Console** (play.google.com/console) : compte personnel, 25 $ une seule fois, pièce d'identité.
   Un compte personnel récent doit faire un **test fermé avec au moins 12 testeurs pendant 14 jours** avant de pouvoir
   publier pour tout le monde.
3. **Créer l'appli** dans la Play Console : nom « Balco », langue français, appli, gratuite.
4. **Construire la version Play Store** : GitHub → Actions → « Construire la version Play Store » → « Run workflow ».
   Télécharger le fichier `.aab` sur expo.dev quand il est prêt.
5. **Test fermé** : Play Console → Tester → Test fermé → créer une version, envoyer le `.aab`, ajouter la liste des
   testeurs (leurs adresses Gmail), puis leur envoyer le lien d'inscription.
6. **Fiche et formulaires** (à préparer ensemble) : description courte et longue, captures, icône 512 px, image de
   présentation 1024 × 500, catégorie, **politique de confidentialité** (adresse web), sécurité des données (compte,
   position approximative, photos, questions envoyées à l'IA), classification du contenu.

## Encore à faire avant la publication pour tous (docs/avant-publication.md)

Politique de confidentialité en ligne, notifications du serveur pour Balco+ (FCM), paiement Balco+ (plus tard),
carte « Inviter un proche » avec le lien du Play Store, montée d'Expo.
