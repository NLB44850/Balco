# Poids des pots : sources (étape 9, 14/10)

Calcul dans `lib/garden/balcony-weight.ts` (Réglages → Mon balcon → Poids de tes pots). Une estimation, comptée large.

| Valeur | Retenu | Sources |
| --- | --- | --- |
| Terreau bien arrosé | **1 kg par litre** (arrondi au-dessus : les fiches donnent 0,55 à 0,8 kg/L mouillé ; on ajoute l'eau de la soucoupe, la couche drainante et la plante). La terre de jardin mouillée pèse bien plus (1,7 kg/L), mais un balcon se cultive au terreau. | [Fiche technique terre à potager (masse volumique humide 550-800 kg/m³)](https://backend.englobecorp.com/sites/default/files/2022-02/lachute_terre_a_potager_fr.pdf) ; [Bruxelles Environnement, potager sur balcon (140 L ≈ 50 kg, jusqu'à 100 kg gorgé d'eau)](https://document.environnement.brussels/opac_css/elecfile/IF_Potager_Potagerbalcon_Balkonmoestuin_FR) ; sacs du commerce (40 L ≈ 16 kg) |
| Pot vide | Compté comme de la terre cuite, le plus lourd : petit 1 kg, moyen 3 kg, grand 6 kg, jardinière 5 kg. Un pot de 30 cm en terre cuite pèse de 2 à 6 kg selon les fiches. | [Kaufland, pot Spang 30 cm (4,7 kg)](https://www.kaufland.fr/product/331132225/) ; [Castorama, pot Japandi 30 cm (6,2 kg)](https://www.castorama.fr/pot-japandi-en-terre-cuite-emaillee-artisanale-diametre-30-cm-deroma/3491780119124_CAFR.prd) ; [Bricomarché, coupe 30 cm (2,2 kg)](https://www.bricomarche.com/p/coupe-amalia-campana-30cm-antique/5600837334139) |
| Volume des pots | Petit 4 L, moyen 10 L, grand 22 L, jardinière 20 L (étape 1, `lib/plants/pot-size.ts`) ; taille pas notée : celle conseillée par la fiche de la plante. | `docs/sources-pots.md` |
| Charge d'un balcon | « Souvent 350 kg par m² pour un balcon récent, parfois moins dans l'ancien » ; demander au syndic. | [AQC, fiche G.04 entretien des balcons (surcharge normale de 350 kg/m²)](https://qualiteconstruction.com/wp-content/uploads/2024/01/fi-pathologie-batiment-g04-entretien-maintenance-balcons.pdf) ; [Mon Immeuble, balcons en copropriété](https://monimmeuble.com/actualite/amenagement-des-balcons-quelles-sont-les-regles-en-copropriete) |
| Alléger | Pots en plastique ou en résine, billes d'argile au fond. | [Castorama, idées pour fleurir les balcons](https://www.castorama.fr/idees-et-conseils/entretien-du-jardin/inspiration/des-idees-astucieuses-pour-fleurir-les-balcons) ; [Consoglobe, ce qu'on peut installer sur son balcon](https://www.consoglobe.com/?p=10395473) |

Pas de seuil « danger » affiché : Balco ne connaît ni la surface ni l'état du balcon. Le conseil reste de demander au
syndic avant un grand bac.
