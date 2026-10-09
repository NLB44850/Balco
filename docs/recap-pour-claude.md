# Balco : récapitulatif à coller au début d'une conversation avec Claude

*À jour au 9 octobre 2026 (Réglages validés ; chantier « une app vivante toute l'année » validé sur le téléphone le 9 octobre). Copier
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
- **Aujourd'hui** : une ligne à faire par plante ; arrosages regroupés ; alertes météo en bandeau ; eau économisée comptée.
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

## Validé sur mon téléphone le 9 octobre : « une app vivante toute l'année »

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
- **Badges** : ceux obtenus restent acquis pour de bon (avec leur date, dans la sauvegarde du compte) ; 8 badges à
  paliers Graine / Pousse / Fleur ; 4 badges par saison avec millésime ; un herbier (une carte par plante récoltée ou
  fleurie la première fois, « Elle a fleuri ? » sur la fiche des fleurs) ; Moi refait (« Presque là », la saison,
  l'herbier, tous les badges).

## Ce qu'il reste à faire, dans l'ordre

1. **Fusionner « une app vivante toute l'année » dans `main`** (PR depuis la branche `ccr-71709eb8-bxzttf`).
2. **Vérifier sur la vraie app Android (APK)**, pas revue depuis le 6 octobre : photo dans Observer, appareil photo
   depuis Aujourd'hui, notifications (heure, plage calme, « Je ne reçois pas les rappels », économie de batterie,
   rappel test, notification d'un temps fort : la date simulée ne les déclenche pas), Balcon à deux cartes par
   ligne, question des rappels et de la position dans l'accueil.
3. **Sainte-Catherine en vrai** : regarder la carte le 18 novembre (sans date simulée), le bilan le 1er décembre.
4. **Mémoire de Nora sur plusieurs jours** : test sur 2 ou 3 jours, retour à donner.
5. **Faire tester par 3 à 5 personnes** avant de brancher le paiement (piste de « test interne » du Play Store).
6. **Tester sans Codespace** (proposé) : version web en ligne qui se met à jour seule, APK construit par GitHub.
7. **Avant la publication** :
   - notifications envoyées par le serveur (Firebase), pour les alertes même app fermée ;
   - synchroniser avec le serveur les « Dans 3 h », les réponses « Tout récolté ? » / « Ta saison est finie ? »
     et les photos des plantes ;
   - paiement Balco+ (RevenueCat), puis un seul e-mail aux inscrits de « Me prévenir à l'ouverture », et effacer la liste ;
   - mise à jour d'Expo (SDK 54 → 57) ;
   - page Confidentialité (compte, position, photos, questions à Nora, e-mail laissé pour Balco+) ;
   - adresse de contact sur mon nom de domaine (aujourd'hui contact_balco@gmail.com) ;
   - compte développeur Google et fiche Play Store ; offre payante d'Open-Meteo dès que Balco+ sera payant.
8. **Version suivante** : suivi d'une plante en photos, balcon visuel (plan, emplacement, exposition), récoltes et
   recettes, défis entre jardiniers, rentrer une plante pour l'hiver (piment, poivron, physalis).

## Décisions déjà prises (à ne pas remettre en question sans moi)

- Aujourd'hui garde **une ligne à faire par plante au plus** ; Saisons est **à lire**, on coche sur Aujourd'hui.
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
