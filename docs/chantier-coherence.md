# Chantier « Cohérence » (boutons et interactions, validé le 14/10)

Tour de l'app du 14/10 (captures des 15 écrans et inventaire du code) : la même action changeait d'aspect d'un écran à
l'autre (bouton vert ou noir, arrondis 14 / 16 / 999, cinq façons de supprimer, cases rondes ou carrées, cinq « × » et
retours différents, textes à l'infinitif ou au tutoiement). Ses 3 choix du 14/10 : plus de bouton noir ; texte des
boutons à l'infinitif (le tutoiement reste pour les conseils, « Arrose le basilic ») ; ce chantier avant la 8b.

## Les règles

1. **Vert plein = l'action principale** de l'écran ou de la feuille, une seule. Même taille partout : arrondi 16,
   52 points de haut au moins, texte 16 gras blanc. Plus aucun bouton noir.
2. **Encadré = l'action secondaire** (à côté de la principale : « Plus tard », « Pas encore », « Dans 3 h »).
3. **Texte vert suivi de « › » = aller voir quelque chose** (« Voir la fiche de … ›», « Tout voir ›»).
4. **Petite pastille** (vert plein ou encadrée) pour un bouton dans une carte ou une ligne (« Ajouter », « OK »).
5. **Supprimer = une seule façon** : si on peut revenir en arrière (geste, photo, plante, souvenir de Nora, liste),
   c'est immédiat avec « Annuler » dans le message du bas. La feuille de confirmation rouge reste pour ce qu'on ne peut
   pas récupérer (supprimer son compte).
6. **Rond = un geste fait, carré = une option.** Même taille partout ; le même « × » et la même flèche de retour.
7. **Texte des boutons à l'infinitif** (« Ajouter une photo », « Préparer les consignes »).

Dans le code : `components/ui/button.tsx` (`Button`, variantes `primary`, `secondary`, `link`, `danger`, option
`small` ; `PRESSED` : le même retour au toucher partout). Tout nouveau bouton passe par lui.

## Les trois livraisons

1. **Un seul modèle de bouton (règles 1 à 4)** : codée le 14/10, à valider. Tous les boutons principaux, secondaires,
   liens et petites pastilles d'Aujourd'hui, Balcon, Saisons, Nora, Observer, Réglages, Moi, catalogue, fiche plante,
   pas-à-pas, accueil, diagnostic, vacances, consignes, courses, Ma semaine, temps forts et feuilles du bas passent par
   `Button`. Les boutons noirs deviennent verts (ou encadrés) ; les pastilles de filtre actives sont vertes partout
   (catalogue et Saisons étaient noires). Les suppressions restent à la livraison 2.
2. **Suppression unifiée et fiche plante (règle 5)** : historique sans « Supprimer » répété (toucher une ligne ouvre une
   feuille « Supprimer ce geste », puis « Annuler »), « Renommer » et « Retirer du balcon » en lignes comme Réglages,
   photo retirée avec « Annuler », souvenir de Nora, conversation, « Tout décocher », mode vacances arrêté : même façon.
   Graphique de progression caché tant qu'il n'y a pas assez de semaines.
3. **Cases, pastilles, « × », retours et textes (règles 6 et 7).**
