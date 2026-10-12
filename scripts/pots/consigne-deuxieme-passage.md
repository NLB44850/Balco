# Deuxième passage : fiches « Spécial Pot » en confiance faible

Lis d'abord /tmp/claude-0/pots/consigne.md (même format, mêmes règles). Ton fichier d'entrée contient des fiches
déjà remplies mais en confiance "low" (une seule source, désaccord, ou valeur estimée). Pour chacune :
1. Fais des recherches CIBLÉES (WebSearch, extraits seulement) pour trouver une 2ᵉ source qui confirme ou corrige
   chaque valeur (profondeur, volume, terreau, engrais). Essaie aussi les synonymes et les noms latins, la
   culture « en bac », « en jardinière », « sur balcon », et des sources anglaises si rien en français
   (rhs.org.uk, gardenersworld.com, extension universitaire…).
2. LIMITE STRICTE : 45 recherches au plus pour tout ton travail (la session a un plafond partagé). Commence par
   les valeurs les plus utiles (volume et profondeur), puis l'engrais.
3. Vérifie la cohérence physique : un pot rond de profondeur P cm et de largeur ≈ P contient environ
   P×P×P/2000 litres (20 cm → 4 L, 25 cm → 8 L, 30 cm → 13 L, 40 cm → 30 L). Si `liters` est bien plus petit que ce
   qu'impose `depthCm` pour un pot rond, corrige (un pot étroit et profond reste possible mais rare : justifie-le).
   Une jardinière de 60 cm × 20 cm × 18 cm ≈ 20 L.
4. Mets à jour `confidence` : "medium" ou "high" seulement si 2 sources concordent désormais ; sinon garde "low"
   (ce sera affiché « Estimation : peu de sources sur cette plante en pot »). Ajoute les nouvelles URL réellement
   vues à `sources` et réécris `note` (une phrase).
Écris le tableau complet mis à jour (toutes les plantes de ton fichier, même non modifiées) dans le fichier de
sortie indiqué, vérifie que c'est un JSON valide, puis réponds en 4 lignes : plantes passées en medium/high, et
celles restées low.
