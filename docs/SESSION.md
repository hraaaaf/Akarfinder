# AkarFinder — Session courante

**Mise à jour : 2026-08-07**  
**Lot DATA acquis : DATA-4.3E — First Bounded Freshness Write Canary ✅ PR #355**  
**Prochain lot DATA : DATA-4.3F — Controlled Promotion Design**  
**Lot UX acquis : CARTE-QUARTIER-P1A.4 ✅ PR #350 — 9,3/10**  
**Prochain UX : CARTE-QUARTIER-P1A.5 — Territorial Explorer**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

Acquis récents :

- DATA-4.0 ✅ PR #341 ;
- DATA-4.1A ✅ PR #343 ;
- DATA-4.2 ✅ PR #344 ;
- DATA-4.3A ✅ PR #347 ;
- DATA-4.3B ✅ PR #348 ;
- DATA-4.3C ✅ PR #351 ;
- DATA-4.3D ✅ PR #353 ;
- DATA-4.3E ✅ PR #355, merge `41e2b57` ;
- P1A.3 ✅ PR #349 ;
- P1A.4 ✅ PR #350, **9,3/10**, audit final **30 captures / 0 finding**.

Invariants : no-bypass, capability ≠ permission, Source Registry avant activation, volume technique ≠ inventaire public, Search canonique, Map complément spatial.

# DATA-4.3E — résultat certifié

PR #355 : **20/20 gates verts**.

Dry-run CI :

- pool seed-only éligible : **5 564** ;
- canary déterministe : **10 URLs** ;
- canal : `public_sitemap_presence` ;
- TTL : **14 jours** ;
- apply/rollback manifests : 10/10 ;
- 10 source requests ;
- 0 DB/freshness write en PR ;
- 0 policy/display change ;
- 0 détail/content reuse/activation.

Rehearsal production :

1. préflight : **10/10** toujours `seed_only`, metadata attendue, Registry `public_sitemap_only → canonical_link_only → external_tail_link_only` ;
2. apply : **10/10** passées à `fresh_confirmed` avec canal `public_sitemap_presence` ;
3. verify : **10/10** exactement dans l’état proposé ;
4. rollback : **10/10** restaurées ;
5. post-rollback : **10/10 `seed_only`**, `fresh_last_seen_at=NULL`, `fresh_channels=[]`, metadata originale, aucune `freshness_evidence` ;
6. les **10 restent présentes dans `public_search_representations_v1` après rollback**, donc cette présence publique préexistait au write canary et n’a pas été créée par la promotion freshness.

Limite observée : `updated_at` a changé lors du rehearsal et n’était pas capturé dans le snapshot initial. La freshness/evidence est restaurée exactement, mais pas l’ancien timestamp d’audit.

# Prochain lot DATA — DATA-4.3F

## Controlled Promotion Design

Objectif : concevoir le passage d’un rehearsal 10-row à des batchs persistants bornés, sans promotion massive implicite.

Contrat proposé :

- first batch : **50 lignes** ;
- hard cap : **100/run** ;
- **500 lignes max avant re-certification** ;
- drift max : **1 %** ;
- canal `public_sitemap_presence` ;
- TTL 14 jours ;
- `updated_at` capturé comme audit trail non rollbackable ;
- préconditions exactes + idempotence ;
- observabilité applied/skipped/drifted/rolled-back ;
- arrêt fail-closed sur drift Registry/robots/sitemap ;
- aucune modification display policy ;
- aucune page détail/content reuse ;
- jamais 5 564 lignes en une seule opération.

Gate fondamentale : 4.3F reste **design/read-only**. Il prépare un premier batch persistant séparé, sans bulk activation.

# Business parallèle

**Agenz = priorité partenariat/feed** : 4 490 normalized, 1 227 fresh, 1 146 decision-structured, hidden/internal-only.

# UX

## P1A.4 ✅ PR #350

Map Design System certifié : map-first, cockpit flottant, responsive 390/768/1280, 30 captures/0 finding, score final 9,3/10.

## Prochain UX — P1A.5 Territorial Explorer

Construire l’exploration **Maroc → ville → quartier** au-dessus du Map Design System certifié, sans modifier le contrat URL ni inventer de géométrie/proximité, puis auditer 390/768/1280 avec seuil ≥9/10.
