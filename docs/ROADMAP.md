# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-23**  
**Statut : ACTIVE — DATA MASS-INDEX / M5 Dedup + freshness hardening**

Ce fichier est l’unique vérité canonique globale pour l’ordre des chantiers, leur état et leur progression.

## 1. Chantier actif P0 — DATA MASS-INDEX

**Issue canonique : #854**  
**Plan : `docs/MASS_INDEX.md`**

### Goal
Construire l’index le plus large possible de l’immobilier marocain dans AkarFinder, avec provenance réelle, déduplication, fraîcheur et séparation stricte entre index externe minimal et contenu partenaire riche.

### Doctrine
`DISCOVERED -> INDEXED_EXTERNAL -> ENRICHED -> PARTNER_FULL`

Aucun contournement login/CAPTCHA/paywall/anti-bot. Aucun contenu riche externe copié par défaut. Aucun provider relabel. Aucun Vercel sans autorisation explicite.

### Progression stricte

**5/8 lots CLOSED = 62,5 %.**

| Lot | Scope | État | Preuve principale |
|---|---|---|---|
| M0 | Current-main audit + baseline fraîche | ✅ CLOSED | `docs/MASS_INDEX_M0_AUDIT.md` |
| M1 | Universal candidate promotion | ✅ CLOSED | run `32577296107` SUCCESS |
| M2 | External Index model | ✅ CLOSED | run `32580352867` SUCCESS |
| M3 | Source Factory adapters | ✅ CLOSED | PR #863 ; run `32594176513` SUCCESS |
| M4 | National MASS ingest | ✅ CLOSED | PR #871 ; run final `32610621902` SUCCESS ; 965/965 preserved |
| M5 | Dedup + freshness hardening | 🟡 ACTIVE | audit courant à produire |
| M6 | Search activation + SEO | ⏳ PENDING | — |
| M7 | Conversion partenaires | ⏳ PENDING | — |

### M4 — closeout certifié

Cohorte Wave 1 certifiée : **965 URLs** sur 7 sources positives M3.

Preuves :
- M4-A plan : run `32609000430` SUCCESS ; artifact `9484969203` ;
- M4-B canary : run `32609756948` SUCCESS ; 10 inserts ; Thin Index `+0` ; Search OFF ;
- M4-C écriture : run `32610430027` SUCCESS ; **955 inserts + 10 préservés** ;
- DB : `source_offer_seeds` **56 881 -> 57 836** ;
- `thin_index_search_documents` **56 866 -> 56 866** ;
- M4-C certification idempotente finale : run `32610621902` SUCCESS ; **0 insert + 965 préservés** ;
- artifact final `9485403997` ; digest `sha256:e64364b4ada0bb2545e4aa722834e72c575affc56b689d31f4beffff70f3f7af` ;
- PR #871 merge `206672c8a24b7aa95271f2f7d32dbc733dba08b5` ;
- `metadata:null`, `seed_only`, aucun provider relabel, aucune mutation de seed existant, aucune activation Search.

Le Thin Index `+0` est **attendu** pour M4 : les seeds minimaux `metadata:null` restent hors projection Thin Index/Search jusqu’aux étapes autorisées suivantes. L’ancien critère “augmentation Thin Index” est donc remplacé par “absence vérifiée de fuite Thin Index/Search”.

### M5 — Goal
Durcir la déduplication et la fraîcheur avant toute activation Search.

### M5 — Succès
- baseline read-only exacte des doublons et états de fraîcheur ;
- règles déterministes de clustering sans prétendre compter des propriétés uniques avant validation ;
- stratégie de fraîcheur/expiration vérifiable ;
- aucune activation Search ;
- preuves avant/après et rollback pour toute écriture ultérieure.

### Next exact
M5 audit current-main + schémas/tables existants -> mesurer doublons/fraîcheur read-only -> définir contrat M5 et critères -> implémentation/test ciblés.

---

## 2. Homepage Visual Reconciliation ✅ CLOSED

Issue #849 : **6/6 CLOSED = 100 %**. Preuve finale : PR #861 ; merge `78079f179ffbbf6285e23bf86ba18c609563f661` ; run `32595444588` SUCCESS ; artifact `9481435261` ; score 9,4/10 ; human gate APPROVED ; aucun Vercel.

## 3. Références fermées
- GitHub Hygiene & Single Source of Truth : PR #851 ; merge `9359034d8587ee12e0bd2fce72bf791582b90a5c`.
- Product Experience Reconciliation : PR #848 ; run `32559337861` SUCCESS ; merge `669d040162eb39f25e904da065c1b197c09dc039`.
- DATA MASS historique : MASS-X5 ; PR #609 ; merge `3f1724faf03fd3c93fdafc2f522d61465d377e5b`.

## 4. Règles permanentes
- provenance + canonical URL obligatoires ;
- aucune métrique propriété unique avant dédup certifiée ;
- writer idempotent, budgets, rollback et circuit breakers ;
- aucune donnée inventée ;
- aucune copie implicite de contenu riche externe ;
- CI pending n’arrête pas le travail indépendant ;
- **aucun déploiement Vercel sans autorisation explicite**.
