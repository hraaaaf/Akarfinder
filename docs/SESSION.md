# AkarFinder — Session courante

**Mise à jour : 2026-08-08**  
**Lane DATA : DATA-4.4A 🔴 Second Reservoir Qualification**  
**Lot DATA acquis : DATA-4.3H ✅ fermé et certifié en production au cap 500**  
**Lot UX acquis : P1B.1 — AkarFinder Map Visual Layer ✅ PR #371 — 9,1/10**  
**Prochain UX : P1B.2 — Couches d’intelligence territoriale sourcées**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

Acquis récents :

- DATA-4.3G ✅ PR #362 ;
- DATA-4.3H contrat ✅ PR #364 ;
- DATA-4.3I ✅ PR #367 ;
- DATA-4.3J ✅ PR #368 ;
- DATA-4.3H.1 ✅ PR #372 ;
- DATA-4.3H.2 ✅ PR #373 ;
- DATA-4.3H.3 ✅ PR #375 ;
- DATA-4.3H final certification ✅ PR #377, merge `cdaf296f` ;
- P1A.5 ✅ PR #365, **9,3/10** ;
- P1A.6 ✅ PR #369, **9,2/10** ;
- P1B.1 ✅ PR #371, **9,1/10**.

Invariants : no-bypass, capability ≠ permission, Source Registry avant activation, volume technique ≠ inventaire public, Search canonique, Map complément spatial, Geo Registry unique source de vérité.

# DATA — DATA-4.3H ✅ CERTIFIÉ À 500

Plan exécuté :

`50 baseline DATA-4.3G + 100 + 100 + 100 + 100 + 50 = 500`

Production Dar Agadir finale :

- total : **6 533** ;
- `fresh_confirmed` : **605** ;
- `seed_only` : **5 928** ;
- `public_sitemap_presence` global : **502** ;
- cohorte contrôlée : **500/500** ;
- Public Search : **500/500** ;
- technical display : **500/500** ;
- drift : **0 %** ;
- Registry inchangé ;
- rollback non nécessaire ;
- aucune promotion >500 autorisée par ce lot.

# DATA — DATA-4.4A 🔴 Second Reservoir Qualification

Objectif : choisir le prochain réservoir de croissance sur preuves existantes uniquement, sans write production.

Candidats sitemap/canonical-link analysés :

| Source | Total | Normalized OK | Technical display | Fresh | Seed only | City | Type | Intent | Review |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `promoimmomarrakech.com` | **3 005** | **3 000** | **2 923** | 9 | **2 996** | **3 005** | 2 556 | **2 905** | due_soon |
| `limmobiliersansfrontieres.com` | 1 414 | 563 | 573 | 94 | 1 320 | 607 | 1 107 | 1 068 | due_soon |
| `atlasimmobilier.com` | 793 | 414 | 420 | 2 | 791 | 445 | 558 | 70 | due_soon |
| `aykana.ma` | 647 | 467 | 472 | 62 | 585 | 486 | 507 | 534 | due_soon |

Décision actuelle : **`promoimmomarrakech.com` = `PREFERRED_PENDING_REVALIDATION`**.

La qualification est encodée dans un scorer déterministe et un audit Supabase read-only. Elle ne modifie ni Registry, ni freshness, ni display/publication policy.

# Prochaine action DATA — DATA-4.4B

Après merge 4.4A uniquement : **Source Revalidation + Canary 50** sur Promo Immo Marrakech.

Gates obligatoires :

1. Registry revalidé ;
2. `robots.txt` + sitemap publics actuels ;
3. same-origin + population sitemap ;
4. intersection sitemap ↔ normalized ;
5. bruit/qualité ;
6. collisions/dedup Property Graph ;
7. Search/display avant write ;
8. snapshot + rollback ;
9. canary **max 50** ;
10. drift ≤1 %, fail-closed.

Aucun detail-page fetch, aucune réutilisation d’image/contenu, aucun passage direct à 100/500.

# UX — P1B.1 AkarFinder Map Visual Layer ✅

Acquis : couche territoriale propriétaire, 16 arrondissements Casablanca issus du dataset OSM shadow existant, couleurs non sémantiques, preview-canary seulement, audit **3 captures / 0 finding**, score **9,1/10**.

# Prochain UX — P1B.2

Première couche d’intelligence territoriale calculée uniquement depuis des données observables/canoniques certifiées ; 430×932 obligatoire ; score ≥9/10 avant merge.

# Business parallèle

**Agenz = priorité partenariat/feed** : hidden/internal-only tant qu’aucune autorisation écrite n’autorise une évolution Registry/produit.
