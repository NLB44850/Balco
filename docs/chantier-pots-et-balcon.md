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
2. **Fiches « Spécial Pot » : codées le 12/10, à valider sur son téléphone.** Recherche web en deux passages (consignes
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
