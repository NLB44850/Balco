# Balco : retour de Claude Code sur le brief « une app vivante toute l'année »

*8 octobre 2026. À copier en entier dans la conversation claude.ai où le brief a été écrit (ou dans une nouvelle
conversation, avec `docs/recap-pour-claude.md` avant).*

---

Bonjour Claude. Claude Code a lu le brief « une app vivante toute l'année » (Aujourd'hui toute l'année, banque
d'astuces, badges à paliers et de saison, herbier, Sainte-Catherine) et a fait l'état des lieux du code, sans rien
coder. Voici ce qu'il a trouvé, son plan, et 12 questions auxquelles je dois répondre. **Aide-moi à y répondre**,
puis rédige-moi **une réponse courte à recoller dans Claude Code** (numéro de la question + décision).

Rappel : je ne suis pas développeur. Explique-moi simplement les conséquences de chaque choix.

## 1. Ce que le brief disait et qui ne correspond pas au code

1. **Aujourd'hui n'est jamais vide** : quand il n'y a rien à faire, l'app affiche déjà « 🌿 Rien à faire
   aujourd'hui · Tes plantes n'ont besoin de rien. Balco te préviendra si la météo change. » « Ton balcon se
   repose » la remplacera.
2. **Les badges ne sont pas enregistrés** : ils sont recalculés à chaque fois, donc ils peuvent se perdre.
   « Main Verte » (7 jours de suite) disparaît dès que la série casse ; « Premier Pot » et « Ami des Abeilles »
   disparaissent si on retire les plantes. Aucune date d'obtention. Le téléphone ne garde aussi que les 1 000
   derniers gestes. Pour respecter « rien ne se perd », il faut d'abord **enregistrer ce qui est acquis**.
3. **Les 6 badges actuels** :
   - Premier Pot : 1 plante sur le balcon (aujourd'hui) ;
   - Ami des Abeilles : 3 plantes mellifères sur le balcon (58 mellifères au catalogue) ;
   - Zéro Gâchis d'Eau : 5 conseils météo suivis ;
   - Bio-Défenseur : 5 « inspections » ;
   - Du Balcon à l'Assiette : 1 récolte ;
   - Main Verte : 7 jours suivis de suite.
4. **Deux badges comptent de travers** : « Bio-Défenseur » compte aussi les semis, plantations et arrosages évités
   sous la pluie ; « Zéro Gâchis d'Eau » compte les arrosages évités, notés tout seuls par l'app.
5. **La cause d'une alerte suivie n'est pas notée** (gel, chaleur, vent, orage) : il faudra la noter pour des badges
   comme « Canicule maîtrisée » ou « Protégé du gel ».
6. **Aucune floraison n'est notée** dans l'app : l'herbier « fleurie pour la première fois » n'est pas vérifiable.
7. **Pas de simulation de date** : l'heure est lue à 96 endroits du code ; cette étape est plus lourde que prévu.
8. **Climat** : la zone s'appelle « de montagne ». Le décalage climatique ne joue qu'au printemps, rien à
   l'automne. Pour l'automne, l'app connaît le mois des premières gelées : octobre en montagne et en continental,
   novembre en océanique et tempéré, décembre en méditerranéen.
9. **Sainte-Catherine** : 9 plantes du catalogue se plantent en novembre : ail (plein soleil, jardinière),
   ail des ours (ombre), violas (rebord de fenêtre), framboisier, groseillier, cassissier, myrtillier, mûres sans
   épines (balcon, pots de 20 à 30 L), kiwaï (terrasse). **Les fraisiers n'en font pas partie** (mars, avril, août,
   septembre). Sur un simple rebord de fenêtre, seuls les violas conviennent.
10. **Astuces qui contredisent l'app** :
    - `dec-rebord` : persil (récolte mai-novembre) et ciboulette (mars-octobre) ne se récoltent pas en décembre ;
    - `nov-romarin` : la sauge se récolte d'avril à octobre (romarin et thym : toute l'année, d'accord) ;
    - `mar-terre-dessus` dit 3 cm, le geste de l'app dit « Change les 5 cm de terre du dessus » ;
    - `jan-micropousses` : à relier à la plante « micro-pousses » (radis, roquette, moutarde ne se sèment pas en
      janvier en pot) ;
    - « tomates » et « salades » ne sont pas des plantes du catalogue (tomates cerises, tomates naines ; salade à
      couper, laitue pommée…) ; la courgette (`mai-saints-glace`) demande une terrasse ;
    - mi-mai (Saints de glace, nuits claires d'avril) ne vaut ni en montagne (gelées jusqu'à début juin) ni dans le
      Midi (mi-mars).
11. **Manquent encore** : le paillage n'est pas un geste de l'app ; on ne peut pas ouvrir Nora avec une question
    déjà écrite ; un badge gagné depuis une notification n'est jamais fêté.
12. **Badge d'hiver « Semis au chaud d'une aromatique »** : aucune aromatique ne se sème au chaud avant mars dans le
    calendrier (en février : piment, poivron ; toute l'année : micro-pousses).

## 2. Plan proposé par Claude Code (une étape = un commit testé, puis mon test sur le téléphone)

La Sainte-Catherine passe **avant** les astuces et les paliers, pour tenir l'échéance du 15 novembre.

1. Simulation de date (« Faire comme si on était le… » dans Réglages → Version de test).
2. Badges acquis gardés pour de bon (avec leur date), cause des alertes notée, fête même hors d'Aujourd'hui.
3. « Ton balcon se repose », ordre des cartes, au plus 2 cartes en plus sous la liste.
4. Carte « À anticiper ».
5. Mécanisme d'événements décrit par des données, et Nora ouverte avec une question déjà écrite.
6. **Sainte-Catherine**, à tester sur le téléphone vers le 1ᵉʳ novembre.
7. Banque d'astuces : vérification sur deux sources, complément à ~100, document à valider (sans code).
8. Carte « Astuce de saison ».
9. Paliers Graine / Pousse / Fleur.
10. Badges de saison (avec millésime).
11. Herbier.
12. Moi refait (« Presque là », saison en cours, herbier, collection).
13. Vérifications complètes et mise à jour des documents.

## 3. Les 12 questions (entre parenthèses : la recommandation de Claude Code)

1. **Cartes en plus sur Aujourd'hui** : au plus 2, priorité événement > à anticiper > astuce > Idée du mois ? Et la
   carte « C'est le moment » des envies du printemps (mars-avril) compte-t-elle comme « à anticiper » ?
   *(oui aux deux)*
2. **Astuce** : une nouvelle par semaine toute l'année, été compris ? *(oui, une par semaine)*
3. **Nouveau palier ou nouvelle carte d'herbier** : petite animation, pas de plein écran ? *(oui)*
4. **Dates de la Sainte-Catherine** : du 18 au 30 novembre ? *(oui)*
5. **Actions de la Sainte-Catherine** : framboisier, groseillier, cassissier, myrtillier, mûres sans épines, ail
   (selon soleil et place), kiwaï si terrasse ; pas de fraisiers. Faut-il aussi proposer violas et ail des ours pour
   les petits balcons, même si ce n'est pas du « bois » ? *(oui, sinon un rebord de fenêtre n'a rien à planter)*
6. **Seuils des paliers** (Graine / Pousse / Fleur) : Ami des abeilles 3 / 6 / 10 ; récoltes 1 / 10 / 50 ; alertes
   suivies 1 / 5 / 15 ; jours suivis 7 / 30 / 100 ; Premier Pot devient « plantes accueillies » 1 / 5 / 15. Les
   4 badges de chaque saison seront proposés en détail à l'étape 10. *(d'accord ?)*
7. **Badges déjà obtenus** : on les fige dès l'étape 2, même si la série casse ensuite ? *(oui)*
8. **Bio-Défenseur** : ne compter que les vraies observations (analyses Observer, gestes « Observe ») ? *(oui)*
9. **Herbier et fleurs** (aucune floraison notée) :
   - a) récoltes seulement ;
   - b) un bouton « Elle a fleuri » sur la fiche pendant ses mois de floraison ;
   - c) la fleur compte toute seule après un mois sur le balcon pendant sa floraison.
   *(b : simple et honnête)*
10. **Paillage** pour la Sainte-Catherine : un conseil avec « C'est fait » sur la page de l'événement, qui compte pour
    le badge « Paré pour l'hiver » ? *(oui)*
11. **Saisons des badges** : dates fixes (1ᵉʳ décembre, 1ᵉʳ mars, 1ᵉʳ juin, 1ᵉʳ septembre) ? Et remplacer
    « Semis au chaud d'une aromatique » en hiver par « un semis au chaud » (piment, poivron, micro-pousses) ?
    *(oui aux deux)*
12. **Ordre de travail** : Sainte-Catherine avant les astuces, comme dans le plan ? *(oui)*

## 4. Ce que j'attends de toi

1. Pour chaque question, dis-moi si la recommandation te paraît bonne et pourquoi, en deux phrases au plus.
2. Signale ce qui te semble manquer ou risqué dans le plan (surtout pour tenir le 15 novembre).
3. Termine par un bloc prêt à coller dans Claude Code, de la forme :
   « 1 oui · 2 oui · … · 9 b · … » avec mes éventuelles modifications.
