# Balco : récapitulatif à coller au début d'une conversation avec Claude

*À jour au 8 octobre 2026 (accords des textes, après-récolte, laitue pommée, fin de saison des annuelles et
correction Saisons validés ; demande en cours : revoir l'écran Réglages). Copier tout le texte sous la ligne
ci-dessous dans une nouvelle conversation sur claude.ai, et y joindre au besoin les captures de `docs/captures/`.*

---

Bonjour Claude. Je travaille sur **Balco**, une application de jardinage sur balcon, en français. Voici où en est le
projet, puis ma demande pour cette conversation.

## Qui je suis et comment m'aider

- Je suis le porteur du projet, **je ne suis pas développeur**. Réponds-moi en français, simplement, avec des étapes numérotées.
- Je teste chaque étape sur mon téléphone Android avant de passer à la suivante.
- Ne me demande jamais de coller un secret (clé Expo, clé Anthropic, mot de passe) : je les tape moi-même.
- Le code est développé avec **Claude Code** (dépôt GitHub `NLB44850/Balco`). Ici, j'ai surtout besoin d'aide pour
  **réfléchir, décider et préparer** (idées, priorités, textes, plans), puis je transmets à Claude Code.

## L'application en bref

Balco dit chaque jour quoi faire pour chaque plante du balcon, selon la saison et la météo de ma ville.

- **4 onglets** : Aujourd'hui (la liste du jour à cocher), Balcon (mes plantes en cartes photo), Saisons (le calendrier,
  à lire), Nora (l'assistante IA). « Moi » s'ouvre par l'avatar (avec une roue crantée vers **Réglages**), « Observer »
  (analyse d'une photo) par le bouton appareil photo.
- **Style** : inspiré de Too Good To Go, Spotify, Uber et Airbnb. Trois règles : **moins d'efforts, clarté visuelle,
  retour immédiat**. Un seul vert (#1F7A4D), orange pour la chaleur et « à surveiller », bleu pour le gel. Police Onest.
  Fond « lumière du balcon ». Feuilles qui montent du bas pour les détails et les choix.
- **Technique** : Expo / React Native (Android d'abord), serveur Node (Express, tRPC, MySQL), IA Claude d'Anthropic
  pour Nora et l'analyse des photos, météo Open-Meteo.
- **Offre** : gratuit (rappels du téléphone, calendrier, sauvegarde, 1 photo analysée et 5 questions à Nora par mois) ;
  **Balco+** payant plus tard (alertes même application fermée, plusieurs appareils, 20 photos et 100 questions par
  mois, prix fondateur pour les 500 premiers). Le paiement n'est pas encore branché (« Bientôt »).

## Ce qui est fait et validé sur mon téléphone

- **Rappels intelligents** selon la météo (pluie, gel, chaleur, vent, orage) ; « Fait », « Dans 3 h », « Pas aujourd'hui ».
- **Aujourd'hui** : une ligne à faire par plante ; arrosages regroupés ; alertes météo en bandeau ; eau économisée comptée.
- **Saisons** : calendrier de 101 plantes vérifié auprès de semenciers, adapté au climat de ma ville ; suggestions du mois.
- **Nora** : connaît mes plantes, ma ville, mon historique ; se souvient de ce que je lui dis ; a un « niveau »
  (Je débute / Je me lance / J'ai déjà un potager) réglable dans sa carte « Nora se souvient de toi ».
- **Observer**, **progression** (Ma semaine, badges, niveaux), **mode vacances**, **catalogue** avec photos.
- **Accueil refait** (6 octobre) : « Tu as déjà des plantes ? », soleil (avec « Je ne sais pas »), espace, envies,
  ville, rappels, premières plantes de saison. **Plus de question « expérience »** ; le prénom est demandé par Nora.
  L'hiver, l'accueil garde des **envies du printemps**, reproposées en mars.
- **11 pas-à-pas illustrés** (semer, planter, rempoter, terre du dessus, éclaircir, pincer, sortir les plants).
- **Rempotage selon le besoin** (signe à vérifier, pot suivant, « Pas besoin cette année »).

## Ce qui vient d'être fait, validé et intégré (7 et 8 octobre)

1. **Accords des textes** : chaque plante connaît son genre et son nombre (« Garde-le » pour le thym, « Garde-la » pour
   la menthe, « Garde-les » pour les radis).
2. **Après la récolte** des plantes récoltées en une fois (radis, carottes, betteraves, navets, chou-rave, oignons
   botte, ail, pommes de terre, oca, pak choï, laitue pommée) : « Radis récoltés : noté · Tout récolté ? » avec « Oui » ;
   sans réponse, la ligne devient une fois « Tes radis sont-ils tous récoltés ? ». Puis **« Ton pot est libre »** :
   ressemer ou replanter, une ou deux plantes de saison qui tiennent dans ce pot, ou laisser le pot vide (au repos
   l'hiver). Les récoltes restent dans ma progression.
3. **Fin de saison des annuelles** (basilic, tomates, cosmos… 52 plantes) : « Ta saison de basilic est finie ? » à la fin
   de ses mois de récolte (une relance deux semaines plus tard, puis plus jamais). Pour les frileuses, le soir de gel :
   « Récolte tout ton basilic avant cette nuit », et la question le lendemain. La feuille « Ton pot est libre » donne
   un conseil et propose **« Me le reproposer au printemps »** (cochée d'office, ajoute la plante aux envies du printemps).
4. **Laitue pommée** ajoutée (101 plantes), et mois de semis revus avec au moins deux semenciers.
5. **Correction** : une alerte météo traitée sur Aujourd'hui disparaît aussi de Saisons.

## La suite de la feuille de route

1. **Revoir l'écran Réglages** (ma demande ci-dessous).
2. **Revérifier sur la vraie app Android (APK)** : photo dans Observer, appareil photo, notifications, Balcon.
3. Mémoire de Nora sur plusieurs jours ; tester sans Codespace (version web en ligne, APK construit automatiquement).
4. **Avant la publication** : notifications envoyées par le serveur, paiement Balco+, mise à jour d'Expo, politique de
   confidentialité, fiche Google Play ; synchroniser avec le serveur les réponses « Tout récolté ? » et « Ta saison est finie ? ».
5. **Version suivante** : suivi d'une plante en photos, balcon visuel, récoltes et recettes, défis entre jardiniers,
   rentrer une plante pour l'hiver (piment, poivron, physalis).

## Décisions déjà prises (à ne pas remettre en question sans moi)

- Aujourd'hui garde **une ligne à faire par plante au plus** ; Saisons est **à lire**, on coche sur Aujourd'hui.
- Les pas-à-pas sont **facultatifs** ; règles d'écriture : une action par écran, verbe en tête, moins de 12 mots, tutoiement.
- L'accueil ne propose que des plantes de saison ; **prénom et expérience ne sont plus dans l'accueil** ; le prénom reste
  modifiable dans Réglages.
- Fête en plein écran seulement pour un nouveau badge et la 1ʳᵉ récolte d'une plante, une fois par jour.
- Un mois de semis ne change que si deux semenciers au moins le confirment.
- L'app ne copie pas les photos dans la galerie ; un compte gratuit sauvegarde depuis un seul téléphone.

## L'écran Réglages aujourd'hui (ce qui ne va pas)

On l'ouvre par Moi → roue crantée. Il contient, dans cet ordre, tout déplié :

- **Toi** : prénom (champ + « OK ») et « Ton expérience » en pastilles.
- **Mon balcon** : ville, soleil, espace, envies (en pastilles qui reprennent les longues phrases de l'accueil, par
  exemple « Le soleil tape presque toute la journée »), puis « Gérer mes plantes » et « Crédits photos ».
- **Rappels** : « Mode vacances » (carte à part), interrupteur, « Envoyer une notification de test », heure du rappel
  (17 h 30, 18 h 30 ou 19 h 30), plage calme (début 20-22 h, fin 7-9 h), liste des plantes concernées.
- **Sauvegarde et compte** : état de la sauvegarde, liste des avantages gratuits et Balco+ (« Bientôt »), boutons
  Synchroniser / Se déconnecter, « Supprimer mon compte ».
- **Version de test** (pas dans l'app publiée) : simulation météo, « Refaire l'accueil », « Illustrations du pas-à-pas ».

Les défauts relevés :

1. **Pas à jour avec l'accueil** : « Ton expérience » est toujours là alors que l'accueil ne la demande plus, et fait
   doublon avec le niveau de Nora ; le soleil n'a pas « Je ne sais pas » ; les **envies du printemps** ne se voient
   nulle part et ne s'enlèvent pas.
2. **Brouillon** : de longues phrases en pastilles serrées ; tout est déplié d'un coup (réglages des rappels, liste des
   plantes, avantages Balco+…).
3. **Mal rangé** : « Crédits photos » et « Gérer mes plantes » dans « Mon balcon » ; la notification de test au milieu
   des vrais réglages ; « Mode vacances » à part au-dessus des rappels.

## La proposition de Claude Code

Une liste simple où chaque ligne montre sa valeur actuelle ; la toucher ouvre une feuille du bas avec les **mêmes choix
et les mêmes phrases que l'accueil**.

1. **Mon balcon** : Ville › « Lyon » ; Soleil › « Le matin ou l'après-midi » ; Espace › « Un petit balcon » ;
   Envies › « Tomates cerises, salades » ; Envies du printemps › « Basilic » (on peut les retirer).
2. **Rappels** : interrupteur ; Heure › « 18 h 30 » ; Plage calme › « 21 h → 8 h » ; Plantes suivies › « Toutes »
   (sans les plantes « à planter » ni les pots libres, qui n'ont pas de rappel) ; Mode vacances ›.
3. **Toi** : Prénom › ; Comment Nora te parle › (le même niveau que dans la carte de Nora, une seule valeur).
4. **Compte** : une ligne d'état (« Sauvegardé aujourd'hui à 14 h 05 »), un seul bouton, Balco+ › (avantages dans une
   feuille), « Supprimer mon compte » tout en bas.
5. **À propos** : Crédits photos ›.
6. **Version de test** : simulation météo, notification de test, refaire l'accueil, illustrations.

Étapes prévues : (1) Mon balcon et Toi, (2) Rappels, (3) Compte, À propos, Version de test, (4) vérifications puis test
sur mon téléphone.

Questions posées par Claude Code :

1. Retirer « Gérer mes plantes » (l'onglet Balcon fait déjà ce travail) ?
2. Garder le niveau dans Réglages sous « Comment Nora te parle », relié à celui de la carte de Nora, ou le laisser
   seulement dans Nora ?
3. Ajouter un créneau de rappel le matin (8 h 30) en plus de 17 h 30, 18 h 30 et 19 h 30 ?
4. Ranger les avantages Balco+ (encore « Bientôt ») dans une feuille « Balco+ › » au lieu de les afficher en entier ?

---

*Ma demande pour cette conversation :* aide-moi à revoir l'écran Réglages. Dis-moi ce que tu penses de la proposition
ci-dessus (ordre des sections, ce qui doit rester, ce qui peut partir ou être déplacé), aide-moi à répondre aux quatre
questions, et propose les textes exacts de chaque ligne et de chaque feuille du bas (titres, valeurs affichées, phrases
d'explication), dans le style de l'app : court, tutoiement, sans majuscules décoratives.
