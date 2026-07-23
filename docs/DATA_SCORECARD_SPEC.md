# AkarFinder — DATA Scorecard & Gates

**Version : 2026-07-23**
**Statut : préparation documentaire — aucun changement runtime**

## Objectif

Créer un cockpit unique pour piloter la montée DATA sans tomber dans une métrique de volume trompeuse.

Le scorecard doit séparer clairement :

- acquisition ;
- conversion ;
- qualité ;
- fraîcheur ;
- canonicalisation ;
- couverture ;
- impact Search.

---

## 1. Acquisition

KPIs :

- discovered seeds total ;
- unique seeds après normalisation ;
- seeds par channel : OpenSERP / Sitemap / Common Crawl / partner ;
- seeds par source ;
- seeds par ville ;
- seeds par transaction ;
- seeds par type ;
- croissance nette / jour ;
- duplicate seed rate ;
- out-of-scope rate.

Alerte : une forte croissance brute avec faible diversité géographique ne constitue pas un progrès suffisant.

---

## 2. Confirmation / Conversion

KPIs :

- confirmation attempts ;
- exact confirmations ;
- confirmation yield ;
- admissible after confirmation ;
- structured listings créés ;
- structured conversion yield ;
- median time seed → structured ;
- outcomes par motif de rejet ;
- yield par source / ville / type / transaction.

Top 3 bottlenecks obligatoires dans chaque revue.

---

## 3. Qualité structurée

KPIs :

- city completeness ;
- transaction completeness ;
- property type completeness ;
- district coverage ;
- price availability ;
- surface availability ;
- bedrooms availability ;
- provenance coverage ;
- display eligibility rate ;
- contradictory data rate ;
- unknown / unclassified rate.

Règle : ne jamais améliorer artificiellement la complétude en inférant une donnée non prouvée.

---

## 4. Freshness

KPIs :

- fresh ;
- probably_fresh ;
- stale ;
- gone ;
- reappeared ;
- offers sans preuve temporelle récente ;
- median age of last evidence ;
- recheck success rate.

Avant la Freshness Machine complète, mesurer au minimum la présence et l'âge du dernier evidence event.

---

## 5. Property Graph

KPIs futurs :

- SourceOffers total ;
- canonical properties total ;
- clusters single-source ;
- clusters multi-source ;
- auto_merge count ;
- possible_match count ;
- distinct after contradiction count ;
- audited false-merge rate ;
- audited missed-merge rate ;
- evidence coverage.

Gate critique : false-merge rate prioritaire sur l'augmentation artificielle du taux de déduplication.

---

## 6. Coverage Matrix

Matrice :

`city × transaction × property_type × source`

Statuts recommandés :

- GREEN : profondeur satisfaisante ;
- YELLOW : couverture partielle ;
- RED : trou significatif ;
- UNKNOWN : non mesuré.

La prochaine vague d'acquisition doit prioriser les plus gros trous pondérés par demande utilisateur.

---

## 7. Search Impact

Basé sur `GOLDEN_QUERY_SET.md`.

KPIs :

- % Golden Queries ≥80/100 ;
- median score ;
- relevance score ;
- depth score ;
- source diversity ;
- noise rate ;
- visible duplicate rate ;
- stale result rate ;
- no-result / low-depth rate.

La croissance DATA est considérée utile seulement si elle améliore ces métriques ou comble une lacune de couverture prouvée.

---

# Gates officiels

## DATA-1 — Funnel Truth

PASS si :

- compteurs réconciliés ;
- définitions stabilisées ;
- pertes quantifiées ;
- top bottlenecks prouvés ;
- yield segmenté connu.

## DATA-2 — Structured Mass

PASS minimum :

- ≥5 000 structured listings ;
- diversité suffisante ;
- aucune régression des garde-fous.

Target forte : ≥10 000.

## DATA-3 — Quality

PASS si :

- provenance forte ;
- dimensions essentielles fiables ;
- taux d'unknown maîtrisé ;
- display eligibility explicite ;
- aucune fabrication de données.

Les seuils numériques exacts sont à figer après le Funnel Truth Audit afin de ne pas inventer des objectifs déconnectés du stock réel.

## DATA-4 — Search Depth

PASS si :

- ≥80 % Golden Queries satisfaisantes ;
- profondeur utile ;
- bruit et doublons acceptables ;
- principales villes couvertes.

## DATA-5 — Property Graph

PASS si :

- hard blocks prouvés ;
- possible_match séparé ;
- auto-merge conservateur ;
- evidence trail ;
- audit humain d'un échantillon significatif avant scaling.

## PROD

PASS uniquement après :

- DATA/Search gates suffisants ;
- findings UX/UI retenus ;
- Arabic/RTL ;
- responsive ;
- SEO/indexabilité ;
- performance ;
- smoke ;
- certification finale.

Puis un seul déploiement Vercel consolidé.

---

## Cadence de revue recommandée pendant la phase DATA

À chaque palier significatif ou mission d'acquisition :

1. snapshot scorecard avant ;
2. exécution ;
3. snapshot après ;
4. delta absolu + relatif ;
5. impact Golden Queries ;
6. nouveaux risques / régressions ;
7. décision GO / HOLD / ROLLBACK logique.

Ne jamais publier uniquement : `+N URLs` ou `+N listings` sans expliquer qualité, couverture et impact Search.
