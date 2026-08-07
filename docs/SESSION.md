# AkarFinder — Session courante

**Mise à jour : 2026-08-07**  
**Lot DATA acquis : DATA-4.3H — Controlled Expansion to 500 ✅ PR #364**  
**Prochaine action DATA : première expansion persistante ≤100 lignes sous contrat 4.3H**  
**Lot UX acquis : CARTE-QUARTIER-P1A.5 ✅ PR #365 — 9,3/10**  
**Prochain UX : CARTE-QUARTIER-P1A.6 — Responsive hardening**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

Acquis récents :

- DATA-4.3D ✅ PR #353 ;
- DATA-4.3E ✅ PR #355 ;
- DATA-4.3F ✅ PR #358 ;
- DATA-4.3G ✅ PR #362, merge `0286178` ;
- DATA-4.3H ✅ PR #364, merge `88a3592` ;
- P1A.4 ✅ PR #350, **9,3/10**, audit **30 captures / 0 finding** ;
- P1A.5 ✅ PR #365, merge `c489f000`, **9,3/10**, audit final **48 captures / 0 finding**.

Invariants : no-bypass, capability ≠ permission, Source Registry avant activation, volume technique ≠ inventaire public, Search canonique, Map complément spatial, Geo Registry unique source de vérité.

# UX — P1A.5 Territorial Explorer ✅

Acquis :

- explorateur territorial progressif **Maroc → ville → quartier** ;
- données de contrôle provenant uniquement du Geo Registry et du canonical neighborhood dataset ;
- navigation via le contrat URL certifié (`withMapLocation` / `buildMapHref`) ;
- Search/Quartier/Mon Projet restent compatibles avec l’état géographique ;
- aucune géométrie ou proximité fabriquée ;
- viewport **430×932** ajouté au smoke obligatoire ;
- scénarios réels `/map`, `/map?city=Rabat`, `/map?city=Rabat&district=Agdal` audités ;
- correction du chevauchement panneau Agdal / explorateur à 768 px ;
- audit final : **12 routes × 4 viewports = 48 captures, 0 finding** ;
- TypeScript, production build, Geo Productization, Final Design/A11y, UX gates et Canonical Baseline Validation complets verts ;
- score final : **9,3/10**.

# Prochain UX — P1A.6 Responsive hardening

Durcir les comportements carte, explorateur et panneaux sur **390 / 430×932 / 768 / 1280**, avec double-check visuel obligatoire et score ≥9/10.

Ne pas modifier dans ce lot : Geo Registry, contrat URL/Search, modèle de données, intelligence métier ou géométrie.

# DATA — état acquis

## DATA-4.3G ✅ PR #362

Premier contrat de batch fraîcheur persistant certifié : sélection déterministe **50 lignes**, canal `public_sitemap_presence`, TTL **14 jours**, snapshot/rollback complet, observabilité Search/display, aucune modification de display policy dans la certification.

## DATA-4.3H ✅ PR #364

Controlled Expansion to 500 certifiée en DRY_RUN :

| Mesure | Résultat |
|---|---:|
| point de départ persistant | **50 lignes** |
| plan d’expansion | **100 + 100 + 100 + 100 + 50** |
| max / run | **100** |
| cap avant re-certification | **500** |
| TTL | **14 jours** |
| drift cap | **1 %** |
| Registry+sitemap revalidation | **obligatoire avant chaque run** |
| DB writes dans PR #364 | **0** |
| display-policy changes | **0** |
| activation publique | **0** |

# Prochaine action DATA

Préparer puis exécuter le premier batch d’expansion **≤100 lignes** sous les contraintes acquises de DATA-4.3H : préflight Registry+sitemap, snapshot/rollback, freshness/evidence uniquement, TTL 14 jours, observabilité applied/skipped/drifted, arrêt si drift >1 %, mesure Search/display séparée, aucune modification de display/publication policy.

Ne pas inventer un numéro de lot suivant avant définition explicite dans `docs/ROADMAP.md`.

# Business parallèle

**Agenz = priorité partenariat/feed** : hidden/internal-only tant qu’aucune autorisation écrite n’autorise une évolution Registry/produit.
