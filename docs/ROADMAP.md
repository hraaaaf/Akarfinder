# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-22**  
**Statut : ACTIVE — DATA MASS-INDEX**

Ce fichier est l’unique vérité canonique globale pour l’ordre des chantiers, leur état et leur progression.

Référence immuable de la roadmap immédiatement avant le pivot MASS-INDEX :
`main@a44ed88db1cc6c0b556fa7af9cda6f43fc1faf30:docs/ROADMAP.md`.

L’ancien ledger détaillé antérieur reste également conservé à :
`main@05f74e8892b8d8958d86bbf2b2247e69b98d276f:docs/ROADMAP.md`.

---

## 1. Chantier actif P0 — DATA MASS-INDEX

**Issue canonique : #854 — DATA MASS-INDEX — Couverture immobilière Maroc maximale**  
**Plan d’exécution : `docs/MASS_INDEX.md`**

### Goal

Construire l’index le plus large possible de l’immobilier marocain dans AkarFinder, puis convertir progressivement les représentations externes en données enrichies et contenus partenaires lorsque les canaux le permettent.

### Doctrine

Quatre niveaux non confondus :

1. `DISCOVERED` — URL candidate connue ;
2. `INDEXED_EXTERNAL` — représentation externe minimale, provenance + canonical URL ;
3. `ENRICHED` — faits normalisés obtenus par un canal admissible ;
4. `PARTNER_FULL` — contenu riche explicitement autorisé.

Le pivot stratégique supprime le blocage global où l’absence d’autorisation de contenu riche empêchait toute progression de discovery/index externe. Il ne supprime pas les interdits techniques : aucun contournement de login, CAPTCHA, paywall, anti-bot ou autre contrôle.

### Baseline historique à revalider en M0

- MASS-6 : 209 109 discovery rows ;
- 104 584 URL representations distinctes ;
- 90 190 net-new vs Thin Index ;
- 52 591 probablement immobilier Maroc ;
- 24 505 probablement pages détail ;
- unité = URL representation, pas propriété unique ;
- baseline publique historique : 7 483 LISTING éligibles au read model.

### Progression stricte

**0/8 lots CLOSED = 0 %.**

| Lot | Scope | État | Succès observable |
|---|---|---|---|
| M0 | Current-main audit + baseline fraîche | 🟡 ACTIVE | baseline Supabase/current-main reproductible + inventaire pipeline |
| M1 | Universal candidate promotion | ⏸️ NEXT | candidates canonicalisées/classifiées/dédupliquées et accounting exact |
| M2 | External Index model | ⏸️ | représentation minimale externe recherchable, provenance claire |
| M3 | Source Factory adapters | ⏸️ | rendement mesuré par domaine + budgets/circuit breakers |
| M4 | National MASS ingest | ⏸️ | forte hausse vérifiée des URL listing et clusters recherchables |
| M5 | Dedup + freshness | ⏸️ | lifecycle idempotent + doublons multi-portails maîtrisés |
| M6 | Search activation + SEO | ⏸️ | Search réel + sitemaps/canonicals/noindex propres |
| M7 | Conversion partenaires | ⏸️ | feeds/accords réels, conversion vers `PARTNER_FULL` |

### Sources prioritaires

Historiques : `agenz.ma`, `mubawab.ma`, `mouldar.com`, `masaken.ma`, `avito.ma`.

Réservoir MASS : `marocannonces.com`, `yakeey.com`, `domio.ma`, `2p.ma`, `sakane.ma`, `1000-annonces.com`, `housing.place`, `expat.com`, `milkiya.ma`, `portail-immobilier.ma`.

Extension ensuite aux 107 domaines de la Source Factory.

### KPI

- `unique_listing_urls_indexed` ;
- `unique_property_clusters_searchable` ;
- couverture villes/quartiers ;
- fraîcheur <= 7/30 jours ;
- rendement par source ;
- taux doublons ;
- taux prix/surface/localisation.

### Next exact

**M0** sur la branche `data/mass-index-m0` : audit current-main + Supabase read-only, inventaire des composants MASS encore présents, baseline fraîche, delta vs MASS-6, puis M1 uniquement sur preuve réelle.

---

## 2. Chantier produit suspendu — Homepage Visual Reconciliation

**Issue #849 — HVR-1→HVR-6.**

Suspendu par décision produit au profit de MASS-INDEX. Aucun lot HVR n’est supprimé ni déclaré fermé artificiellement.

Dernier état canonique avant pivot : HVR-1 CLOSED avec score 9,0/10 et human gate approuvé. Le commit current-main `a44ed88db1cc6c0b556fa7af9cda6f43fc1faf30` contient ensuite le travail « HVR-2 — direct city navigation » ; son closeout devra être réconcilié avant de reprendre HVR.

---

## 3. Chantiers fermés — références stables

### Product Experience Reconciliation ✅ CLOSED

12/12 lots CLOSED = 100 %. Preuve finale P11 : PR #848 MERGED ; run `32559337861` SUCCESS ; artifact `9472405507` ; 332/332 captures ; score 9,2/10 ; human gate APPROVED ; merge `669d040162eb39f25e904da065c1b197c09dc039`.

### DATA MASS historique ✅ CLOSED

Le programme DATA MASS / MASS-X5 reste fermé historiquement. Référence : PR #609, merge `3f1724faf03fd3c93fdafc2f522d61465d377e5b`, run `31762998799` SUCCESS. MASS-INDEX est un nouveau chantier.

### GitHub Hygiene & Single Source of Truth ✅ CLOSED

PR #851 MERGED ; merge `9359034d8587ee12e0bd2fce72bf791582b90a5c`.

---

## 4. Anciennes PR DATA / Source Policy

Les anciennes PR #622, #474, #478, #454, #319, #289, #255, #133, #113, #54 et fondations DATA historiques restent des preuves/reconciliation, pas le chemin critique MASS-INDEX.

Ne jamais merger aveuglément une branche historique. Réutiliser uniquement le résidu utile après comparaison current-main et état production réel.

---

## 5. Règles permanentes

### Goal / Succès / Preuve

Chaque lot significatif possède un Goal exact, un Succès observable et une Preuve vérifiable. Aucun lot n’est CLOSED sans preuve.

### DATA

- provenance + canonical URL obligatoires ;
- pas de métrique « propriété unique » avant dédup ;
- rate limits, budgets, circuit breakers et rollback proportionnés ;
- aucune donnée inventée ;
- aucun contournement de contrôles techniques ;
- contenu riche externe non copié par défaut.

### CI

Une CI queued/pending/in_progress n’arrête pas le travail indépendant. Pas de polling ni attente active.

### Vercel

**Aucun déploiement Vercel sans autorisation explicite de l’utilisateur.**

---

## 6. Prochaine action exacte

1. M0 audit current-main/Supabase read-only.
2. Recalculer baseline source/canal/ville/fraîcheur.
3. Inventorier writers/read-models/classifiers/dedup déjà présents.
4. Produire le delta exact vs MASS-6.
5. Construire M1 Universal candidate promotion.
6. Ne pas attendre les anciennes CI/PR non nécessaires au chemin critique.
