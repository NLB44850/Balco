# Chantier : refonte de l'onboarding (plan validé le 6 octobre 2026)

Document de reprise : tout ce qui a été établi dans la conversation du 6 octobre. **Le plan est validé par
le porteur, avec toutes les propositions de Claude (« OK pour tes propositions »).**

**Avancement** : A1 validée le 6 octobre ; A2 codée le 6 octobre, **en attente de validation sur son
téléphone (APK : la version web n'a pas de notifications)**. Prochaine action après son accord : l'étape A3.

- C1 (fait, à valider) : `lib/ai/greeting.ts` (`noraGreeting`) : sans prénom, Nora demande « Comment je
  t'appelle ? » dans sa conversation (champ + OK + « Plus tard », gardé sous `balco.nora.name-asked.v1`), sans
  IA ni compte ; « Enchantée, Camille ! Tu pourras changer ton prénom dans Réglages. ». Prénom et expérience
  restent réglables dans Réglages ; sans niveau, Nora parle simplement (« considère qu'elle débute »).
  `recommendPlants` : +3 aux plantes faciles pour tout le monde, l'expérience n'y change plus rien.
- B4 (fait, à valider) : `arrivalCard` (`lib/garden/onboarding.ts`) : carte « Bienvenue, voici ton balcon 🌱 » en
  haut d'Aujourd'hui le jour de l'accueil jusqu'au premier geste coché (`completedAt` gardé et synchronisé) ;
  après « Passer », carte « Quelques questions · pour des conseils adaptés à ton balcon » qui ouvre
  `/welcome?again=1` (droit aux questions ; « Passer » ou la fin reviennent en arrière sans empiler d'onglets ;
  une plante déjà là n'est pas ajoutée deux fois). Réglages → Version de test : « Refaire l'accueil ».
- B3 (fait, à valider) : étape « Où est ton balcon ? » (juste avant les plantes ; après l'espace sur le chemin
  Oui) : « ⌖ Utiliser ma position » (seule demande de position de l'app, 20 s au plus), recherche de ville,
  « Plus tard » ; les plantes de saison suivent alors le climat de la ville. Sur téléphone, dernière étape
  « Je te préviens s'il gèle cette nuit ou si tes plantes ont soif. » (logique de A2, refus = message et
  « Créer mon balcon »). `use-local-weather.ts` ne demande plus la position d'office (sans ville : Paris et le
  bandeau de A3) ; `requestDeviceLocation` renvoie true/false. E2e : refus simulé par `denyGeolocation`.
- B2 (fait, à valider) : `app/welcome.tsx` réécrit. Bienvenue « Ton balcon, au bon moment. » + « C'est parti » /
  « Passer » ; « Tu as déjà des plantes sur ton balcon ? » ; chemins dans `onboardingSteps`
  (`lib/garden/onboarding.ts`) : Oui → Lesquelles (recherche `searchCatalog` + raccourcis `COMMON_PLANT_IDS`,
  ajoutées installées), soleil, espace ; Pas encore → soleil, espace, envies, premières plantes (à planter).
  Soleil en 3 phrases + « Je ne sais pas » (= mi-ombre, `sunlightFromChoice`). Envie `salads` « Des salades à
  couper » (catalogue retagué : 15 légumes-feuilles ; `normalizeOnboarding` convertit `zero-waste`). Plus de
  prénom ni d'expérience dans l'accueil (C1). Réponse gardée : `hasPlants`. E2e « Oui » et « Pas encore ».
- B1 (fait, à valider) : `GardenPlant.toPlant` (colonne `reminder_plants.toPlant`, migration 0015, synchro).
  À planter : un seul geste `startActivity` (`lib/plants/calendar.ts` : « Plante » si c'est le mois de
  plantation ou si la plante se plante, sinon « Sème », au chaud si besoin ; hors saison « Meilleure période… »),
  événement `<id>:start` ; état « À planter » (`TO_PLANT_LABEL`) ; ni soif ni alerte (téléphone et serveur),
  pas comptée dans la série (`inGroundSince`). Cocher le geste l'installe (`logEvent` de `garden-context`),
  « Annuler » la remet à planter. Installée : plus jamais « Plante … » (l'exception « arrivée ce mois-ci » est
  retirée). Les « + » des idées de saison (Idée du mois, Saisons, état vide d'Aujourd'hui) ajoutent « à
  planter » ; le catalogue ajoute « installée ». Nora voit « (choisie, pas encore semée ni plantée) ».
- A3 (fait, à valider) : recherche de ville sortie en composant `components/city-picker.tsx` (Saisons,
  Aujourd'hui, Réglages) ; bandeau « Météo de Paris par défaut · Choisir ma ville » sur Aujourd'hui dès que la
  météo est celle de repli ; ligne « 📍 Ta ville · Lyon » dans Réglages → Mon balcon. E2e `e2e/6-ville.spec.ts`.
- A2 (fait, à valider) : `activateReminders` dans `lib/reminders/activate.ts` (autorisation demandée d'abord,
  `enabled` + toutes les plantes enregistrés seulement après un accord, puis programmation du prochain conseil
  s'il y en a un ; refus = alerte `NOTIFICATIONS_DENIED`, rien d'enregistré). Utilisée par Aujourd'hui
  (« Activer les rappels ») et Réglages. Tests : `tests/activate-reminders.test.ts`.
- A1 (validée) : `seasonalStarters` dans `lib/plants/suggestions.ts` (plantes qu'on peut semer ou planter
  ce mois-ci dans le climat, valeurs sûres `DEFAULT_PICKS` d'abord sans réponses, phrase d'attente tirée de la
  plante phare la plus proche de chaque envie sans plante de saison). Utilisée par `welcome.tsx` (climat de
  Paris : la ville n'est pas encore demandée), l'état vide d'Aujourd'hui et les idées de Saisons (balcon vide).
  Le catalogue « adaptées » n'est pas filtré (hors du plan). Tests : `tests/seasonal-starters.test.ts`, e2e
  d'onboarding. **À signaler** : en décembre-janvier, très peu de plantes de saison (1 à 2 : micro-pousses,
  groseillier), c'est la règle appliquée telle quelle.

Règles de travail (rappel de CLAUDE.md) : une étape = un commit testé (`pnpm -s check`, `pnpm -s lint`,
Vitest avec MariaDB, `bash scripts/e2e.sh` complet avec reconstruction, `npx expo export --platform android`),
poussé sur `claude/eloquent-gates-g7xc6x` ; compte rendu en français simple avec ce qu'il doit taper et
regarder ; attendre sa validation. Décisions déjà prises à garder : une ligne à faire par plante sur
Aujourd'hui, Saisons en lecture seule, fêtes en grand rares, pas de copie des photos dans la galerie, etc.

---

## 1. État des lieux de l'onboarding actuel (vérifié dans le code le 6 octobre)

Fichiers : `app/welcome.tsx` (écrans), `lib/garden/onboarding.ts` (choix), `recommendPlants` dans
`lib/plants/catalog.ts` (plantes proposées), réponses gardées sous `balco.onboarding.preferences.v1`
(`ONBOARDING_STORAGE_KEY`, `garden-context.tsx`), synchronisées en `balconyJson` (`reminder_profiles`).
`app/(tabs)/_layout.tsx` renvoie vers `/welcome` tant qu'il n'y a pas de réponses ; `welcome.tsx` renvoie
vers `/(tabs)` dès qu'il y en a (les questions ne reviennent jamais).

**Écrans** : 0 Bienvenue (« On commence par faire connaissance. », « … Quatre petites questions, et ton balcon
est prêt. », prénom facultatif, « C'est parti », « Je regarderai plus tard ») ; 1 « Tu jardines déjà ? » (Je
débute / Je me lance / J'ai déjà un potager) ; 2 Soleil (Plutôt ombragé / Mi-ombre / Très ensoleillé) ;
3 Espace (rebord de fenêtre / jardinières / petit balcon / terrasse) ; 4 Envies, plusieurs choix (Tomates
cerises / Basilic & menthe / Fleurs pour les abeilles / Moins de gaspillage), « Passer cette question » ;
5 « Tes premières plantes » (6 plantes, les 3 premières cochées d'office), « Créer mon balcon · N plantes ».
Écrans 1 à 3 : un toucher fait avancer, pas de bouton pour passer. Barre de 5 segments (4 questions + écran
des plantes) alors que le texte dit « Quatre petites questions ».

**Ce que les réponses changent vraiment** :
- Prénom : « Bonjour », titre de Moi, Nora. Enregistré seulement à la fin.
- Expérience : petit bonus aux plantes faciles dans `recommendPlants` (+6 débutant, +2 sinon : souvent la
  même liste) et niveau de langage de Nora (avec compte). **Rien d'autre** (ni Aujourd'hui, ni rappels).
- Soleil, espace : filtrent les plantes proposées (premières plantes, suggestions, Idée du mois, catalogue
  « adaptées »), affichés dans Moi, transmis à Nora. **Rien sur les rappels.**
- Envies : font remonter des plantes (`GOAL_FLAGSHIPS`) et sont transmises à Nora. « Moins de gaspillage »
  promet « Composter, récupérer et arroser mieux » mais ne fait que favoriser les salades.
- **Défaut** : les plantes proposées ne sont pas filtrées par la saison (bonus seulement). En octobre, avec
  « plein soleil, petit balcon, tomates », 4 des 6 plantes ne se plantent pas en octobre (tomates cerises,
  œillets d'Inde, tomates naines, tomatillo) ; les idées de « Je regarderai plus tard » (`DEFAULT_PICKS` :
  basilic, menthe, radis, capucines, salade à couper, ciboulette) aussi en partie.

**« Je regarderai plus tard »** : `{ skipped: true }`, prénom gardé, aucune plante, arrivée sur Aujourd'hui
avec « Ajoute ta première plante » (3 idées de `DEFAULT_PICKS`) et « Voir les 100 plantes ». Questions
jamais reproposées (seulement modifiables une à une dans Réglages, sans que rien ne le dise).

**Ville** : jamais demandée dans l'accueil. `hooks/use-local-weather.ts` lance la demande de position du
téléphone d'office au premier affichage d'Aujourd'hui (texte iPhone dans `app.config.ts`, texte système sur
Android). En cas de refus : Paris (`PARIS_COORDINATES`), refus retenu (`mode: "denied"`), aucun message sur
Aujourd'hui, **pas d'alerte ni de conseil météo** (décisions coupées quand `weather.isFallback`), pas de
climat local ni de rappels serveur. Seul moyen de changer : Saisons, carte « Ton climat » (« Paris par défaut :
choisis ta ville pour des dates justes », bouton « ⌖ Paris », modale de recherche dans `calendar.tsx`).

**Notifications** : jamais dans l'accueil. Ligne « Sois prévenu au bon moment, sans ouvrir l'app. » +
« Activer les rappels » sur Aujourd'hui (téléphone seulement), ou Réglages → Rappels. **Défaut** : sur
Aujourd'hui, `activateReminders` enregistre `enabled: true` avant la permission et affiche « Rappels
activés… » même en cas de refus ; la permission n'est demandée que s'il y a un conseil à programmer
(`scheduleLocalReminder`). Dans Réglages (`toggleReminders`), c'est correct : alerte « Notifications
désactivées · Autorise les notifications dans les réglages de ton téléphone pour recevoir les conseils Balco ».

**« Tes premières plantes »** : 3 cochées d'office, on peut tout décocher ; impossible d'ajouter une plante
qu'on a déjà (pas de recherche). Les plantes ajoutées sont « arrivées aujourd'hui, jamais arrosées » : elles
demandent toutes un arrosage dès le premier jour.

**Après « Créer mon balcon »** : Aujourd'hui, demande de position immédiate sans explication, « Vérifie la
terre de 3 plantes », Idée du mois, « Tes plantes », « Activer les rappels » (téléphone). Pas de mot
d'accueil, pas de proposition de compte.

---

## 2. Le plan validé (8 étapes, une par commit)

### Étape A — Les vrais défauts (sans toucher au parcours)

**A1 · Des plantes de saison seulement.** Une seule règle : plantes qu'on peut semer ou planter **ce mois-ci,
dans le climat de l'utilisateur** (`adaptToClimate`, climat de Paris tant que la ville n'est pas connue),
triées par envies, soleil, espace. S'applique à « Tes premières plantes », aux idées de « Je regarderai plus
tard », à l'état vide d'Aujourd'hui et aux idées de Saisons quand le balcon est vide. Si une envie n'a aucune
plante de saison : « Les tomates se plantent en mai. En attendant, voici ce qui pousse maintenant. » (mois tiré
du calendrier de la plante phare de l'envie). Vitest : octobre, mai, climat de montagne, la phrase.

**A2 · « Activer les rappels » sur Aujourd'hui.** Toujours demander l'autorisation ; n'enregistrer `enabled`
qu'après un accord ; en cas de refus, le même message que dans Réglages. Vitest : accord, refus, aucun conseil
à programmer.

**A3 · Ville par défaut.** Bandeau sur Aujourd'hui « Météo de Paris par défaut · Choisir ma ville » qui ouvre la
recherche de ville (sortir la modale de `calendar.tsx` en composant commun) ; ligne « Ta ville » dans Réglages.
Playwright : ville refusée → bandeau → choix de Lyon → plus de bandeau.

### Étape B — Le nouveau parcours

**B1 · Deux états pour une plante** (sans changer l'accueil). Nouvelle information par plante : *installée* ou
*à planter* (colonne en base = migration Drizzle, schéma de synchro `server/reminders-router.ts`, `GardenPlant`).
Installée : jamais de « Plante… », premier geste = arrosage (regroupé « Vérifie la terre de N plantes »). À
planter : pas d'arrosage tant qu'elle n'est pas en terre, premier geste « Sème la mâche » ou « Plante la
lavande » (bon verbe selon le calendrier de la plante), cocher la fait passer à installée ; Balcon et la fiche
affichent « À planter ». Plantes existantes = installées (rien ne change pour le porteur). Aujourd'hui, une
plante arrivée ce mois-ci garde « Plante … » (`alreadyPlanted` dans `lib/plants/calendar.ts`) : à remplacer par
cet état. Vitest : plan du jour pour chaque état, synchro.

**B2 · Parcours, 1re partie.** Accueil : titre, promesse, « C'est parti », lien discret « Passer » (plus de
prénom ni de « Quatre petites questions »). « Tu as déjà des plantes sur ton balcon ? » Oui / Pas encore.
Si Oui : « Lesquelles ? », recherche dans les 100 plantes + raccourcis (basilic, menthe, tomates cerises,
fraisier, persil, lavande…), ajoutées *installées* ; pas de plantes de saison en plus. Soleil : « Le soleil tape
presque toute la journée » (plus de 6 h), « Le matin ou l'après-midi seulement » (3 à 6 h), « Presque jamais »
(moins de 3 h), « Je ne sais pas » (= mi-ombre). Espace inchangé. Si Pas encore : Envies (« Des salades à
couper » remplace « Moins de gaspillage », conversion automatique des réponses déjà enregistrées et des
étiquettes du catalogue), puis « Tes premières plantes » de saison, ajoutées *à planter*. Plus de question
« expérience ». La barre ne compte que les écrans du chemin suivi. **Décision : la ville est demandée juste
avant le choix des plantes** (le filtre de saison dépend du climat) : voir B3, à placer dans l'ordre.
Playwright : « Oui » et « Pas encore ».

**B3 · Ville et rappels dans le parcours.** « Où est ton balcon ? » : « Pour te prévenir du gel, de la pluie et
de la chaleur chez toi. », « Utiliser ma position » (la fenêtre d'Android n'arrive qu'après ce bouton) ou
recherche de ville ; « Plus tard » → bandeau de A3. Sur téléphone uniquement : « Je te préviens s'il gèle cette
nuit ou si tes plantes ont soif. », « Activer les rappels » (logique de A2) ou « Plus tard ». Plus de demande
de position surprise à l'arrivée sur Aujourd'hui (`use-local-weather.ts` ne doit plus demander d'office).
Playwright : ville refusée.

**B4 · Arrivée et « Passer ».** Carte « Bienvenue, voici ton balcon » au-dessus de la liste, qui disparaît après
le premier geste coché ou le lendemain. « Passer » : Aujourd'hui avec l'état vide (plantes de saison) et une
carte « **Quelques questions** pour des conseils adaptés à ton balcon » qui relance le parcours (`welcome` doit
accepter une relance). Bouton « **Refaire l'accueil** » dans Réglages → Version de test (à côté de la
simulation météo), sans toucher aux plantes, pour que le porteur teste. Playwright : « Passer ».

### Étape C — Ce qui sort de l'accueil

**C1 · Prénom et expérience.** Prénom : message d'accueil de Nora **sans IA** (« Comment je t'appelle ? » avec un
champ), sans compte et sans décompter de question ; reste modifiable dans **Réglages** (ouvert depuis Moi).
Expérience : Nora parle simplement par défaut ; le niveau reste réglable dans Réglages ; retirer « Balco
s'adapte à ton expérience ». `recommendPlants` : plus de bonus lié à l'expérience absente (garder un léger
bonus « facile » pour tout le monde).

**C2 · Bilan.** Parcours de bout en bout pour chaque chemin (Oui, Pas encore, Passer, ville refusée), mise à
jour de CLAUDE.md, `docs/feuille-de-route.md`, `docs/recap-pour-claude.md` ; liste de ce qui demande une
décision ; proposer la PR vers `main`.

---

## 3. Décisions prises (6 octobre, « OK pour tes propositions »)

1. La ville est demandée **juste avant** le choix des plantes (climat nécessaire au filtre de saison).
2. Le bon verbe selon la plante : « Sème la mâche », « Plante la lavande ».
3. Prénom : message d'accueil de Nora sans IA, sans compte, sans décompte.
4. Prénom modifiable dans **Réglages** (pas de champ dans Moi).
5. Carte de relance : « **Quelques questions** pour des conseils adaptés à ton balcon ».
6. Après « Oui » : pas de plantes de saison proposées en plus (elles restent dans l'Idée du mois).
7. Bouton « Refaire l'accueil » dans Réglages → Version de test.
8. « Des salades à couper » remplace « Moins de gaspillage », conversion automatique des réponses existantes.
