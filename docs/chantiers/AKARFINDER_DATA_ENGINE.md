# AKARFINDER DATA ENGINE

## Goal
Construire un moteur de données immobilier interne capable de maximiser le corpus multi-sources, mesurer la fraîcheur, enrichir les annonces, dédupliquer les biens et promouvoir seulement les représentations suffisamment fiables vers la recherche publique AkarFinder.

## État vérifié — handover 2026-09-06

### Corpus Mubawab
- corpus interne total : **37 420 IDs uniques**
- `current_verified` : **18 445**
- `historical_unverified` : **18 975**
- manifest robots-safe certifié : **3 174 / 3 174 shards**
- aucune suppression destructive du corpus historique

### P1 — Freshness Engine
**TERMINÉ**

Distribution certifiée :
- score 100 : **12 149**
- score 95 : **6 160**
- score 90 : **136**
- score 40 : **18 975**

Le corpus complet est scoré et explicable. Les historiques restent conservés comme matière interne.

### P2 — Enrichissement Mubawab
**TERMINÉ pour le lot actuel**

Sur les **18 445** lignes `current_verified` :
- route enrichment : **18 445 / 18 445 = 100 %**
- titre : **17 702 / 18 445 = 96,0 %**
- prix connu : **12 584 / 18 445 = 68,22 %**
- surface : **15 012 / 18 445 = 81,4 %**

Statut prix explicite sur **18 445 / 18 445** :
- `known` : **12 584**
- `not_observed_on_card` : **4 058**
- `not_disclosed` : **1 271**
- `no_card_observation` : **468**
- `ambiguous` : **62**
- `rejected_evidence` : **2**

Aucun prix n'est inventé. Les prix EUR/USD conservés le sont dans leur devise native sans conversion arbitraire.

### Canonical Hygiene Mubawab
**CLASSIFICATION + QUARANTAINE PHYSIQUE TERMINÉES**

`listing_sources` classifiées : **1 286**
- vraies pages détail : **481**, `canonical_eligible=true`
- `/is/` search : **663**, `canonical_eligible=false`
- legacy search surfaces : **123**, `canonical_eligible=false`
- safe shards : **12**, `canonical_eligible=false`
- project pages : **6**, `canonical_eligible=false`
- autre non-individuel : **1**, `canonical_eligible=false`

Total non individuel : **805**.

État live vérifié après verrouillage :
- sources non individuelles encore actives : **0 / 805**
- lignes `thin_index_search_documents` liées à ces mauvaises URLs : **446**
- lignes mauvaises encore servables : **0 / 446**
- trigger de quarantaine `listing_sources` présent : **oui**
- trigger de protection `thin_index_search_documents` présent : **oui**

Test de non-régression DB : tentative transactionnelle de réactiver une source quarantinée avec `is_active=true` => valeur retournée **false** ; transaction annulée ensuite. Le verrou empêche donc la réactivation par une ingestion legacy.

Commits de fermeture :
- `80f3670f426f2a563f65b953ea807d7cac054239` — `db(data): enforce Mubawab canonical quarantine`
- `31120707c9ab0320362d070066c581a854408cbd` — `db(data): lock Mubawab quarantine against reactivation`

Migration live appliquée : `lock_mubawab_source_quarantine_v1`.

### État GitHub / livraison
- branche : `feat/mubawab-full-enumeration`
- PR : **#997 OPEN + DRAFT**
- merge : **NON**
- déploiement Vercel : **NON**
- promotion P3 vers `property_listings` : **NON AUTORISÉE / NON LANCÉE**

CI du commit `31120707c9ab0320362d070066c581a854408cbd` au moment du handover :
- CI Workflow Efficiency Policy : **SUCCESS**
- Phase 1 P0 Closure Gate : **in_progress**
- Phase 1 P1 Final Sweep Gate : **in_progress**
- Phase 1 P2 Residual Closure Gate : **in_progress**
- Canonical Baseline Validation : **in_progress**
- Canonical Baseline Compile Validation : **in_progress**
- UX Gate 0 Contracts : **in_progress**

Une CI `in_progress` n'annule pas les preuves DB déjà obtenues, mais elle ne doit pas être déclarée verte avant conclusion réelle.

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

### Statut
**PAS ENCORE AUTORISÉE.** Toute écriture de promotion vers `property_listings` nécessite une autorisation explicite séparée.

### Goal
Promouvoir progressivement les candidats suffisamment fiables vers le modèle canonique.

### Gates
- score fraîcheur minimum
- données minimales présentes
- URL ou représentation source sûre
- `canonical_eligible=true` pour toute source individuelle utilisée
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

1. **Freshness Engine** — terminé
2. **Enrichissement Mubawab** — terminé pour le lot actuel
3. **Canonical Hygiene / quarantine** — terminé et verrouillé
4. **Promotion vers `property_listings`** — prochain lot, autorisation explicite requise
5. **Déduplication inter-portails**
6. **Ranking AkarFinder**
7. **Archive & Market Memory**
8. **Coverage Expansion multi-sources**

---

## Garde-fous

- pas de suppression destructive du corpus historique par défaut
- pas de publication publique d'un candidat non qualifié
- toute source `canonical_eligible=false` doit rester `is_active=false` et non servable
- pas d'écriture P3 `property_listings` sans autorisation explicite
- pas de merge sans autorisation explicite
- pas de déploiement Vercel sans autorisation explicite
- tout lot significatif doit verrouiller : **Goal / Succès / Preuve**
- CI en cours n'arrête pas les travaux sûrs indépendants
- aucune CI `in_progress` ne doit être présentée comme SUCCESS

---

## Cible produit

Construire progressivement :
- **100k+ annonces brutes multi-sources**
- un corpus historique plus large encore
- **50k–80k annonces réellement exploitables** comme cible intermédiaire
- un moteur public propre, scoré, dédupliqué et explicable

Le compteur brut n'est jamais le KPI final. Le KPI utile est : **couverture maximale × fraîcheur × qualité × déduplication**.
