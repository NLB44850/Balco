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

1. **Un seul modèle de bouton (règles 1 à 4)** : codée le 14/10, validée le 14/10 (« c'est bon »). Tous les boutons principaux, secondaires,
   liens et petites pastilles d'Aujourd'hui, Balcon, Saisons, Nora, Observer, Réglages, Moi, catalogue, fiche plante,
   pas-à-pas, accueil, diagnostic, vacances, consignes, courses, Ma semaine, temps forts et feuilles du bas passent par
   `Button`. Les boutons noirs deviennent verts (ou encadrés) ; les pastilles de filtre actives sont vertes partout
   (catalogue et Saisons étaient noires). Les suppressions restent à la livraison 2.
2. **Suppression unifiée et fiche plante (règle 5)** : codée le 14/10, à valider. Historique sans « Supprimer » répété (toucher une ligne ouvre une
   feuille « Supprimer ce geste », puis « Annuler »), « Renommer » et « Retirer du balcon » en lignes comme Réglages,
   photo retirée avec « Annuler », souvenir de Nora, conversation, « Tout décocher », mode vacances arrêté : même façon.
   Graphique de progression caché tant qu'il n'y a pas assez de semaines.
3. **Cases, pastilles, « × », retours et textes (règles 6 et 7).**

### Livraison 2, ce qui est fait (14/10)

- `useUndoToast` (components/today/undo-toast.tsx) : le message du bas d'un écran, avec `onExpire` pour ce qui se fait
  pour de bon au départ du message (nouveau message, fermeture, sortie de l'écran) ; « Annuler » l'abandonne.
- `showGlobalToast` (lib/ui/global-toast.ts) + `GlobalToast` posé dans app/_layout.tsx : un message qui survit au
  changement d'écran, au-dessus de la barre des onglets.
- Bouton `remove` (encadré, texte rouge) pour retirer ce qu'on peut remettre.
- Fiche plante : plus de « Supprimer » sous chaque geste ; toucher une ligne de l'historique ouvre une feuille
  (« Arrosage », « Hier à 12:00 », la note, « Supprimer ce geste ») puis « Geste supprimé de l'historique · Annuler ».
  Photo : « Retirer cette photo » tout de suite, « Annuler » ; le fichier n'est effacé qu'au départ du message
  (`removePhoto(id, { keepFile })`, `restorePhoto`, `forgetPhotoFile`). Section « Ta plante » en lignes comme Réglages :
  « Son nom » (feuille du bas avec « Enregistrer ») et « Retirer du balcon » (rouge) : retirée tout de suite, retour sur
  Balcon avec « Basilic retiré de ton balcon · Annuler » (`restorePlant`). Les photos d'une plante retirée attendent
  15 s avant d'être effacées (le temps de « Annuler »). Graphique des semaines seulement à partir de 2 semaines soignées.
- Nora : « Effacer » la conversation et « Oublier » un souvenir (dans la conversation et dans « Nora se souvient de
  toi », « Tout oublier » compris) tout de suite avec « Annuler » ; le serveur n'oublie qu'au départ du message.
- Mode vacances : « Arrêter le mode vacances » tout de suite, « Annuler » remet les dates et les préparatifs.
- Courses : « Tout décocher » avec « Annuler ». Réglages → Envies du printemps : « Retirer » avec « Annuler ».
- Reste en feuille de confirmation rouge : supprimer son compte (irréversible). E2e `27-coherence`.

### Retours du 14/10 sur la livraison 2 (« tout est ok », 4 petits bugs), corrigés

1. Nora parlait de plantes retirées : une plante retirée alors qu'elle était encore « à planter » restait décrite
   « pas encore en terre » dans son contexte (`plantName`, server/ai/context.ts). Corrigé, et la liste des plantes du
   balcon « fait foi » dans le contexte (aucune autre plante présentée comme encore là). Côté serveur : en ligne après
   la fusion (Railway).
2. Nora : le clavier cachait le champ de saisie sur Android (bord à bord) : `KeyboardAvoidingView` en `padding` partout
   (Nora, consignes, connexion), comme la feuille du bas.
3. En-tête : un bouton à droite (« Effacer » de Nora) est centré verticalement et le sous-titre passe sur deux lignes
   (`ScreenHeader`) ; « Ta coach, qui connaît ta plante » (au lieu de « tes plante ») ; « OK » du prénom dans sa bulle.
4. Image d'une plante vide sur Aujourd'hui : une photo dont le fichier a disparu laisse place à la photo d'exemple
   (`onError` de `PlantPicture`).
5. (14/10, après test) Nora citait encore lavande, thym, menthe : le serveur n'avait pas reçu leur retrait. Deux causes
   possibles, corrigées : (a) compte gratuit sauvegardé depuis un autre appareil (statut `other-device`) : Nora affiche
   maintenant « Nora ne voit pas tes derniers changements… » avec « Sauvegarder depuis ce téléphone » ; (b) date de
   modification d'une plante plus ancienne que sa date d'ajout simulée (le serveur garde la modification la plus
   récente) : `nextUpdatedAt` (toujours après tout ce qu'on sait de la plante) et `resendPlants` (toutes les plantes
   renvoyées une fois, `plantsResent` dans les métadonnées de synchro). Tests `sync-logic`.
