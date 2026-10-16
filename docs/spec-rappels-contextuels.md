# Spécification — Rappels contextuels météo et dernier entretien

**Produit :** Balco — *Mon potager pour les petits espaces*  
**Statut :** Spécification MVP prête à implémenter  
**Auteur :** Manus AI  
**Date :** 23 septembre 2026

## 1. Décision produit

Balco ne doit pas envoyer un rappel fixe du type « arrose tes plantes ». Le rappel doit être calculé à partir de **la plante**, **du dernier entretien enregistré** et **de la météo locale à venir**.

Le système doit aussi savoir recommander de ne rien faire. Si une pluie suffisante est prévue, Balco doit pouvoir dire : **« Pas besoin d’arroser aujourd’hui »**. Éviter un geste inutile est une valeur produit au même titre que rappeler un geste oublié.

Le MVP se déroule en deux niveaux. Le premier calcule les recommandations à l’ouverture de l’application et programme des notifications locales lorsque cela est possible. Le second ajoute un recalcul serveur lorsque l’application est fermée.

## 2. Objectifs et indicateurs

L’objectif est d’aider un citadin débutant à prendre soin de ses plantes sans interpréter seul une prévision météo. Chaque rappel doit être court, justifié et actionnable.

| Indicateur | Définition | Cible initiale |
|---|---|---:|
| Ouverture d’un rappel | Notification ouverte ou actionnée | ≥ 25 % |
| Validation après rappel | Rappel ouvert puis geste accompli | ≥ 35 % |
| Rappels normaux par utilisateur | Notifications quotidiennes | ≤ 1 |
| Désactivation | Désactivation après 7 jours | < 15 % |
| Fraîcheur météo | Âge maximal de la donnée | < 6 h |

## 3. Périmètre du MVP

Le MVP couvre les plantes recommandées ou enregistrées, l’historique du dernier geste, la météo locale, une tâche prioritaire par jour et des notifications contextuelles facultatives.

Les gestes initiaux sont : arrosage, observation, taille légère, protection contre le froid ou le vent et récolte. Le système ne propose pas de dosage d’engrais ni de traitement phytosanitaire sans validation spécifique.

Le MVP accepte une ville choisie manuellement ou la position de l’appareil. Il conserve le repli actuel sur Paris lorsque la localisation ou la météo est indisponible.

## 4. Expérience utilisateur

### Activation

Lors de la première activation, Balco explique :

> « Balco regarde la météo et ton dernier geste pour te rappeler seulement ce qui est utile. »

L’utilisateur choisit une heure de rappel, par défaut **18 h 30**, ainsi qu’une plage calme, par exemple de 21 h à 9 h. La permission de notification est demandée au moment de l’activation, jamais au premier écran de l’onboarding.

Les réglages comprennent un interrupteur global, une heure préférée, le mode « maximum un rappel normal par jour », l’option d’éviter les rappels d’arrosage en cas de pluie et l’activation par plante.

### Format d’un rappel

Un rappel contient une action, une plante, une justification et un lien vers l’accueil. Le corps reste inférieur à environ 120 caractères.

> **Pas besoin d’arroser les tomates aujourd’hui**  
> 6 mm de pluie sont prévus cette nuit. Vérifie plutôt le tuteur.

> **Le basilic a besoin d’un contrôle**  
> Dernier arrosage il y a 2 jours, pas de pluie prévue dans les 12 prochaines heures.

> **Protège tes capucines ce soir**  
> Des rafales de 42 km/h sont attendues sur ton balcon.

Au clic, Balco recalcule la décision. Une notification devenue obsolète ne valide jamais automatiquement une tâche.

## 5. Données nécessaires

### Profil de plante

Chaque plante dispose d’un profil de soin configurable. Les seuils sont des paramètres produit à ajuster par variété, contenant et saison.

| Champ | Type | Exemple | Usage |
|---|---|---|---|
| `plantId` | chaîne | `tomatoes-cherry-01` | Identité stable |
| `displayName` | chaîne | Tomates cerises | Libellé affiché |
| `wateringIntervalHours` | nombre | 48 | Délai indicatif entre deux contrôles |
| `rainSkipMm` | nombre | 2 | Pluie suffisante pour supprimer un arrosage |
| `heatThresholdC` | nombre | 30 | Seuil de chaleur |
| `frostThresholdC` | nombre | 2 | Seuil de froid |
| `windThresholdKmh` | nombre | 40 | Seuil de rafales |
| `preferredWateringWindows` | tableau | matin, soir | Créneaux conseillés |
| `allowedTaskTypes` | tableau | arrosage, tuteur | Gestes possibles |

### Historique d’entretien

L’historique déjà présent dans Balco doit être généralisé à plusieurs types de gestes. Le dernier événement du même type sert au calcul.

```ts
type MaintenanceEvent = {
  id: string;
  plantId: string;
  type: "watering" | "observation" | "pruning" | "protection" | "harvest";
  completedAt: string; // ISO 8601
  source: "daily_task" | "reminder" | "manual";
  note?: string;
};
```

Un arrosage récent ne remet pas à zéro le délai d’une taille. Une récolte récente ne justifie pas à elle seule un nouveau rappel d’arrosage.

### Prévision météo

Le hook météo actuel récupère la température, la température ressentie, le code météo, le jour ou la nuit, la ville et les coordonnées. Pour les rappels, il doit aussi récupérer les précipitations, leur probabilité, les températures minimale et maximale, les rafales, le lever et le coucher du soleil.

Open-Meteo expose notamment les paramètres horaires `precipitation`, `precipitation_probability`, `wind_gusts_10m` et `weather_code`, ainsi que les agrégats quotidiens `precipitation_sum`, `precipitation_probability_max`, `temperature_2m_min`, `temperature_2m_max` et `wind_gusts_10m_max`.[1]

```ts
type WeatherSnapshot = {
  fetchedAt: string;
  timezone: string;
  city: string;
  latitude: number;
  longitude: number;
  current: {
    temperatureC: number;
    apparentTemperatureC: number;
    weatherCode: number;
  };
  next12h: {
    precipitationMm: number;
    precipitationProbabilityMax: number;
    windGustKmhMax: number;
  };
  today: {
    precipitationMm: number;
    temperatureMinC: number;
    temperatureMaxC: number;
    windGustKmhMax: number;
  };
};
```

## 6. Moteur de décision

Le moteur évalue les règles dans cet ordre : **sécurité**, **suppression d’un geste inutile**, **urgence depuis le dernier entretien**, puis **entretien léger**.

### Garde-fous

Aucun rappel météo n’est envoyé si la donnée est trop ancienne, si la localisation est inconnue, si les notifications sont désactivées ou si la plante est archivée. En mode hors-ligne, Balco peut afficher le dernier conseil connu, mais ne doit pas créer de nouveau rappel météo.

Le résultat normal est limité à une tâche principale par jour. Une alerte urgente de gel, d’orage ou de vent violent peut dépasser cette limite.

### Suppression de l’arrosage

Un rappel d’arrosage est supprimé lorsque la pluie prévue dans les 12 prochaines heures atteint `rainSkipMm`, lorsque la probabilité maximale atteint 60 % avec au moins 1 mm prévu, lorsqu’une pluie récente significative est connue ou lorsque le dernier arrosage est plus récent que `wateringIntervalHours`.

Balco peut alors proposer une observation du drainage ou un contrôle du tuteur. Il ne doit jamais afficher simultanément « arrose » et « n’arrose pas » pour la même plante.

### Rappel d’arrosage

Balco propose un contrôle lorsque le délai depuis le dernier arrosage dépasse `wateringIntervalHours`, qu’aucune pluie suffisante n’est prévue et qu’aucun rappel identique n’a été envoyé dans les dernières 24 heures.

La formulation reste prudente : **vérifier la terre avant d’arroser**. La météo seule ne prouve pas que le terreau est sec.

### Chaleur, froid et vent

À partir de 30 °C de température maximale ou 32 °C de température ressentie, Balco augmente la priorité du contrôle sans ordonner automatiquement un arrosage. Le rappel est déplacé vers le matin ou le début de soirée.

À partir d’une température minimale de 2 °C, Balco propose de protéger les plantes sensibles. Sous 0 °C, l’alerte devient prioritaire.

À partir de 40 km/h de rafales, Balco recommande de vérifier les tuteurs et les contenants. À partir de 60 km/h, il recommande de mettre les contenants mobiles à l’abri. En cas d’orage, l’action doit être réalisée depuis l’intérieur.

### Sortie du moteur

Le moteur doit être pur et testable. Il ne doit pas appeler AsyncStorage, l’API météo ou le système de notification.

```ts
type ReminderDecision = {
  plantId: string;
  taskType: MaintenanceEvent["type"];
  priority: "normal" | "important" | "urgent";
  action: "do" | "skip" | "protect" | "observe";
  title: string;
  body: string;
  reason: string;
  validUntil: string;
  weatherFetchedAt: string;
};
```

## 7. Exemples de décisions

| Situation | Dernier entretien | Décision |
|---|---|---|
| 3 jours sans arrosage, 0 mm prévu | Arrosage il y a 72 h | Rappeler un contrôle du terreau |
| 3 jours sans arrosage, 6 mm prévus | Arrosage il y a 72 h | Supprimer l’arrosage et expliquer la pluie |
| Arrosage hier, 31 °C demain | Arrosage il y a 24 h | Contrôle tôt le matin, sans nouvel arrosage automatique |
| Température minimale à 1 °C | Observation il y a 2 h | Alerte de protection contre le froid |
| Rafales à 45 km/h | Aucun geste récent | Contrôle des tuteurs et contenants |
| Météo âgée de 14 h | Arrosage il y a 72 h | Aucun rappel météo ; afficher une situation incertaine |

## 8. Architecture technique

### Étape locale

Étendre `useLocalWeather` pour demander une prévision de 24 à 48 heures. Ajouter `lib/reminders/reminder-engine.ts`, qui reçoit le profil de plante, l’historique et le snapshot météo.

Recalculer les décisions à l’ouverture de l’accueil, après un changement de ville, après un rafraîchissement météo, après validation ou annulation d’un entretien et après modification des réglages.

### Notifications locales

Après calcul, le planificateur supprime les notifications Balco obsolètes puis programme la décision active. `expo-notifications` permet de planifier une notification ponctuelle ou récurrente et de gérer l’interaction pour rediriger l’utilisateur vers une route Expo Router.[2]

Les données embarquées doivent contenir :

```ts
{
  url: "/",
  plantId: "tomatoes-cherry-01",
  taskType: "watering",
  decisionId: "uuid",
  validUntil: "2026-09-24T20:00:00+02:00"
}
```

Sur Android, créer un canal Balco d’importance normale. Vérifier les permissions à chaque activation.

### Version serveur

Une notification locale planifiée à l’ouverture ne garantit pas qu’une évolution météo survenue ensuite sera prise en compte lorsque l’application est fermée. Pour une version autonome, un job serveur doit charger les préférences, récupérer la météo, calculer la décision, dédupliquer les alertes et envoyer une notification distante.

Le job doit respecter le fuseau horaire de l’utilisateur et limiter les rappels normaux à une décision par jour. Il doit recalculer la décision avant l’envoi.

## 9. Stockage

Pour le prototype mobile, AsyncStorage suffit. Les clés recommandées sont :

```text
balco.location.preference.v1
balco.plant.task-history.v1
balco.reminder.settings.v1
balco.reminder.decisions.v1
balco.reminder.last-sync.v1
```

```ts
type ReminderSettings = {
  enabled: boolean;
  preferredHour: number;
  preferredMinute: number;
  quietStartHour: number;
  quietEndHour: number;
  maxNormalRemindersPerDay: number;
  skipWateringWhenRainExpected: boolean;
  enabledPlantIds: string[];
};
```

La synchronisation cloud devient nécessaire seulement avec les comptes et le multi-appareils. L’historique devra alors être fusionné par identifiant d’événement.

## 10. Cas limites

Si la localisation est refusée, les rappels restent disponibles avec une ville manuelle. Si aucune ville n’est configurée, Balco demande une localisation avant l’activation météo.

Si la météo est indisponible, Balco ne doit pas inventer de pluie, de température ou de vent. Il peut rappeler un entretien basé uniquement sur le dernier geste, en indiquant qu’il s’agit d’un contrôle et non d’une certitude météo.

Si la ville change, les décisions existantes sont invalidées et recalculées après réception de la nouvelle météo. Si l’utilisateur remplace une plante, le rappel de l’ancienne plante devient obsolète.

Si plusieurs plantes demandent le même soin, Balco peut regrouper le rappel, par exemple : « Vérifie les tomates et le basilic ». Le détail reste accessible dans l’accueil.

## 11. Critères d’acceptation

Le MVP est accepté lorsque :

1. une prévision horaire et quotidienne est chargée pour la localisation enregistrée ;
2. un arrosage n’est pas rappelé lorsqu’une pluie suffisante est prévue ;
3. la date du dernier entretien du même type est prise en compte ;
4. la validation d’une tâche met à jour l’historique et invalide la décision correspondante ;
5. le remplacement d’une plante recalcule la tâche et le rappel ;
6. une météo trop ancienne empêche l’envoi d’une notification météo ;
7. la désactivation globale supprime les rappels normaux ;
8. le gel et le vent violent produisent une alerte prioritaire ;
9. un clic sur une notification ouvre l’accueil sans valider automatiquement la tâche ;
10. les règles de pluie, chaleur, froid, vent, geste récent et météo indisponible sont couvertes par des tests unitaires.

## 12. Découpage recommandé

**Lot 1 — Moteur pur.** Enrichir la météo et implémenter les règles avec des tests déterministes.

**Lot 2 — Interface.** Ajouter les réglages, le prochain rappel et la justification visible dans l’accueil.

**Lot 3 — Notifications locales.** Ajouter `expo-notifications`, les permissions, le canal Android, la suppression des alertes obsolètes et la navigation.

**Lot 4 — Autonomie.** Ajouter le recalcul serveur lorsque l’application est fermée, les métriques de qualité et les profils enrichis par variété et contenant.

## 13. Décisions à confirmer

L’équipe doit confirmer l’ambition du premier livrable : notifications locales après ouverture ou rappels autonomes avec un service serveur. Elle doit aussi choisir entre un profil générique par plante et un profil enrichi par variété, contenant et exposition.

La recommandation est de commencer par le moteur pur, l’historique existant et les notifications locales. Cela permet de mesurer la pertinence des conseils avant d’investir dans une infrastructure distante.

> **Point de vigilance :** un rappel recalculé à l’ouverture n’est pas une surveillance météo continue. Cette différence doit rester explicite tant qu’un job serveur ou un mécanisme de fond n’est pas déployé.

## Références

[1]: https://open-meteo.com/en/docs "Open-Meteo Weather Forecast API Documentation"

[2]: https://docs.expo.dev/versions/latest/sdk/notifications/ "Expo Notifications Documentation"

**Fin de la spécification.**


## 14. État d’implémentation — 24 septembre 2026

### Lots réalisés

| Lot | État | Implémentation actuelle |
|---|---|---|
| Lot 1 — Moteur pur | Terminé | `decideReminder` est pur, testable et couvre pluie, arrosage récent, chaleur, gel, vent, orage, fraîcheur météo et déduplication. |
| Lot 1 — Météo locale | Terminé | `useLocalWeather` charge les données actuelles, horaires et quotidiennes Open-Meteo pour la position enregistrée ou la ville manuelle. |
| Lot 2 — Interface | Terminé | `ContextualReminderCard` affiche la justification, l’action, la priorité et les actions de validation/fermeture sur l’accueil. |
| Lot 3 — Notifications locales | Terminé | Permission explicite, notification à l’heure choisie, canal Android, payload de décision, suppression des notifications Balco obsolètes et ouverture de l’accueil au clic. |
| Lot 3 — Préférences | Terminé | Activation globale, heure préférée, plage calme configurable et activation par plante persistées dans AsyncStorage. |
| Lot 3 — Regroupement | Terminé | Plusieurs décisions visibles peuvent être regroupées dans `GroupedReminderCard`, avec validation indépendante par plante. |

### Critères d’acceptation atteints

Les critères 1 à 10 sont couverts au niveau du prototype local. Les critères relatifs à la météo horaire, la pluie, le dernier entretien, la validation, le remplacement de plante, la fraîcheur météo, la désactivation, le gel, le vent et le clic de notification sont vérifiés par le code et les tests. La notification locale reste volontairement limitée à la décision principale afin de respecter la cible d’un rappel normal par jour ; le détail des autres plantes reste visible dans l’accueil.

### Reste à faire pour la version autonome

Le **Lot 4** n’est pas encore implémenté. Il doit ajouter un job serveur capable de recalculer la météo et la décision lorsque l’application est fermée, respecter le fuseau horaire de l’utilisateur, dédupliquer les alertes et envoyer une notification distante. Il faudra également instrumenter les métriques d’ouverture, de validation et de désactivation avant de conclure sur la pertinence des règles.

À noter : l’expérience web permet de vérifier l’interface, le stockage et le typage, mais les notifications locales natives doivent être testées sur un appareil iOS ou Android avec une build Expo compatible. L’application ne valide jamais automatiquement une tâche à partir d’un clic de notification.
