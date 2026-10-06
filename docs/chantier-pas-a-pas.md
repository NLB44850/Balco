# Chantier : pas-à-pas pour planter, et fin de l'accueil (plan proposé le 6 octobre 2026)

Statut : **plan validé le 6 octobre (« OK pour les 3, enchaîne toutes les étapes »)** : ordre accueil d'abord,
« J'ai déjà » commun pour terreau / billes / arrosoir et par plante pour le reste, rappel du samedi à 9 h.

Avancement :
- P1 (fait) : `addChoices` / `ADD_CHOICE_LABELS` (`lib/plants/suggestions.ts`) ; le « + » du catalogue ouvre deux
  boutons sous la ligne, la fiche du catalogue aussi ; toast « À planter sur ton balcon : Lavande ».
- P2 (fait) : hiver = novembre à février (ou moins de 3 plantes de saison) : `seasonalStarters` renvoie aussi
  `indoor` (`lib/plants/indoor.ts` : micro-pousses, cresson, ciboulette, persil, sources citées) et `spring`
  (à semer ou planter de mars à mai). Accueil : 3 blocs, rien de coché d'office dans les deux derniers.
  Rebord intérieur : premier geste « Sème le persil à l'intérieur » (`startActivity`). Envies gardées dans
  `springWishes` (synchronisées), notification le 1er mars à 9 h (`scheduleDatedReminder`,
  `lib/garden/spring.ts`), carte « C'est le moment 🌱 » sur Aujourd'hui en mars-avril (« Ne plus me le
  rappeler »). E2e `e2e/7-hiver.spec.ts` (horloge du navigateur avancée : `page.clock.install` + `resume`).
- P5 (fait avant P3, indépendant des données) : `lib/garden/postpone.ts` (`nextSaturdayMorning`, `postponeStart`,
  clé de mise en sommeil `start:<plantId>`) ; `planDay({ postponed })` cache le premier geste jusqu'au samedi
  9 h ; feuille du bas d'Aujourd'hui « Pas encore acheté ? Rappelle-moi samedi » + toast « Je te le rappelle
  samedi » avec « Annuler » ; notification « C'est samedi 🌱 · Pense au plant : … » si les rappels sont activés.
- P3 (fait) : `lib/plants/planting.ts` (100 plantes, sources par plante, recherche faite par 4 sous-agents en
  parallèle, choix notés dans `docs/sources-calendrier.md`) ; `lib/plants/guide.ts` : 5 modèles (le 5ᵉ,
  `plant-bulb`, pour ail, pommes de terre, oca, crosnes, dahlias), `supplies` (« Ce qu'il te faut », objets
  communs `shared`), `whatsNext` (« Les pousses sortent dans… », « Première récolte dans… »), `delayText`.
- P4 (fait) : audit : avant, 2 plantes seulement avaient « Éclaircis… ». `lib/garden/follow-ups.ts`
  (`followUpsFor`) : après un premier geste `<id>:start`, « Éclaircis… » (65 plantes à éclaircir, une semaine
  après la levée la plus lente), « Sors tes plants de basilic sur le balcon » (semis au chaud ou à l'intérieur, au
  mois de plantation, 4 semaines au moins après), « Pince… » (33 plantes, texte des données) ; chacun une fois
  (`<id>:thin|outdoors|pinch`), effacé après 3 semaines d'oubli ; `CalendarActivity.followUp`. Corrigé au
  passage : une plante semée ou plantée ce mois-ci ne se voit plus reproposer « Sème… » le même mois.
- P6 (fait) : 22 dessins au trait (`components/guide/illustrations.tsx`, noms dans `illustration-names.ts`),
  vert Balco, terre beige, une flèche pour le geste ; relus sur capture (7 redessinés : arbuste qui faisait un
  visage, bulbe, mains, ciseaux, doigts, sachet de graines, trou de la motte). Écran de revue `app/illustrations.tsx`
  (Réglages → Version de test → « Illustrations du pas-à-pas ») ; e2e `e2e/8-illustrations.spec.ts` (capture
  `dist/illustrations.png`).
- P7 (fait) : écran `app/guide/[catalogId].tsx` (`plantId` pour cocher, `mode=need` depuis le catalogue) :
  « Ce qu'il te faut » (« J'ai déjà » sous `balco.guide.have.v1`, objets communs pour toutes les plantes,
  « Partager ce qui manque · N » par le partage du téléphone), étapes qu'on fait glisser (ou « Suivant »), erreur à
  éviter en orange à son étape, « Et après ? » (`whatsNext` + `nextGestures`) et « C'est planté / C'est semé »
  (même événement `<id>:start` qu'Aujourd'hui, coche + retour, pas de fête). Étapes : `guideSteps` dans
  `lib/plants/guide.ts` (4 à 7 écrans selon le modèle). Test automatique des règles sur 100 plantes × 12 mois :
  verbe en tête, moins de 12 mots, point final, une seule erreur à éviter, pas de mot technique (a corrigé
  « collet » et une 2ᵉ erreur dans « semer au chaud »). Entrées : feuille du bas d'Aujourd'hui (« Pas à pas, avec
  ce qu'il te faut »), fiche plante (« Pas à pas… » / « Revoir le pas-à-pas »), fiche du catalogue (« 🧺 Ce qu'il
  te faut pour la planter »). E2e `e2e/9-pas-a-pas.spec.ts`. Une étape = un commit testé (check, lint, Vitest, e2e,
bundle Android), compte rendu, validation sur son téléphone avant la suivante (sauf s'il demande d'enchaîner).

## Ce que le porteur a décidé (6 octobre)

1. Entrées : les trois. Feuille du bas d'un geste « à planter » (Aujourd'hui), fiche plante, catalogue. Depuis le
   catalogue, seulement « Ce qu'il te faut ».
2. Illustrations dessinées par Claude pour cette version : simples, au trait, vert Balco, chacune compréhensible
   sans la phrase.
3. Liste partageable en texte par le bouton de partage du téléphone ; pas de liste de courses gérée dans l'app.
4. Dans « Ce qu'il te faut », chaque objet se coche « J'ai déjà » ; le partage n'envoie que ce qui manque.
5. Feuille du bas d'un geste « à planter » : « Pas encore acheté ? Rappelle-moi samedi » reporte le geste.
6. Dernier écran : ce qui va se passer ensuite (« Les pousses sortent dans 7 à 10 jours. Garde la terre
   humide. »), tiré des données du catalogue.
7. Une seule erreur à éviter par modèle de guide, placée à l'étape concernée.
8. Vérifier que les gestes de suite existent dans les rappels (éclaircir après un semis…), sinon les ajouter.
9. « C'est planté » : animation discrète, pas de fête plein écran.
10. Accueil : à l'ajout d'une plante depuis le catalogue, demander « Déjà sur mon balcon » ou « À planter ».
11. Accueil en hiver : plantes de saison + aromatiques à semer à l'intérieur + « Tes envies pour le printemps »
    avec un rappel en mars.
12. « Je ne sais pas » pour le soleil reste mi-ombre (rien à faire).

Règles d'écriture des étapes : une action par écran, commençant par le verbe, moins de 12 mots, tutoiement ;
une ligne grise facultative pour le « pourquoi » ; mesures concrètes ; aucun mot technique sans explication.
Exemple : « Mets une poignée de billes d'argile au fond. » / « Les racines ne baigneront pas dans l'eau. »

## Ce que le code dit aujourd'hui (vérifié le 6 octobre)

- 74 plantes sur 100 se sèment ; seules **2** (radis, betteraves) ont un geste « Éclaircis… ». Aucune donnée de
  levée (« pousses dans 7 à 10 jours »), de profondeur de semis, de nombre de graines par pot ni d'espacement.
- **Trou repéré** : une plante semée au chaud (basilic en mars) passe « installée » au semis ; rien ne dit ensuite
  « Sors tes plants sur le balcon » au mois de plantation. À combler à l'étape P2.
- Les reports (« Dans 3 h », « Pas aujourd'hui ») ne s'appliquent qu'aux conseils météo ; un geste « à planter »
  ne peut pas être reporté (à ajouter à l'étape P5). Ces reports restent sur le téléphone (non synchronisés).
- `react-native-svg` est déjà installé : les illustrations peuvent être dessinées en code (légères, hors ligne).

## Le plan proposé, 8 étapes

**Bloc 1 · Finir l'accueil (puis PR vers `main`)**

- **P1 · Catalogue : « Déjà sur mon balcon » ou « À planter »** (point 10). Le « + » du catalogue ouvre un petit
  choix à deux boutons (pas d'écran en plus) ; la fiche du catalogue propose les deux boutons. Défaut sûr si
  la plante n'est pas de saison : « Déjà sur mon balcon » en premier. Vitest + Playwright.
- **P2 · Hiver** (point 11). Quand moins de 3 plantes sont de saison (novembre à février surtout) :
  « Tes premières plantes » montre les plantes de saison, puis « À semer sur le rebord intérieur » (aromatiques
  et pousses qui se cultivent au chaud toute l'année ; liste vérifiée auprès de 2 sources), puis « Tes envies pour
  le printemps » (plantes cochées gardées dans les réponses de l'accueil, synchronisées). En mars : carte sur
  Aujourd'hui « C'est le moment : basilic, tomates… » avec « + », et notification locale le 1er mars à 9 h si les
  rappels sont activés. Vitest (mois par mois) + Playwright (accueil en janvier, horloge simulée).
- Puis **PR vers `main`** de tout l'accueil (onboarding + P1 + P2), après son test.

**Bloc 2 · Le pas-à-pas**

- **P3 · Données** (base de tout le reste). Pour chaque plante : son modèle de guide (semer en pot, semer au chaud
  en godets, planter un plant acheté, installer une vivace ou un arbuste en grand pot), profondeur de semis
  (« 1 cm, l'épaisseur d'un doigt »), graines ou plants par pot, écart, jours de levée, délai avant la première
  récolte. Vérifié comme le calendrier (recherche web, 2 sources concordantes, repère culture en pot), sources
  ajoutées à `docs/sources-calendrier.md`. « Ce qu'il te faut » calculé depuis ces données (taille du pot, terreau,
  billes, graines ou plant, godets pour un semis au chaud…). Vitest : 100 plantes complètes et cohérentes.
- **P4 · Gestes de suite** (point 8). Audit des 100 plantes, puis gestes datés depuis le semis ou la plantation,
  comme l'engrais : « Éclaircis les radis » (~15 jours après un semis à plusieurs graines), « Sors tes plants de
  basilic sur le balcon » (au mois de plantation, après un semis au chaud), « Pince… » quand c'est utile.
  Une ligne par plante sur Aujourd'hui, comme toujours. Vitest sur le plan du jour.
- **P5 · « Pas encore acheté ? Rappelle-moi samedi »** (point 5). Dans la feuille du bas d'un geste à planter :
  la ligne disparaît jusqu'au samedi suivant (samedi prochain si on est samedi), revient ce jour-là, notification
  locale à 9 h si les rappels sont activés. Vitest + Playwright.
- **P6 · Les illustrations** (point 2). Une vingtaine de dessins au trait (pot percé, billes d'argile, terreau,
  trou du doigt, graines, godets au chaud, motte, arrosoir, tasser, éclaircir, soucoupe…). **Écran de revue**
  dans Réglages → Version de test → « Illustrations » pour que tu les valides avant qu'elles servent.
- **P7 · Le guide** (points 1, 3, 4, 6, 7, 9). Écran `Pas à pas` : 1) « Ce qu'il te faut » avec « J'ai déjà »
  et « Partager ce qui manque » ; 2) 4 ou 5 étapes qu'on fait glisser (illustration + phrase, ligne grise
  facultative, l'erreur à éviter du modèle à son étape) ; 3) « Et après ? » (levée, prochains gestes, première
  récolte) et « C'est planté » (coche le geste, petite animation, pas de fête plein écran). Entrées :
  feuille du bas (Aujourd'hui), fiche plante (« Comment la planter » tant qu'elle est à planter, « Revoir le
  pas-à-pas » ensuite), catalogue (« Ce qu'il te faut » seulement). Textes relus contre les règles d'écriture
  (test automatique : verbe en tête, moins de 12 mots). Vitest + Playwright.
- **P8 · Bilan** : parcours de bout en bout, documentation, PR vers `main`.

## Questions posées au porteur

1. Ordre : finir l'accueil (P1, P2, PR) avant le pas-à-pas ?
2. « J'ai déjà » : retenu pour toutes les plantes pour les objets communs (terreau, billes, arrosoir), et par
   plante pour le reste (pot, graines, plant) ?
3. Samedi : rappel à 9 h ?
