# Feuille de route Balco

> Positionnement : **une application qui ne demande pas à l'utilisateur de devenir jardinier, mais qui lui indique simplement quoi faire, au bon moment, pour ses propres plantes.**

Ce document sert de référence pour les prochaines évolutions. La partie 1 reprend la demande du porteur du projet, telle qu'il l'a écrite le 28 septembre 2026. La partie 2 fait le point sur ce qui existe déjà dans le code. La partie 3 donne l'ordre de travail retenu.

Légende : ✅ déjà en place · 🟡 en partie · ⬜ à faire

---

## 1. Fonctionnalités souhaitées (texte d'origine)

### 1. Rappels vraiment intelligents

C'est probablement le différenciateur principal de Balco.

- Tâche quotidienne adaptée à chaque plante.
- Prise en compte de la météo, de la pluie, du gel, de la chaleur et du vent.
- Historique du dernier arrosage ou entretien.
- Message explicatif : *« N'arrose pas aujourd'hui, 8 mm de pluie sont prévus demain. »*
- Notifications personnalisées par plante.
- Possibilité de reporter, ignorer ou confirmer une tâche.
- Limitation des rappels pour éviter la surcharge.

### 2. Assistant jardinage IA personnalisé

Un assistant plus utile qu'un simple chatbot générique.

- Réponses basées sur les plantes réellement possédées.
- Prise en compte de la ville, de la saison et de l'exposition.
- Conseils simples et progressifs pour débutants.
- Questions rapides : arrosage, maladie, rempotage, récolte.
- Analyse de l'historique : *« Tu n'as pas fertilisé tes tomates depuis trois semaines. »*
- Mémoire des préférences et du niveau de l'utilisateur.

### 3. Scanner de plantes et diagnostic naturel

Une fonctionnalité très attractive pour l'acquisition et l'engagement.

- Identification d'une plante à partir d'une photo.
- Détection des problèmes fréquents : feuilles jaunes, parasites, manque d'eau, champignons.
- Niveau de confiance du diagnostic.
- Solutions naturelles et accessibles.
- Suivi de l'évolution avec plusieurs photos.
- Avertissement clair lorsque le diagnostic est incertain.

### 4. Calendrier de culture local

Le calendrier doit devenir une véritable feuille de route personnalisée.

- Dates de semis, plantation, rempotage et récolte.
- Adaptation au climat local.
- Vue mensuelle et saisonnière.
- Alertes en cas de gel ou de forte chaleur.
- Association automatique avec les tâches quotidiennes.
- Suggestions de cultures adaptées au balcon et à la place disponible.

### 5. Suivi de progression et motivation

Pour créer une habitude durable.

- Historique des gestes réalisés.
- Série de jours consécutifs.
- Progression par plante.
- Badges écologiques.
- Niveau d'expérience qui évolue.
- Bilan hebdomadaire : gestes réalisés, eau économisée, récoltes estimées.
- Petites animations et retours positifs après chaque action.

### 6. Gestion visuelle du mini-potager

Très utile lorsque l'utilisateur possède plusieurs plantes.

- Vue de tous les plants sous forme de cartes.
- Emplacement : balcon, rebord de fenêtre, intérieur.
- Exposition au soleil pour chaque plante.
- Taille du pot et volume disponible.
- Photo personnelle de chaque plante.
- État actuel : semis, croissance, floraison, récolte.
- Possibilité de réorganiser virtuellement son espace.

### 7. Mode « vacances » ou absence

Une fonctionnalité à forte valeur pratique.

- Indiquer les dates d'absence.
- Générer un plan de préparation avant le départ.
- Conseils de conservation de l'humidité.
- Liste des tâches à transmettre à un proche.
- Reprise automatique des rappels au retour.

### 8. Partage et dimension communautaire

À développer après avoir solidifié l'expérience individuelle.

- Partage d'une récolte ou d'une progression.
- Défis collectifs éco-responsables.
- Conseils validés par la communauté.
- Échange de graines ou de boutures localement.
- Galerie de balcons inspirants.
- Classement facultatif basé sur les actions, pas uniquement sur la performance.

### 9. Récoltes et cuisine anti-gaspillage

Très cohérent avec la promesse écologique.

- Estimation de la période de récolte.
- Journal des récoltes.
- Suggestions de recettes selon les plantes disponibles.
- Conseils pour conserver les herbes et légumes.
- Alertes : *« Ton basilic est prêt à être récolté. »*
- Quantité récoltée et impact du potager.

### 10. Modèle économique utile et non intrusif

À envisager une fois l'usage validé.

- Version gratuite avec recommandations et tâches essentielles.
- Version premium avec assistant IA avancé, scanner illimité et historique complet.
- Packs de cultures adaptés aux saisons.
- Partenariats avec pépinières ou commerces responsables.
- Recommandations de produits uniquement si elles sont pertinentes et transparentes.

### Priorité recommandée

**Prochaine version à développer**

1. Rappels intelligents fiables et testés sur appareil réel
2. Calendrier local connecté aux tâches
3. Assistant IA mémorisant les plantes de l'utilisateur
4. Historique et progression plus motivants
5. Mode vacances

**Version suivante**

1. Scanner de plantes réellement fonctionnel
2. Gestion visuelle avancée du balcon
3. Récoltes et recettes
4. Premiers défis communautaires

---

## 2. Où en est Balco (état au 28 septembre 2026)

### 1. Rappels intelligents

| Élément | État | Ce qui existe / ce qui manque |
|---|---|---|
| Tâche quotidienne par plante | ✅ | Session du jour sur l'accueil, gestes tirés du catalogue selon le mois |
| Météo : pluie, gel, chaleur, vent, orage | ✅ | Moteur de décision testé (`lib/reminders/reminder-engine.ts`), données Open-Meteo |
| Historique du dernier entretien | ✅ | Pris en compte dans la décision, visible dans la fiche plante |
| Message explicatif | ✅ | « N'arrose pas les tomates cerises aujourd'hui : 8 mm de pluie sont prévus dans les 12 prochaines heures », avec la raison sous le conseil |
| Notifications par plante | 🟡 | Locales dans l'app et envoi par le serveur, choix des plantes concernées, bouton « Envoyer une notification de test ». **Validation sur un vrai téléphone en cours** ; l'envoi serveur sur Android attend la configuration Firebase |
| Reporter / ignorer / confirmer | ✅ | « Fait ✓ », « Dans 3 h » (jamais pendant la plage calme) et « Pas aujourd'hui », sur la carte de l'accueil et dans la notification. La mise en sommeil reste sur le téléphone (pas encore transmise au serveur) |
| Limiter les rappels | ✅ | Plafond par jour, plage calme, délai de 24 h entre deux rappels. Une même alerte météo (pluie, gel, orage, vent, chaleur) est regroupée en une seule carte et une seule notification pour toutes les plantes |

### 2. Assistant IA (Nora)

| Élément | État | Ce qui existe / ce qui manque |
|---|---|---|
| Réponses basées sur les plantes possédées | ✅ | Le serveur transmet les plantes, avec la variété choisie |
| Ville, saison, exposition | ✅ | Ville, balcon, exposition et date transmis à chaque question |
| Conseils pour débutants | ✅ | Niveau choisi à l'accueil, modifiable dans Réglages ou dans « Nora se souvient de toi » (Je débute / Je me lance / J'ai déjà un potager) : Nora adapte la longueur et le vocabulaire |
| Questions rapides | ✅ | Boutons de questions prêtes à l'emploi |
| Analyse de l'historique | ✅ | Tout l'historique résumé plante par plante : nombre de gestes par type, date du dernier, gestes conseillés jamais notés, derniers gestes, plantes retirées dans l'année. Bouton « Fais le point sur mes plantes ». Nouveau geste « Engrais » (26 plantes gourmandes, rythme par plante) : Nora sait dire « pas d'engrais depuis 3 semaines » |
| Mémoire des préférences et du niveau | ✅ | 9 préférences à cocher (réponses courtes, animal, enfants, peu de temps, économiser l'eau…) et faits retenus en discutant (« A un chat »), affichés sous la réponse avec « Oublier », et « Tout oublier ». Stockés sur le serveur (table `nora_memories`), effacés avec le compte |

### 3. Scanner et diagnostic

| Élément | État | Ce qui existe / ce qui manque |
|---|---|---|
| Identification par photo | ✅ | Claude, avec correspondance au catalogue |
| Problèmes fréquents | ✅ | État de santé, observations, gestes conseillés |
| Niveau de confiance | ✅ | Élevée / moyenne / faible |
| Solutions naturelles | ✅ | Rubrique « Solution naturelle » |
| Suivi avec plusieurs photos | 🟡 | La photo d'un diagnostic noté rejoint la fiche de la plante, avec ses autres photos (sur l'appareil seulement) |
| Avertissement si incertain | ✅ | « Diagnostic incertain », conseil d'aller voir un professionnel |

### 4. Calendrier local

| Élément | État | Ce qui existe / ce qui manque |
|---|---|---|
| Semis, plantation, récolte | ✅ | Pour les 73 plantes du catalogue |
| Rempotage | ✅ | Mois de rempotage des 24 vivaces (mars–avril par défaut, exceptions comme l'ail des ours en automne), nouveau geste « Rempotage » dans l'historique |
| Adaptation au climat local | ✅ | Climat déduit de la ville et de l'altitude (méditerranéen, océanique, tempéré, continental, montagne) : semis et plantations des plantes frileuses un mois plus tôt dans le Midi, un mois plus tard en montagne ; date habituelle des dernières gelées |
| Vue mensuelle / saisonnière | ✅ | « Par mois » ou « Par saison », en commençant par la saison en cours |
| Alertes gel / chaleur | ✅ | Alertes météo du moment (gel, orage, vent, chaleur, pluie) en haut du calendrier, regroupées par cause |
| Lien avec les tâches du jour | ✅ | Un entretien coché dans le calendrier l'est aussi sur l'accueil ; semis, plantations et rempotages se notent une fois par mois, et l'accueil rappelle ceux du mois pas encore faits |
| Suggestions adaptées au balcon | ✅ | Recommandations selon l'exposition, la place et les objectifs |

### 5. Progression et motivation

| Élément | État | Ce qui existe / ce qui manque |
|---|---|---|
| Historique des gestes | ✅ | Fiche plante, jour par jour |
| Série de jours consécutifs | ✅ | Affichée dans le profil |
| Progression par plante | ✅ | Carte « Sa progression » dans la fiche : stade (s'installe, en croissance, bientôt la récolte, en récolte, au repos, fin de saison), soins des 8 dernières semaines en barres, étapes marquantes (arrivée, 1ʳᵉ récolte, 1ᵉʳ engrais, 10 gestes, 1ʳᵉ photo) |
| Badges | ✅ | 6 badges |
| Niveau qui évolue | ✅ | Points et niveaux (« Graine curieuse »…) |
| Bilan hebdomadaire | 🟡 | Écran « Ma semaine » : jours actifs, gestes (comparés à la semaine d'avant), récoltes, photos, conseils météo suivis, plante par plante. Eau économisée (arrosages évités grâce à la pluie × environ 20 % du volume du pot) et récoltes à venir (ce mois-ci, puis le mois prochain) |
| Animations et retours positifs | ✅ | Message après chaque geste ; message de fête quand un geste débloque un badge, un niveau, une série (3, 7, 14, 30… jours) ou la première récolte d'une plante |

### 6. Gestion visuelle du balcon

| Élément | État | Ce qui existe / ce qui manque |
|---|---|---|
| Cartes des plantes | ✅ | Écran « Balcon » en grandes cartes photo : point de couleur d'état, geste du jour |
| Emplacement par plante | ⬜ | Seule l'exposition du balcon entier est connue |
| Exposition par plante | ⬜ | Idem |
| Taille du pot | 🟡 | Pot conseillé affiché en pastille sur la fiche ; celui de l'utilisateur n'est pas enregistré |
| Photo personnelle | 🟡 | Journal photo par plante (24 photos au plus), la plus récente en couverture sur Balcon et sur la fiche. Gardé sur l'appareil : pas encore envoyé au serveur |
| Stade : semis, croissance, floraison, récolte | ⬜ | À faire |
| Réorganisation virtuelle | ⬜ | À faire |

### 7. Mode vacances

| Élément | État |
|---|---|
| Dates d'absence | ✅ Écran « Mode vacances » (Moi, Réglages, accueil) : départ et durée en deux touches |
| Plan de préparation | ✅ Préparatifs à cocher selon les plantes, la saison et la durée, avec leur moment (quelques jours avant, la veille, le jour du départ) |
| Conservation de l'humidité | ✅ Paillis, pots groupés à l'ombre, réserve d'eau (bouteille, oya, mèche), soucoupe pour les plus assoiffées |
| Liste pour un proche | ✅ Rythme d'arrosage par plante selon la saison, récoltes, message prêt à envoyer |
| Reprise automatique | ✅ Rappels muets pendant l'absence (téléphone et serveur), notification « Bon retour » et liste de retour, reprise seule |

### 8. Communauté

| Élément | État |
|---|---|
| Tous les éléments | ⬜ À faire (prévu plus tard) |

### 9. Récoltes et cuisine

| Élément | État | Ce qui existe / ce qui manque |
|---|---|---|
| Période de récolte | ✅ | Dans le catalogue et le calendrier |
| Journal des récoltes | 🟡 | Un geste « Récolte » s'enregistre, sans quantité |
| Recettes | ⬜ | À faire |
| Conseils de conservation | 🟡 | Un conseil de récolte par plante, pas de conservation |
| Alerte « prêt à récolter » | 🟡 | Tâche de récolte pendant les mois concernés, sans notification dédiée |
| Quantité et impact | ⬜ | À faire |

### 10. Modèle économique

| Élément | État | Ce qui existe / ce qui manque |
|---|---|---|
| Gratuit / premium | 🟡 | Quotas IA gratuit / Balco+ en place côté serveur ; **achats intégrés (RevenueCat) à faire** |
| Packs saisonniers, partenariats, recommandations de produits | ⬜ | À faire |

---

## 3. Ordre de travail retenu

L'ordre suit la priorité fixée par le porteur du projet. Chaque étape est validée avec lui avant de commencer.

**Prochaine version**

1. **Rappels intelligents fiables sur appareil réel** : bouton « notification de test », validation sur un vrai téléphone Android, messages plus explicites, actions « reporter / ignorer / fait » dans l'app et dans la notification, envoi serveur sur Android (Firebase).
2. **Calendrier local connecté aux tâches** : ajout du rempotage, décalage des dates selon la région, alertes météo dans le calendrier, vue par saison, une seule source pour les tâches du calendrier et de l'accueil.
3. ✅ **Assistant IA qui se souvient** : niveau et préférences de l'utilisateur, faits retenus en discutant, analyse de l'historique complet. (Validation sur téléphone en cours.)
4. ✅ **Progression plus motivante** : bilan hebdomadaire (eau économisée, récoltes à venir), progression par plante, petites victoires fêtées. (Validation sur téléphone en cours.)
5. ✅ **Mode vacances** : dates d'absence, plan de départ, liste pour un proche, reprise automatique. (Validation sur téléphone en cours.)

**Version suivante**

1. Scanner : suivi dans le temps avec plusieurs photos par plante.
2. Balcon visuel : emplacement, exposition et pot par plante, photo, stade de culture, plan du balcon.
3. Récoltes et recettes.
4. Premiers défis communautaires.

**En parallèle, pour la rentabilité** : achats intégrés Balco+ quand l'usage est validé (voir le point 10).

**Refonte visuelle (septembre 2026)** : écrans plus sobres, sans rien retirer. Trois règles : moins d'efforts, clarté visuelle, retour immédiat.

1. ✅ Accueil « Aujourd’hui », sur fond de lumière du balcon (ombres de la rambarde et des plantes, animées selon l'heure et la météo) : une seule liste à cocher (alertes météo, gestes du jour, gestes de saison), l'état du balcon en une ligne, le détail dans une feuille qui monte du bas, un message « Annuler » après chaque geste. Nouvelle base : fond blanc, un seul vert de marque, barre du bas claire.
2. ✅ 4 onglets : Aujourd’hui, Balcon, Saisons, Nora. « Moi » s'ouvre depuis l'avatar, « Observer » depuis Nora et Balcon. La lumière du balcon (ombres de feuillage selon l'heure et la météo) et les cartes en verre sur tous les écrans.
3. ✅ Balcon et fiche plante « photo d'abord » : cartes photo avec point d'état et geste du jour ; fiche avec ta photo datée en grand, pastilles soleil / pot / depuis quand, le prochain geste en un bouton, tes photos et l'historique jour par jour ; renommer et retirer en bas de la fiche. Tes photos remplacent les emojis ; sans photo, l'emoji de la plante reste affiché.
4. ✅ Saisons, Nora et Moi : Saisons en liste à cocher comme l'accueil (détail dans la feuille du bas, « Annuler », « Tout est fait pour ce mois »), Nora avec des questions prêtes tirées de tes plantes et de la saison, Moi avec « Ma semaine » et le niveau en haut, les badges, puis les réglages. Nouvel écran « Ma semaine » (les 7 jours, gestes, récoltes, photos, chaque plante), ouvert par « Voir ma semaine ». Les réglages ont leur propre écran (ouvert depuis Moi), où l'on change aussi l'exposition, l'espace et les envies sans refaire l'accueil. L'accueil de première ouverture est refait sur le même modèle : une question par écran, puis les premières plantes proposées, déjà cochées.
