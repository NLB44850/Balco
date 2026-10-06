# Balco : récapitulatif à coller au début d'une conversation avec Claude

*À jour au 6 octobre 2026 (nuit). Copier tout le texte sous la ligne ci-dessous dans une nouvelle conversation sur claude.ai.*

---

Bonjour Claude. Je travaille sur **Balco**, une application de jardinage sur balcon, en français. Voici le contexte, puis une idée sur laquelle j'aimerais **ton avis**.

## Qui je suis et comment m'aider

- Je suis le porteur du projet, **je ne suis pas développeur**. Réponds-moi en français, simplement, avec des étapes numérotées.
- Je teste chaque étape sur mon téléphone Android avant de passer à la suivante.
- Ne me demande jamais de coller un secret (clé Expo, clé Anthropic, mot de passe) : je les tape moi-même.
- Le code est développé avec **Claude Code** (dépôt GitHub `NLB44850/Balco`, branche `claude/eloquent-gates-g7xc6x`). Ici, j'ai surtout besoin d'aide pour **réfléchir, décider et préparer** (idées, priorités, textes, plans), puis je transmets à Claude Code.

## L'application en bref

Balco dit chaque jour quoi faire pour chaque plante du balcon, selon la saison et la météo de ma ville.

- **4 onglets** : Aujourd'hui (la liste du jour à cocher), Balcon (mes plantes en cartes photo), Saisons (le calendrier, à lire), Nora (l'assistante IA). « Moi » s'ouvre par l'avatar, « Observer » (analyse d'une photo) par le bouton appareil photo.
- **Style** : inspiré de Too Good To Go, Spotify, Uber et Airbnb. Trois règles : **moins d'efforts, clarté visuelle, retour immédiat**. Un seul vert (#1F7A4D), orange pour la chaleur et « à surveiller », bleu pour le gel. Police Onest. Fond « lumière du balcon » (ombres de feuillage selon l'heure et la météo).
- **Technique** : Expo / React Native (Android d'abord), serveur Node (Express, tRPC, MySQL), IA Claude d'Anthropic pour Nora et l'analyse des photos, météo Open-Meteo.
- **Offre** : gratuit (rappels du téléphone, calendrier, sauvegarde, 1 photo analysée et 5 questions à Nora par mois) ; **Balco+** payant plus tard (alertes gel et orage même application fermée, plusieurs appareils, 20 photos et 100 questions par mois, prix fondateur pour les 500 premiers). Le paiement n'est pas encore branché.

## Ce qui est fait et validé sur mon téléphone

- **Rappels intelligents** : un geste par plante et par jour selon la météo (pluie, gel, chaleur, vent, orage) ; « Fait », « Dans 3 h », « Pas aujourd'hui » ; notifications sur le téléphone.
- **Aujourd'hui** : une ligne à faire par plante (« Arrose le basilic » + comment vérifier) ; le geste suivant prend sa place une fois fait ; arrosages regroupés ; gestes pas urgents repliés ; alertes météo en bandeau en haut ; l'eau économisée grâce à la pluie est comptée toute seule.
- **Saisons** : calendrier de 100 plantes vérifié auprès de semenciers, adapté au climat de ma ville ; à lire (on coche sur Aujourd'hui) ; suggestions « à semer ou planter ce mois-ci » et « Idée du mois », qui changent chaque jour.
- **Nora** : connaît mes plantes, ma ville, la saison, mon historique ; se souvient de mes préférences et de ce que je lui dis (avec la date).
- **Observer** : photo d'une plante → nom, état de santé, gestes à faire, solution naturelle ; une analyse offerte sans compte.
- **Progression** : Ma semaine (gestes, récoltes, eau économisée), série de « jours suivis », badges, niveaux, carte « Sa progression » par plante ; fête en plein écran seulement pour les grands moments.
- **Mode vacances** : plan de départ, liste pour un proche qui arrose, rappels muets pendant l'absence.
- **Catalogue** : 100 plantes avec photos d'exemple libres de droits.
- **Coulisses** : budget IA mensuel avec pause automatique, sauvegarde du compte, protections contre les abus, tests automatiques (457 tests et 30 parcours complets).

## Ce qui vient d'être fait (6 octobre) : l'accueil refait, en cours de test

Un plan en 8 étapes, toutes codées ; je suis en train de les tester sur mon téléphone.

1. **Plantes de saison seulement** : l'accueil ne propose que ce qu'on peut semer ou planter ce mois-ci, dans le climat de ma ville. Si une envie n'a rien de possible maintenant, l'app le dit : « Les tomates se plantent en mai. En attendant, voici ce qui pousse maintenant. », ou, si mon balcon ne convient pas, « Les tomates ont besoin de soleil presque toute la journée. Voici plutôt ce qui pousse bien chez toi maintenant. » (corrigé après mon test, **validé**).
2. **« Activer les rappels »** demande toujours l'autorisation du téléphone et ne dit plus « activés » en cas de refus.
3. **Ville** : bandeau « Météo de Paris par défaut · Choisir ma ville » sur Aujourd'hui tant que la ville manque ; ligne « Ta ville » dans Réglages.
4. **Deux états pour une plante** : *installée* (déjà en terre) ou *à planter* (son premier geste est « Sème la mâche » ou « Plante la lavande » ; pas d'arrosage ni d'alerte avant ; le cocher l'installe).
5. **Nouveau parcours** : « Ton balcon, au bon moment. », « C'est parti » ou « Passer ». Puis « Tu as déjà des plantes sur ton balcon ? » :
   - **Oui** → « Lesquelles ? » (recherche + raccourcis), soleil, espace, ville ;
   - **Pas encore** → soleil, espace, envies, ville, puis « Tes premières plantes » de saison.
   Soleil dit simplement (« Le soleil tape presque toute la journée », « Le matin ou l'après-midi seulement », « Presque jamais », « Je ne sais pas »). « Des salades à couper » remplace « Moins de gaspillage ».
6. **Ville et rappels dans le parcours** : la position n'est demandée que si je touche « Utiliser ma position » ; sur téléphone, dernière question « Je te préviens s'il gèle cette nuit ou si tes plantes ont soif. ».
7. **Arrivée** : carte « Bienvenue, voici ton balcon » le premier jour ; après « Passer », carte « Quelques questions » pour reprendre l'accueil ; bouton « Refaire l'accueil » (Réglages → Version de test).
8. **Prénom et expérience sortis de l'accueil** : Nora demande mon prénom dans sa conversation (sans IA, sans compte) ; le niveau d'expérience se règle dans Réglages, Nora parle simplement par défaut.

Points encore ouverts sur l'accueil : quoi proposer en hiver (en décembre-janvier, seulement 1 ou 2 plantes de saison) ; une plante ajoutée depuis le catalogue arrive « installée » (faut-il demander « Déjà en terre ? ») ; « Je ne sais pas » pour le soleil vaut mi-ombre.

## Mon idée : un pas-à-pas pour planter (j'aimerais ton avis)

**Mon idée** : un pas-à-pas **facultatif** avant de planter : de quoi j'ai besoin pour planter, puis pour entretenir, avec **de petites illustrations à chaque étape**. Sans surcharger l'application ni le geste de l'utilisateur.

**Ce que Claude Code propose :**

- **On ouvre le guide, on ne l'impose jamais.** Sur Aujourd'hui, « Plante la lavande » se coche toujours d'un toucher. Toucher la ligne ouvre le détail (feuille du bas) avec un bouton « Pas à pas · 4 étapes ». Le même guide est accessible depuis la fiche de la plante (« Comment la planter ») et depuis le catalogue (« Avant d'acheter : ce qu'il te faut »).
- **Trois parties courtes :**
  1. **Ce qu'il te faut** : une petite liste à cocher, adaptée à la plante (pot percé d'au moins 10 L, terreau, billes d'argile, plant ou graines, arrosoir). Option : la partager comme liste de courses.
  2. **Le pas-à-pas** : 4 ou 5 écrans qu'on fait glisser, une illustration et une phrase chacun (« Mets 2 cm de billes au fond », « Remplis de terreau », « Fais un trou de la taille de la motte », « Installe le plant et tasse », « Arrose bien »). Le dernier écran a un bouton **« C'est planté »** qui coche le geste sur Aujourd'hui (la plante passe à « installée »).
  3. **Et après ?** : une seule carte avec les 3 gestes qui comptent pour cette plante (arrosage, engrais, récolte). Pas de nouveau suivi : Aujourd'hui les rappelle le moment venu.
- **Réaliste à fabriquer** : pas 100 guides écrits à la main, mais 4 modèles (semer en pot, semer au chaud en godets, planter un plant acheté, installer une vivace ou un petit arbuste en grand pot), personnalisés avec les données de chaque plante. Il faudrait ajouter au catalogue la profondeur de semis, le nombre de graines ou de plants par pot et l'espacement, vérifiés auprès de semenciers.
- **Illustrations** : une vingtaine de dessins communs, pas un par plante. Style simple au trait, vert Balco sur fond clair, dans l'esprit des ombres du balcon ; légers et utilisables hors connexion. Dessinés par Claude Code en attendant, ou plus tard par un illustrateur.

**Les questions qu'on m'a posées, et sur lesquelles j'aimerais ton avis :**

1. Les entrées (détail du geste sur Aujourd'hui, fiche plante, catalogue) : les trois, ou seulement depuis Aujourd'hui ?
2. Les illustrations : dessins simples faits par Claude Code, ou illustrateur ?
3. La liste « Ce qu'il te faut » : partageable comme liste de courses, ou simple ?

**Ce que j'attends de toi :**

- Est-ce que l'idée tient la promesse « moins d'efforts » ou risque-t-elle d'alourdir ?
- Ce qui manque, ce qui est en trop.
- Ton avis sur les 3 questions.
- Une idée de ton et de longueur pour les phrases des étapes, pour un débutant complet.

## Le reste de la feuille de route, dans l'ordre

1. **Finir le test de l'accueil** sur mon téléphone, corriger, puis fusionner dans la branche principale (`main`).
2. **Revérifier sur le prochain APK** (la vraie app Android) : l'aperçu de la photo dans Observer (corrigé, pas encore revu), l'appareil photo depuis Aujourd'hui, les notifications, la position et les rappels de l'accueil.
3. **Pas-à-pas pour planter** (l'idée ci-dessus), une fois l'accueil validé.
4. **Après la récolte** des plantes qu'on récolte en une fois (radis, carottes, salades pommées) : « Tout récolté ? » puis « Ressemer » ou « Libérer le pot ». À décider.
5. **Mémoire de Nora sur plusieurs jours** : test à faire sur 2 ou 3 jours.
6. **Tester sans Codespace** (idée) : une version web toujours en ligne et l'APK construit automatiquement.
7. **Avant la publication** (pas encore décidée) : notifications envoyées par le serveur (Firebase), paiement Balco+ (RevenueCat), mise à jour d'Expo (54 → 57), politique de confidentialité, fiche et compte Google Play.
8. **Version suivante** : suivi d'une plante en photos dans le temps, balcon visuel (plan, emplacement, exposition), récoltes et recettes, défis entre jardiniers.

## Décisions déjà prises (à ne pas remettre en question sans moi)

- Aujourd'hui garde **une ligne à faire par plante au plus**.
- Ordre des gestes : alerte météo, arrosage, récolte, plantation / semis / rempotage, engrais, entretien.
- Saisons est un calendrier **à lire** ; on ne coche que sur Aujourd'hui.
- Fête en plein écran seulement pour un nouveau badge et la 1ʳᵉ récolte d'une plante, une fois par jour.
- L'accueil ne propose que des plantes de saison ; la ville est demandée juste avant le choix des plantes ; prénom et expérience ne sont plus dans l'accueil.
- Sans compte : une analyse photo par téléphone, trois par réseau et par jour.
- L'app **ne copie pas** les photos dans la galerie du téléphone.
- Un compte gratuit sauvegarde son balcon depuis un seul téléphone ; plusieurs appareils = Balco+.

## Comment je teste

- **Le plus rapide** : l'app web servie par mon Codespace GitHub, ouverte dans Chrome sur mon téléphone (simulation météo disponible dans Réglages).
- **La vraie app Android (APK)** : construite avec Expo (EAS), pour les notifications, l'appareil photo et la position.

---

*Ma demande pour cette conversation :* donne-moi ton avis sur l'idée du pas-à-pas pour planter (voir plus haut) et sur les 3 questions.
