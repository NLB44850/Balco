# Notes intégration météo et géolocalisation

## Open-Meteo
Source officielle : https://open-meteo.com/en/docs

- Endpoint : `https://api.open-meteo.com/v1/forecast`
- Paramètres utilisés : `latitude`, `longitude`, `current=temperature_2m,apparent_temperature,weather_code,is_day`, `timezone=auto`.
- La documentation indique que latitude et longitude sont requises, que les variables `current` renvoient les conditions courantes et que `timezone=auto` adapte les horaires au lieu.
- Aucune clé API n'est nécessaire pour cet usage public non commercial.

## Expo Location
Documentation locale : `/home/ubuntu/balco_helper/docs/location/location/DOCS.md`

- Permission à demander : `Location.requestForegroundPermissionsAsync()`.
- Vérification recommandée : `Location.hasServicesEnabledAsync()`.
- Position : `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })`.
- Reverse geocoding : `Location.reverseGeocodeAsync({ latitude, longitude })`.
- La permission est configurée dans `app.config.ts` avec le message français Balco.

## Décision produit

La météo et la position sont récupérées au premier plan au chargement de l'accueil et du calendrier. Si l'utilisateur refuse la permission, désactive la localisation ou si le réseau/API échoue, Balco conserve un repli Paris explicite afin de garder l'expérience utilisable.
