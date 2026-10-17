# Chantier « Tour de l'appli » avant la publication (proposé le 16/10)

Demande du porteur : « avant [le déploiement en prod], faire le tour de l'appli et optimiser le code si besoin ».
État des lieux fait le 16/10 en lecture seule (rien modifié), en quatre relectures : rapidité, ménage du code,
serveur, solidité de l'app. Ce document garde les constats, le plan proposé et les décisions à prendre.

## Ce qui va déjà bien (vérifié)

- Les outils de la « Version de test » (date et météo simulées, « Simuler Balco+ ») sont cachés dans une version
  de production (`WEATHER_SIMULATION_AVAILABLE`, variable posée seulement par les profils `test` et `codespace`).
  À vérifier : que Railway ne pose pas `EXPO_PUBLIC_WEATHER_SIMULATION` pour l'app web.
- Serveur : chaque donnée est lue et écrite seulement pour son propriétaire ; entrées validées (zod) ; codes de
  connexion stockés hachés ; jetons Apple et Google vérifiés ; budget IA, quotas et limites comptés en base ;
  migrations conformes au schéma.
- App : synchro sans perte (la file d'attente est rejouée), jeton de session dans le coffre du téléphone, photos
  réduites avant d'être gardées, pas de `console.log`, contextes bien mémorisés, animations du fond en natif et en
  pause hors écran, aucune bibliothèque du serveur dans l'app.

## Le plan (une étape = un commit testé, validé sur le téléphone)

### Étape 1. Ménage (rien de visible) : faite le 16/10
Supprimer ce qui reste du modèle de départ et ne sert plus : page de démonstration `app/dev/theme-lab.tsx`
(ouvrable par lien dans la version publiée), composants `external-link`, `hello-wave`, `parallax-scroll-view`,
`collapsible`, `contextual-reminder-card`, fichiers `constants/const.ts`, `shared/*`, `drizzle/relations.ts`,
`scripts/reset-project.js`, fonctions `dailyTip` et `defaultAiQuota`, dépendances `cookie`, `expo-keep-awake`,
`@expo/ngrok`, `@types/cookie`, images `react-logo*`, notes à la racine (vers `docs/`), TODO du modèle. Environ
1 000 lignes en moins.
Fait : tout supprimé sauf `shared/const.ts` (encore lu par le serveur) ; notes de la racine déplacées en
`docs/notes-meteo.md` et `docs/spec-rappels-contextuels.md`. 760 tests et 95 e2e verts.

### Étape 2. Sécurité du serveur (le plus important) : faite le 16/10, validée le 17/10 (PR #55 fusionnée)
1. **Code de connexion devinable** en envoyant beaucoup d'essais en même temps : compteur d'essais en une seule
   écriture en base, et limite d'essais par adresse IP.
2. **Envoi de codes en masse** qui épuiserait le quota d'e-mails Brevo (300 par jour en gratuit) : plafond par jour
   pour tout le serveur et limite par IP plus basse.
3. **Erreurs internes renvoyées telles quelles** (requêtes SQL, adresses e-mail) et jamais écrites dans les
   journaux : message neutre pour l'app, détail dans les journaux de Railway (sans données personnelles).
4. **Analyse photo sans compte** : budget IA obligatoire en production et plafond par jour pour tous les invités.
5. **Appels sans délai maximal** (météo et notifications côté serveur) qui peuvent bloquer la synchro : délai de 10 s.
6. **Se déconnecter** n'invalide pas la session (valable 6 mois) : la déconnexion la rend inutilisable.
7. Suppression de compte en une seule opération (tout ou rien), y compris l'inscription « Me prévenir » faite avant
   le compte ; index pour les rappels à envoyer ; en-têtes de sécurité de l'app web ; taille des requêtes limitée à
   1 Mo hors analyse photo ; un jeton de notification ne peut plus passer d'un compte à un autre ; limites de taille
   et de fréquence pour la synchro.

Fait (16/10) :
- Code : l'essai est compté avant la comparaison, en une seule écriture (`verifyLoginCode`, test de 40 essais
  simultanés) ; un code ne sert qu'une fois même envoyé deux fois en même temps ; 30 essais par heure et par IP.
- Codes envoyés : 250 par jour pour tout le serveur (`LOGIN_CODES_PER_DAY`, compteur `code-day`), 10 demandes par
  heure et par IP (`LOGIN_CODE_REQUESTS_PER_IP_PER_HOUR`, 20 avant).
- Erreurs imprévues : « Un souci est survenu sur le serveur. Réessaie dans un instant. » pour l'app, sans pile ;
  détail dans les journaux (`[trpc] <route> a échoué : …`, e-mails masqués, `server/_core/log.ts`). Les messages
  écrits exprès pour la personne passent tels quels.
- IA : budget de 30 $ par mois par défaut en production si `AI_MONTHLY_BUDGET_USD` est vide ; 30 analyses sans
  compte par jour au plus, tous invités réunis (`AI_GUEST_SCANS_PER_DAY`).
- Délai de 10 s sur Open-Meteo et les notifications Expo (serveur) ; une panne d'envoi ne coupe plus le passage.
- « Se déconnecter » : le jeton de ce téléphone est refusé jusqu'à sa fin (table `revoked_sessions`, migration
  0020, purgée chaque jour) ; chaque jeton a son identifiant (deux téléphones, deux jetons).
- Suppression de compte en une transaction, avec l'inscription « Me prévenir » faite avec la même adresse.
- Index `reminder_decisions_due_index` (status, scheduledFor) ; en-têtes `X-Frame-Options`, `Permissions-Policy`,
  HSTS en production ; requêtes limitées à 2 Mo (8 Mo pour les photos d'Observer, 2 Mo plutôt que 1 pour laisser la
  place à 1 000 gestes avec notes) ; 300 synchros par heure et par compte.
- Pas fait, à dessein : empêcher un jeton de notification de passer d'un compte à l'autre. C'est le cas normal d'un
  téléphone qui change de compte, et un jeton ne se lit que sur le téléphone lui-même ; le bloquer casserait les
  notifications de ce cas sans vraie protection en échange.
- `EXPO_PUBLIC_WEATHER_SIMULATION=1` est posée exprès sur Railway (`docs/deploiement-railway.md`) : elle garde la
  simulation dans l'app web de test. Elle ne touche pas l'app du téléphone (eas.json, update.yml). À retirer à l'étape 6,
  quand Railway servira la vraie version publique.

### Étape 3. Solidité de l'app : faite le 17/10
1. **Écran « Oups »** au lieu d'une fermeture sèche si un écran plante, avec « Réessayer ».
2. **Sans réseau, la météo était inventée** (22 °C, ni pluie ni vent) et les alertes calculées dessus : garder la
   dernière vraie prévision sur le téléphone et la dire ancienne ; sans elle, pas d'alerte inventée.
3. **Historique limité à 1 000 gestes** : au-delà (vers 100 jours avec 10 plantes), la date de plantation et les
   rempotages disparaissaient, ce qui fausse rempotage, fin de saison, série et progression. Garder toujours les
   gestes marquants, ne limiter que les arrosages anciens.
4. Données abîmées sur le téléphone ignorées au lieu de faire planter l'app au démarrage.
5. Synchro avec un délai maximal (20 s) et un nouvel essai automatique quand le réseau revient.
6. Autorisation des notifications demandée seulement après une action (accueil ou Réglages), jamais à l'improviste.
7. File d'attente de synchro plafonnée ; petites corrections de la date simulée et de l'accessibilité.

Fait (17/10, décisions du porteur : écran « Oups » sans Sentry pour l'instant, rappels des 7 jours à l'étape 5) :
- « Oups, cet écran a eu un souci » + « Réessayer » (`components/oops-screen.tsx`, `ErrorBoundary` de
  `app/_layout.tsx`, sans thème ni fournisseur : couleurs fixes). « Réessayer » ramène l'app sur Aujourd'hui.
  Réglages → Version de test → « Voir l'écran « Oups » » pour le voir.
- Météo : la dernière vraie prévision gardée sur le téléphone (`balco.weather.last-forecast.v1`, 48 h au plus, même
  zone), relue à l'heure de maintenant (`lib/weather/snapshot.ts`) ; bandeau « 📡 Hors connexion · Balco utilise la météo
  reçue à 8 h… » + « Réessayer », liseré orange (rendu plus visible à sa demande le 17/10). Sans elle : bandeau « Météo indisponible » + « Réessayer », et aucune alerte (`usable` de
  `useLocalWeather` remplace `isFallback` pour décider des conseils ; `isFallback` reste « ville inconnue »).
- Historique : `capEvents` garde les 1 000 derniers gestes et tous les gestes marquants plus anciens (seuls les
  arrosages et vérifications anciens partent, 3 000 au plus) ; le serveur renvoie la même chose (`loadSnapshot`).
- Données abîmées : plantes, gestes et boîte d'envoi relus ligne par ligne (`isStoredPlant`, `isStoredEvent`,
  `readOutbox`).
- Synchro : 20 s au plus, nouvel essai une minute après un échec ; envoi en paquets (`takeBatch`, `PUSH_LIMITS` =
  limites du serveur). Trouvé en codant : un premier envoi ou un long hors-ligne de plus de 1 000 gestes était refusé
  par le serveur à chaque fois.
- Notifications : les rappels programmés en arrière-plan ne demandent plus l'autorisation
  (`hasLocalNotificationPermission`) ; seuls l'accueil, Réglages, « Activer les rappels » et les tests la demandent.
- Pas fait : « petites corrections de la date simulée et de l'accessibilité », trop vagues dans l'état des lieux pour
  être reprises sans nouvelle relecture ; à revoir avec l'étape 4.

### Étape 4. Rapidité : faite le 17/10
1. **Le plan du jour calculé une seule fois** pour toute l'app (il l'était 3 à 4 fois, une fois par onglet ouvert,
   à chaque coche) : environ 100 à 250 ms de calcul en moins par coche sur un téléphone moyen (estimation).
2. Synchro qui ne réécrit plus tout quand rien n'a changé ; fiche plante qui ne recalcule plus à chaque frappe ;
   notifications reprogrammées seulement si elles changent ; badges calculés après l'animation.
3. Catalogue : la liste se charge au fil du défilement, avec des vignettes légères (101 photos de 800 px pour un
   rond de 46 px aujourd'hui).
4. « C'est rentré », « Décocher », « Tout récolté ? » écrits une seule fois pour Aujourd'hui et la fiche (deux copies
   aujourd'hui, qui peuvent diverger).

Fait (17/10) :
- Plan du jour partagé : `DayPlanProvider` (hooks/use-day-plan.ts, dans app/_layout.tsx sous le jardin) calcule une
  fois la météo, les réglages, les conseils et le plan ; `useDayPlan()` lit ce plan commun (Aujourd'hui, Balcon,
  Saisons, fiche, courses, temps fort). L'heure se remet à jour au retour sur un écran (une plante ajoutée depuis le catalogue
  serait sinon « pas encore là ») et au retour dans l'app ; la météo est relue au retour dans l'app si elle a plus de 30 minutes.
- Synchro : plantes et gestes réécrits seulement s'ils ont changé (`sameEvents`, `samePlants`).
- Notification du jour reprogrammée seulement si elle change (clé date + texte + réglages, index.tsx).
- Catalogue et petits ronds : vignettes de 200 px (`assets/plants/thumbs/`, `STOCK_THUMBS`, faites par
  `generer-index.mjs`), `CatalogPicture` les prend par défaut (`full` pour la grande photo de la feuille du catalogue
  et de l'herbier). La liste reste une ScrollView : ses lignes étaient déjà mémorisées, le coût venait des photos.
- Fiche plante : le surnom tapé ne recalcule plus toute la fiche à chaque lettre.
- « C'est rentré » / « C'est ressorti » écrits une fois (`hooks/use-winter-moves.ts`).
- Pas fait : badges calculés après l'animation (le message du bas en dépend, gain faible) ; « Décocher » et
  « Tout récolté ? » laissés tels quels (logiques proches mais pas identiques entre les deux écrans).

### Étape 5. Notifications des comptes gratuits (à décider)
Aujourd'hui, un compte gratuit reçoit au plus **une** notification : la suivante n'est prévue qu'à la prochaine
ouverture de l'app. Proposé : prévoir les rappels des 7 prochains jours.

### Étape 6. Version de production (avec la publication)
Nom de paquet définitif (`com.app.balco` aujourd'hui, impossible à changer après le premier envoi au Play Store),
adresse du serveur (« api.votre-domaine.fr » aujourd'hui), icône et couleurs du modèle à remplacer, polices
intégrées (démarrage plus rapide), localisation approximative seulement, réduction de taille (R8). Retirer
`EXPO_PUBLIC_WEATHER_SIMULATION` des variables Railway (app web publique), et du profil EAS de production s'il y est. Ces changements
demandent un nouvel APK de test.

## Décisions à prendre avec le porteur

1. Étape 5 : prévoir les notifications des 7 prochains jours pour les comptes gratuits ?
2. Rapport de plantages : écran « Oups » seul, ou aussi un service gratuit (Sentry) qui me prévient des plantages
   (compte à créer par le porteur, nouvel APK) ?
3. Nom de paquet définitif (étape 6), par exemple `fr.balco.app` (il faut posséder le nom de domaine pour en être
   sûr ; sinon un nom qui lui est propre).
4. Brevo : rester sur l'offre gratuite (300 e-mails par jour) avec le plafond de l'étape 2, ou passer à l'offre
   payante au lancement.
