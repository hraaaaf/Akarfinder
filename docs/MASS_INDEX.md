# AkarFinder — DATA MASS-INDEX

**Issue canonique : #854**  
**Statut : M0→M4 CLOSED — M5 ACTIVE**

## Goal
Construire l'index le plus large possible de l'immobilier marocain dans AkarFinder, en séparant découverte, index externe minimal, enrichissement factuel et contenu partenaire complet.

## Doctrine
`DISCOVERED -> INDEXED_EXTERNAL -> ENRICHED -> PARTNER_FULL`

Aucun contournement de login, CAPTCHA, paywall, anti-bot ou autre contrôle technique. Aucun texte long/photo source copié par défaut.

## Pipeline
`DISCOVERY -> canonicalization -> LISTING classification -> source-specific detail guard -> minimal external seed -> dedup/freshness -> Search (M6)`

## Lots
- M0 — current-main audit + baseline fraîche : ✅ CLOSED.
- M1 — Universal candidate promotion : ✅ CLOSED.
- M2 — External Index model : ✅ CLOSED.
- M3 — Source Factory adapters : ✅ CLOSED.
- M4 — National MASS ingest : ✅ CLOSED.
- M5 — Dedup + freshness hardening : 🟡 ACTIVE.
- M6 — Search activation + SEO : ⏳ PENDING.
- M7 — Conversion partenaires : ⏳ PENDING.

**Progression : 5/8 = 62,5 %.**

## M4 — certification finale
Wave 1 : `marocannonces.com`, `domio.ma`, `sakane.ma`, `1000-annonces.com`, `housing.place`, `expat.com`, `milkiya.ma`.

Résultat :
- 3 447 candidats canoniques ;
- 1 605 acceptés M1 ;
- 967 détails structurels ;
- 2 rejets sécurité ;
- **965 URLs valides** ;
- M4-B canary : 10 inserts ;
- M4-C : **955 inserts + 10 préservés** ;
- `source_offer_seeds` : **56 881 -> 57 836** ;
- Thin Index : **56 866 -> 56 866** ;
- certification finale idempotente : **0 insert + 965 préservés** ;
- Search OFF ;
- `metadata:null`, `seed_only`, provenance/provider préservés ;
- aucun Vercel.

Preuves :
- run write `32610430027` SUCCESS ;
- run final `32610621902` SUCCESS ;
- artifact final `9485403997` ;
- digest `sha256:e64364b4ada0bb2545e4aa722834e72c575affc56b689d31f4beffff70f3f7af` ;
- PR #871 merge `206672c8a24b7aa95271f2f7d32dbc733dba08b5`.

Le Thin Index `+0` est attendu : les seeds M4 minimalistes n'embarquent pas le metadata riche requis par la projection Search. M4 matérialise l'index externe minimal sans activer M6.

## M5 — contrat
Goal : mesurer puis durcir la déduplication et la fraîcheur avant activation Search.

Invariants :
- audit initial read-only ;
- aucune métrique de propriétés uniques avant validation du clustering ;
- règles déterministes et explicables ;
- provenance conservée ;
- freshness observable et réversible ;
- aucune activation Search ;
- rollback obligatoire pour toute future écriture.

## Next exact
Audit M5 current-main -> inventaire des schémas/scripts dedup/freshness -> baseline read-only -> contrat de clustering/fraîcheur -> tests -> implémentation bornée.

## Interdits permanents
- aucun déploiement Vercel sans autorisation explicite ;
- aucun contournement de contrôles techniques ;
- aucune donnée inventée ;
- aucune copie implicite de contenu riche externe.
