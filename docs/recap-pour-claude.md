# Balco : récapitulatif à coller au début d'une conversation avec Claude

*À jour au 6 octobre 2026. Copier tout le texte ci-dessous dans une nouvelle conversation.*

---

Bonjour Claude. Je travaille sur **Balco**, une application de jardinage sur balcon, en français. Voici le contexte pour m'aider.

## Qui je suis et comment m'aider

- Je suis le porteur du projet, **je ne suis pas développeur**. Réponds-moi en français, simplement, avec des étapes numérotées et les commandes exactes à copier.
- Je teste chaque étape sur mon téléphone Android avant de passer à la suivante.
- Ne me demande jamais de coller un secret (clé Expo, clé Anthropic, mot de passe) : je les tape moi-même.
- Le code est développé avec **Claude Code** (dans le dépôt GitHub `NLB44850/Balco`, branche `claude/eloquent-gates-g7xc6x`). Dans cette conversation, j'ai surtout besoin d'aide pour **réfléchir, décider et préparer** (idées, priorités, textes, plans), puis je transmets à Claude Code.

## L'application en bref

Balco dit chaque jour quoi faire pour chaque plante du balcon, selon la saison et la météo de ma ville.

- **4 onglets** : Aujourd'hui (la liste du jour à cocher), Balcon (mes plantes en cartes photo), Saisons (le calendrier à lire), Nora (l'assistante IA). « Moi » s'ouvre par l'avatar, « Observer » (analyse d'une photo) par le bouton appareil photo.
- **Style** : inspiré de Too Good To Go, Spotify, Uber et Airbnb. Trois règles : moins d'efforts, clarté visuelle, retour immédiat. Un seul vert (#1F7A4D), orange pour la chaleur et « à surveiller », bleu pour le gel. Police Onest. Fond « lumière du balcon » (ombres de feuillage selon l'heure et la météo).
- **Technique** : Expo SDK 54 / React Native (Android d'abord), serveur Node (Express, tRPC, MySQL), IA Claude d'Anthropic pour Nora et l'analyse des photos, météo Open-Meteo.
- **Offre** : gratuit (rappels du téléphone, calendrier, sauvegarde, 1 photo analysée et 5 questions à Nora par mois) ; **Balco+** payant plus tard (alertes gel et orage même application fermée, plusieurs appareils, 20 photos et 100 questions par mois, prix fondateur pour les 500 premiers). Le paiement n'est pas encore branché.

## Ce qui est fait (validé sur mon téléphone)

- **Rappels intelligents** : un geste par plante et par jour, selon la météo (pluie, gel, chaleur, vent, orage) ; « Fait », « Dans 3 h », « Pas aujourd'hui » ; notifications sur le téléphone.
- **Aujourd'hui** : une ligne à faire par plante (« Arrose le basilic » + comment vérifier) ; le geste suivant prend sa place une fois fait ; arrosages regroupés ; gestes pas urgents repliés ; **alertes météo en bandeau** en haut (« C'est fait » pour le gel, l'orage, le vent, la chaleur ; simple message pour la pluie, et l'eau économisée est comptée toute seule).
- **Saisons** : calendrier de 100 plantes vérifié auprès de semenciers, adapté au climat de la ville ; à lire (les gestes se font sur Aujourd'hui), montre ce qui est déjà fait ; suggestions « à semer ou planter ce mois-ci » et « Idée du mois ».
- **Nora** : connaît mes plantes, ma ville, la saison, mon historique ; se souvient de mes préférences et de ce que je lui dis (avec la date).
- **Observer** : photo d'une plante → nom, état de santé, gestes à faire, solution naturelle ; **une analyse offerte sans compte**.
- **Progression** : Ma semaine (gestes, récoltes, eau économisée), série de « jours suivis », badges, niveaux, carte « Sa progression » par plante ; fêtes en plein écran réservées aux grands moments (nouveau badge, 1ʳᵉ récolte d'une plante).
- **Mode vacances** : plan de départ, liste pour un proche qui arrose, rappels muets pendant l'absence.
- **Catalogue** : 100 plantes avec photos d'exemple libres de droits.
- **Coulisses** : budget IA mensuel avec pause automatique, sauvegarde du compte, protections contre les abus, tests automatiques (433 tests et 25 parcours complets).

## Ce qui reste à faire, dans l'ordre

1. **Revérifier sur le prochain APK** (version Android installée) : l'aperçu de la photo dans Observer (corrigé, pas encore revu), l'appareil photo depuis Aujourd'hui, les notifications.
2. **Améliorer l'onboarding** (l'accueil de première ouverture : prénom facultatif, une question par écran sur l'expérience, le soleil, la place et les envies, puis « Tes premières plantes » et « Créer mon balcon ») pour une meilleure expérience. **À cadrer d'abord** : ce qui gêne, ce qu'on veut obtenir.
3. **Après la récolte** des plantes qu'on récolte en une fois (radis, carottes, salades pommées) : proposer « Tout récolté ? » puis « Ressemer » ou « Libérer le pot ». À décider.
4. **Mémoire de Nora sur plusieurs jours** : test à faire sur 2 ou 3 jours.
5. **Tester sans Codespace** (idée) : une version web toujours en ligne et l'APK construit automatiquement.
6. **Avant la publication** (pas encore décidée) : notifications envoyées par le serveur (Firebase), paiement Balco+ (RevenueCat), mise à jour d'Expo, politique de confidentialité, fiche et compte Google Play.
7. **Version suivante** : suivi d'une plante en photos dans le temps, balcon visuel (plan, emplacement, exposition), récoltes et recettes, défis entre jardiniers.

## Décisions déjà prises (à ne pas remettre en question sans moi)

- Aujourd'hui garde **une ligne à faire par plante au plus**.
- Ordre des gestes : alerte météo, arrosage, récolte, plantation / semis / rempotage, engrais, entretien.
- Saisons est un calendrier **à lire**, on ne coche que sur Aujourd'hui.
- Fête en plein écran seulement pour un nouveau badge et la 1ʳᵉ récolte d'une plante, une fois par jour.
- Sans compte : une analyse photo par téléphone, trois par réseau et par jour.
- L'app **ne copie pas** les photos dans la galerie du téléphone.
- Un compte gratuit sauvegarde son balcon depuis un seul téléphone ; plusieurs appareils = Balco+.

## Comment je teste

- **Le plus rapide** : l'app web servie par mon Codespace GitHub, ouverte dans Chrome sur mon téléphone (simulation météo disponible dans Réglages).
- **La vraie app Android (APK)** : construite avec Expo (EAS), pour les notifications et l'appareil photo.

---

*Ma demande pour cette conversation :* (écrire ici)
