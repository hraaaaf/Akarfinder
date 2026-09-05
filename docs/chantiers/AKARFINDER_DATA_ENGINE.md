# AKARFINDER DATA ENGINE

## Goal
Construire un moteur de données immobilier interne capable de maximiser le corpus multi-sources, mesurer la fraîcheur, enrichir les annonces, dédupliquer les biens et promouvoir seulement les représentations suffisamment fiables vers la recherche publique AkarFinder.

## État de départ vérifié

- Corpus Mubawab interne : **37 420 IDs uniques**
- Mubawab `current_verified` : **18 445**
- Mubawab `historical_unverified` : **18 975**
- `property_listings` existants : **7 921**
- représentations de recherche publique : **21 537**

Le corpus historique n'est pas considéré comme mort par défaut. Il reste conservé comme matière interne et doit être scoré avant promotion publique.

---

## P1 — Freshness Engine

### Goal
Attribuer à 100 % du corpus un score interne de fraîcheur et un état explicable.

### Signaux
- dernière observation
- fréquence de réapparition
- présence dans les sweeps récents
- source de confirmation
- stabilité URL / source ID
- ancienneté historique
- signaux de disparition / expiration

### Sortie
- `fresh_confirmed`
- `likely_active`
- `uncertain`
- `stale`
- `archive`
- score interne `0..100`

### Succès
- 100 % des 37 420 Mubawab scorés
- aucune annonce supprimée uniquement faute de preuve récente
- score explicable par signaux stockés

### Preuve
- distribution des scores
- tests unitaires des règles
- échantillons manuels par classe

---

## P2 — Enrichissement

### Goal
Transformer les IDs bruts en fiches exploitables sans inventer les champs absents.

### Champs cibles
- titre
- ville
- quartier
- prix
- surface
- type de bien
- transaction
- chambres / pièces
- URL canonique
- photos / métadonnées autorisées
- source
- première / dernière observation

### Succès
- couverture mesurée champ par champ
- ≥ 90 % des candidats promouvables avec le minimum requis

### Preuve
- rapport de couverture
- taux de null par champ
- échantillons de validation

---

## P3 — Promotion vers `property_listings`

### Goal
Promouvoir progressivement les candidats suffisamment fiables vers le modèle canonique.

### Gates
- score fraîcheur minimum
- données minimales présentes
- URL ou représentation source sûre
- aucune incohérence critique
- déduplication source effectuée

### Succès
- promotion idempotente
- aucun doublon source
- aucune baisse de qualité du moteur public

### Preuve
- delta avant/après `property_listings`
- tests de recherche
- contrôle de régression

---

## P4 — Déduplication inter-portails

### Goal
Reconnaître plusieurs annonces comme représentations d'un même bien.

### Signaux
- localisation
- prix
- surface
- texte
- images si autorisées
- agence / vendeur
- proximité temporelle

### Sortie
`1 bien canonique -> N sources`

### Succès
- réduction mesurable des doublons visibles
- faux positifs contenus par seuil de confiance

### Preuve
- échantillon annoté
- précision / rappel estimés
- groupes suspects audités

---

## P5 — Ranking AkarFinder

### Goal
Classer les résultats selon utilité réelle, pas seulement récence.

### Facteurs
- pertinence requête
- fraîcheur
- complétude
- fiabilité source
- précision géographique
- cohérence prix / surface
- duplication
- qualité globale

### Succès
- les meilleurs résultats remontent sans masquer artificiellement les historiques utiles

### Preuve
- jeux de requêtes fixes
- comparaison avant/après
- audit manuel top 10

---

## P6 — Archive & Market Memory

### Goal
Exploiter les annonces anciennes comme mémoire immobilière.

### Usages
- historique de prix
- durée probable de commercialisation
- évolution prix/m²
- disparition / réapparition
- comparables historiques
- tendances par quartier / ville

### Succès
- les annonces mortes ne polluent pas la recherche principale mais restent exploitables analytiquement

---

## P7 — Coverage Expansion

### Goal
Maximiser la couverture Mubawab puis reproduire le pipeline sur Avito, Agenz, Sarouty et autres sources autorisées.

### Priorité Mubawab
- expliquer le gap entre le corpus observé et les volumes publics annoncés
- auditer les familles de routes hors manifest actuel
- compléter uniquement via surfaces autorisées et preuves externes légitimes
- ne jamais confondre présence historique et activité actuelle

### Succès
- couverture quantifiée par source
- aucun chiffre promu sans preuve du dénominateur

---

## Ordre d'exécution

1. **Freshness Engine**
2. **Enrichissement Mubawab**
3. **Promotion vers `property_listings`**
4. **Déduplication inter-portails**
5. **Ranking AkarFinder**
6. **Archive & Market Memory**
7. **Coverage Expansion multi-sources**

---

## Garde-fous

- pas de suppression destructive du corpus historique par défaut
- pas de publication publique d'un candidat non qualifié
- pas d'écriture production hors lot explicitement autorisé
- pas de merge sans autorisation explicite
- pas de déploiement Vercel sans autorisation explicite
- tout lot significatif doit verrouiller : **Goal / Succès / Preuve**
- CI en cours n'arrête pas les travaux sûrs indépendants

---

## Cible produit

Construire progressivement :

- **100k+ annonces brutes multi-sources**
- un corpus historique plus large encore
- **50k–80k annonces réellement exploitables** comme cible intermédiaire
- un moteur public propre, scoré, dédupliqué et explicable

Le compteur brut n'est jamais le KPI final. Le KPI utile est : **couverture maximale x fraîcheur x qualité x déduplication**.
