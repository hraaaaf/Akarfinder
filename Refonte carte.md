# Refonte carte — Référentiel visuel premium AkarFinder

> **Statut : référentiel canonique de cible visuelle**
>
> Ce document définit la cible premium à atteindre pour les pages AkarFinder. Il ne remplace pas le produit existant par une direction étrangère : il **prolonge l’ADN réel du site**. Toute refonte future doit être comparée à ce référentiel, et non improvisée lot après lot.

## 1. Doctrine

### Goal
Construire une expérience immobilière marocaine premium, claire, rassurante et data-first, dont chaque page ressemble au même produit.

### Succès observable
Une page est conforme si elle :
- utilise les tokens et composants AkarFinder existants ou leur évolution explicitement documentée ;
- respecte la même hiérarchie visuelle, les mêmes rayons, espacements, typographies et états interactifs ;
- ne crée aucune rupture esthétique avec les pages déjà validées ;
- reste lisible et exploitable sur mobile, tablette et desktop ;
- respecte le référentiel spécifique de son type de page ci-dessous ;
- obtient une validation visuelle **avant / référentiel / après** sur les mêmes viewports.

### Preuve obligatoire pour chaque lot UI/UX
1. capture(s) **avant** ;
2. Goal écrit + critères ;
3. référence ou mockup visuel ;
4. implémentation ;
5. capture(s) **après** sur les mêmes viewports ;
6. contrôle des écarts ;
7. score visuel sur 10 ;
8. tests fonctionnels et accessibilité proportionnels au changement.

Une page n’est jamais déclarée conforme sur la seule base du code.

---

## 2. ADN visuel AkarFinder à préserver

### Typographie
- Famille principale : **Plus Jakarta Sans**.
- Titres : denses, nets, jamais décoratifs.
- Corps : contraste élevé, longueur de ligne maîtrisée.
- Chiffres/prix/data : priorité à la lisibilité et à l’alignement.

### Palette canonique
- Fond principal : `#F7F8FA`.
- Texte principal : `#111827`.
- Violet data / action premium : `#7C3AED` à `#8B5CF6`.
- Orange attention / accent contextuel : `#F97316`.
- Vert validation / confiance : `#166534`.
- Blanc : utilisé pour les surfaces et cartes, pas comme vide sans structure.

### Formes
- Cartes : rayons visuels autour de **18–20 px** lorsque le composant appelle une surface premium.
- Ombres : sobres, diffuses, jamais « floating dashboard » excessif.
- Bordures : légères, principalement pour structurer et séparer, pas pour encadrer chaque pixel comme en 2013.

### Densité
- Premium = **moins de bruit**, pas plus d’effets.
- Une action principale identifiable par écran.
- Les informations secondaires se révèlent progressivement.
- Les blocs doivent respirer sans provoquer de scroll artificiel.

### Iconographie
- Icônes simples, cohérentes, taille optique uniforme.
- Pas de mélange de familles visuelles.
- Les icônes décoratives ne remplacent jamais un libellé nécessaire.

### Motion
- Transition courte et fonctionnelle.
- Aucun effet qui retarde la recherche, la comparaison ou la lecture d’une annonce.
- Respect de `prefers-reduced-motion`.

---

## 3. Principes premium transversaux

### Hiérarchie
1. intention utilisateur ;
2. réponse principale ;
3. données de confiance ;
4. actions ;
5. contenu secondaire.

### Recherche et données
- La recherche reste le cœur du produit.
- Le violet porte la donnée/action, pas le décor gratuit.
- Les scores, prix, surfaces, localités et badges doivent être lisibles avant les textes longs.
- Toute donnée non fiable doit être explicitement différenciée ou masquée selon les règles métier.

### Confiance
- Provenance et nature de l’annonce visibles sans surcharge.
- Badges premium/promoteur/agence/utilisateur/indexé doivent avoir une grammaire commune.
- Aucune formulation ne doit suggérer une certitude que la donnée ne permet pas.

### Responsive
Viewports de validation minimum :
- 390 px ;
- 430 px ;
- 768 px ;
- 1280 px.

La version mobile n’est pas une desktop compressée. Le contenu doit être re-priorisé.

---

# 4. Référentiel page par page

> L’inventaire doit rester synchronisé avec `app/`. Lorsqu’une nouvelle route publique est ajoutée, son référentiel doit être ajouté ici dans le même lot ou avant son implémentation visuelle.

## 4.1 Accueil `/`

### Rôle
Faire comprendre AkarFinder en quelques secondes et envoyer immédiatement vers la recherche.

### Cible premium
- Hero clair et court ;
- recherche immédiatement visible ;
- preuve de couverture/confiance sous forme de données sobres ;
- accès direct Acheter / Louer / Vendre ;
- sélection ou tendances sans transformer l’accueil en catalogue interminable ;
- footer riche mais calme.

### Interdit
- multiplication de CTA équivalents ;
- hero abstrait sans utilité ;
- promesses chiffrées non démontrées ;
- effets « portail immobilier générique » déconnectés d’AkarFinder.

---

## 4.2 Recherche `/search`

### Rôle
Être la surface la plus efficace du produit : comprendre, filtrer, comparer et ouvrir une annonce.

### Cible premium
- barre de recherche dominante mais compacte ;
- filtres rapides visibles ;
- filtres avancés organisés par intention ;
- compteur/résumé de recherche très lisible ;
- cartes de résultats cohérentes et data-first ;
- carte géographique intégrée sans concurrencer la liste ;
- états vide, loading, erreur et données incomplètes explicitement dessinés ;
- sticky actions seulement lorsqu’elles réduisent réellement la friction.

### Mobile
- priorité à la liste ;
- filtres accessibles en une action ;
- bascule carte/liste évidente ;
- aucune barre horizontale parasite.

---

## 4.3 Détail annonce `/annonces/[slug]` ou route canonique équivalente

### Rôle
Transformer un résultat en décision éclairée.

### Cible premium
- média principal haut de page ;
- prix, type, transaction, surface et localisation immédiatement lisibles ;
- badges de provenance/confiance près du résumé, jamais noyés ;
- colonne ou zone d’action stable sur desktop ;
- sections : résumé, caractéristiques, description, localisation, contexte, source/contact ;
- comparaison et favoris accessibles mais secondaires ;
- données incertaines visuellement distinguées ;
- aucun faux « temps de trajet » présenté comme fiable si la source ne l’est pas.

### Mobile
- résumé avant galerie secondaire ;
- CTA principal sticky seulement si nécessaire ;
- sections repliables si la longueur l’exige.

---

## 4.4 Acheter `/acheter`

### Rôle
Landing transactionnelle orientée achat.

### Cible premium
- proposition de valeur concise ;
- entrée recherche Achat préconfigurée ;
- raccourcis villes/quartiers utiles ;
- tendances/prix uniquement avec provenance acceptable ;
- contenus d’accompagnement courts et actionnables.

---

## 4.5 Louer `/louer`

### Rôle
Landing transactionnelle location.

### Cible premium
Même structure fondamentale qu’Acheter pour préserver la mémoire utilisateur, avec contenus et filtres adaptés à la location.

---

## 4.6 Vendre `/vendre`

### Rôle
Transformer un propriétaire en dépôt/lead qualifié.

### Cible premium
- message direct ;
- bénéfices concrets ;
- processus en peu d’étapes ;
- réassurance ;
- CTA principal unique ;
- formulaire ou entrée de parcours visuellement sobre.

---

## 4.7 Comparateur `/compare`

### Rôle
Comparer des biens sans surcharge cognitive.

### Cible premium
- colonnes comparables ;
- différences importantes mises en évidence ;
- images contenues ;
- prix, surface, localisation et attributs clés alignés ;
- possibilité de retirer/remplacer facilement un bien ;
- mobile traité en cartes séquentielles ou comparaison ciblée, jamais tableau desktop écrasé.

---

## 4.8 Alertes `/alerts`

### Rôle
Créer et gérer une veille immobilière.

### Cible premium
- état de chaque alerte immédiatement lisible ;
- résumé humain des critères ;
- édition/suspension/suppression accessibles ;
- création d’alerte guidée, courte ;
- distinction nette entre aucune alerte et aucune nouvelle annonce.

---

## 4.9 Accompagnement `/accompagnement`

### Rôle
Présenter les services d’aide sans ressembler à une page commerciale générique.

### Cible premium
- problème utilisateur → solution → preuve → action ;
- modules cohérents avec l’univers immobilier AkarFinder ;
- tonalité rassurante et factuelle ;
- CTA contextualisés.

---

## 4.10 Crédit `/credit`

### Rôle
Aider à comprendre la capacité de financement sans transformer AkarFinder en établissement de crédit.

### Cible premium
- simulateur/entrée data claire ;
- hypothèses visibles ;
- résultat hiérarchisé ;
- avertissements légaux ou limites placés au bon niveau ;
- aucune fausse précision.

---

## 4.11 Compagnon `/compagnon`

### Rôle
Assistant/parcours guidé AkarFinder.

### Cible premium
- une question/action dominante à la fois ;
- progression visible ;
- recommandations sobres ;
- conservation du langage visuel du reste du site ;
- aucune interface de chat générique plaquée sur le produit si le besoin ne le justifie pas.

---

## 4.12 Comment ça marche `/comment-ca-marche`

### Rôle
Expliquer le produit et sa logique de confiance.

### Cible premium
- 3 à 5 étapes maximum dans le premier niveau ;
- exemples visuels réels du produit ;
- transparence sur indexation, provenance, déduplication et limites ;
- CTA vers la recherche.

---

## 4.13 À propos `/a-propos`

### Rôle
Présenter mission, positionnement et principes.

### Cible premium
- texte éditorial court ;
- métriques uniquement vérifiées ;
- valeurs produit liées à des mécanismes concrets ;
- identité visuelle forte mais sobre.

---

## 4.14 Contact `/contact`

### Rôle
Permettre un contact clair sans friction.

### Cible premium
- choix du motif ;
- formulaire court ;
- coordonnées utiles ;
- confirmation explicite ;
- erreurs champ par champ accessibles.

---

## 4.15 Pages légales et de gouvernance
Routes incluant notamment `/conditions-utilisation`, demandes de retrait et autres pages légales actives.

### Cible premium
- même header/footer que le produit ;
- colonne de lecture maîtrisée ;
- sommaire sticky sur desktop pour les textes longs ;
- titres et dates de mise à jour clairs ;
- aucune décoration qui nuise à la lisibilité juridique.

---

## 4.16 Pages partenaires / promoteurs / agences

### Rôle
Donner une identité premium aux entités sans casser la neutralité AkarFinder.

### Cible premium
- identité de l’entité cadrée dans le design AkarFinder ;
- badge partenaire/premium explicite ;
- catalogue filtrable ;
- informations vérifiées distinctes du contenu marketing ;
- CTA de contact mesurés ;
- pas de mini-site totalement différent à l’intérieur du produit.

---

## 4.17 Pages ville / quartier / marché

### Rôle
Donner du contexte local et orienter vers les annonces pertinentes.

### Cible premium
- nom de zone et contexte géographique clairs ;
- métriques uniquement si le seuil de maturité data est satisfait ;
- carte et périmètre cohérents avec la vérité géographique ;
- accès rapide aux annonces ;
- contenu éditorial secondaire ;
- aucun prix/m² public si les gates de fiabilité ne sont pas atteints.

---

## 4.18 Authentification / compte / favoris / espace personnel

### Rôle
Donner accès aux fonctions personnelles sans créer un second design system.

### Cible premium
- formulaires simples ;
- états de session explicites ;
- composants et tokens identiques au public ;
- navigation personnelle cohérente ;
- favoris, alertes et paramètres reliés par la même grammaire.

---

## 4.19 États système

Sont considérés comme des pages à part entière :
- 404 ;
- erreur ;
- loading/skeleton ;
- résultats vides ;
- absence de données ;
- contenu retiré/non disponible.

### Cible premium
- explication courte ;
- action de sortie évidente ;
- aucun écran blanc ou message technique brut ;
- tonalité AkarFinder cohérente.

---

# 5. Grille de score visuel obligatoire

Chaque lot UI reçoit une note /10 après capture « après ».

- **2 pts — fidélité au référentiel** : structure et direction conformes.
- **2 pts — cohérence AkarFinder** : palette, typo, composants, iconographie.
- **2 pts — hiérarchie / lisibilité** : intention et action principales immédiates.
- **1 pt — responsive** : 390 / 430 / 768 / 1280 sans régression visible.
- **1 pt — accessibilité visuelle** : contraste, focus, taille, reduced motion selon besoin.
- **1 pt — densité / absence de bruit**.
- **1 pt — finition** : alignements, rythmes, détails, états.

### Seuils
- `< 8/10` : non conforme, correction obligatoire.
- `8–8.9/10` : acceptable mais pas cible premium finale.
- `9–9.4/10` : très bon, écarts résiduels documentés.
- `>= 9.5/10` : cible premium atteinte **uniquement si les preuves fonctionnelles et visuelles sont également vertes**.

Une note ne remplace jamais les tests.

---

# 6. Protocole anti-dérive

Pour toute nouvelle modification visuelle :

1. identifier la page et la section du présent référentiel ;
2. capturer l’état réel ;
3. définir le Goal visuel du lot ;
4. produire une référence/mockup compatible avec l’existant ;
5. implémenter sans introduire de nouveaux tokens si les tokens actuels suffisent ;
6. capturer les mêmes viewports ;
7. comparer **avant / référence / après** ;
8. scorer ;
9. corriger les écarts avant closeout ;
10. mettre à jour ce document seulement si une évolution de design system a été explicitement validée.

### Règle absolue
**Le code suit le référentiel. Le référentiel suit l’ADN vérifié d’AkarFinder. Aucun lot ne redéfinit seul l’identité du produit.**

---

# 7. Ordre recommandé de la refonte

Priorité fonctionnelle, pas cosmétique :
1. Recherche ;
2. Détail annonce ;
3. Accueil ;
4. Acheter / Louer ;
5. Vendre ;
6. Comparateur ;
7. Alertes / Favoris / Compte ;
8. Ville / quartier / marché ;
9. Promoteurs / agences / partenaires ;
10. Crédit / accompagnement / compagnon ;
11. pages explicatives ;
12. pages légales et états système.

Chaque lot doit rester livrable indépendamment et ne doit jamais dégrader une page déjà certifiée.

---

# 8. Definition of Done d’un lot visuel

Un lot n’est fermé que lorsque :
- Goal écrit satisfait ;
- capture avant disponible ;
- référence/mockup disponible ;
- implémentation conforme ;
- captures après disponibles aux viewports concernés ;
- comparaison réalisée ;
- score documenté ;
- tests fonctionnels ciblés verts ;
- accessibilité ciblée verte ;
- aucune régression visible connue ;
- documentation/roadmap cohérente avec l’état réellement vérifié.

---

## Historique
- **v1** — création du référentiel canonique de refonte premium, basé sur l’ADN visuel existant d’AkarFinder et destiné à verrouiller tous les lots UI futurs.
