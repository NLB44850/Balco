# Chantier Réglages (validé le 08/10)

Une liste simple où chaque ligne montre sa valeur courte ; la toucher ouvre une feuille du bas avec les mêmes
choix que l'accueil. Les phrases longues restent dans les feuilles.

## Décisions du porteur

1. « Gérer mes plantes » retiré (l'onglet Balcon fait ce travail).
2. Niveau gardé sous « Comment Nora te parle », une seule valeur (`onboarding.experience`), mêmes libellés dans la
   carte « Nora se souvient de toi » : « Simplement, sans jargon » · « Avec un peu plus de détails » · « En jardinier, droit au but ».
3. Créneau « Le matin · 8 h 30 » en plus de 17 h 30, 18 h 30, 19 h 30 ; l'heure du rappel ne tombe jamais dans la plage
   calme (sinon la plage s'ajuste et la feuille le dit en une phrase).
4. Balco+ dans une feuille, avec « Me prévenir à l'ouverture » (intérêt du compte, ou e-mail sans compte : e-mail et
   date seulement, effacés après l'envoi ; sous le champ : « On t'écrira une seule fois, à l'ouverture de Balco+. »).
5. Supprimer mon compte : efface le compte et ses données sur le serveur, garde le balcon sur le téléphone, l'app
   repasse sans compte, sans revenir à l'accueil. « Ton compte, ta sauvegarde et tes échanges avec Nora seront
   effacés. Ton balcon reste sur ce téléphone. »
6. Plantes suivies : décocher coupe seulement les notifications ; gestes et alertes restent sur Aujourd'hui et Saisons.
7. Donner mon avis : e-mail vers contact_balco@gmail.com, dans un seul réglage (changera avant la publication).
8. Économie de batterie : « À vérifier » + « Ouvrir les réglages », Android seulement.
9. Page Confidentialité (à venir) : mentionner l'e-mail gardé pour « Me prévenir à l'ouverture ».

## Étapes

1. **Fait** : lignes et feuilles communes (`components/settings/rows.tsx`, `choice-list.tsx`), valeurs courtes
   (`lib/garden/settings-summary.ts`), Mon balcon : Ville (feuille « Où est ton balcon ? », `city-picker.tsx`
   devenu feuille du bas, partagé avec Aujourd'hui et Saisons), Soleil avec « Je ne sais pas » gardé
   (`sunlightUnknown`, vaut « partial ») et son astuce, Espace, Envies (« Enregistrer »), Envies du printemps
   (« Retirer », notification du 1er mars recalculée). « Crédits photos » passe dans À propos. E2e `16-reglages`.
2. **Fait** : Toi, Prénom › et « Comment Nora te parle » › (`NORA_LEVELS` : `title` long, `short` pour la ligne), mêmes
   libellés dans la carte de Nora ; `EXPERIENCE_OPTIONS` retiré.
3. **Fait** : Rappels (`lib/reminders/settings-text.ts` : `withReminderHour` ajuste la plage calme et le dit,
   `coversReminder` grise un choix de plage qui couvrirait le conseil, `followedText`, `vacationText`) ;
   `notificationPermission` (local-notifications) pour « Bloqués par ton téléphone » ; Plantes suivies sans les
   plantes à planter ni les pots libres, et `useDayPlan` ne filtre plus que `reminderDecisions` (notifications).
4. **Fait** : Compte (`backupStatus`), feuille Balco+ (`plusSheetBenefits`, `freeForAllText`), « Me prévenir à
   l'ouverture » (table `plus_interest`, migration 0016, `server/plus-router.ts` : `plus.interest`,
   `plus.notifyMe`, 10 adresses par heure et par réseau), suppression du compte qui garde le balcon
   (`deleteAccount` de garden-context : plus de retour à l'accueil).
5. À propos (Donner mon avis, Confidentialité « Bientôt », version) et Version de test.
6. Vérifications complètes, test sur le téléphone.
