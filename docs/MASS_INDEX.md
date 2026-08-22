# AkarFinder — DATA MASS-INDEX

**Issue canonique : #854**  
**Statut : M0→M3 CLOSED — M4 ACTIVE**

## Goal
Construire l'index le plus large possible de l'immobilier marocain dans AkarFinder, en séparant découverte, index externe minimal, enrichissement factuel et contenu partenaire complet.

## Doctrine
`DISCOVERED -> INDEXED_EXTERNAL -> ENRICHED -> PARTNER_FULL`

Aucun contournement de login, CAPTCHA, paywall, anti-bot ou autre contrôle technique. Aucun texte long/photo source copié par défaut.

## Pipeline
`DISCOVERY -> canonicalization -> LISTING classification -> source-specific detail guard -> M2 seed projection -> Thin Index -> dedup/freshness -> Search (M6)`

## Lots
- M0 — current-main audit + baseline fraîche : ✅ CLOSED.
- M1 — Universal candidate promotion : ✅ CLOSED.
- M2 — External Index model : ✅ CLOSED.
- M3 — Source Factory adapters : ✅ CLOSED ; PR #863 ; merge `fe6740ff40872e57789f67d12b02a5b43ea412d6` ; run `32594176513` SUCCESS ; artifact `9481117150`.
- M4 — National MASS ingest : 🟡 ACTIVE.
- M5 — Dedup + freshness hardening : ⏳ PENDING.
- M6 — Search activation + SEO : ⏳ PENDING.
- M7 — Conversion partenaires : ⏳ PENDING.

**Progression : 4/8 = 50 %.**

## Baseline M0
- `discovery_candidates` : 272 437 rows ;
- canonical URLs distinctes : 135 754 ;
- `thin_index_search_documents` : 56 861 ;
- `LISTING + real_estate_likely` : 15 546 ;
- `property_listings` : 5 700.

Ces valeurs sont des lignes/URL representations selon le champ, pas un nombre de propriétés uniques.

## M3 — certification finale
La première certification générique a montré des faux positifs de pages catégorie. M3 a donc ajouté un second gate source-specific après M1.

Résultat final :
- 10 domaines mesurés ;
- 350 canonical candidates ;
- 77 fiches détail valides ; rendement 22 % ;
- 7 sources positives : `marocannonces.com`, `domio.ma`, `sakane.ma`, `1000-annonces.com`, `housing.place`, `expat.com`, `milkiya.ma` ;
- `yakeey.com`, `2p.ma`, `portail-immobilier.ma` restent hors wave M4 initiale faute de rendement positif certifié, sans exclusion définitive ;
- 0 write DB ; 0 source-network request ; 0 activation publique ; 0 provider relabel ; 0 policy mutation ; 0 breaker ouvert.

## M4 — contrat
Goal : matérialiser nationalement les fiches validées des 7 sources positives via le writer M2 existant.

Invariants :
- manifest M1 + garde M3 ;
- `INSERT_NATIVE` uniquement sur canonical URLs net-new ;
- seeds existants préservés ;
- providers uniquement `openserp` / `serper_mass_harvest` ;
- canary borné et rollback par IDs ;
- batches bornés ;
- Search reste OFF jusqu’à M6 ;
- before/after DB obligatoire.

## Potentiel structurel wave 1
- marocannonces.com : 473 URL detail-like ;
- sakane.ma : 193 ;
- milkiya.ma : 131 ;
- expat.com : 104 ;
- 1000-annonces.com : 76 ;
- housing.place : 22 ;
- domio.ma : 5.

Ce sont des plafonds structurels, pas encore des listings M4 validés ni des propriétés uniques.

## Next exact
M4 dry-run national -> write-plan net-new/preserve -> canary -> Thin Index/Search verification -> batches -> before/after DB -> closeout M4.

## Interdits permanents
- aucun déploiement Vercel sans autorisation explicite ;
- aucun contournement de contrôles techniques ;
- aucune métrique propriété unique avant dédup ;
- aucune donnée inventée ;
- aucune copie implicite de contenu riche externe.
