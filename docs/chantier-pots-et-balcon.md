# Chantier « Pots et balcon » (plan validé le 11/10, ordre et 3 ajouts validés le 11/10)

Rendre Balco plus juste en tenant compte du pot de chaque plante et du balcon lui-même (soleil, poids), puis
préparer l'offre Balco+. Même méthode que les chantiers précédents : une étape = un commit testé, validé par le
porteur sur son téléphone avant la suivante ; une demande de fusion vers `main` quand il valide.

Règles qui valent pour toutes les étapes :
- **Moins d'efforts** : rien d'obligatoire, « Je ne sais pas » partout où l'utilisateur peut hésiter.
- **Accords des textes** par `lib/plants/grammar.ts` ; règles d'écriture : verbe en tête, moins de 12 mots, tutoiement.
- **Une ligne par plante au plus** sur Aujourd'hui, regroupée dès deux plantes (feuille du bas pour cocher chaque plante).
- **Chaque valeur de jardinage vérifiée sur 2 sources** (comme le calendrier), sources notées dans `docs/`.
- **Pas de nouveau module natif** sans prévenir le porteur avant de coder (sinon il faut un nouvel APK) : tout doit
  passer par la mise à jour sans réinstaller.
- Aucune marque citée, jamais de produit chimique.

## Les étapes, dans l'ordre

1. **Taille du pot sur chaque plante**
   - 5 choix avec un petit dessin de pot de taille croissante : Petit (moins de 20 cm), Moyen (20 à 30 cm),
     Grand (30 à 40 cm), Jardinière ou bac, Je ne sais pas (valeur par défaut, y compris pour les plantes existantes).
   - Un volume indicatif par choix (≈ 4 / 10 / 22 / 20 L), en constantes commentées, pour les étapes 6 et 9.
   - Fiche de la plante : ligne « Pot : Moyen (20 à 30 cm) », qui ouvre une feuille du bas (style Réglages).
   - Ajout d'une plante : feuille facultative « Dans quel pot ? », qu'on peut passer. Rien de plus dans l'accueil.
   - Fait partie de la sauvegarde du compte (serveur et base de données), comme les autres infos de la plante.

2. **Fiches « Spécial Pot »**
   - Par plante : profondeur minimale, volume, terreau, engrais ; chaque valeur vérifiée sur 2 sources.

3. **Accueil enrichi**
   - Simulateur de soleil : orientation N / S / E / O ou « Je ne sais pas », balcon couvert, vis-à-vis ; heures de
     soleil calculées selon la ville et la date, sans service extérieur. Plein soleil ≥ 6 h, mi-ombre 3 à 6 h,
     ombre < 3 h.
   - « Diagnostic de ton balcon » calculé par nos règles (pas d'appel à l'IA).
   - Première tâche liée au pot.

4. **Rappels d'engrais**
   - Rythme et date de départ tirés des fiches Spécial Pot (ex. tomates : toutes les 2 semaines dès la floraison).
     Rien en hiver ni en mode vacances.
   - Une ligne par plante au plus : si l'arrosage tombe le même jour, une seule ligne (« Arrose et nourris tes
     tomates »). Regroupé dès deux plantes (« Nourris 3 plantes », feuille pour cocher chaque plante).
   - Suit les réglages de rappels existants (heure, plage calme, plantes suivies).

5. **Liste de courses pour la jardinerie**
   - S'ouvre depuis la carte « À anticiper » et depuis l'onglet Balcon.
   - Calculée : terreau en litres selon la taille des pots (« Je ne sais pas » → proposer de choisir la taille),
     engrais selon les fiches, godets et pots plus grands annoncés par « À anticiper ».
   - On coche en magasin ; partage possible (SMS, WhatsApp). Aucune marque citée.

6. **Arrosage météo selon la taille du pot (gratuit), puis « coach d'arrosage » (Balco+)**
   - Gratuit : l'arrosage tient compte de la météo et de la taille du pot.
   - Balco+ : coach précis (vent, évaporation, volume, type de plante).
   - Toujours une ligne par plante, regroupée dès deux plantes.

7. **Consignes pour le voisin qui arrose**
   - Bouton dans le mode vacances : « Prépare les consignes pour qui arrose ».
   - Texte clair, plante par plante, selon les règles d'arrosage de l'étape 6 (pot, saison, chaleur annoncée), avec
     les dates des vacances. Modifiable avant l'envoi, envoyé par le partage du téléphone (pas de module natif).
   - Petite ligne finale « Préparé avec Balco », qu'on peut retirer.

8. **« Que planter à la place ? » et traitement naturel**
   - Après une récolte ou une fin de saison : « Que planter à la place ? ».
   - Traitement naturel dans les réponses d'Observer : prudent, jamais de produit chimique.

9. **Calculateur de poids** (Réglages → Mon balcon)
   - Estimation seulement : environ 1 kg par litre de terreau mouillé, plus le pot.
   - Repère : « souvent 350 kg/m² pour un balcon récent, parfois moins dans l'ancien » ; conseil de vérifier auprès
     du syndic. Plantes seulement pour commencer.

10. **Écran Balco+ refait**
    - Annuel mis en avant (29 €/an contre 4,99 €/mois), prix fondateur, essai de 7 jours, pause de l'abonnement.
    - Déclencheurs : 2ᵉ photo du mois, 6ᵉ question à Nora, premier soir de gel, activation du coach.
    - Pas de limite de plantes en gratuit. Reste en « Me prévenir » tant que le paiement n'est pas branché.

## Reporté

- Plantes d'intérieur.
- Planificateur de balcon : à fusionner avec le « balcon visuel » de la version suivante, en zones simples.

## Avancement

1. **Taille du pot : codée et validée sur son téléphone le 11/10.** `lib/plants/pot-size.ts` (`PotSize`, `POT_LITERS`
   4 / 10 / 22 / 20 L, `potSizeOf`, `potSizeLabel`, `potLitersOf`) ; `GardenPlant.potSize` (absent = « Je ne sais pas »),
   `setPlantPotSize` (garden-context) ; colonne `reminder_plants.potSize` (migration 0018) et synchro ; feuille
   `components/pot-size-sheet.tsx` (dessins `PotSizeArt` en react-native-svg, déjà dans l'app : rien à réinstaller ;
   `art` ajouté à `ChoiceList`) ; ligne « Pot » de la fiche (la pastille devient « Pot conseillé : 5 L ») ; feuille
   « Dans quel pot ? » après l'ajout depuis le catalogue (« Passer », « Annuler » par-dessus). Pas dans l'accueil, ni
   dans les ajouts depuis Saisons, Aujourd'hui ou un temps fort (la fiche suffit). Tests `tests/pot-size.test.ts`,
   synchro, e2e « catalogue : ajouter une plante puis ouvrir sa fiche ».
2. **Fiches « Spécial Pot » : codées le 12/10, validées sur son téléphone le 12/10 (« parfait et très lisible »).** Recherche web en deux passages (consignes
   dans `scripts/pots/`) : 90 plantes vérifiées sur 2 sources au moins, 11 estimations affichées comme telles (son choix
   « A » du 12/10 : « Estimation : peu de sources sur cette plante en pot. »). Données `lib/plants/pot-sheets-data.ts`,
   logique `lib/plants/pot-sheet.ts` (`potSheetFor`, `SOIL_LABELS`, `feedingValue`, `feedingDetail`, `potFit`), sources
   lisibles `docs/sources-pots.md`. Fiche : carte « Spécial pot » (`components/pot-sheet-card.tsx`) : Ton pot (avec
   « Assez grand » / « Un peu juste »), Profondeur, Volume, Terreau (+ conseil), Engrais. Les volumes vérifiés
   remplacent le « pot conseillé » du catalogue (`potLiters`, souvent plus grand : menthe 5 → 15 L) ; seuil du
   pas-à-pas « grand pot pour des années » relevé de 15 à 25 L (`BIG_POT_LITERS`) pour le garder aux petits fruits.
   Catalogue : « Pot d’au moins 15 L, 20 cm de terre ». À reprendre à l'étape 4 : les rappels d'engrais actuels
   (`lib/plants/fertilizing.ts`, 33 plantes) ne suivent pas encore les fiches (ex. tournesol nain : rappel tous les
   21 jours, fiche « Un peu »).
   **Retours du 12/10, corrigés** : (1) tout en centimètres, plus aucun litre de pot à l'écran (fiche, catalogue,
   pas-à-pas, À anticiper, rempotage : `potNeedFor`, `potNeedShort`, `potNeedText`, `roundPotWidthCm`, largeur arrondie
   aux 5 cm d'un pot aussi haut que large) ; (2) conseil propre à la jardinière (`potFit` : « Place pour 4 pieds dans
   60 cm », « Jardinière trop peu profonde : il lui faut 30 cm de terre ») ; (3) pot trop petit en visuel : dessin des
   deux pots à la même échelle (le sien en orange, celui qu'il faut en pointillés verts), titre « ⚠︎ Pot trop petit »,
   « Prends un grand pot » (ou « un bac de 45 cm ou plus »), carte bordée d'orange, « Changer › ». Formes types des
   tailles : `POT_SHAPES` (pot-sheet.ts).
   **Retours du 12/10 (après validation), faits le 13/10** : (1) pas-à-pas selon les fiches : terreau de la fiche dans
   « Ce qu'il te faut » (`soilSupplies` : compost, sable, terre de bruyère…), étape « Remplis de terreau mêlé d'un tiers
   de sable », profondeur du pot, engrais dans « Et après ? » (`feedingNext`) ; `docs/pas-a-pas.md` refait par
   `scripts/pas-a-pas/mettre-a-jour.ts`. (2) Ajout d'une plante : « Dans quel pot ? » dit ce qu'il lui faut, « ✓ Le plus
   adapté » / « Trop petit pour elle » sous chaque taille (`hintTones` de `ChoiceList`), puis « Pot noté : il lui
   convient » ou « Pot noté, mais trop petit : prends un grand pot » (avec « Annuler »). (3) Rempotage : pot suivant
   `nextPotFor` (celui de la fiche si son pot est trop petit, sinon 5 cm de plus ; inconnu : fiche + 5 cm par rempotage),
   terreau de la fiche (`soilPhrase`) ; un pot trop petit avance le rempotage d'une vivace dès ses mois de rempotage,
   même la première saison (`potCareFor`, `CalendarSubject.potSize`). (4) Lenteurs du catalogue : feuillage animé en
   continu derrière 101 cartes translucides (redessin permanent) → décor immobile sur cet écran (`still` de
   `LightScreen`/`BalconySky`), lignes mémorisées (`CatalogRow`), recherche différée (`useDeferredValue`).
   **Retour du 13/10** (« affichage trop dense ») : plus de feuille « Dans quel pot ? » à l'ajout. Balco donne d'office la
   taille conseillée par la fiche (`recommendedPotSize` : la plus petite qui suffit, sinon un grand pot ; appliqué dans
   `addPlant` de garden-context, donc pour tous les ajouts) et le dit dans le message du bas : « Ajouté : Menthe en pot
   moyen (20 à 30 cm) » (`potSizePhrase` ; catalogue, Saisons, Aujourd'hui, temps forts). On la change sur la fiche ; la
   feuille n'y marque plus que « ✓ Conseillé ». Les plantes déjà sur le balcon gardent leur taille (ou « Je ne sais pas »).
3. **Accueil enrichi**, découpé en trois livraisons (13/10) : 3a simulateur de soleil, 3b diagnostic du balcon,
   3c première tâche liée au pot.
   - **3a, simulateur de soleil : codé le 13/10, validé sur son téléphone le 13/10.** `lib/garden/sun.ts` : position du soleil (déclinaison,
     angle horaire, heure solaire), heures de soleil direct au quart d'heure selon l'orientation (S/E/O/N), la latitude
     de la ville (Paris par défaut) et la date ; soleil caché sous 10° (toits), sous 25° avec un vis-à-vis, au-dessus de
     55° si le balcon est couvert, et quand il rase la façade (plus de 75° de côté) ; moyenne du 15 de chaque mois
     d'avril à septembre, à la demi-heure ; plein soleil ≥ 6 h, mi-ombre 3 à 6 h, ombre < 3 h (Paris : sud 7 h 30,
     est et ouest 5 h 30, nord 0 h 30). Accueil : « De quel côté est ton balcon ? » (4 orientations + « Je ne sais
     pas ») puis « Ton balcon a-t-il de l'ombre ? » (couvert, vis-à-vis, résultat recalculé à chaque case). Réglages →
     Soleil : même simulateur, enregistré à chaque toucher, valeur « Plein sud · plein soleil ». Réponses
     `orientation`, `covered`, `facing` dans `OnboardingAnswers` (synchronisées), `sunlight` en découle (`sunPatch`).
   - **3b, diagnostic du balcon : codé le 13/10, validé sur son téléphone le 13/10.** `lib/garden/balcony-diagnosis.ts` (`diagnoseBalcony`, nos
     règles, sans IA) : soleil en heures et ce qu'il permet, « Chaud l'été » (sud ou ouest en plein soleil, non couvert),
     « La pluie passe à côté » (couvert), « Le soleil bas est caché » (vis-à-vis), « Peu pour les légumes-fruits »
     (ombre), la place, le climat de la ville (`frostNote`), deux plantes déjà là qui voudraient plus de soleil, trois
     plantes qui y pousseront bien (`recommendPlants`). Écran `app/diagnostic.tsx` : à la fin de l'accueil
     (`/diagnostic?first=1`, « Voir mon balcon ») et Réglages → Mon balcon → « Diagnostic de ton balcon ». À reprendre à
     l'étape 6 (arrosage météo) : un balcon couvert ne devrait pas recevoir « N'arrose pas, il pleut ».
   - **3c, première tâche liée au pot : codée le 13/10, validée sur son téléphone le 14/10 (« nickel », après la carte en une ligne).** `lib/garden/first-pots.ts` (`firstPotsCard`) :
     pendant les 14 jours qui suivent l'accueil (pas après « Passer »), carte prioritaire sur Aujourd'hui (`pots` en tête
     de `pickTodayCards`, `components/today/first-pots-card.tsx`) : « Prépare tes pots » (plantes à planter : « Un pot
     percé d'au moins 30 cm de large, du terreau neuf mêlé de sable. ») ou « Vérifie tes pots » (plantes déjà là :
     « Noté : moyen (20 à 30 cm). C'est bien ça ? », en orange si le pot noté est trop petit). Chaque ligne a le dessin
     du pot et ouvre la fiche directement sur « Dans quel pot ? » (`/garden/<id>?pot=1`) ; « C'est bon » la ferme pour
     de bon (`first-pots:<date de l'accueil>` avec les cartes fermées des temps forts). E2e dans `1-parcours`.
     **Retour du 14/10** (« liste beaucoup trop grande dès plusieurs plantes ») : une seule ligne sur Aujourd'hui, quel
     que soit le nombre de plantes (« Vérifie le pot de 9 plantes · 1 trop petit · 6 à choisir », en orange s'il y a un
     pot trop petit) ; le détail dans une feuille du bas, une ligne courte par plante, les pots à corriger d'abord
     (trop petit, à choisir, à préparer, puis ceux qui vont bien), « C'est bon » en bas. Proposé ensuite : regrouper les
     plantations de saison sur Aujourd'hui dès 2 plantes (« Plante ou sème 7 plantes de saison »), accepté le 14/10.
   - **Étape 3 fusionnée dans `main` (PR #42, 14/10).**
   - **Plantations regroupées sur Aujourd'hui : codé et validé sur son téléphone le 14/10.** Groupe `planting` de `layoutTodayList`
     (`lib/garden/today.ts`) : dès 2 semis ou plantations du mois (gestes `sow` / `plant`, dont le 1ᵉʳ geste d'une plante
     « à planter »), une ligne « Plante ou sème N plantes de saison » (« Plante » ou « Sème » seuls quand tous sont du même
     type), « Ce mois-ci · aubergine, chou-rave… ». Feuille du bas commune avec l'arrosage et la récolte : « Pas besoin
     de tout faire aujourd'hui : tu as le mois », chaque plante se coche, la ligne ouvre son détail et son pas-à-pas.
     Rempotage, terre du dessus et gestes de suite restent une ligne par plante. E2e : `openPlantings` (helpers).
4. **Rappels d'engrais tirés des fiches : codés le 12/10, validés sur son téléphone le 13/10 (PR #44).** `lib/plants/fertilizing.ts`
   (`feedingFor`, `fertilizeTask`) lit la fiche Spécial pot de chaque plante au lieu de l'ancienne table de 33 plantes :
   « Tous les N jours » (rythme et mois de la fiche, ex. courgette tous les 7 jours de juin à août, tomates tous les
   14 jours de juin à septembre) ; « Un peu » = une seule fois dans la période (compost de la menthe en mars-avril,
   `oncePerSeason`, `periodStart`) ; rien quand l'apport se fait au semis ou à la plantation (mêlé au terreau, le
   pas-à-pas le dit : tournesol nain, roquette…) ; « Pas besoin » = rien. Jamais de novembre à février.
   - Départ : compté depuis le dernier engrais, sinon depuis l'arrivée **ou la mise en terre** (événement `<id>:start`) ;
     une fois par période : dû au début, sauf pour une plante arrivée depuis (terreau neuf) — `spacedTaskDue` (garden-logic).
   - Pas la veille d'une pluie ni par forte chaleur (`badDayToFeed`, `planDay`) : il revient le lendemain.
   - Aujourd'hui (`buildTodayList`) : engrais et arrosage le même jour = une ligne « Arrose et nourris tes tomates
     cerises » (`feed` de `TodayItem`, les deux gestes notés ensemble, « Annuler » retire les deux ; feuille du bas avec
     les deux consignes) ; engrais seul : « Nourris ton basilic », sous-titre = l'engrais de la fiche ; dès deux plantes,
     « Nourris 2 plantes » (groupe `feeding`, feuille commune) ; arrosages regroupés : « Sèche ? Arrose · engrais pour 1 ».
     Choix fait en codant : l'engrais s'affiche aussi quand une récolte attend (sinon, la récolte revenant chaque jour
     de l'été, il ne serait jamais venu).
   - Notification (`lib/garden/feeding-reminder.ts`, `nextFeedingReminder`) : le prochain jour où une plante suivie est à
     nourrir, à l'heure des rappels, hors plage calme et vacances, une seule pour toutes les plantes de ce jour
     (« Nourris 3 plantes 🌿 ») ; programmée par Aujourd'hui (source `balco-feeding`), seulement rappels activés. Pas de
     module natif. Saisons : « Une fois, mars–avril : … » pour les apports uniques. E2e `22-engrais`.
   - **Retour du 12/10 (capture en juillet 2027 simulé, 13 « Ta saison de … est finie ? » à la suite), ses 2 choix :**
     (1) dès deux questions de fin de saison ou de récolte en une fois, une seule ligne « Fais le point sur N plantes en fin
     de saison » (groupe `season-end` de `layoutTodayList`) ; la feuille du bas ouvre le pot libre de la plante cochée ;
     (2) une saison finie depuis plus de 6 mois sans réponse est tenue pour finie (`settleLongOverSeasons`,
     `LONG_OVER_DAYS` = 183, harvest-end.ts, appliqué par `use-day-plan` et Réglages) : plus de question, « Ton pot est
     libre » replié dans les gestes pas urgents.
5. **Liste de courses pour la jardinerie : contenu validé le 13/10, codée le 13/10, validée et fusionnée (PR #46).**
   Logique `lib/garden/shopping.ts` (`shoppingList`, `shoppingShareText`, `sackText`, `feedFamily`), écran `app/shopping.tsx`
   (route `/shopping`), coches `lib/garden/shopping-checks.ts` (sur le téléphone, effacées après 45 jours). Fenêtre : ce
   mois-ci et les 6 semaines qui viennent (`shoppingMonths`, comme « À anticiper »).
   - Pots : plantes « à planter » dont le semis ou la plantation tombe dans la fenêtre (taille notée ; « Je ne sais pas » :
     largeur de la fiche et « Touche pour choisir la taille du pot », qui ouvre la fiche sur « Dans quel pot ? ») et
     envies du printemps ; pot plus grand des rempotages annoncés (`nextPotFor`, pas déjà rempoté ce mois-ci) ; pots
     identiques regroupés (« 2 × Grand pot (30 à 40 cm) »), « Percé au fond ».
   - Terre : litres de ces pots (`POT_LITERS`, sinon la fiche) selon le terreau de la fiche (compost ou sable pour un
     tiers, terreau léger, terre de bruyère, terreau pour agrumes), avec le sac à prendre (10, 20, 40, 50 L).
   - Billes d'argile (ajoutées le 13/10, à sa demande) : une couche de 2,5 cm au fond de chaque pot de la liste (4 cm
     dans un bac de plus de 40 cm), sac de 3, 5, 10, 20 ou 50 L ; sources dans `docs/sources-pots.md`.
   - Semis : godets (« une dizaine par semis ») et terreau de semis (3 L par semis) des semis au chaud ; si la plantation
     tombe aussi dans la fenêtre, le pot en plus.
   - Engrais : celui des fiches pendant ses mois seulement, un par famille (tomates/potasse, fleurs, purin d'ortie /
     légumes, petits fruits, agrumes, terre de bruyère, compost, liquide aux algues), pas pour un pot libre.
   - Entrées : feuille de « À anticiper » (« 🛒 Ma liste de courses ») et onglet Balcon. « Partager ma liste » par le
     partage du téléphone (texte affiché à copier si le partage échoue), « Préparé avec Balco » en bas, « Tout décocher ».
     Aucune marque. E2e `23-courses`.
6. **Arrosage selon le pot et la météo.** Choix tranchés le 13/10 (avec claude.ai, document `docs/decisions-etape-6.md`) :
   coefficients proposés notés comme estimation Balco, litres arrondis au demi-litre, interrupteur unique « Simuler
   Balco+ » (version de test, doit marcher même si le coach est calculé par le serveur), 6a puis 6b, soleil réservé au
   coach, coach en valeur arrondie (« environ 1,5 L »), balcon couvert = pas d'eau économisée les jours de pluie.
   - **6a, gratuit : codée le 13/10, validée et fusionnée (PR #47, avec le même format de détail pour tous les gestes).** `lib/plants/watering.ts` (`POT_WATERING_FACTOR`,
     `wateringIntervalHours`, `wateringLiters`, `wateringSubtitle`, `WATERING_ONCE_NOTE`) ; `wateringIntervalOf` /
     `wateringLitersOf` (garden-logic) servent au plan du jour, à la série de jours suivis, à la fraîcheur et à l'eau
     économisée (`litersPerWatering`). Profil de soin (`careProfileFor(resolved, balcony)`) : rythme du pot,
     `wateringLiters`, `sheltered` (balcon couvert) ; moteur : pluie ignorée si `sheltered` (« Balcon couvert : la pluie
     n'arrive pas à tes pots. Sèche sur 2 cm ? Arrose environ 2 L, jusqu'à ce que ça coule. »), donc ni « N'arrose pas »
     ni eau économisée. Le serveur passe la taille du pot et le balcon couvert (après la fusion). Aujourd'hui :
     sous-titre « Sèche sur 2 cm ? Arrose environ 2 L » (« …, puis l'engrais » avec l'engrais), détail avec la consigne
     de la plante + « Arrose environ 2 L, jusqu'à ce que ça coule. » ; repère « 1,5 L, c'est une grande bouteille… vide
     la soucoupe après 30 min » dans le premier détail d'arrosage ouvert, une seule fois (`lib/garden/once-notes.ts`).
     Sources : estimations notées dans `docs/sources-pots.md`. Tests `tests/watering.test.ts`, e2e `24-arrosage`.
     **Retour du 13/10** (« le contenu est bon, mais pas assez visible ») : pastille « 💧 2 L » sur chaque ligne
     d'arrosage (`badge` de `TodayRow`, total sur « Vérifie la terre de N plantes »), sous-titre raccourci « Sèche sur
     2 cm ? Arrose au pied » ; détail d'un arrosage refait : bandeau « ☂️ Balcon couvert », quantité en grand avec des
     grandes bouteilles dessinées (`components/today/water-dose.tsx`, `bottlesText` : « ≈ 1 grande bouteille et ⅓ »),
     trois gestes courts avec icônes (doigt, arroser jusqu'à ce que ça coule, vider la soucoupe après 30 min), l'engrais
     dans un encadré à part, plus de « Pourquoi : Délai de 48 h dépassé » technique. Le repère de la bouteille est
     désormais dessiné à chaque fois (plus de phrase dite une seule fois).
     **Puis (13/10, à sa demande « uniformiser ce nouveau design pour les autres gestes »)** : le détail de tous les
     gestes d'Aujourd'hui suit le même format (`lib/garden/gesture-detail.ts`, `gestureDetail`, `gestureKindLabel` ;
     dessin `components/today/gesture-detail-view.tsx`) : petite ligne du type de geste (« Plantation · ce mois-ci »,
     « Récolte », « Engrais »…), bandeau éventuel (« ✓ Fait à 14 h 33 », « ☂️ Balcon couvert »), un repère en grand sur
     fond vert pâle avec une grande icône, puis 2 à 4 gestes courts avec icône. Repères : planter = largeur du pot (fiche)
     et profondeur de terre, gestes terreau de la fiche / motte au même niveau / tasser / « Arrose bien, environ 2 L » ;
     semer = profondeur du semis (`PLANTING`), graines par trou et écart, pluie fine, levée ; semis au chaud = « 18 à
     22 °C », godets, humidité, levée ; rempoter = largeur du pot suivant (`nextPotFor`), signe, racines, terreau,
     arroser ; terre du dessus = « 5 cm » ; récolte = « Jusqu'en octobre » (fin de la période en cours), consigne de la
     plante, « Récolte souvent » ; engrais = « 14 jours » entre deux engrais (ou « 1 fois »), arroser d'abord, l'engrais,
     au pied ; entretien, gestes de suite et alertes météo = leur texte découpé en gestes courts. Tests
     `tests/gesture-detail.test.ts`, e2e `25-gestes`.
   - **6b, coach d'arrosage Balco+ : codé le 13/10, validé et fusionné (PR #48).** Prochaine étape : 7 (consignes pour le voisin). Moteur `lib/plants/watering-coach.ts`
     (`coachAdvice`, `coachSummary` ; paramètres et sources dans `docs/sources-pots.md`) : eau restante dans le pot,
     arroser ou non aujourd'hui, quantité au demi-litre, prochain arrosage, rythme du jour. Calculé dans l'app
     (`use-day-plan` : `coach`, `isPlus`), avec la météo déjà chargée et le soleil du balcon (orientation, couvert,
     vis-à-vis de l'accueil). Balco+ = forfait du compte ou interrupteur « Simuler Balco+ » (Réglages → Version de test,
     `hooks/use-balco-plus.ts`, sur ce téléphone seulement, ne change ni le compte ni les limites du serveur). En Balco+ :
     le plan du jour suit le coach (`coach` de `planDay` : arrosage proposé seulement quand la terre a soif, sa quantité ;
     les rappels utilisent son rythme et sa quantité via `careProfileFor(…, coach)`), bandeau « ✨ Coach Balco+ » dans le
     détail, carte « Coach d'arrosage Balco+ » dans la fiche (« Arrose environ 3 L ce soir » ou « Pas besoin aujourd'hui ·
     prochain arrosage dans 2 jours », jauge d'eau). En gratuit : carte « Coach d'arrosage · bientôt avec Balco+ ».
     Les rappels du serveur gardent la version gratuite (le coach n'y est pas encore). Tests `tests/watering-coach.test.ts`,
     e2e `26-coach`.
7. **Consignes pour le voisin qui arrose : codées le 13/10, validées et fusionnées (PR #49).** Logique
   `lib/garden/helper-note.ts` (`helperPlants`, `helperPlantWatering`, `helperVisits`, `heatNow`, `helperNoteText`,
   `helperNoteMessage`), écran `app/helper-note.tsx` (route `/helper-note`). Mode vacances avec « Oui, un proche passera » :
   la liste « Pour la personne qui arrose » suit maintenant les règles de l'étape 6a, et le bouton « Prépare les consignes
   pour qui arrose » ouvre le texte, modifiable.
   - Plante par plante (sans les plantes « à planter ») : taille du pot (« pot moyen »), quantité (`wateringLitersOf`,
     « environ 2 L ») et rythme : rythme du pot (`wateringIntervalOf`) × saison (×1 en juin-août, ×1,5 en mai et
     septembre, ×2 en avril et octobre, ×3 l'hiver, comme l'ancienne liste), « presque rien » hors des mois d'arrosage ;
     de mai à septembre, le rythme par forte chaleur (moitié du rythme, « chaque jour s'il fait plus de 30 °C ») ; quoi
     récolter si c'est la saison.
   - Quand passer : premier passage après l'arrosage copieux du départ, au rythme de la plante la plus assoiffée
     (« Premier passage jeudi 15 juillet, puis tous les 2 jours jusqu'au 19 juillet », « Un passage suffit », ou « Pas
     besoin de passer avant mon retour, sauf forte chaleur »).
   - Chaleur annoncée : la prévision ne couvre que deux jours, donc « Il fait chaud en ce moment (32 °C) : arrose le
     soir… » seulement si le départ est aujourd'hui ou demain et que le maximum du jour dépasse 30 °C.
   - Comment arroser : le doigt dans la terre (sèche sur 2 cm), au pied jusqu'à ce que ça coule, la grande bouteille de
     1,5 L ; balcon couvert : « arrose même s'il pleut », sinon « s'il a bien plu, tu peux sauter un arrosage ».
   - Texte modifiable, brouillon gardé sur le téléphone pour ces dates-là (`balco.vacation.helper-note.v1`), « Revenir
     au texte de Balco » ; case « Ajouter « Préparé avec Balco » à la fin » (cochée d'office) ; « Envoyer les consignes »
     par le partage du téléphone (sinon le texte s'affiche à copier). Aucun module natif.
   - Choix faits en codant : version gratuite (pot et saison) même en Balco+, le coach dépendant de la météo du jour ;
     écran à part plutôt qu'une feuille du bas (texte long à modifier). Tests `tests/helper-note.test.ts`, e2e
     « mode vacances : les consignes pour qui arrose… » (`3-compte-et-vacances`).
8. **« Que planter à la place ? » et traitement naturel**, en deux livraisons : 8a puis 8b (traitement naturel dans
   Observer).
   - **8a, « Que planter à la place ? » : codée le 13/10, validée et fusionnée (PR #50, 14/10).** Dans la feuille « Ton pot est
     libre » (après une récolte en une fois ou une fin de saison, Aujourd'hui et fiche) : « Ressemer… » s'il est encore
     temps, puis la section « Que planter à la place ? » avec trois idées au plus (au lieu d'une ou deux), puis « Laisser
     le pot vide ». Logique `lib/garden/replant.ts` (`replantIdeas`, `fitsFreedPot`, `replantSoilTip`, `rotationNote`),
     appelée par `freePotChoices` (harvest-end.ts).
   - Les idées : suggestions de saison (soleil, espace, envies, climat) à semer ou planter ce mois-ci dans le pot (pas
     de semis au chaud), sinon le mois suivant (« En novembre · … », message « Mâche notée : Balco te la proposera en
     novembre ») ; qui tiennent dans ce pot (`potFit` de sa taille notée, sinon pas plus grand que la plante d'avant) ;
     jamais de la même famille (`lib/plants/families.ts`, 12 familles, les autres plantes seules de leur famille) ; les
     annuelles avant les vivaces ; après une gourmande (engrais régulier dans sa fiche), les sobres d'abord.
   - Sous le titre : « Pas de la famille du chou : mêmes maladies dans la terre. » et le geste pour la terre (« remplace
     un tiers de la terre par du terreau neuf mêlé de compost » après une gourmande, sinon « aère la terre et mêles-y une
     poignée de compost »). Règles et sources : `docs/sources-rotation.md`.
   - La nouvelle plante garde la taille du pot libéré (`addPlant(…, { potSize })`).
   - Choix faits en codant : « Ressemer » reste proposé (semis échelonnés dans la même saison) ; pas de lien vers le
     catalogue entier (la feuille resterait courte). Tests `tests/replant.test.ts`, e2e « pot libre : Que planter à la
     place ? » (`14-apres-recolte`).
   - **Retour du 14/10** (capture : « Oui » du message du bas peu visible, caché par la barre d'Android au-dessus d'une
     feuille du bas) : le bouton du message du bas (`components/today/undo-toast.tsx`) est une pastille d'au moins 44
     points (« Oui » en vert plein, « Annuler » en blanc), texte sur 3 lignes, une question reste 9 s au lieu de 5 ; au
     -dessus d'une feuille du bas, le message tient compte de la marge du bas du téléphone (`bottom={insets.bottom + 16}`
     dans Aujourd'hui, Saisons et la fiche).
   - **Retours du 14/10, ses choix** : (1) catalogue en **un seul « + »** au lieu des deux boutons « Déjà sur mon balcon /
     À planter » (mal alignés) : Balco choisit « à planter » quand c'est le moment de la semer ou de la planter, sinon
     « déjà sur mon balcon » ; le message du bas propose l'autre choix (« Pas encore plantée ? », « Déjà plantée ? »,
     accordé) et « Annuler » (deuxième bouton du message, `onCancel` de `ToastMessage`) ; la fiche du catalogue n'a plus
     qu'« Ajouter à mon balcon ». (2) **Hors saison, prévenir et garder pour le printemps** : « à planter » alors que ce
     n'est pas sa saison → « Aubergine : à semer au chaud dès février. Balco te la reproposera au printemps » (envie du
     printemps, carte de mars, notification du 1er mars ; si sa saison revient de juin à janvier, elle attend sur le
     balcon : « À planter en août : … ») ; annuelle frileuse ajoutée « déjà là » de septembre à décembre → « Fin de
     saison : récolte avant les premières gelées ». Logique `lib/garden/catalog-add.ts` (`defaultAddChoice`,
     `toPlantPlan`, `installedText`, `toPlantText`, `switchLabel`), tests `tests/catalog-add.test.ts`, e2e « catalogue :
     ajouter une plante d'un + » (`1-parcours`, en octobre).
   - **Retour du 14/10 sur le « + »** (« on tourne en rond » : « Déjà plantée ? » puis « Pas encore plantée ? » dans le
     message du bas) : le « + » ouvre une feuille du bas avec **une question et deux cartes** qui disent ce qui va se
     passer avant de toucher : « Où en est ton aubergine ? » → 🪴 « Déjà sur mon balcon » (« Balco te dit quand l'arroser
     dès aujourd'hui », ou en orange « Fin de saison : récolte avant les premières gelées. ») et 🌱 « Pas encore plantée »
     (« C'est le moment » + « Le pas-à-pas t'attend sur Aujourd'hui », ou « À semer au chaud dès février : Balco te la
     reproposera au printemps. »). Un toucher ajoute ; le message du bas n'a plus que « Annuler ». Les mêmes cartes
     terminent la fiche du catalogue. `addQuestion`, `addOptions` (catalog-add.ts).

   - **8b, traitement naturel dans Observer : codée le 14/10, à valider.** Observer reconnaît le problème (`problem`,
     9 au choix : pucerons, cochenilles, araignées rouges, mouches blanches, oïdium, mildiou, limaces et escargots,
     chenilles, moucherons du terreau) ; le traitement affiché vient de Balco (`lib/plants/natural-remedies.ts`,
     carte `components/natural-remedy-card.tsx`) : gestes à la main d'abord, recette seulement si simple et sûre (savon
     noir 1 c. à soupe par litre au plus, bicarbonate 5 g par litre), précautions (essai sur une feuille, le soir, ne pas
     forcer la dose, rincer avant de manger), « Pas mieux dans 10 jours ? Montre-la en jardinerie. ». Le texte libre
     « Solution naturelle » reste pour les autres cas, écarté par le serveur s'il parle d'un produit à éviter
     (`isUnsafeRemedyText`). Sources : `docs/sources-traitements.md`. Côté serveur : en ligne après la fusion (Railway).