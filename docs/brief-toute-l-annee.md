# Balco : brief « une app vivante toute l'année »

*Rédigé le 8 octobre 2026 avec Claude (claude.ai), pour une nouvelle conversation Claude Code.
À placer dans le dépôt sous `docs/brief-toute-l-annee.md`.*

Ce brief contient trois chantiers liés : **Aujourd'hui toute l'année** (à anticiper, astuces), **les badges éco**
et **le premier événement saisonnier, la Sainte-Catherine**. Il est écrit pour être lu sans autre contexte.
Lis-le en entier avant de proposer quoi que ce soit.

---

## 0. Comment travailler sur ce brief

1. Lis d'abord `CLAUDE.md`, le dernier récapitulatif pour claude.ai, puis ce brief en entier.
2. Fais un **état des lieux sans coder** (voir la section 7) et signale tout écart entre ce brief et le code réel.
   Si le brief se trompe sur l'existant, c'est le code qui fait foi : dis-le, ne « corrige » pas le code pour
   coller au brief.
3. Propose un **plan par étapes** (une étape = un commit testé), puis **attends la validation du porteur**.
4. Les points marqués **« à valider »** ne sont pas des décisions : pose la question avant de coder.
5. En cas de doute sur une intention, **demande** plutôt que de deviner.
6. À la fin : mets à jour `CLAUDE.md` et le récapitulatif pour claude.ai, et donne au porteur les commandes exactes
   pour tester sur son téléphone.

---

## 1. Le porteur et sa façon de travailler

- Le porteur n'est **pas développeur**. Réponses en français, simples, avec des étapes numérotées et les commandes
  exactes à copier.
- Il teste chaque étape sur son téléphone Android (app web dans Chrome, ou APK) avant de passer à la suivante.
- **Ne jamais lui demander de coller un secret** (clé Expo, clé Anthropic, mot de passe) : il les tape lui-même.

## 2. L'application en bref

Balco dit chaque jour quoi faire pour chaque plante du balcon, selon la saison et la météo de la ville de
l'utilisateur. Public : citadins débutants, en France (climat tempéré à montagnard, hémisphère nord).

- **4 onglets** : Aujourd'hui (la liste du jour à cocher), Balcon (les plantes en cartes photo), Saisons (le calendrier,
  à lire), Nora (l'assistante IA). « Moi » s'ouvre par l'avatar (roue crantée vers Réglages), « Observer » par le
  bouton appareil photo.
- **Style** : inspiré de Too Good To Go, Spotify, Uber et Airbnb. Trois règles : **moins d'efforts, clarté visuelle,
  retour immédiat**. Un seul vert (#1F7A4D), orange pour la chaleur et « à surveiller », bleu pour le gel.
  Police Onest. Fond « lumière du balcon ». Feuilles du bas pour les détails et les choix.
- **Déjà en place et à réutiliser** : calendrier de 101 plantes adapté au climat de la ville (mois de semis,
  plantation, récolte, floraison) ; alertes météo en bandeau ; eau économisée ; « Idée du mois » ; envies du
  printemps ; fin de saison des annuelles et « Ton pot est libre » ; pas-à-pas illustrés ; Ma semaine, série de
  « jours suivis », niveaux, 6 badges éco ; outil d'accord des textes (genre et nombre de chaque plante) ;
  simulation météo dans Réglages → Version de test.

## 3. Décisions déjà prises (ne pas les remettre en cause sans le porteur)

- Aujourd'hui garde **une ligne à faire par plante au plus**. Les nouveautés de ce brief sont des **cartes séparées**
  de la liste, jamais des lignes en plus.
- Ordre des gestes : alerte météo, arrosage, récolte, plantation / semis / rempotage, engrais, entretien.
- **Saisons est à lire** ; on coche uniquement sur Aujourd'hui.
- Les pas-à-pas sont facultatifs. Règles d'écriture de toute l'app : une action par phrase, verbe en tête quand c'est
  une consigne, phrases courtes, **tutoiement**, pas de majuscules décoratives, aucun mot technique sans explication.
- **Fête en plein écran** seulement pour un nouveau badge et la 1ʳᵉ récolte d'une plante, **une fois par jour**.
- Un mois de semis ne change que si **deux semenciers au moins** le confirment. Même exigence pour toute information
  de jardinage ajoutée (astuces, événements) : vérifiée sur deux sources fiables.
- L'accueil ne propose que des plantes de saison. L'app ne copie pas les photos dans la galerie.
- Décocher une plante dans « Plantes suivies » ne coupe que ses notifications.
- Un compte gratuit sauvegarde depuis un seul téléphone.

## 4. Principes communs aux trois chantiers

1. **Récompenser les bons gestes, jamais les gestes en plus.** Suivre une alerte, ne pas arroser sous la pluie,
   semer au bon moment : oui. Arroser plus que nécessaire pour gagner quelque chose : jamais.
2. **Rien ne se perd** : un badge, un palier ou une carte d'herbier obtenus restent acquis.
3. **Seulement ce que l'app peut vérifier** (gestes cochés, données météo, calendrier). Pas de badge déclaratif
   invérifiable du type « zéro pesticide ».
4. **Pas d'encombrement** : sous la liste d'Aujourd'hui, **au plus deux cartes « en plus » à la fois** (à valider),
   par priorité : événement en cours > à anticiper > astuce > Idée du mois.
5. **Pas d'IA pour les contenus fixes** : les astuces et les textes d'événement sont écrits, vérifiés et stockés
   dans l'app (gratuit à l'usage, justesse maîtrisée). Nora peut en parler, mais ne les génère pas.
6. **Adapté au climat** : tout ce qui dépend d'une date tient compte du décalage climatique de la ville, comme le
   calendrier.
7. **Textes accordés** avec l'outil existant dès qu'une phrase cite une plante.
8. **Notifications sobres** : rien de nouveau n'est envoyé chaque jour. Au plus une notification au début d'un
   événement, en respectant l'interrupteur des rappels et la plage calme.

---

## 5. Chantier A : Aujourd'hui, utile toute l'année

### Le problème

L'hiver, il y a peu de gestes. Aujourd'hui risque d'être vide et l'utilisateur d'oublier l'app. Or un jardinier ne
s'ennuie jamais : en hiver, il **anticipe, protège et prépare**.

### A1. Jamais d'écran vide

Quand il n'y a aucun geste à faire, la liste est remplacée par une carte calme :
« **Ton balcon se repose** · Rien à faire aujourd'hui. Profites-en pour préparer la suite. »
Elle est suivie des cartes « À anticiper » et « Astuce ». (Vérifier ce qui s'affiche aujourd'hui dans ce cas.)

### A2. La carte « À anticiper »

- Balco regarde **3 à 6 semaines devant** dans le calendrier des plantes du balcon **et** des envies du printemps.
- Elle annonce un geste à venir et ce qu'il faut préparer, sans rien à cocher.
  Exemples de ton :
  - « **Dans 4 semaines** : semis de tomates au chaud. Prépare des godets et du terreau. »
  - « **Fin novembre** : c'est le moment de planter l'ail. Il te faudra un pot d'au moins 20 cm de profondeur. »
- Une seule annonce à la fois, la plus proche. Touchée, elle ouvre une feuille avec le détail et, s'il existe,
  « Ce qu'il te faut » du pas-à-pas concerné (avec « J'ai déjà » et le partage déjà en place).
- Si rien n'est prévu dans les 6 semaines, la carte n'apparaît pas.

### A3. La carte « Astuce de saison »

- Tirée de la **banque d'astuces** (section 6), filtrée par mois, climat et plantes du balcon.
- **Une nouvelle astuce par semaine** (à valider), la plus pertinente : une astuce liée à une plante du balcon passe
  avant une astuce générale. Pas deux fois la même dans l'année.
- Une croix la masque jusqu'à la suivante. Un lien « Demander à Nora » ouvre Nora avec la question pré-remplie
  (compte nécessaire, quota habituel).

### A4. Ordre sur Aujourd'hui (à valider)

Bandeau météo → carte d'événement compacte (si un événement est en cours) → progression et liste du jour
(ou « Ton balcon se repose ») → au plus deux cartes parmi : à anticiper, astuce, Idée du mois → Tes plantes.

---

## 6. La banque d'astuces (première version)

### Format de chaque astuce

| Champ | Contenu |
|---|---|
| `id` | identifiant stable (ex. `jan-graines`) |
| `texte` | 1 ou 2 phrases, 30 mots au plus, tutoiement |
| `mois` | mois où elle peut sortir (décalés selon le climat) |
| `plantes` | facultatif : n'apparaît que si l'une de ces plantes est sur le balcon |
| `condition` | facultatif : météo (gel annoncé, canicule, vent, pluie) |
| `sources` | deux sources fiables, notées lors de la vérification |

### À faire par Claude Code

1. **Vérifier chaque astuce sur deux sources fiables** (semenciers, jardineries reconnues, instituts). Corriger ou
   retirer celles qui ne tiennent pas, et lister les changements pour le porteur.
2. Vérifier que les plantes citées existent dans le catalogue ; sinon reformuler avec des plantes du catalogue.
3. Vérifier la cohérence avec le calendrier des 101 plantes (aucune astuce ne doit contredire un mois de semis,
   de plantation ou de récolte).
4. Compléter jusqu'à **environ 100 astuces** (au moins 6 par mois), en gardant le même ton, puis les soumettre au
   porteur avant intégration.

### Les 50 premières astuces (à vérifier)

**Janvier**
- `jan-graines` · Fais l'inventaire de tes graines : un sachet ouvert se garde souvent 2 à 3 ans au sec. Au-delà, elles germent moins bien.
- `jan-thym-eau` · *plantes : thym, romarin, lavande, sauge* · Ton thym craint plus l'humidité que le froid. Arrose seulement si la terre est sèche depuis longtemps et qu'il ne gèle pas.
- `jan-cales` · *condition : gel annoncé* · Les pots gèlent plus vite que la pleine terre. Surélève-les sur des cales : l'eau s'écoule au lieu de geler dessous.
- `jan-micropousses` · Sème des micro-pousses sur ton rebord de fenêtre : radis, roquette ou moutarde se récoltent en une à deux semaines.
- `jan-pots-propres` · Lave tes pots vides à l'eau savonneuse : tu évites de garder maladies et œufs d'insectes pour le printemps.

**Février**
- `fev-godets` · Prépare des godets pour tes semis au chaud : des pots de yaourt percés ou des boîtes d'œufs font très bien l'affaire.
- `fev-nettoyage` · Les jours rallongent et tes plantes vivaces se réveillent. Retire les feuilles mortes et les tiges sèches pour laisser place aux nouvelles pousses.
- `fev-fraisiers` · *plantes : fraisier* · Coupe les feuilles sèches et abîmées de tes fraisiers : ils repartiront plus vite au printemps.
- `fev-vent` · *condition : vent* · Le vent d'hiver dessèche autant que le soleil. Rapproche les pots fragiles d'un mur, à l'abri.

**Mars**
- `mar-patience` · Ne te précipite pas : une tomate mise dehors trop tôt cale au froid. Attends des nuits au-dessus de 10 °C.
- `mar-terre-dessus` · Remplace les 3 premiers centimètres de terre de tes pots de vivaces par du terreau neuf : ça les nourrit pour l'année.
- `mar-eau-pluie` · Récupère l'eau de pluie dans un seau ou un arrosoir : tes plantes la préfèrent souvent à l'eau calcaire du robinet.
- `mar-profondeur` · Une graine se sème à une profondeur d'environ deux fois sa taille. Les toutes petites se posent juste sur la terre.
- `mar-menthe` · *plantes : menthe* · La menthe envahit tout : garde-la seule dans son pot, jamais mélangée à d'autres plantes.

**Avril**
- `avr-endurcir` · Habitue tes semis à l'extérieur peu à peu : une heure le premier jour, un peu plus chaque jour pendant une semaine.
- `avr-nuits-claires` · Gare aux nuits claires d'avril : même après une belle journée, le gel peut revenir jusqu'aux Saints de glace, mi-mai.
- `avr-abeilles` · Installe une fleur mellifère tôt : les abeilles sortent dès les premiers beaux jours et cherchent déjà à manger.
- `avr-basilic` · *plantes : basilic* · Le basilic adore la chaleur : garde-le à l'intérieur tant que les nuits descendent sous 10 °C.
- `avr-soucoupe` · Une soucoupe pleine d'eau asphyxie les racines. Vide-la une demi-heure après l'arrosage.

**Mai**
- `mai-saints-glace` · Les Saints de glace passés (11 au 13 mai), c'est le moment d'installer tomates, courgettes et poivrons dehors.
- `mai-paillage` · Paille tes pots avec du chanvre, du lin ou de la tonte sèche : la terre garde son humidité bien plus longtemps.
- `mai-tuteur` · *plantes : tomates cerises, tomates* · Plante le tuteur en même temps que tes tomates : l'enfoncer plus tard abîmerait les racines.
- `mai-pucerons` · Les pucerons arrivent avec la chaleur. Un jet d'eau ou un peu de savon noir dilué suffit souvent à les déloger.

**Juin**
- `juin-gourmands` · *plantes : tomates* · Retire les gourmands de tes tomates, ces pousses entre la tige et une feuille : la plante produit mieux.
- `juin-arrosage-heure` · Arrose tôt le matin ou le soir : en pleine journée, une bonne partie de l'eau s'évapore avant d'atteindre les racines.
- `juin-aromatiques` · Cueille tes aromatiques le matin, une fois la rosée séchée : c'est là qu'elles ont le plus de parfum.
- `juin-salades` · *plantes : salades* · La chaleur fait monter tes salades en graines : place-les à la mi-ombre pendant l'été.

**Juillet**
- `juil-pot-sombre` · *condition : canicule* · Un pot sombre en plein soleil chauffe les racines. Abrite-le, ou entoure-le d'un tissu clair pendant la canicule.
- `juil-vacances` · Tu pars ? Regroupe tes pots à l'ombre : ensemble, ils perdent moins d'eau. Le mode vacances prépare tout avec toi.
- `juil-au-pied` · Arrose au pied, pas sur les feuilles : des feuilles souvent mouillées attrapent plus facilement des maladies comme le mildiou.
- `juil-basilic-fleurs` · *plantes : basilic* · Coupe les fleurs de ton basilic dès qu'elles apparaissent : ses feuilles restent tendres et parfumées.

**Août**
- `aout-cueillir` · Cueille souvent : plus tu récoltes tomates cerises et haricots, plus la plante en produit.
- `aout-semis-automne` · C'est le moment de penser à l'automne : mâche et roquette aiment les jours qui raccourcissent.
- `aout-graines` · Garde quelques graines de tes plus beaux haricots : sèche-les bien avant de les ranger. Évite les variétés hybrides (F1), elles ne se ressèment pas à l'identique.
- `aout-canicule-eau` · *condition : canicule* · Pendant une canicule, un arrosage copieux le soir vaut mieux que plusieurs petits dans la journée.

**Septembre**
- `sep-fraisiers` · Planter des fraisiers à la fin de l'été leur laisse le temps de s'enraciner avant l'hiver.
- `sep-tomates-vertes` · Les nuits fraîchissent : cueille tes tomates vertes avant le premier froid, elles finiront de mûrir à l'intérieur.
- `sep-boutures` · *plantes : romarin, sauge, lavande* · Fais des boutures : une tige de 10 cm plantée dans un pot de terreau humide prend souvent racine.
- `sep-feuilles` · Garde les feuilles mortes de l'automne : elles feront un paillage gratuit pour protéger tes pots cet hiver.

**Octobre**
- `oct-ail` · L'ail a besoin du froid de l'hiver pour bien démarrer : on le plante en automne.
- `oct-moins-eau` · Réduis l'arrosage : avec la fraîcheur, la terre sèche bien moins vite qu'en été.
- `oct-racines` · Quand une annuelle a fini, coupe-la au ras de la terre et laisse les racines : en se décomposant, elles nourrissent le pot.
- `oct-frileuses` · Repère les plantes frileuses de ton balcon, comme le basilic ou le piment : ce sont elles qu'il faudra protéger en premier.

**Novembre**
- `nov-sainte-catherine` · « À la Sainte-Catherine, tout bois prend racine » : c'est le bon moment pour planter les petits fruitiers.
- `nov-voile` · Ce sont surtout les racines qui craignent le gel en pot. Entoure les pots fragiles de carton ou d'un voile d'hivernage.
- `nov-terre-cuite` · Un pot en terre cuite gorgé d'eau peut éclater au gel. Vide les soucoupes et surélève-le.
- `nov-romarin` · *plantes : romarin, sauge, thym* · Ton romarin se récolte aussi l'hiver : prends quelques brins, sans couper plus d'un tiers de la plante.

**Décembre**
- `dec-carnet` · Note ce qui a marché cette année et ce qui t'a déçu : c'est la meilleure base pour choisir tes plantes du printemps.
- `dec-rebord` · Une aromatique sur le rebord de ta fenêtre, comme le persil ou la ciboulette, se cueille même en hiver.
- `dec-repos` · Les jours les plus courts sont là : tes plantes poussent à peine et n'ont besoin que de très peu d'eau.
- `dec-graines-sec` · Range tes graines dans une boîte fermée, au sec et au frais : l'humidité les abîme plus vite que le froid.

---

## 7. Chantier B : les badges éco

### Le problème

Il n'y a que 6 badges. Une fois obtenus, la section ne bouge plus.

### État des lieux demandé (avant tout plan)

- La liste des 6 badges actuels et leur condition exacte.
- Les données déjà enregistrées qui peuvent servir : gestes, récoltes, eau économisée, alertes suivies (« C'est
  fait »), semis, plantations, plantes mellifères, envies du printemps, fins de saison, jours suivis.

### B1. Des badges qui grandissent

- Chaque badge permanent a **trois paliers : « Graine », « Pousse », « Fleur »**.
- Exemple : « Ami des abeilles » à 3, 6 puis 10 plantes mellifères.
- Proposer les seuils de chacun des 6 badges actuels, plus 2 ou 3 nouveaux badges permanents, par exemple :
  récoltes (1 / 10 / 50), alertes météo suivies (1 / 5 / 15), jours suivis (7 / 30 / 100).
- Les badges déjà obtenus sont **convertis au bon palier**, jamais perdus.

### B2. Des badges de saison, qui reviennent chaque année

- **Quatre par saison**, disponibles seulement pendant la saison (décalée selon le climat si besoin).
- Ils reviennent chaque année avec le **millésime** : « Protégé du gel · 2027 ». Les anciens restent dans la
  collection.
- Pistes (compléter pour arriver à 4 par saison, avec des conditions vérifiables) :
  - printemps : « Premiers semis » (3 semis), « Balcon fleuri » (2 plantes mellifères ajoutées) ;
  - été : « Économe en eau » (3 jours de pluie sans arroser), « Canicule maîtrisée » (3 alertes chaleur suivies) ;
  - automne : « Paré pour l'hiver » (gestes faits avant le premier gel), « Graines du printemps » (2 envies du
    printemps gardées), **« Sainte-Catherine » (badge de l'événement, voir section 8)** ;
  - hiver : « Protégé du gel » (une alerte gel suivie), « Semis au chaud » (une aromatique semée à l'intérieur).

### B3. L'herbier

- Une carte par plante **récoltée ou fleurie pour la première fois** : « Ton herbier · 7 plantes sur 101 ».
- Les récoltes déjà enregistrées comptent dès l'arrivée de l'herbier.
- Carte : photo d'exemple (ou photo de l'utilisateur si elle existe), nom, date de la première récolte ou floraison.

### B4. Affichage dans Moi

Plus de grille de cases grises. Dans l'ordre :
1. **« Presque là »** : les 2 ou 3 badges les plus proches, avec leur barre et une phrase (« Encore 2 plantes
   mellifères »).
2. La collection de la saison en cours.
3. L'herbier.
4. Tous les badges (permanents et saisons passées).

### Fêtes

- Plein écran pour un **nouveau badge**, une fois par jour (décision existante).
- **Animation discrète** pour un nouveau palier ou une nouvelle carte d'herbier (**à valider**).

---

## 8. Chantier C : les événements saisonniers, en commençant par la Sainte-Catherine

### Le principe

Un temps fort par saison, ancré dans les vrais rendez-vous du jardinage en France. Chaque événement dure une à deux
semaines, reste **facultatif** et se masque d'une croix.

Calendrier prévu (seule la Sainte-Catherine est à faire dans ce lot) :

| Saison | Événement | Période indicative |
|---|---|---|
| Automne | **La Sainte-Catherine** (« tout bois prend racine ») | autour du 25 novembre |
| Hiver | Prépare ton printemps | janvier |
| Printemps | Les Saints de glace (compte à rebours, puis feu vert selon la météo réelle) | 11 au 13 mai |
| Été | Balcon en vacances (canicule, départs, mode vacances) | juillet |

### C1. Un mécanisme commun, piloté par des données

Construire un mécanisme générique pour que les événements suivants s'ajoutent par des **données**, sans nouveau code :
dates de début et de fin, carte compacte, page de l'événement, actions proposées, badge associé, suggestion pour
Nora, texte de bilan, notification de lancement.

### C2. La Sainte-Catherine en détail

- **Période** : carte visible du **18 au 30 novembre** (à valider).
- **Notification** : une seule, le 18 novembre à l'heure du rappel choisie, si les rappels sont activés et hors plage
  calme. Texte proposé : « La Sainte-Catherine approche : c'est le moment de planter. »
- **Carte compacte** sur Aujourd'hui (sous le bandeau météo) : « 🌳 La Sainte-Catherine · Ce que tu plantes maintenant
  s'enracine tout l'hiver › », avec une croix.
- **Page de l'événement** :
  - Titre : « La Sainte-Catherine »
  - Citation : « À la Sainte-Catherine, tout bois prend racine. »
  - Explication : « La terre est encore douce et humide. Ce que tu plantes maintenant s'installe pendant l'hiver
    et démarre plus fort au printemps. » (à vérifier sur deux sources)
  - **3 ou 4 actions**, choisies uniquement parmi les plantes du catalogue **qu'on peut planter en novembre dans le
    climat de l'utilisateur** et qui conviennent à son balcon (soleil, espace). Exemples possibles selon le
    calendrier : ail, petits fruitiers (mûres sans épines, groseillier, framboisier si présents), fraisiers si
    novembre est dans leurs mois. Chaque action ajoute la plante « à planter » et propose son pas-à-pas existant.
  - Une action de protection, valable pour tous : « Paille tes pots avant l'hiver » (avec le geste ou l'astuce
    existante).
  - Un lien « Demander à Nora » avec la question « Que planter pour la Sainte-Catherine sur mon balcon ? ».
- **Climat froid** : si la ville est en climat montagnard ou si un gel est annoncé, la page met en avant la
  protection plutôt que la plantation, et ne propose aucune plantation impossible selon le calendrier.
- **Badge** : « Sainte-Catherine · 2026 », obtenu en plantant au moins une plante proposée pendant l'événement
  (compte dans les badges d'automne du chantier B).
- **Fin** : le 30 novembre, la carte disparaît. Si l'utilisateur a participé, une carte de bilan le lendemain :
  « Tu as planté 2 plantes pour la Sainte-Catherine. Rendez-vous au printemps pour les voir repartir. »

### C3. Tester avant novembre

Ajouter dans **Réglages → Version de test** une **simulation de date** (« Faire comme si on était le… »), pour tester
l'événement, les astuces du mois, « À anticiper » et les badges de saison sans attendre. Elle n'existe pas dans l'app
publiée.

### Échéance

La Sainte-Catherine doit être **en place et testée sur le téléphone avant le 15 novembre 2026**.

---

## 9. Ordre de travail proposé (à valider)

1. État des lieux (sections 5 à 8) et réponses aux points « à valider ».
2. Simulation de date dans Version de test (nécessaire pour tout tester).
3. Aujourd'hui toute l'année : « Ton balcon se repose », « À anticiper », ordre des cartes.
4. Banque d'astuces : vérification, complément à environ 100, validation par le porteur, puis carte « Astuce ».
5. Badges : paliers, badges de saison, herbier, nouvel affichage dans Moi.
6. Mécanisme d'événements, puis la Sainte-Catherine.
7. Vérifications complètes (tests automatiques, parcours de bout en bout, accords des textes), puis test du porteur
   sur son téléphone.

## 10. Points à faire valider par le porteur avant de coder

1. Au plus deux cartes « en plus » sous la liste d'Aujourd'hui, et leur ordre de priorité.
2. Une nouvelle astuce par semaine (ou plus souvent l'été ?).
3. Animation discrète, et non plein écran, pour un palier ou une carte d'herbier.
4. Dates de la Sainte-Catherine : du 18 au 30 novembre.
5. La liste finale des actions de la Sainte-Catherine, une fois le calendrier vérifié.
6. Les 4 badges de chaque saison et les seuils des paliers.

## 11. Hors de ce lot (ne pas faire maintenant, mais ne pas l'empêcher)

- « Ton année au balcon » (bilan annuel partageable, façon Spotify), prévu pour décembre : le chantier B doit garder
  les données nécessaires (récoltes, eau économisée, herbier, alertes suivies, dates).
- Les événements d'hiver, de printemps et d'été (contenus à écrire plus tard avec le porteur).
- Défis du mois et défis entre jardiniers (version suivante).
