# Synchronisation et rappels serveur

## Principe

- **Sans compte**, tout reste sur le téléphone (AsyncStorage) et les rappels sont des notifications locales.
- **Avec un compte**, l'app envoie ses changements au serveur (`reminders.sync`) et reçoit l'état complet du jardin, qui fait foi. Un geste annulé ou une plante retirée sur un appareil disparaît donc aussi des autres.
- Les changements sont mis en file sur l'appareil (`lib/sync/sync-logic.ts`). Hors ligne, rien n'est perdu : ils partent à la synchro suivante, déclenchée 2 s après une modification, au lancement et au retour au premier plan.
- Le serveur recalcule les rappels avec la météo de la **vraie** position de l'utilisateur. Tant qu'aucune position n'a été envoyée, il ne calcule rien, plutôt que d'utiliser la ville par défaut.
- Dès que l'appareil est inscrit aux notifications push, c'est le serveur qui prévient et les notifications locales s'effacent, pour éviter les doublons.
- Un rappel en attente est annulé si le geste a été fait entre-temps, si la pluie est annoncée ou si la plante est retirée.

## Mise en production

Voir [deploiement.md](deploiement.md) : variables d'environnement, cron des rappels, notifications push (`eas init` et `EAS_PROJECT_ID`).

## Tests

- `pnpm test` : tests unitaires.
- `TEST_DATABASE_URL=mysql://… pnpm test` : ajoute les tests d'intégration sur une vraie base (`tests/sync.integration.test.ts`), avec la météo et Expo simulées. Les migrations doivent être appliquées sur cette base au préalable.
- `OPEN_METEO_URL` et `EXPO_PUSH_URL` permettent de pointer le serveur vers des services simulés.
