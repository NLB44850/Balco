# Sources des événements de l'année

Règle du projet : toute information de jardinage ajoutée est vérifiée sur deux sources fiables au moins.
Les données des événements sont dans `lib/events/events.ts`.

## La Sainte-Catherine (18 au 30 novembre)

**Explication affichée** : « Les arbustes entrent au repos : ils supportent mieux d'être plantés. Leurs racines
s'installent pendant l'hiver, tant que la terre ne gèle pas, et la plante démarre plus fort au printemps. »

Le brief proposait « La terre est encore douce et humide… ». Aucune des sources consultées ne parle de la
température du sol : la phrase a été remplacée par ce que les sources disent (vérifié le 8 octobre 2026).

- Futura Sciences, « Jardinage : quand planter un arbre ? » : le 25 novembre correspond à l'entrée en repos des
  arbres et arbustes ; plantés à ce moment, ils supportent mieux la transplantation et leurs racines s'installent
  avant les grands froids. https://www.futura-sciences.com/maison/questions-reponses/jardinage-planter-arbre-7088/
- JDS, « Novembre dans mon jardin » : plantation des arbustes de novembre à mars, hors gel ; racines prêtes à
  repartir dès les beaux jours. https://www.jds.fr/deco-maison/exterieur/novembre-dans-mon-jardin-plantation-elagage-taille-29859_A
- BFC Nature, « Sainte-Catherine » (2012) : origine du dicton (boutures de bois sec), étendu à la plantation des
  arbres et arbustes. https://bfcnature.fr/fichiers/20121118-ste-catherine_1515146274.pdf
- Truffaut, « Planter, tailler, entretenir les arbustes à petits fruits » : plantation idéale à l'automne.
  https://www.truffaut.com/planter-tailler-entretenir-arbustes-petits-fruits.html

**Plantes proposées (« Ce qui se plante maintenant »)** : uniquement les plantes du catalogue dont les mois de
plantation (déjà vérifiés, `docs/sources-calendrier.md`) comprennent novembre : framboisier, groseillier,
cassissier, myrtillier, mûres sans épines, kiwaï, ail, violas, ail des ours ; selon le soleil et la place du
balcon. Les fraisiers ne se plantent pas en novembre dans le calendrier (mars, avril, août, septembre).

**« Paille tes pots avant l'hiver »** : en pot, ce sont surtout les racines qui craignent le gel ; un paillage
protège la terre (fiche « Arbustes à petits fruits » de Bruxelles Environnement : paillis de protection contre le
gel, https://document.environnement.brussels/opac_css/elecfile/IF%20Potager%2007%20Arbustes%20petits%20fruits%20FR ;
CAUE Occitanie, « Planter une haie » : paillage d'une dizaine de centimètres après plantation,
https://www.les-caue-occitanie.fr/sites/default/files/fichiers/ressource/field_fichiers/planter_haie.pdf).

## Prépare ton printemps (12 au 31 janvier)

Choisir ses plantes du printemps, faire l'inventaire de ses graines, laver ses pots : tâches de janvier citées par
les calendriers de jardinage (vérifié le 8 octobre 2026).
- Consoglobe, « Calendrier du jardin mois par mois » : commander ses graines et préparer ses plans pour l'année.
  https://www.consoglobe.com/calendrier-jardin-mois-par-mois-cg
- Croq'Kilos, « Tout ce qu'il y a à faire dans votre jardin en janvier » : vérifier pots, outils et arrosoirs.
  https://www.croq-kilos.com/actus/tout-ce-quil-y-a-faire-dans-votre-jardin-en-janvier
- « Lave tes pots vides » reprend l'astuce `jan-pots-propres`, vérifiée dans `docs/astuces.md`.
Plantes proposées : celles du catalogue qui se sèment ou se plantent en mars ou avril (climat de la ville), adaptées
au soleil et à la place ; « Garder » les ajoute aux envies du printemps (carte de mars, notification du 1er mars).

## Les Saints de glace (4 au 20 mai ; climats océanique, tempéré et continental)

Les 11, 12 et 13 mai (saint Mamert, saint Pancrace, saint Servais) marquent traditionnellement la fin des gelées
tardives ; il est conseillé d'attendre ce repère pour sortir les plantes frileuses, en surveillant la météo (vérifié
le 8 octobre 2026).
- Ootravaux, « Saints de glace » : dates et saints, risque de gelées jusqu'à fin mai dans l'Est.
  https://www.ootravaux.fr/actualites/saints-glace.html
- Météo-Paris, « Faut-il redouter les saints de glace ? » : tradition, pas une garantie.
  https://www.meteo-paris.com/actualites/faut-il-redouter-les-saints-de-glace-11-mai-2018
- Futura Sciences, « Les saints de glace sont-ils toujours d'actualité ? » : tomates et poivrons à ne pas sortir trop tôt.
  https://www.futura-sciences.com/maison/actualites/jardinage-saints-glace-mythe-realite-113232/
Pas en montagne (gelées jusqu'à début juin) ni en climat méditerranéen (dernières gelées mi-mars) : repères de
`lib/plants/climate.ts`. Après le 13 mai, la carte dit « Feu vert » sauf si du gel est annoncé chez l'utilisateur.

## Balcon en vacances (1er au 15 juillet)

Avant de partir : regrouper les pots à l'ombre, arroser en profondeur puis pailler, prévoir une réserve d'eau ou un
proche (vérifié le 8 octobre 2026).
- Hornbach, « Arrosage des plantes pendant les vacances » : regrouper, ombre, réserves d'eau.
  https://www.hornbach.ch/projets/arrosage-des-plantes-pendant-les-vacances/
- Futura Sciences, « 8 conseils pour préparer votre jardin avant de partir en vacances » : arrosage, paillage.
  https://www.futura-sciences.com/maison/questions-reponses/jardinage-jardinage-8-conseils-preparer-votre-jardin-avant-aller-vacances-17241/
- Consoglobe, « Comment prendre soin de vos plantes pendant les vacances » : arroser abondamment puis pailler épais.
  https://www.consoglobe.com/?p=10351287
