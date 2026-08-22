# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-22**  
**Statut : ACTIVE — DATA MASS-INDEX**

Ce fichier est l’unique vérité canonique globale pour l’ordre des chantiers, leur état et leur progression.

Référence immuable immédiatement avant le pivot MASS-INDEX :
`main@f0293bb446e2e5779fb67181cd504d71dd1d0138:docs/ROADMAP.md`.

Ancien ledger détaillé :
`main@05f74e8892b8d8958d86bbf2b2247e69b98d276f:docs/ROADMAP.md`.

---

## 1. Chantier actif P0 — DATA MASS-INDEX

**Issue : #854 — DATA MASS-INDEX — Couverture immobilière Maroc maximale**  
**Plan : `docs/MASS_INDEX.md`**  
**M0 audit : `docs/MASS_INDEX_M0_AUDIT.md`**

### Goal
Construire l’index le plus large possible de l’immobilier marocain dans AkarFinder.

### Doctrine
`DISCOVERED -> INDEXED_EXTERNAL -> ENRICHED -> PARTNER_FULL`.

L’absence d’autorisation de contenu riche ne bloque plus toute discovery/indexation externe minimale. Aucun contournement de login, CAPTCHA, paywall, anti-bot ou autre contrôle technique.

### Baseline M0 certifiée
- 272 437 discovery rows ;
- 135 754 canonical URLs distinctes ;
- 56 861 Thin Index docs ;
- 15 546 `LISTING + real_estate_likely` ;
- 15 425 représentations recherchables via `search_public_representations_v2` ;
- 5 700 `property_listings` ;
- 5 561 `property_clusters` ;
- 3 158 Thin Index docs avec prix ;
- 2 549 avec surface ;
- 880 avec prix + surface.

Delta vs MASS-6 : +63 328 discovery rows (+30,28 %) et +31 170 canonical URLs (+29,80 %).

### Progression
**1/8 lots CLOSED = 12,5 %.**

| Lot | Scope | État |
|---|---|---|
| M0 | Current-main audit + baseline fraîche | ✅ CLOSED |
| M1 | Universal candidate promotion | 🟡 ACTIVE |
| M2 | External Index model | ⏸️ NEXT |
| M3 | Source Factory adapters | ⏸️ |
| M4 | National MASS ingest | ⏸️ |
| M5 | Dedup + freshness | ⏸️ |
| M6 | Search activation + SEO | ⏸️ |
| M7 | Conversion partenaires | ⏸️ |

### Diagnostic M0
Le goulot principal est `discovery candidate -> classification/promotion -> display eligibility`, pas la découverte. Le Search live lit déjà `thin_index_search_documents` via `search_public_representations_v2`.

Le POC `public_property_index` existe dans le repo, mais sa table Supabase live n’existe pas. Il n’est pas le read-model courant.

### Sources prioritaires
Historiques : `agenz.ma`, `mubawab.ma`, `mouldar.com`, `masaken.ma`, `avito.ma`.

Réservoir MASS : `marocannonces.com`, `yakeey.com`, `domio.ma`, `2p.ma`, `sakane.ma`, `1000-annonces.com`, `housing.place`, `expat.com`, `milkiya.ma`, `portail-immobilier.ma`.

Extension ensuite aux 107 domaines Source Factory.

### Next exact
M1 : construire un manifest déterministe read-only depuis `discovery_candidates`, canonicaliser/dédupliquer, classifier LISTING/real-estate, compter accept/reject par raison et domaine, puis micro-write borné seulement après preuve d’idempotence.

---

## 2. Homepage Visual Reconciliation — SUSPENDU

Issue #849. Pivot produit volontaire vers MASS-INDEX.

État vérifié avant suspension :
- HVR-1 CLOSED ;
- HVR-2 CLOSED sur current-main via commit `f0293bb446e2e5779fb67181cd504d71dd1d0138` après implémentation `a44ed88db1cc6c0b556fa7af9cda6f43fc1faf30` ;
- HVR-3 était le lot suivant ; il est suspendu, pas supprimé.

Progression HVR conservée : **2/6 lots CLOSED = 33,3 %**.

---

## 3. Références fermées

### Product Experience Reconciliation ✅ CLOSED
12/12 lots CLOSED. Preuve finale : PR #848 MERGED ; run `32559337861` SUCCESS ; 332/332 captures ; score 9,2/10 ; human gate APPROVED ; merge `669d040162eb39f25e904da065c1b197c09dc039`.

### DATA MASS historique ✅ CLOSED
MASS-X5 reste fermé historiquement. Référence : PR #609 ; merge `3f1724faf03fd3c93fdafc2f522d61465d377e5b` ; run `31762998799` SUCCESS. MASS-INDEX est un nouveau chantier.

### GitHub Hygiene ✅ CLOSED
PR #851 MERGED ; merge `9359034d8587ee12e0bd2fce72bf791582b90a5c`.

---

## 4. Anciennes PR DATA

Les anciennes PR Source Policy / DATA restent des preuves ou sujets de réconciliation, pas le chemin critique. Ne jamais merger une branche historique sans comparaison current-main + état production réel.

---

## 5. Règles permanentes

### Goal / Succès / Preuve
Chaque lot significatif possède Goal exact, Succès observable et Preuve vérifiable. Aucun lot n’est CLOSED sans preuve.

### DATA
- provenance + canonical URL obligatoires ;
- aucune métrique propriété unique avant dédup ;
- rate limits, budgets, circuit breakers, rollback ;
- aucune donnée inventée ;
- aucun contournement de contrôles techniques ;
- aucun contenu riche externe copié par défaut.

### CI
Une CI queued/pending/in_progress n’arrête pas le travail indépendant. Pas de polling ni attente active.

### Vercel
**Aucun déploiement Vercel sans autorisation explicite de l’utilisateur.**

---

## 6. Prochaine action exacte

1. M1 manifest read-only depuis le stock discovery live.
2. Réutiliser les classifieurs/normaliseurs existants plutôt que créer une deuxième logique.
3. Séparer `INDEXED_EXTERNAL` de `PARTNER_FULL` dans la décision de promotion.
4. Tests déterministes + accounting exact.
5. Canary write borné et idempotent seulement lorsque le dry-run est prouvé.
