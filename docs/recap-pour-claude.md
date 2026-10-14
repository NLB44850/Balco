# Balco : récapitulatif à coller au début d'une conversation avec Claude

*À jour au 14 octobre 2026 (tout est validé sur le téléphone ; dernière demande de fusion, PR #43, à fusionner ; l'app se met en ligne et se met à jour toute seule). Copier
tout le texte sous la ligne ci-dessous dans une nouvelle conversation sur claude.ai, et y joindre au besoin les
captures de `docs/captures/`.*

---

Bonjour Claude. Je travaille sur **Balco**, une application de jardinage sur balcon, en français. Voici où en est le
projet et ce qu'il reste à faire.

## Qui je suis et comment m'aider

- Je suis le porteur du projet, **je ne suis pas développeur**. Réponds-moi en français, simplement, avec des étapes numérotées.
- Je teste chaque étape sur mon téléphone Android avant de passer à la suivante.
- Ne me demande jamais de coller un secret (clé Expo, clé Anthropic, mot de passe) : je les tape moi-même.
- Le code est développé avec **Claude Code** (dépôt GitHub `NLB44850/Balco`). Ici, j'ai surtout besoin d'aide pour
  **réfléchir, décider et préparer** (idées, priorités, textes, plans), puis je transmets à Claude Code.

## Comment je teste (en place depuis le 9 octobre, plus besoin du Codespace)

- **Serveur, app web et base de données sur Railway** (environ 5 $ par mois) : à chaque fusion dans `main`, Railway se met
  à jour tout seul. J'ouvre l'adresse Railway dans Chrome pour la version web (avec simulation météo et date simulée).
- **E-mails des codes de connexion** envoyés par Brevo (gratuit, par son API : Railway bloque l'envoi classique).
- **APK de test** construit par un bouton sur GitHub (onglet Actions → « Construire l'APK de test »), à installer à la
  main seulement quand l'app change de version (nouvelle fonction du téléphone).
- **Mises à jour sans réinstaller** : à chaque fusion dans `main`, GitHub envoie le nouveau code ; en rouvrant Balco,
  « Nouvelle version de Balco… Redémarrer ». Testé et validé le 11 octobre. Réglages affiche la date de la mise à jour.
- **Rappels météo du serveur** lancés par GitHub chaque heure. Pas-à-pas complet : `docs/deploiement-railway.md`.

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
  **Balco+** payant plus tard (alertes gel et orage même app fermée, plusieurs téléphones, 20 photos et 100 questions
  par mois, prix fondateur pour les 500 premiers). Le paiement n'est pas encore branché (« Bientôt »), mais on peut
  déjà demander à être prévenu de l'ouverture.

## Ce qui est fait et validé sur mon téléphone

- **Rappels intelligents** selon la météo (pluie, gel, chaleur, vent, orage) ; « Fait », « Dans 3 h », « Pas aujourd'hui ».
- **Aujourd'hui** : une ligne à faire par plante ; **arrosages et récoltes regroupés** dès deux plantes (« Vérifie la terre
  de N plantes », « Récolte ce qui est prêt sur N plantes », une feuille pour cocher chaque plante) ; la récolte reste
  visible même si l'arrosage attend (terre encore humide) ; alertes météo en bandeau ; eau économisée comptée.
- **Saisons** : calendrier de 101 plantes vérifié auprès de semenciers, adapté au climat de ma ville ; suggestions du mois ;
  mêmes alertes qu'Aujourd'hui.
- **Nora** : connaît mes plantes, ma ville, mon historique ; se souvient de ce que je lui dis ; je règle comment elle
  me parle (simplement, avec des détails, en jardinier).
- **Observer**, **progression** (Ma semaine, badges, niveaux), **mode vacances**, **catalogue** avec photos.
- **Accueil** : déjà des plantes ou pas, soleil (avec « Je ne sais pas »), espace, envies, ville, rappels, premières
  plantes de saison ; l'hiver, des **envies du printemps** reproposées en mars.
- **11 pas-à-pas illustrés** (semer, planter, rempoter, terre du dessus, éclaircir, pincer, sortir les plants).
- **Rempotage selon le besoin**, **accords des textes** (« Garde-le / Garde-la / Garde-les »).
- **Après la récolte** des plantes récoltées en une fois (« Tout récolté ? », puis « Ton pot est libre ») et **fin de
  saison des annuelles** (« Ta saison de basilic est finie ? », soir de gel, « Me le reproposer au printemps »).
- **Réglages refaits** (8 octobre) : une liste simple où chaque ligne montre sa valeur, la toucher ouvre une feuille du bas.
  - Mon balcon : ville, soleil, espace, envies, envies du printemps (qu'on peut retirer).
  - Rappels : mode vacances, interrupteur, heure (dont 8 h 30 le matin ; la plage calme s'ajuste si besoin), plage
    calme, plantes suivies (décocher coupe seulement les notifications), « Je ne reçois pas les rappels » (autorisation,
    économie de batterie, rappel test).
  - Toi : prénom, comment Nora te parle.
  - Compte : état de la sauvegarde, Balco+ avec « Me prévenir à l'ouverture » (compte, ou e-mail sans compte),
    « Supprimer mon compte » (efface le compte sur le serveur, garde le balcon sur le téléphone).
  - À propos : donner mon avis (e-mail), confidentialité (bientôt), crédits photos, version.

## Validé le 9 octobre : « une app vivante toute l'année »

D'après le brief écrit avec toi (plan et réponses validés, détail dans `docs/chantier-toute-l-annee.md`) :
- **Date simulée** dans Réglages → Version de test, pour tout essayer sans attendre (n'existe pas dans l'app publiée).
- **Aujourd'hui toute l'année** : « Ton balcon se repose » quand il n'y a rien à faire ; au plus 2 cartes en plus
  (événement > à anticiper > astuce > Idée du mois) ; « À anticiper » annonce 3 à 6 semaines avant ce qu'il faut
  préparer (godets, terreau, pot plus grand) ; « Astuce de la semaine » tirée de 99 astuces vérifiées sur deux sources.
- **La Sainte-Catherine** (18-30 novembre) : carte, page « Ce qui se plante maintenant » (petits fruits, ail, violas,
  pas de fraisiers), « Paille tes pots » avec « C'est fait », « Demander à Nora », notification le 18, badge
  « Sainte-Catherine · 2026 », bilan le 1er décembre. Version climat froid (protection d'abord).
- **Trois autres temps forts** : Prépare ton printemps (12-31 janvier, plantes à garder pour le printemps), les Saints
  de glace (4-20 mai, compte à rebours puis feu vert selon la météo de ma ville), Balcon en vacances (1-15 juillet,
  paillage et mode vacances). Chacun a son badge avec millésime.
- **Grande carte d'arrivée** (ajoutée et validée le 9 octobre) : à la première ouverture pendant un temps fort, une carte
  en plein écran avec des feuilles, flocons ou soleils qui tombent, la citation et un bouton vers la page ; une fois par
  temps fort, puis la petite carte reste sur Aujourd'hui.
- **Badges** : ceux obtenus restent acquis pour de bon (avec leur date, dans la sauvegarde du compte) ; 8 badges à
  paliers Graine / Pousse / Fleur ; 4 badges par saison avec millésime ; un herbier (une carte par plante récoltée ou
  fleurie la première fois, « Elle a fleuri ? » sur la fiche des fleurs) ; Moi refait (« Presque là », la saison,
  l'herbier, tous les badges).

## Corrigé après mes tests de l'APK (9 au 11 octobre, validé)

- La feuille du bas remonte au-dessus du clavier (prénom, ville) ; « Se déconnecter » ne dépasse plus ; « Comment Nora te
  parle » bien aligné ; l'aperçu de la photo s'affiche dans Observer (galerie et appareil photo depuis Aujourd'hui).

## Chantier en cours : « Pots et balcon » (plan validé le 11 octobre, détail dans `docs/chantier-pots-et-balcon.md`)

Rendre Balco plus juste en tenant compte du pot de chaque plante et du balcon (soleil, poids), puis préparer Balco+.
Règles : rien d'obligatoire (« Je ne sais pas » partout), une ligne par plante au plus sur Aujourd'hui (regroupée dès deux
plantes), chaque valeur de jardinage vérifiée sur 2 sources, pas de nouveau module du téléphone sans me prévenir, aucune
marque citée, jamais de produit chimique, tout en centimètres (jamais de litres de pot à l'écran).

- **Fait et validé** :
  - étape 1, taille du pot de chaque plante (5 choix dessinés), choisie d'office par Balco à l'ajout ;
  - étape 2, fiches « Spécial pot » (profondeur, largeur, terreau, engrais ; « Pot trop petit » en dessin) ;
  - étape 3, accueil enrichi : simulateur de soleil (orientation, couvert, vis-à-vis → heures de soleil), « Diagnostic de
    ton balcon », et une ligne « Vérifie le pot de N plantes » après l'accueil (détail dans une feuille du bas) ;
  - en plus (14/10) : sur Aujourd'hui, semis et plantations du mois regroupés dès deux plantes
    (« Plante ou sème 7 plantes de saison »), PR #43 ;
  - étape 4, rappels d'engrais tirés des fiches (« Arrose et nourris tes tomates », « Nourris 3 plantes », notification),
    et fins de saison regroupées (« Fais le point sur N plantes en fin de saison »), PR #44 ;
  - étape 5, liste de courses pour la jardinerie (pots, terreau en litres avec le sac à prendre, billes d'argile,
    godets, engrais par famille ; on coche en magasin, partage par SMS ou WhatsApp), PR #46 ;
  - étape 6a, arrosage selon la taille du pot (rythme, quantité « 💧 2 L » avec des bouteilles dessinées, balcon couvert
    sans « N'arrose pas »), et le même format de détail pour tous les gestes (un repère en grand, des gestes courts avec
    icône), PR #47 ;
  - étape 6b, coach d'arrosage Balco+ (eau restante dans le pot selon la chaleur, le soleil du balcon, le vent, le pot ;
    carte avec jauge dans la fiche) et interrupteur « Simuler Balco+ » dans la version de test, PR #48.
- Depuis le 12/10, chaque demande de fusion vers `main` publie toute seule la mise à jour de l'app pour la tester.
- Étape 7, consignes pour le voisin qui arrose, validée et fusionnée (PR #49) (mode vacances → « Oui,
  un proche passera » → « Prépare les consignes pour qui arrose » : quand passer, plante par plante la quantité et le
  rythme selon le pot et la saison, « chaque jour s'il fait plus de 30 °C », balcon couvert, quoi récolter ; texte
  modifiable, gardé sur le téléphone, « Préparé avec Balco » à décocher, envoi par le partage du téléphone).
- **Étape 8a, « Que planter à la place ? » : validée et fusionnée (PR #50, 14/10).** Quand un pot se libère
  (« Ton pot est libre »), trois idées de saison qui tiennent dans ce pot, jamais de la même famille que la plante
  d'avant (mêmes maladies dans la terre), les plantes sobres d'abord après une gourmande, avec le geste pour la terre ;
  la nouvelle plante garde la taille du pot. Ensuite 8b, le traitement naturel dans les réponses d'Observer.
- **Chantier « Cohérence » (14/10, avant la 8b)** : les mêmes boutons partout (vert plein = action principale, encadré =
  secondaire, lien vert « › », plus de bouton noir), une seule façon de supprimer (avec « Annuler »), cases et « × »
  identiques, boutons à l'infinitif. Livraison 1 (les boutons) validée ; 2 (suppression avec « Annuler », fiche plante refaite) validée, petits bugs corrigés, fusionnée (PR #50) ; 3 (cases rondes pour un geste fait, carrées pour une option, même « × » et même flèche de retour, boutons à l'infinitif) validée le 14/10.
- **Étape 8b, traitement naturel dans Observer : validée et fusionnée (PR #51, 14/10).** Observer reconnaît le problème (pucerons, oïdium…) et Balco affiche son propre traitement vérifié : gestes à la main d'abord, recette simple (savon noir 1 cuillère à soupe par litre au plus), précautions, « Pas mieux dans 10 jours ? Montre-la en jardinerie. » Jamais de produit chimique.
- **Étape 9, calculateur de poids : validée le 14/10.** Réglages → Mon balcon → « Poids de tes pots » : une estimation comptée large (terreau mouillé 1 kg par litre, pot en terre cuite), pot par pot, avec le repère « souvent 350 kg par m² » et le conseil de demander au syndic.
- **Étape 10, écran Balco+ : codée le 14/10, à valider.** Un écran à part : les avantages, l'annuel mis en avant (29 € par an, soit 2,42 € par mois, contre 4,99 € par mois), 7 jours d'essai, pause, prix fondateur, « Me prévenir à l'ouverture » (rien n'est prélevé). Il s'ouvre aussi à la 2ᵉ photo du mois, à la 6ᵉ question à Nora, le premier soir de gel et depuis le coach d'arrosage.

## Ce qu'il reste à faire, dans l'ordre

1. **Sainte-Catherine en vrai** : le 18 novembre, la notification (à l'heure de mes rappels) et la grande carte sans
   date simulée ; le bilan le 1er décembre.
2. **Mémoire de Nora sur plusieurs jours** : test sur 2 ou 3 jours, retour à donner.
3. **Faire tester par 3 à 5 personnes** avant de brancher le paiement (l'adresse Railway et l'APK de test le
   permettent déjà ; ensuite piste de « test interne » du Play Store).
4. **Avant la publication** :
   - notifications envoyées par le serveur (Firebase), pour les alertes même app fermée ;
   - synchroniser avec le serveur les « Dans 3 h », les réponses « Tout récolté ? » / « Ta saison est finie ? »
     et les photos des plantes ;
   - paiement Balco+ (RevenueCat), puis un seul e-mail aux inscrits de « Me prévenir à l'ouverture », et effacer la liste ;
   - mise à jour d'Expo (SDK 54 → 57) ;
   - page Confidentialité (compte, position, photos, questions à Nora, e-mail laissé pour Balco+) ;
   - un nom de domaine : adresse de contact (aujourd'hui contact_balco@gmail.com) et expéditeur des e-mails reconnu par
     Brevo (avec une adresse Outlook ou Gmail, les codes peuvent arriver dans les indésirables) ;
   - compte développeur Google et fiche Play Store ; offre payante d'Open-Meteo dès que Balco+ sera payant.
5. **Version suivante** : suivi d'une plante en photos, balcon visuel (plan, emplacement, exposition), récoltes et
   recettes, défis entre jardiniers, rentrer une plante pour l'hiver (piment, poivron, physalis).

## Décisions déjà prises (à ne pas remettre en question sans moi)

- Aujourd'hui garde **une ligne à faire par plante au plus** (sauf la récolte, visible même si l'arrosage attend ; arrosages et
  récoltes, semis et plantations sont regroupés dès deux plantes) ; Saisons est **à lire**, on coche sur Aujourd'hui.
- Les pas-à-pas sont **facultatifs** ; règles d'écriture : une action par écran, verbe en tête, moins de 12 mots, tutoiement.
- L'accueil ne propose que des plantes de saison ; prénom et niveau de Nora ne sont plus dans l'accueil (on les règle
  dans Réglages ou dans Nora).
- Fête en plein écran seulement pour un nouveau badge et la 1ʳᵉ récolte d'une plante, une fois par jour.
- Un mois de semis ne change que si deux semenciers au moins le confirment.
- L'app ne copie pas les photos dans la galerie ; un compte gratuit sauvegarde depuis un seul téléphone.
- Décocher une plante dans « Plantes suivies » ne coupe que ses notifications ; supprimer son compte garde le balcon
  sur le téléphone.

---

*Ma demande pour cette conversation :* (à écrire ici)
