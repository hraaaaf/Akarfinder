# AkarFinder — Session courante

**Mise à jour : 2026-08-07**  
**Lot DATA acquis : DATA-4.3F — Controlled Promotion Design ✅ PR #358**  
**Prochain lot DATA : DATA-4.3G — First Persistent Freshness Batch**  
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
- DATA-4.3F ✅ PR #358, merge `5125e3f` ;
- P1A.4 ✅ PR #350, **9,3/10**, audit final **30 captures / 0 finding**.

Invariants : no-bypass, capability ≠ permission, Source Registry avant activation, volume technique ≠ inventaire public, Search canonique, Map complément spatial.

# DATA-4.3E — rehearsal production certifié

- pool seed-only éligible : **5 564** ;
- canary : **10 URLs** ;
- canal : `public_sitemap_presence` ;
- TTL : **14 jours** ;
- apply production : **10/10** ;
- verify : **10/10** ;
- rollback : **10/10** ;
- post-rollback : 10/10 `seed_only`, `fresh_last_seen_at=NULL`, `fresh_channels=[]`, metadata originale, aucune `freshness_evidence` ;
- les 10 restent dans `public_search_representations_v1` après rollback : cette représentation n’a pas été créée par le write canary ;
- `updated_at` reste une trace d’audit non restaurée.

# DATA-4.3F — Controlled Promotion Design ✅

Preuve live finale :

| Mesure | Résultat |
|---|---:|
| Dar Agadir total | **6 533** |
| `seed_only` | **6 431** |
| `fresh_confirmed` | **102** |
| résidu `public_sitemap_presence` du canary | **0** |
| Registry eligible | **true** |
| Registry review | `due_soon` |
| drift | **0 %** |
| first persistent batch | **50** |
| hard max / run | **100** |
| cap avant re-certification | **500** |
| TTL | **14 jours** |
| DB/freshness writes | **0** |
| activation publique | **0** |

Rollback semantics : freshness status / last seen / channels / metadata sont rollbackables ; `updated_at` est capturé mais explicitement `AUDIT_TRAIL_NON_ROLLBACKABLE`.

# Prochain lot DATA — DATA-4.3G

## First Persistent Freshness Batch

Objectif : appliquer réellement un premier batch persistant de **50 lignes maximum**, sans toucher la display policy.

Règles :

1. sélection déterministe ≤50 ;
2. Registry + sitemap revalidés juste avant write ;
3. uniquement `seed_only` sans canal `public_sitemap_presence` ;
4. snapshot complet ;
5. write freshness/evidence uniquement ;
6. TTL 14 jours ;
7. vérification 50/50 post-write ;
8. observabilité applied/skipped/drifted ;
9. arrêt si drift >1 % ;
10. rollback prêt ;
11. aucune modification display/publication policy ;
12. aucune page détail/content reuse ;
13. mesurer Search/display séparément.

Gate fondamentale : 4.3G peut persister **un premier batch**, mais ne peut pas promouvoir les 5 564 lignes d’un coup.

# Business parallèle

**Agenz = priorité partenariat/feed** : 4 490 normalized, 1 227 fresh, 1 146 decision-structured, hidden/internal-only.

# UX

## P1A.4 ✅ PR #350

Map Design System certifié : map-first, cockpit flottant, responsive 390/768/1280, 30 captures/0 finding, score final 9,3/10.

## Prochain UX — P1A.5 Territorial Explorer

Construire l’exploration **Maroc → ville → quartier** au-dessus du Map Design System certifié, sans modifier le contrat URL ni inventer de géométrie/proximité, puis auditer 390/768/1280 avec seuil ≥9/10.
