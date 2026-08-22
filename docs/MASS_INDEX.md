# AkarFinder — DATA MASS-INDEX

**Issue canonique : #854**  
**Statut : M0→M2 RECONCILIÉS — M2 CERTIFIÉ, M3 NEXT**  
**Branche : `data/mass-index-m2-current-main`**  
**Base de réconciliation : `main@71dfced305b6a7d7fc14241927537e996950bdb4`**

## Goal
Construire l'index le plus large possible de l'immobilier marocain dans AkarFinder, en séparant découverte, index externe minimal, enrichissement factuel et contenu partenaire complet.

## Doctrine
`DISCOVERED -> INDEXED_EXTERNAL -> ENRICHED -> PARTNER_FULL`

Aucun contournement de login, CAPTCHA, paywall, anti-bot ou autre contrôle technique. Aucun texte long/photo source copié par défaut.

## Pipeline
`DISCOVERY -> canonicalization -> LISTING classification -> adapter/fetch admissible -> factual extraction -> normalization -> geo resolution -> dedup/cluster -> freshness -> external index -> Search`

## Lots
- M0 — current-main audit + baseline fraîche : ✅ CLOSED sur preuve read-only `docs/MASS_INDEX_M0_AUDIT.md`.
- M1 — Universal candidate promotion : ✅ RECONCILIÉ ; implémentation + contrats repris bit-for-bit du HEAD MASS certifié et couverts par la certification M2.
- M2 — External Index model : ✅ CERTIFIÉ sur le HEAD de réconciliation ; workflow `MASS-INDEX M2 Final Certification` vert avant closeout final.
- M3 — Source Factory adapters : 🟡 NEXT — revalider la Source Factory déjà présente sur current-main contre le modèle M2 natif, puis adapter uniquement les écarts prouvés.
- M4 — National MASS ingest : ⏳ PENDING.
- M5 — Dedup + freshness hardening : ⏳ PENDING.
- M6 — Search activation + SEO : ⏳ PENDING.
- M7 — Conversion partenaires : ⏳ PENDING.

## Baseline M0 vérifiée le 2026-08-22
Source : `docs/MASS_INDEX_M0_AUDIT.md`, requêtes Supabase read-only.

- `discovery_candidates` : 272 437 rows ;
- canonical URLs distinctes : 135 754 ;
- `thin_index_search_documents` : 56 861 ;
- `LISTING + real_estate_likely` : 15 546 ;
- `property_listings` : 5 700 ;
- delta vs MASS-6 : +63 328 discovery rows (+30,28 %) et +31 170 canonical URLs (+29,80 %).

Ces valeurs décrivent des lignes/URL representations selon le champ concerné, pas un nombre de propriétés uniques.

## M2 — invariants
La certification M2 impose notamment :
- plan borné read-only ;
- 0 write DB pendant le plan ;
- 0 requête réseau source ;
- aucun full reservoir scan ;
- 10 canary rows maximum ;
- aucune mutation/relabel des seeds existants ;
- nouveaux providers d'insert limités à `openserp` et `serper_mass_harvest` ;
- rollback documenté dans `docs/MASS_INDEX_M2_ROLLBACK.md`.

## Source Factory déjà présente sur current-main
Le repo possède déjà les briques Source Factory historiques (`source-factory.ts`, cohortes high/mid/long-tail, policy matrix, decisions et final certification) ainsi que leurs tests. M3 n'est donc pas une reconstruction : c'est une revalidation current-main + M2, suivie uniquement des adaptations nécessaires.

## KPI
- unique listing URLs indexed ;
- unique property clusters searchable ;
- couverture villes/quartiers ;
- fraîcheur <= 7/30 jours ;
- rendement par source ;
- taux doublons ;
- taux prix/surface/localisation.

## Next exact
M3 : auditer la Source Factory existante sur le HEAD post-M2 → vérifier compatibilité avec les providers natifs M2 et les invariants de policy/permissions → tests ciblés → correction minimale si nécessaire → certification M3.

## Interdits permanents
- aucun déploiement Vercel sans autorisation explicite ;
- aucun contournement de contrôles techniques ;
- aucune métrique propriété unique avant dédup ;
- aucune donnée inventée ;
- aucune copie implicite de contenu riche externe.
