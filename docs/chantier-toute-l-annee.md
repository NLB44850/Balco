# Chantier « une app vivante toute l'année » : état des lieux et plan

*Rédigé le 8 octobre 2026 à partir de `docs/brief-toute-l-annee.md` et du code de `main` (après la PR #32).
Rien n'est codé : le plan et les réponses aux questions attendent la validation du porteur.*

## 1. État des lieux (le code fait foi)

### Aujourd'hui (`app/(tabs)/index.tsx`, `lib/garden/today.ts`)

Ordre actuel de haut en bas : en-tête, carte de simulation météo (version de test), carte d'arrivée, bandeau
« Météo de Paris par défaut », bandeaux météo, barre « Ton balcon · … », carte vacances, carte « Tout est fait »,
liste du jour (gestes faits en bas, donc **sous** la carte « Tout est fait »), « Activer les rappels », carte
« C'est le moment 🌱 » (envies du printemps, mars-avril), « Idée du mois », « Tes plantes ».

Quand il n'y a rien à faire :
- **Balcon avec des plantes, rien de dû** : carte 🌿 « Rien à faire aujourd'hui · Tes plantes n'ont besoin de rien.
  Balco te préviendra si la météo change. » + « Voir ma semaine ». L'écran n'est donc **pas vide** : la carte
  « Ton balcon se repose » (A1) remplacera celle-ci.
- **Tout est fait** : « Tout est fait pour aujourd'hui » (ou « prêt pour la nuit » après 17 h).
- **Balcon vide** : « Ajoute ta première plante » + 3 plantes de saison ; ni Idée du mois, ni « Tes plantes ».
- Un « Ton pot est libre » laissé de côté reste replié sous la carte (ligne « pas urgente »).

### Dates, climat, notifications, Nora

- **Aucune simulation de date.** « Maintenant » est lu à 96 endroits (`new Date()` / `Date.now()`), dont 39 valeurs
  par défaut dans `lib/`. Il faut d'abord un « maintenant » unique, que la simulation pourra remplacer. Modèle à
  suivre : la simulation météo (`hooks/use-weather-simulation.ts`, active seulement avec
  `EXPO_PUBLIC_WEATHER_SIMULATION=1`, absente de l'app publiée).
- **Climat** : 5 zones (`lib/plants/climate.ts`) dont « de montagne » (pas « montagnard »), au-dessus de 800 m.
  Le décalage (`adaptToClimate`) ne touche que les **mois de printemps (février-juin) des plantes frileuses**
  (−1 mois en méditerranéen, +1 en montagne). Rien n'est décalé à l'automne. Pour l'automne, on dispose en revanche
  du mois des premières gelées par zone (`firstFrostMonth` : octobre en montagne et en continental, novembre ailleurs,
  décembre en méditerranéen).
- **Notifications** : `scheduleDatedReminder` (même mécanisme que la notification des envies du printemps le 1ᵉʳ mars)
  convient pour une notification unique le 18 novembre, à l'heure choisie (qui ne tombe jamais dans la plage calme).
- **Nora** ne s'ouvre pas avec une question pré-remplie : à ajouter (petit relais comme la photo vers Observer).
- **« Ce qu'il te faut »** avec « J'ai déjà » et le partage existe pour tous les pas-à-pas (semer, planter, rempoter,
  terre du dessus, éclaircir, pincer, sortir les plants). Le guide ignore le climat de la ville (détail à corriger
  au passage).
- **Envies du printemps** : une simple liste de plantes (sans date), synchronisée.

### Badges (`lib/garden/garden-logic.ts`, Moi = `app/(tabs)/profile.tsx`)

| Badge | Condition exacte |
|---|---|
| Premier Pot | 1 plante **actuellement** sur le balcon |
| Ami des Abeilles | 3 plantes mellifères **actuellement** sur le balcon (58 mellifères au catalogue) |
| Zéro Gâchis d'Eau | 5 « conseils météo suivis » (tout geste venu d'une alerte, **y compris les arrosages évités sous la pluie, notés tout seuls**) |
| Bio-Défenseur | 5 « inspections » (en réalité tout geste de type observation : **aussi les semis, plantations, sorties des plants, analyses Observer et arrosages évités**) |
| Du Balcon à l'Assiette | 1 récolte |
| Main Verte | 7 jours suivis **de suite (la série en cours)** |

Écarts avec le brief et le principe « rien ne se perd » :
1. **Les badges ne sont pas enregistrés** : ils sont recalculés à chaque affichage. Main Verte disparaît dès que la
   série casse ; Premier Pot et Ami des Abeilles disparaissent si on retire les plantes. Aucune date d'obtention.
2. **Le téléphone ne garde que les 1 000 derniers gestes** (le serveur en renvoie 1 000 aussi) : les « premières
   fois » anciennes peuvent sortir du calcul pour un utilisateur très actif. Il faut enregistrer ce qui est acquis.
3. **La cause d'une alerte suivie n'est pas notée** (gel, chaleur, orage, vent) : seul le titre permet de la deviner.
   Gel et vent le même jour sur la même plante s'écrasent (même identifiant). Les badges « Canicule maîtrisée » ou
   « Protégé du gel » ont besoin de la cause : on la notera pour les gestes à venir, et on la retrouvera par le titre
   pour les anciens.
4. **Aucune floraison n'est notée** nulle part : l'herbier « fleurie pour la première fois » n'est pas vérifiable
   aujourd'hui (voir question 9).
5. **Fête manquée** : un badge débloqué par un arrosage évité (noté tout seul) ou par « Fait » dans une notification
   n'est jamais fêté.
6. Moi : grille de 2 colonnes, cases grises « · » avec « 2 / 5 », toucher = « Encore N pour le débloquer ».
7. Les réponses de fin de saison (« Tout récolté ? », « Ta saison est finie ? ») restent sur le téléphone.

Données utilisables : chaque geste est daté et rattaché à sa plante (y compris les plantes retirées) ; récoltes par
plante (première récolte de chaque plante calculable) ; semis et plantations (`calendar-sow`, `calendar-plant`,
`:start`) ; arrosages évités sous la pluie (litres calculés) ; alertes suivies ; jours suivis ; catégorie
(aromatique, fleur, petit fruit…), mellifère, semis au chaud par plante.

### Catalogue face aux astuces et à la Sainte-Catherine

- **À planter en novembre** (9) : ail (plein soleil, jardinière), ail des ours (ombre), violas (rebord), framboisier,
  groseillier, cassissier, myrtillier, mûres sans épines (balcon, 20 à 30 L), kiwaï (terrasse, 40 L).
  Les **fraisiers ne se plantent pas en novembre** dans le calendrier (mars, avril, août, septembre) : à exclure.
  Sur un rebord de fenêtre, seuls les violas conviennent ; en jardinière, l'ail (si plein soleil) et l'ail des ours.
- Astuces qui contredisent le calendrier ou le catalogue :
  - `dec-rebord` : persil (récolte mai-novembre) et ciboulette (mars-octobre) ne se récoltent pas en décembre ;
  - `nov-romarin` : la sauge se récolte d'avril à octobre (romarin et thym toute l'année, d'accord) ;
  - `mar-terre-dessus` dit 3 cm, le geste de l'app dit « Change les 5 cm de terre du dessus » ;
  - `jan-micropousses` : à relier aux micro-pousses (radis, roquette, moutarde ne se sèment pas en janvier en pot) ;
  - « tomates » et « salades » ne sont pas des plantes du catalogue (tomates cerises, tomates naines ; salade à couper,
    laitue pommée…) ; `mai-saints-glace` cite la courgette, qui demande une terrasse ;
  - `mai-saints-glace` et `avr-nuits-claires` : mi-mai ne vaut pas en montagne (gelées jusqu'à début juin) ni en
    méditerranéen (mi-mars).
- Le paillage n'existe pas comme geste (seulement dans le plan des vacances et des conseils).
- Badge d'hiver « Semis au chaud : une aromatique semée à l'intérieur » : aucune aromatique ne se sème au chaud
  avant mars dans le calendrier (en février : piment, poivron ; toute l'année : micro-pousses).

## 2. Plan proposé (une étape = un commit testé, puis validation sur le téléphone)

Différence avec l'ordre du brief : la Sainte-Catherine passe **avant** les astuces et les paliers, pour tenir
l'échéance du 15 novembre sans dépendre de la vérification des 100 astuces.

1. **Simulation de date** : un « maintenant » unique pour toute l'app, « Faire comme si on était le… » dans
   Réglages → Version de test (absent de l'app publiée).
2. **Badges acquis gardés** : chaque badge obtenu est enregistré avec sa date (téléphone + sauvegarde), les badges
   déjà obtenus sont repris ; la cause des alertes suivies est notée ; fête aussi pour un badge gagné hors
   d'Aujourd'hui.
3. **Aujourd'hui toute l'année** : « Ton balcon se repose », ordre des cartes, au plus deux cartes en plus.
4. **« À anticiper »** : 3 à 6 semaines devant (plantes du balcon et envies du printemps), feuille avec « Ce qu'il
   te faut ».
5. **Mécanisme d'événements** décrit par des données + ouverture de Nora avec une question pré-remplie.
6. **La Sainte-Catherine** : carte, page, actions, protection, version climat froid, notification du 18/11, badge,
   bilan. E2e. → **à tester sur le téléphone vers le 1ᵉʳ novembre.**
7. **Banque d'astuces** : vérification des 50 sur deux sources, complément à ~100, document soumis au porteur
   (pas de code).
8. **Carte « Astuce de saison »** une fois les astuces validées.
9. **Paliers** Graine / Pousse / Fleur et nouveaux badges permanents.
10. **Badges de saison** avec millésime.
11. **Herbier**.
12. **Moi refait** : « Presque là », saison en cours, herbier, collection.
13. **Vérifications complètes** (tests, e2e, accords), mise à jour de `CLAUDE.md` et du récapitulatif.

## 3. Questions à valider

Voir la discussion du 8 octobre ; les réponses seront reportées ici.
