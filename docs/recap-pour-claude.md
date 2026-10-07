# Balco : récapitulatif à coller au début d'une conversation avec Claude

*À jour au 7 octobre 2026 (rempotage, 11 pas-à-pas, Nora et Saisons corrigés, tout validé et intégré à la version principale ; accords des textes et après-récolte livrés, à valider sur mon téléphone). Copier tout le texte sous
la ligne ci-dessous dans une nouvelle conversation sur claude.ai, puis y joindre les captures de `docs/captures/`
(liste et légendes dans `docs/captures/LISEZ-MOI.md`).*

---

Bonjour Claude. Je travaille sur **Balco**, une application de jardinage sur balcon, en français. Voici où en est le
projet. Je joins des captures d'écran des dernières nouveautés.

## Qui je suis et comment m'aider

- Je suis le porteur du projet, **je ne suis pas développeur**. Réponds-moi en français, simplement, avec des étapes numérotées.
- Je teste chaque étape sur mon téléphone Android avant de passer à la suivante.
- Ne me demande jamais de coller un secret (clé Expo, clé Anthropic, mot de passe) : je les tape moi-même.
- Le code est développé avec **Claude Code** (dépôt GitHub `NLB44850/Balco`, branche `claude/eloquent-gates-g7xc6x`).
  Ici, j'ai surtout besoin d'aide pour **réfléchir, décider et préparer** (idées, priorités, textes, plans), puis je
  transmets à Claude Code.

## L'application en bref

Balco dit chaque jour quoi faire pour chaque plante du balcon, selon la saison et la météo de ma ville.

- **4 onglets** : Aujourd'hui (la liste du jour à cocher), Balcon (mes plantes en cartes photo), Saisons (le calendrier,
  à lire), Nora (l'assistante IA). « Moi » s'ouvre par l'avatar, « Observer » (analyse d'une photo) par le bouton
  appareil photo.
- **Style** : inspiré de Too Good To Go, Spotify, Uber et Airbnb. Trois règles : **moins d'efforts, clarté visuelle,
  retour immédiat**. Un seul vert (#1F7A4D), orange pour la chaleur et « à surveiller », bleu pour le gel. Police Onest.
  Fond « lumière du balcon » (ombres de feuillage selon l'heure et la météo). Dessins au trait pour les pas-à-pas.
- **Technique** : Expo / React Native (Android d'abord), serveur Node (Express, tRPC, MySQL), IA Claude d'Anthropic
  pour Nora et l'analyse des photos, météo Open-Meteo.
- **Offre** : gratuit (rappels du téléphone, calendrier, sauvegarde, 1 photo analysée et 5 questions à Nora par mois) ;
  **Balco+** payant plus tard (alertes gel et orage même application fermée, plusieurs appareils, 20 photos et 100
  questions par mois, prix fondateur pour les 500 premiers). Le paiement n'est pas encore branché.

## Ce qui est fait et validé sur mon téléphone

- **Rappels intelligents** : un geste par plante et par jour selon la météo (pluie, gel, chaleur, vent, orage) ;
  « Fait », « Dans 3 h », « Pas aujourd'hui » ; notifications sur le téléphone.
- **Aujourd'hui** : une ligne à faire par plante (« Arrose le basilic » + comment vérifier) ; le geste suivant prend sa
  place une fois fait ; arrosages regroupés ; alertes météo en bandeau ; l'eau économisée grâce à la pluie est comptée.
- **Saisons** : calendrier de 100 plantes vérifié auprès de semenciers, adapté au climat de ma ville ; à lire (on coche
  sur Aujourd'hui) ; suggestions « à semer ou planter ce mois-ci » et « Idée du mois », qui changent chaque jour.
- **Nora** : connaît mes plantes, ma ville, la saison, mon historique ; se souvient de ce que je lui dis (avec la date).
- **Observer** : photo d'une plante → nom, état de santé, gestes à faire, solution naturelle ; une analyse sans compte.
- **Progression** : Ma semaine, série de « jours suivis », badges, niveaux, « Sa progression » par plante.
- **Mode vacances** : plan de départ, liste pour un proche qui arrose, rappels muets pendant l'absence.
- **Catalogue** : 100 plantes avec photos d'exemple libres de droits ; « Déjà sur mon balcon » ou « À planter ».
- **Accueil refait** (6 octobre) : plantes de saison seulement, dans le climat de ma ville ; « Tu as déjà des plantes ? » ;
  ville et rappels dans le parcours ; prénom demandé par Nora ; accueil d'hiver (rebord intérieur, envies du printemps
  rappelées en mars).
- **Coulisses** : budget IA mensuel avec pause automatique, protections contre les abus, tests automatiques
  (490 tests et 42 parcours complets dans un vrai navigateur).

## Ce qui vient d'être fait, validé et intégré à la version principale (6 et 7 octobre)

1. **Pas-à-pas illustrés, 11 en tout** (captures 03 à 06 et 08 à 10, 14). Toujours facultatifs : on touche un geste
   sur Aujourd'hui, puis « Pas à pas, avec ce qu'il te faut ». Chaque guide a trois parties : **Ce qu'il te faut**
   (« J'ai déjà », « Partager ce qui manque »), **une action par écran** avec un dessin (on glisse du doigt ; une seule
   « erreur à éviter » par guide), puis **Et après ?** avec un bouton qui coche le geste (« C'est planté »,
   « C'est rempoté », « C'est pincé »…).
   - Planter et semer : semer en pot, semer au chaud, planter un plant, planter un bulbe, installer une vivace en grand pot.
   - **Rempoter** et **changer la terre du dessus** (nouveaux).
   - **Éclaircir**, **pincer** (le bout des tiges, ou couper les fleurs, les stolons, une touffe), **sortir les plants
     semés au chaud** (nouveaux).
   - 26 dessins au trait, faits par Claude Code (vert Balco, légers, hors connexion).
2. **Rempotage selon le besoin** (captures 01, 02, 07) : jamais la première saison ; chaque vivace a son rythme, vérifié
   sur des sites de jardinage (menthe chaque année, thym tous les 2 à 4 ans, agrumes tous les 2 à 3 ans…) ; le geste dit
   **le signe à vérifier** (« Si l'eau traverse le pot sans mouiller la terre et que des racines sortent par le trou, rempote ton thym ») et **le pot à acheter**
   (« Si son pot fait environ 3 L, prends-en un d'environ 4 L (18 cm de large) », un tiers de plus à chaque fois) ;
   **« Pas besoin cette année »** le repousse à l'an prochain et propose à la place **« Change la terre du dessus »**
   (5 cm de terreau neuf). Correction au passage : un rempotage coché reste affiché coché au lieu de disparaître.
3. **Nora, réponse perdue en route** (capture 13) : une question restait parfois sans réponse (« Failed to execute
   'json'… ») alors que le serveur avait bien répondu ; c'était la connexion entre mon Codespace et mon téléphone. L'app
   va maintenant rechercher la réponse toute seule, sans la compter deux fois ; sinon un message clair et « Réessayer ».
4. **Saisons plus juste** (captures 11, 12) : en octobre, la carte climat dit « premières gelées vers mi-novembre » (et
   plus « dernières gelées en avril ») ; l'été « plus de gel à craindre avant l'automne ». Quand tout ce qui se sème ce
   mois-ci et convient à mon balcon y est déjà, l'app le dit, et le lien reste sur le mois affiché.

## La suite de la feuille de route, dans l'ordre

1. **Revérifier sur le prochain APK** (la vraie app Android) : l'aperçu de la photo dans Observer, l'appareil photo
   depuis Aujourd'hui, les notifications, la position et les rappels de l'accueil.
2. **Accords et après-récolte : livrés, à valider sur mon téléphone.**
   - Les textes s'accordent à chaque plante (« Garde-le » pour le thym, « Garde-la » pour la menthe, « Garde-les »
     pour les radis) : le catalogue connaît le genre et le nombre de chaque plante.
   - Plantes récoltées en une fois (radis, carottes, betteraves, navets, chou-rave, oignons botte, ail, pommes de
     terre, oca, crosnes, pak choï), chacune avec sa durée de récolte. Récolte cochée : « Radis récoltés : noté ·
     Tout récolté ? » avec « Oui ». Sans réponse, une fois cette durée passée (ou à la fin des mois de récolte),
     la ligne devient une seule fois « Tes radis sont-ils tous récoltés ? ». Après « Oui » : « Ton pot est libre »
     (ressemer ou replanter, une ou deux plantes de saison qui tiennent dans ce pot, laisser le pot vide ou au repos
     l'hiver). Les récoltes d'un pot vidé restent dans ma progression.
   - La laitue pommée est au catalogue (101 plantes), récoltée en une fois ; sa photo arrive bientôt.
   - Ensuite : la même chose pour la fin de saison des annuelles (basilic en octobre).
3. **Mémoire de Nora sur plusieurs jours** : test à faire sur 2 ou 3 jours.
4. **Tester sans Codespace** (idée) : une version web toujours en ligne et l'APK construit automatiquement.
5. **Avant la publication** (pas encore décidée) : notifications envoyées par le serveur (Firebase), paiement Balco+
   (RevenueCat), mise à jour d'Expo (54 → 57), politique de confidentialité, fiche et compte Google Play.
6. **Version suivante** : suivi d'une plante en photos dans le temps, balcon visuel (plan, emplacement, exposition),
   récoltes et recettes, défis entre jardiniers.

## Décisions déjà prises (à ne pas remettre en question sans moi)

- Aujourd'hui garde **une ligne à faire par plante au plus**.
- Ordre des gestes : alerte météo, arrosage, récolte, plantation / semis / rempotage, engrais, entretien.
- Saisons est un calendrier **à lire** ; on ne coche que sur Aujourd'hui.
- Les pas-à-pas sont **facultatifs** : le geste se coche toujours d'un toucher. Règles d'écriture : une action par
  écran, verbe en tête, moins de 12 mots, tutoiement, une ligne grise pour le « pourquoi », mesures concrètes, une
  seule erreur à éviter.
- Rempotage : jamais la première saison ; les autres années, la terre du dessus.
- Fête en plein écran seulement pour un nouveau badge et la 1ʳᵉ récolte d'une plante, une fois par jour.
- L'accueil ne propose que des plantes de saison ; prénom et expérience ne sont plus dans l'accueil.
- Sans compte : une analyse photo par téléphone, trois par réseau et par jour.
- L'app **ne copie pas** les photos dans la galerie du téléphone.
- Un compte gratuit sauvegarde son balcon depuis un seul téléphone ; plusieurs appareils = Balco+.

## Comment je teste

- **Le plus rapide** : l'app web servie par mon Codespace GitHub, ouverte dans Chrome sur mon téléphone (simulation
  météo disponible dans Réglages).
- **La vraie app Android (APK)** : construite avec Expo (EAS), pour les notifications, l'appareil photo et la position.

---

*Ma demande pour cette conversation :* (à compléter)
