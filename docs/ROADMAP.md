# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-22**  
**Statut : ACTIVE — DATA MASS-INDEX / M4 National MASS ingest**

Ce fichier est l’unique vérité canonique globale pour l’ordre des chantiers, leur état et leur progression.

- `README.md` = identité / doctrine durable.
- `docs/ROADMAP.md` = état global + priorités + progression.
- une issue GitHub = contrat de scope d’un chantier.
- une PR = implémentation et preuves d’un lot.
- `docs/SESSION.md` = handover court aligné.

---

## 1. Chantier actif P0 — DATA MASS-INDEX

**Issue canonique : #854**  
**Plan : `docs/MASS_INDEX.md`**

### Goal
Construire l’index le plus large possible de l’immobilier marocain dans AkarFinder, avec provenance réelle, déduplication, fraîcheur et séparation stricte entre index externe minimal et contenu partenaire riche.

### Doctrine
`DISCOVERED -> INDEXED_EXTERNAL -> ENRICHED -> PARTNER_FULL`

Aucun contournement de login/CAPTCHA/paywall/anti-bot. Aucun contenu riche externe copié par défaut. Aucun provider relabel. Aucun Vercel sans autorisation explicite.

### Progression stricte

**4/8 lots CLOSED = 50 %.**

| Lot | Scope | État | Preuve principale |
|---|---|---|---|
| M0 | Current-main audit + baseline fraîche | ✅ CLOSED | `docs/MASS_INDEX_M0_AUDIT.md` |
| M1 | Universal candidate promotion | ✅ CLOSED | run `32577296107` SUCCESS ; 33 872 candidates acceptées ; 0 write |
| M2 | External Index model | ✅ CLOSED | run `32580352867` SUCCESS ; migration native providers ; canary 10/10 ; Search inchangé |
| M3 | Source Factory adapters | ✅ CLOSED | PR #863 ; merge `fe6740ff40872e57789f67d12b02a5b43ea412d6` ; run `32594176513` SUCCESS ; artifact `9481117150` |
| M4 | National MASS ingest | 🟡 ACTIVE | wave 1 uniquement sur sources M3 à rendement positif |
| M5 | Dedup + freshness hardening | ⏳ PENDING | — |
| M6 | Search activation + SEO | ⏳ PENDING | — |
| M7 | Conversion partenaires | ⏳ PENDING | — |

### M3 — closeout certifié

- 10/10 domaines mesurés en read-only ;
- 350 canonical candidates échantillonnées ;
- 77 fiches détail valides après M1 + garde structurel source-specific ; rendement agrégé 22 % ;
- 7/10 sources avec rendement positif ;
- 0 write DB ; 0 source-network request ; 0 direct fetch ; 0 activation publique ; 0 provider relabel ; 0 mutation policy ; 0 breaker ouvert ;
- artifact digest `sha256:8a8c8d9947e35940571e8a359cb0bbfa7bb9aa87f3d7ec18a76167cecd74b388`.

Wave M4 initiale : `marocannonces.com`, `domio.ma`, `sakane.ma`, `1000-annonces.com`, `housing.place`, `expat.com`, `milkiya.ma`.

Hors wave 1 : `yakeey.com`, `2p.ma`, `portail-immobilier.ma`. Cela signifie uniquement « rendement M3 positif non prouvé dans l’échantillon certifié », pas exclusion définitive. Le réservoir complet contient notamment 141 URLs Yakeey structurellement detail-like à requalifier ultérieurement.

### M4 — Goal
Matérialiser nationalement les fiches réellement validées des sources M3 positives en `source_offer_seeds`, via le writer M2 existant : net-new seulement, aucun écrasement de seed existant, batches bornés, canary + rollback, Search toujours OFF jusqu’à M6.

### M4 — Succès
- manifest national déterministe M1 + garde M3 ;
- accounting exact par domaine/provider ;
- `INSERT_NATIVE` uniquement sur net-new ;
- canary borné vérifié Thin Index ;
- ingestion par batches avec rollback et circuit breakers ;
- augmentation vérifiée du Thin Index sans activation Search accidentelle.

### Next exact
M4 dry-run national sur les 7 sources positives -> write-plan net-new/preserve -> canary borné -> validation Thin Index/Search inchangé -> batches d’ingestion -> preuves before/after DB.

---

## 2. Homepage Visual Reconciliation ✅ CLOSED

**Issue #849. Progression finale : 6/6 CLOSED = 100 %.**

- HVR-1 : PR #850 ; merge `d6ef5fe970c3e9c71586a2686b0190a800c0e7f1` ; run `32563274184` SUCCESS ; score 9,0/10 ; human gate APPROVED.
- HVR-2 : PR #853 ; merge `a44ed88db1cc6c0b556fa7af9cda6f43fc1faf30` ; run `32568589072` SUCCESS ; score 9,2/10 ; human gate APPROVED.
- HVR-3 : PR #855 ; merge `414a50cc0d8753e4f7b37f5953783a574f164f71` ; run `32578052976` SUCCESS ; score 9,1/10 ; human gate APPROVED.
- HVR-4 : PR #859 ; merge `993f3bc6d7107d3b9d08ce7efea1f1267c4e87cd` ; run `32579508071` SUCCESS ; score 9,3/10 ; human gate APPROVED.
- HVR-5 : PR #860 ; merge `a85f2d04b34fe3d9383e8e26d17a2c756a60041d` ; HEAD `6c1d95bfe49d93aa514114dcd03267f2dbeccba5` ; run `32583217515` SUCCESS ; artifact `9478356032` ; score 9,3/10 ; human gate APPROVED.
- HVR-6 : PR #861 ; merge `78079f179ffbbf6285e23bf86ba18c609563f661` ; HEAD certifié `c3d9a1e4309bf37bebe6a32b41ff89afe6ccfa2f` ; run `32595444588` SUCCESS ; artifact `9481435261` ; digest `sha256:314f5e91e3cca1fb1d6c6935831ba1d48be35e67b5a17a7e1def348acd3c72ca` ; score final 9,4/10 ; human gate APPROVED.

### Résultat final HVR
`Header -> Hero/Search + Intelligence -> Explorer le Maroc -> Biens à découvrir -> Comprendre le quartier -> 4 actions -> Footer`

Certification finale : 390 / 430 / 768 / 1280 ; 4/4 captures ; `findingCount=0` ; 0 overflow ; 0 console error ; 6 villes ; 4 listings ; 3 quartiers ; 4 actions ; benchmark final frais Rightmove / Zillow / Redfin / Realtor.com documenté dans `docs/HVR_6_FINAL_BENCHMARK.md`.

Aucun changement backend/DB/ranking/ingestion. Aucun déploiement Vercel.

---

## 3. Chantiers fermés — références stables

### GitHub Hygiene & Single Source of Truth ✅ CLOSED
PR #851 ; merge `9359034d8587ee12e0bd2fce72bf791582b90a5c`.

### Product Experience Reconciliation ✅ CLOSED
12/12 lots ; PR #848 ; run `32559337861` SUCCESS ; artifact `9472405507` ; 332/332 captures ; score 9,2/10 ; human gate APPROVED ; merge `669d040162eb39f25e904da065c1b197c09dc039`.

### DATA MASS historique ✅ CLOSED
MASS-X5 : PR #609 ; merge `3f1724faf03fd3c93fdafc2f522d61465d377e5b` ; run `31762998799` SUCCESS. MASS-INDEX est un nouveau chantier.

---

## 4. Règles permanentes

### Goal / Succès / Preuve
Aucun lot CLOSED sans preuve observable.

### DATA
- provenance + canonical URL obligatoires ;
- aucune métrique propriété unique avant dédup ;
- writer idempotent, budgets, rollback et circuit breakers ;
- aucun contournement de contrôles techniques ;
- aucune donnée inventée ;
- aucun contenu riche externe copié par défaut.

### CI
Une CI queued/pending/in_progress n’arrête pas le travail indépendant. Pas de polling ni attente active.

### Vercel
**Aucun déploiement Vercel sans autorisation explicite de l’utilisateur.**
