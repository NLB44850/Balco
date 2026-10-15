# Balco : récapitulatif à coller au début d'une conversation avec Claude

*À jour au 15 octobre 2026 (tout est validé sur le téléphone et fusionné jusqu'à la PR #53 ; chantier « Plante hors saison » en cours ; l'app se met en ligne et se met à jour toute seule). Copier
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
- **Offre** : gratuit, sans limite de plantes (rappels du téléphone, calendrier, sauvegarde, 1 photo analysée et
  5 questions à Nora par mois) ; **Balco+** payant plus tard : alertes gel et orage même app fermée, coach d'arrosage,
  plusieurs téléphones, 20 photos et 100 questions par mois. Prix prévus : **29 € par an** (mis en avant, soit 2,42 € par
  mois) ou **4,99 € par mois**, 7 jours d'essai, pause possible, prix fondateur pour les 500 premiers. Le paiement n'est
  pas encore branché : on peut demander à être prévenu de l'ouverture, rien n'est prélevé.

## Ce qui est fait et validé sur mon téléphone

- **Rappels intelligents** selon la météo (pluie, gel, chaleur, vent, orage) ; « Fait », « Dans 3 h », « Pas aujourd'hui ».
- **Aujourd'hui** : une ligne à faire par plante ; **arrosages et récoltes regroupés** dès deux plantes (« Vérifie la terre
  de N plantes », « Récolte ce qui est prêt sur N plantes », une feuille pour cocher chaque plante) ; la récolte reste
  visible même si l'arrosage attend (terre encore humide) ; alertes météo en bandeau ; eau économisée comptée.
- **Saisons** : calendrier de 101 plantes vérifié auprès de semenciers, adapté au climat de ma ville ; suggestions du mois ;
  mêmes alertes qu'Aujourd'hui.
- **Nora** : connaît mes plantes, ma ville, mon historique ; se souvient de ce que je lui dis, **même sur plusieurs
  jours (validé le 14/10)** ; je règle comment elle me parle (simplement, avec des détails, en jardinier) ; elle ne
  parle que des plantes affichées sur mon téléphone.
- **Observer**, **progression** (Ma semaine, badges, niveaux), **mode vacances**, **catalogue** avec photos.
- **Accueil** : déjà des plantes ou pas, soleil (avec « Je ne sais pas »), espace, envies, ville, rappels, premières
  plantes de saison ; l'hiver, des **envies du printemps** reproposées en mars.
- **11 pas-à-pas illustrés** (semer, planter, rempoter, terre du dessus, éclaircir, pincer, sortir les plants).
- **Rempotage selon le besoin**, **accords des textes** (« Garde-le / Garde-la / Garde-les »).
- **Après la récolte** des plantes récoltées en une fois (« Tout récolté ? », puis « Ton pot est libre ») et **fin de
  saison des annuelles** (« Ta saison de basilic est finie ? », soir de gel, « Me le reproposer au printemps »).
- **Réglages refaits** (8 octobre) : une liste simple où chaque ligne montre sa valeur, la toucher ouvre une feuille du bas.
  - Mon balcon : ville, soleil, espace, envies, envies du printemps (qu'on peut retirer), diagnostic du balcon, poids
    des pots.
  - Rappels : mode vacances, interrupteur, heure (dont 8 h 30 le matin ; la plage calme s'ajuste si besoin), plage
    calme, plantes suivies (décocher coupe seulement les notifications), « Je ne reçois pas les rappels » (autorisation,
    économie de batterie, rappel test).
  - Toi : prénom, comment Nora te parle.
  - Compte : état de la sauvegarde (avec la raison d'un échec), Balco+ (un écran à part, « Me prévenir à l'ouverture »),
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

## Chantier terminé le 14 octobre : « Pots et balcon » (10 étapes, détail dans `docs/chantier-pots-et-balcon.md`)

Rendre Balco plus juste en tenant compte du pot de chaque plante et du balcon (soleil, poids), puis préparer Balco+.
Règles : rien d'obligatoire (« Je ne sais pas » partout), une ligne par plante au plus sur Aujourd'hui (regroupée dès deux
plantes), chaque valeur de jardinage vérifiée sur 2 sources, pas de nouveau module du téléphone sans me prévenir, aucune
marque citée, jamais de produit chimique, tout en centimètres (jamais de litres de pot à l'écran).

Toutes les étapes sont validées sur mon téléphone et fusionnées (PR #41 à #52) :
1. **Taille du pot** de chaque plante (5 choix dessinés), choisie d'office à l'ajout.
2. **Fiches « Spécial pot »** : profondeur, largeur, terreau, engrais ; « Pot trop petit » en dessin.
3. **Accueil enrichi** : simulateur de soleil (orientation, couvert, vis-à-vis), « Diagnostic de ton balcon », une ligne
   « Vérifie le pot de N plantes ». En plus : semis et plantations du mois regroupés dès deux plantes.
4. **Rappels d'engrais** tirés des fiches (« Arrose et nourris tes tomates », « Nourris 3 plantes ») ; fins de saison regroupées.
5. **Liste de courses** pour la jardinerie (pots, terreau avec le sac à prendre, billes d'argile, engrais), à cocher et partager.
6. **Arrosage selon le pot** (rythme, quantité « 💧 2 L » avec des bouteilles dessinées, balcon couvert), même format de
   détail pour tous les gestes ; puis **coach d'arrosage Balco+** (eau restante dans le pot, jauge dans la fiche) et
   interrupteur « Simuler Balco+ » dans la version de test.
7. **Consignes pour le voisin qui arrose** (mode vacances) : plante par plante, quantité et rythme, texte modifiable,
   envoyé par le partage du téléphone.
8. **« Que planter à la place ? »** quand un pot se libère (trois idées de saison qui tiennent dans le pot, jamais de la
   même famille, geste pour la terre) ; au catalogue, un seul « + » qui demande « Où en est ton aubergine ? », hors
   saison prévenu et gardé pour le printemps. Puis **traitement naturel dans Observer** : Observer reconnaît le problème
   (9 au choix : pucerons, cochenilles, araignées rouges, mouches blanches, oïdium, mildiou, limaces, chenilles,
   moucherons) et Balco affiche son propre traitement vérifié (gestes à la main d'abord, savon noir 1 cuillère à soupe
   par litre au plus, bicarbonate 5 g par litre, précautions, « Pas mieux dans 10 jours ? Montre-la en jardinerie »).
   Jamais de produit chimique, ni huile de neem, ni bouillie bordelaise.
9. **Poids des pots** (Réglages → Mon balcon) : une estimation comptée large (terreau mouillé 1 kg par litre, pot en
   terre cuite), pot par pot, avec « souvent 350 kg par m² pour un balcon récent » et le conseil de demander au syndic.
10. **Écran Balco+ refait** : les avantages, l'annuel mis en avant, l'essai, la pause, le prix fondateur, « Me prévenir à
    l'ouverture ». Il s'ouvre aussi par « Découvrir Balco+ › » à la 2ᵉ photo du mois, à la 6ᵉ question à Nora, le
    premier soir de gel (une seule fois, sous l'alerte) et depuis le coach d'arrosage.

## Chantier « Cohérence » (14 octobre, validé et fusionné)

Après un tour de toute l'app, les mêmes règles partout (détail dans `docs/chantier-coherence.md`) :
- **Boutons** : vert plein = l'action principale (une seule par écran), encadré = secondaire, texte vert suivi de « › » =
  aller voir, petite pastille dans une carte, rouge plein seulement pour l'irréversible. Plus aucun bouton noir.
- **Supprimer** : tout de suite, avec « Annuler » dans le message du bas (geste, photo, plante, souvenir de Nora,
  conversation, liste, mode vacances). Seule la suppression du compte demande une confirmation rouge.
- **Cases** : ronde = un geste fait, carrée = une option, rond avec un point = un seul choix ; même taille partout ; le même
  « × » et la même flèche de retour partout.
- **Textes des boutons à l'infinitif** (« Ajouter une photo ») ; le tutoiement reste pour les conseils (« Arrose le basilic »).
- Fiche plante refaite : historique sans « Supprimer » répété, « Son nom » et « Retirer du balcon » en lignes comme Réglages.

## Chantier en cours depuis le 15 octobre : « Plante hors saison » (5 étapes, détail dans `docs/chantier-plante-hors-saison.md`)

Un basilic ajouté en octobre affichait « Nouvelle · Rien à faire » : faux, il souffre dès que les nuits passent sous
10 °C et meurt au premier gel ; un thym, lui, n'a vraiment rien à faire. Le chantier avance une partie de « rentrer une
plante pour l'hiver ». Étapes : 1) données des 101 plantes (frileuse ou rustique, seuil de nuit, la rentrer vaut-elle
la peine : oui / quelques semaines / non) ; 2) un état juste dès l'ajout (« Fin de saison », « Au repos jusqu'en mars »,
en neutre) ; 3) le choix en trois réponses (« Tout récolter », « La rentrer à l'intérieur », « La laisser dehors ») ;
4) « Rentre ton basilic » quand une nuit sous le seuil est annoncée, état « À l'intérieur » (météo ignorée, arrosage
plus rare, pas d'engrais) ; 5) « Ressors ton basilic » au feu vert des Saints de glace. Tout en neutre, jamais d'orange.
Étape 1 validée le 15/10 (36 frileuses, sources dans `docs/sources-froid.md`). Étape 2 validée le 15/10 : un
basilic en octobre dit « Fin de saison », une menthe en novembre « Au repos jusqu'en mars », un citronnier « À rentrer
avant l'hiver », en gris, sur le Balcon, la fiche, Aujourd'hui et au catalogue. Étape 3 codée le 15/10, à valider :
« Ton basilic n'aime pas le froid. Que veux-tu faire ? » sur la fiche (tout récolter avec une astuce de conservation
vérifiée, le rentrer, le laisser dehors) ; sur Aujourd'hui « Décide pour ton basilic avant le froid » le premier jour,
puis seulement quand une nuit froide est annoncée (« Prépare 3 plantes pour le froid » dès deux plantes) ; le choix
est gardé dans la sauvegarde du compte.

## Ce qu'il reste à faire, dans l'ordre

1. **Sainte-Catherine en vrai** : le 18 novembre, la notification (à l'heure de mes rappels) et la grande carte sans
   date simulée ; le bilan le 1er décembre.
2. **Faire tester par 3 à 5 personnes** avant de brancher le paiement (l'adresse Railway et l'APK de test le
   permettent déjà ; ensuite piste de « test interne » du Play Store).
3. **Avant la publication** :
   - notifications envoyées par le serveur (Firebase), pour les alertes même app fermée ;
   - synchroniser avec le serveur les « Dans 3 h », les réponses « Tout récolté ? » / « Ta saison est finie ? »
     et les photos des plantes ;
   - paiement Balco+ (RevenueCat), puis un seul e-mail aux inscrits de « Me prévenir à l'ouverture », et effacer la liste ;
   - mise à jour d'Expo (SDK 54 → 57) ;
   - page Confidentialité (compte, position, photos, questions à Nora, e-mail laissé pour Balco+) ;
   - un nom de domaine : adresse de contact (aujourd'hui contact_balco@gmail.com) et expéditeur des e-mails reconnu par
     Brevo (avec une adresse Outlook ou Gmail, les codes peuvent arriver dans les indésirables) ;
   - compte développeur Google et fiche Play Store ; offre payante d'Open-Meteo dès que Balco+ sera payant.
   - afficher le montant du prix fondateur sur l'écran Balco+ (montant à décider avec le porteur).
4. **Version suivante** : suivi d'une plante en photos, balcon visuel (plan, emplacement, exposition), récoltes et
   recettes, défis entre jardiniers, rentrer une plante pour l'hiver (piment, poivron, physalis ; en partie avancé par le chantier « Plante hors saison »).

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
- Chaque valeur de jardinage est vérifiée sur deux sources au moins (sources dans `docs/sources-*.md`) ; aucune marque ;
  jamais de produit chimique ; tout en centimètres à l'écran (sauf l'eau à verser, en litres).
- Le traitement affiché par Observer est écrit par Balco, jamais inventé par l'IA ; dans le doute, la jardinerie.
- Balco ne dit jamais « danger » pour le poids : il ne connaît ni la surface ni l'état du balcon.
- Balco+ ne bloque rien de ce qui est gratuit ; pas de limite de plantes ; il se propose à 4 moments seulement.

---

*Ma demande pour cette conversation :* (à écrire ici)
