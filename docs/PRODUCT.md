# AkarFinder — Définition produit

**Version : 2026-08-03**  
**Statut : définition canonique**

## 1. Définition

AkarFinder est un **moteur de recherche immobilier, un index national et une couche d’intelligence pour le marché marocain**.

Le produit ne cherche pas à devenir un portail classique rempli de copies d’annonces. Il organise des observations issues de plusieurs canaux, applique des règles de provenance, de qualité et d’affichage, rapproche les représentations susceptibles de décrire le même bien, puis aide l’utilisateur à revenir vers la source ou le professionnel approprié.

Le cœur produit est `/search`.

L’objectif long terme est le **Property Graph du marché immobilier marocain** :

- une annonce est une observation de source ;
- plusieurs observations peuvent représenter un même bien ;
- une propriété canonique reste versionnée et explicable ;
- aucune information manquante n’est inventée ;
- les divergences entre sources sont conservées ;
- la source originale reste attribuée et accessible.

## 2. Promesse

Promesse de marque :

> **Toutes les annonces immobilières du Maroc. Une seule recherche.**

Cette phrase exprime l’ambition. Elle ne doit pas être utilisée comme une affirmation de couverture totale tant qu’une certification de profondeur nationale ne l’a pas démontrée.

Tagline :

> **Cherchez moins. Trouvez mieux.**

## 3. Valeur utilisateur

AkarFinder doit permettre de :

- rechercher par ville, quartier, intention, type, budget et surface ;
- voir clairement l’origine d’un résultat ;
- accéder à la source originale ;
- distinguer une annonce partenaire, une annonce première partie et un résultat web indexé ;
- comprendre quand une donnée est complète, limitée, ancienne ou ambiguë ;
- comparer des résultats sans transformer un signal faible en certitude ;
- regrouper les représentations probablement liées au même bien ;
- obtenir des repères de prix uniquement lorsque les données sont suffisamment comparables ;
- enregistrer un projet, comparer et recevoir des alertes ;
- contacter un professionnel dans un cadre transparent.

## 4. Trois familles de contenu public

### A. Partenaire ou autorisé

Contenu reçu via contrat, feed, import ou permission explicite. Les droits d’affichage, images, contacts, stockage et fraîcheur sont définis par source.

### B. Première partie

Contenu créé directement par un promoteur, une agence partenaire ou un utilisateur selon les règles de vérification et de modération applicables.

### C. Résultat web indexé

Représentation limitée d’une page publique découverte légalement : titre/snippet borné, provenance visible, aucune galerie ni contact repris sans droit, CTA principal vers la source originale.

Un résultat web indexé ne doit jamais être présenté comme une annonce partenaire.

## 5. Pipeline produit canonique

`DISCOVERY → INGESTION / OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION / CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION / SERP`

Aucune étape ne peut être contournée pour atteindre artificiellement un objectif de volume.

## 6. Vérité produit actuelle

Au 3 août 2026 :

- application publique active ;
- recherche historique structurée opérationnelle ;
- read model ODM connecté derrière un Canary déterministe et réversible ;
- cap technique Canary : 10 % ;
- parité de paramètres entre page SSR et API ;
- 56 777 documents Thin Index conservés ;
- 34 172 classés immobilier probable ;
- 22 586 éléments non immobiliers quarantainés ;
- 22 481 représentations immobilières display eligible ;
- **7 483 pages annonce `LISTING` réellement éligibles au read model public** ;
- 717 lignes avec prix et surface comparables ;
- six visuels Option A approuvés en Production.

Le différentiel entre volume indexé et profondeur utile est le principal chantier produit.

## 7. North Stars

### Utilisateur

- taux de recherches avec au moins plusieurs résultats utiles ;
- taux de zéro résultat ;
- diversité de sources ;
- fraîcheur ;
- taux de clic vers la source originale ;
- taux de comparaison et de sauvegarde ;
- satisfaction sur la pertinence.

### DATA

- vraies pages annonce LISTING éligibles ;
- couverture ville/quartier/type/intention ;
- prix et surfaces prouvés ;
- taux de comparabilité ;
- doublons visibles ;
- source concentration ;
- fraîcheur confirmée ;
- pourcentage de résultats avec provenance complète.

### B2B

- inventaire partenaire actif ;
- fraîcheur des feeds ;
- leads consentis et qualifiés ;
- délai de traitement ;
- conversion visite/contact ;
- valeur mesurable apportée aux promoteurs et agences.

## 8. Ce qu’AkarFinder n’est pas

- un scraper sans gouvernance ;
- une copie de bases concurrentes ;
- une agence immobilière ;
- un estimateur officiel ;
- un système qui affirme qu’un bien est vérifié sans preuve ;
- un classement pay-to-win masqué ;
- un produit qui réutilise contacts, galeries ou marques sans droit ;
- un moteur qui confond plusieurs annonces avec plusieurs propriétés uniques.

## 9. Monétisation

La monétisation doit rester séparée de la vérité du résultat :

- abonnements et pages professionnelles ;
- feeds et outils promoteurs/agences ;
- leads consentis et qualifiés ;
- visibilité sponsorisée clairement étiquetée ;
- intelligence de marché agrégée ;
- services liés à Sakan Expo ;
- partenariats financement et services, sous réserve de conformité.

Un paiement peut modifier la visibilité commerciale, jamais le niveau de fiabilité affiché ni les règles de display eligibility.

## 10. Priorité produit

La priorité n’est pas d’ajouter davantage de surfaces UI. Elle est de rendre la recherche :

1. plus profonde ;
2. plus exacte ;
3. plus fraîche ;
4. plus diversifiée ;
5. plus explicable ;
6. juridiquement et techniquement durable.
