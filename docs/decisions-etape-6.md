# Balco : 4 choix à trancher avant l'étape 6 (arrosage selon le pot et la météo)

*À coller dans une discussion claude.ai. Préparé le 13/10 dans la session Claude Code.*

## Ce que j'attends de toi (Claude)

Je suis le porteur de Balco. Je ne suis pas développeur. Aide-moi à trancher les 4 questions en bas de ce document.
Pour chaque question, donne une recommandation claire et dis en deux ou trois phrases pourquoi, côté jardinage et
côté expérience utilisateur. Si une proposition te paraît fausse ou risquée pour les plantes, dis-le. Termine par
un récapitulatif court que je pourrai recopier tel quel dans Claude Code, par exemple :
« 1. oui ; 2. litres ; 3. oui ; 4. 6a puis 6b ».

## Balco en bref

- Une app Android de jardinage sur balcon, en français, pour débutants. Elle est en test sur mon téléphone, pas
  encore publiée.
- Écran principal **« Aujourd'hui »** : une liste de gestes à cocher. Il y a **une ligne par plante au plus**, et
  les gestes sont regroupés dès deux plantes (« Vérifie la terre de 3 plantes » ouvre une feuille où l'on coche
  chaque plante).
- Trois règles d'expérience : moins d'efforts, clarté visuelle, retour immédiat. Textes au tutoiement, verbe en
  tête, moins de 12 mots.
- Règle maison : chaque valeur de jardinage est vérifiée sur au moins 2 sources, sources notées dans le projet.
  Sinon, elle est affichée comme une estimation.
- Une offre payante **Balco+** est prévue, mais **le paiement n'est pas encore branché** : les textes disent
  « bientôt ».
- Chantier en cours, « Pots et balcon » (10 étapes) :
  1. taille du pot ;
  2. fiches « Spécial pot » de chaque plante ;
  3. simulateur de soleil et diagnostic du balcon ;
  4. rappels d'engrais ;
  5. liste de courses.

  Les étapes 1 à 5 sont faites et validées. On arrive à l'**étape 6**.

## Ce que dit le plan pour l'étape 6

> **Arrosage météo selon la taille du pot (gratuit), puis « coach d'arrosage » (Balco+).**
> Gratuit : l'arrosage tient compte de la météo et de la taille du pot.
> Balco+ : coach précis (vent, évaporation, volume, type de plante).
> Toujours une ligne par plante, regroupée dès deux plantes.

## Comment Balco décide d'arroser aujourd'hui

- **Un rythme fixe par plante**, selon trois profils :
  - plantes assoiffées (basilic, tomates…, 31 plantes) : toutes les **36 h** ;
  - plantes ordinaires (56 plantes) : toutes les **48 h** ;
  - plantes résistantes à la sécheresse (thym, romarin, lavande…, 15 plantes) : toutes les **96 h**.

  Le rythme est compté depuis le dernier arrosage noté. **La taille du pot ne compte pas.**
- La ligne dit toujours de **vérifier avant d'arroser** : « Enfonce ton doigt : sèche sur 2 cm ? Arrose. » La
  profondeur dépend de la plante.
- **Pluie** : si 2 ou 3 mm sont prévus dans les 12 heures (ou une pluie à plus de 60 % de probabilité), la ligne
  devient « N'arrose pas … aujourd'hui ». **Problème connu** : c'est vrai même sur un **balcon couvert**, où la
  pluie n'arrive pas aux pots. L'utilisateur indique pourtant dans l'accueil si son balcon est couvert.
- **Forte chaleur** : une alerte « 32 °C aujourd'hui : pense à ton basilic ».
- Balco ne dit **jamais combien** arroser.
- L'utilisateur choisit la taille du pot de chaque plante :
  - Petit : moins de 20 cm ;
  - Moyen : 20 à 30 cm ;
  - Grand : 30 à 40 cm ;
  - Jardinière (60 cm, environ 18 cm de profondeur) ;
  - « Je ne sais pas ».

  Volumes repères : petit 4 L, moyen 10 L, grand 22 L, jardinière 20 L. À l'ajout d'une plante, Balco donne
  d'office la taille conseillée par sa fiche.

## Ce qui est proposé

**6a. Gratuit pour tous : arrosage selon le pot et la météo**

1. **La taille du pot change le rythme.** Un petit pot sèche plus vite, un grand pot garde l'eau plus longtemps.
   Si la taille est « Je ne sais pas », le rythme ne change pas.
2. **Balcon couvert : la pluie ne compte pas.** Plus de « N'arrose pas, il pleut ». L'arrosage continue
   normalement, avec la mention « Ton balcon est couvert : la pluie n'arrive pas jusqu'à tes pots ».
3. **Combien arroser**, selon la taille du pot : par exemple « Sèche sur 2 cm ? Arrose avec environ 1 L ».
   Le repère serait environ **20 % du volume du pot** : 0,8 L pour un petit pot, 2 L pour un moyen, 4,4 L pour un
   grand, 4 L pour une jardinière. Ce repère est déjà utilisé dans l'app pour compter l'eau économisée les jours de
   pluie.
4. Toujours une ligne par plante, regroupée dès deux plantes.

**6b. Balco+ : coach d'arrosage**

- Un calcul plus précis, plante par plante. Il tient compte :
  - de l'eau qui s'évapore chaque jour (la météo gratuite Open-Meteo fournit l'« évapotranspiration ») ;
  - du vent ;
  - du soleil du balcon (orientation, balcon couvert, vis-à-vis) ;
  - du volume du pot et du type de plante.
- Résultat : « Arrose 1,2 L ce soir », ou « Pas besoin aujourd'hui, ta terre a encore de l'eau ».
- Pour les comptes gratuits, une ligne « Coach d'arrosage · bientôt avec Balco+ » le présente.

## Les 4 questions à trancher

### 1. Combien la taille du pot change-t-elle le rythme ?

Proposition (coefficients appliqués au rythme de la plante) :

| Pot | Coefficient | Basilic (36 h d'habitude) | Plante ordinaire (48 h) | Thym (96 h) |
| --- | --- | --- | --- | --- |
| Petit (moins de 20 cm) | × 0,7 (≈ 30 % plus souvent) | ≈ 25 h, chaque jour | ≈ 34 h | ≈ 67 h |
| Moyen (20 à 30 cm) | × 1 | 36 h | 48 h | 96 h |
| Grand (30 à 40 cm) | × 1,3 (≈ 30 % moins souvent) | ≈ 47 h, tous les 2 jours | ≈ 62 h | ≈ 125 h |
| Jardinière (peu profonde) | × 0,85 (≈ 15 % plus souvent) | ≈ 31 h | ≈ 41 h | ≈ 82 h |
| Je ne sais pas | × 1 | 36 h | 48 h | 96 h |

Point d'attention : **ces coefficients sont des règles Balco, pas des valeurs trouvées dans des sources.** Les
sites de jardinage disent seulement qu'un petit pot sèche plus vite et qu'un grand pot garde l'humidité. Comme la
ligne dit toujours de vérifier la terre avec le doigt avant d'arroser, une erreur de rythme a peu de conséquences.

**À trancher :** ces coefficients conviennent-ils ? Faut-il les afficher comme une estimation (règle maison) ? Ou
faut-il d'abord chercher des valeurs sourcées ?

### 2. La quantité d'eau : en litres ou en verres ?

- **Litres** : « Arrose avec environ 1 L ». C'est précis et ça se lit sur un arrosoir gradué. Mais les débutants
  ne savent pas toujours ce que représente un litre.
- **Verres** : « Arrose avec environ 4 verres », avec un verre d'environ 25 cl. C'est concret, mais ça devient
  bizarre pour un grand pot (« 18 verres »).
- **Les deux** : « environ 1 L (4 verres) ». Plus clair, mais plus long, alors que la règle est moins de 12 mots.

Rappel : le 12/10, j'ai demandé qu'il n'y ait plus aucun **litre de pot** à l'écran (tailles de pot en centimètres
seulement). La question porte ici sur **l'eau à verser**, pas sur la taille du pot.

**À trancher :** litres, verres ou les deux ? Et le repère « environ 20 % du volume du pot » est-il raisonnable ?

### 3. Comment tester le coach d'arrosage (Balco+) avant que le paiement existe ?

- Mon compte de test est en offre gratuite. Pour le passer en Balco+, il faudrait modifier la base de données du
  serveur (une commande SQL), ce que je ne sais pas faire seul.
- Proposition : un interrupteur **« Simuler Balco+ »** dans Réglages → Version de test. Il ne vaut que sur ce
  téléphone, ne change rien au compte ni au serveur, et ne déverrouille pas les vraies limites du serveur, comme le
  nombre de questions à l'IA.

**À trancher :** d'accord pour cet interrupteur ? Faut-il qu'il serve aussi à prévisualiser les autres avantages
Balco+ à venir ?

### 4. Dans quel ordre ?

- Proposition : **d'abord 6a (gratuit)**, je la teste et la valide sur mon téléphone, **puis 6b (coach Balco+)**.
- Alternative : tout en une seule livraison. C'est plus rapide, mais plus de choses à tester d'un coup.

**À trancher :** 6a puis 6b, ou tout ensemble ?

## Questions bonus (facultatives)

- Faut-il aussi tenir compte du **soleil du balcon** dans la version gratuite ? Par exemple, un balcon plein sud
  non couvert ferait arroser un peu plus souvent. Ou faut-il le garder pour le coach Balco+ ?
- Pour le **coach Balco+**, vaut-il mieux une quantité précise (« 1,2 L ») ou une fourchette (« 1 à 1,5 L ») ?
