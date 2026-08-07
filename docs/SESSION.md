# AkarFinder — Session courante

**Mise à jour : 2026-08-07**  
**Lot DATA acquis : DATA-4.3G — First Persistent Freshness Batch ✅ PR #362**  
**Prochain lot DATA : DATA-4.3H — Controlled Expansion to 500**  
**Lot UX acquis : CARTE-QUARTIER-P1A.4 ✅ PR #350 — 9,3/10**  
**Prochain UX : CARTE-QUARTIER-P1A.5 — Territorial Explorer**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

Acquis récents :

- DATA-4.0 ✅ PR #341 ;
- DATA-4.1A ✅ PR #343 ;
- DATA-4.2 ✅ PR #344 ;
- DATA-4.3A→D ✅ ;
- DATA-4.3E ✅ PR #355 ;
- DATA-4.3F ✅ PR #358 ;
- DATA-4.3G ✅ PR #362, merge `0286178` ;
- P1A.4 ✅ PR #350, **9,3/10**, audit final **30 captures / 0 finding**.

Invariants : no-bypass, capability ≠ permission, Source Registry avant activation, volume technique ≠ inventaire public, Search canonique, Map complément spatial.

# DATA — Dar Agadir

## DATA-4.3E ✅

Production rehearsal 10 lignes : apply 10/10, verify 10/10, rollback 10/10. Freshness/evidence restaurée ; `updated_at` documenté comme audit trail non rollbackable.

## DATA-4.3F ✅ PR #358

- total : **6 533** ;
- `seed_only` : **6 431** ;
- `fresh_confirmed` : **102** ;
- résidu canary : **0** ;
- batch initial : **50** ;
- hard max : **100/run** ;
- cap avant re-certification : **500** ;
- drift max : **1 %** ;
- TTL : **14 jours**.

## DATA-4.3G ✅ PR #362

Premier batch freshness **persistant** certifié.

| Mesure | Résultat |
|---|---:|
| PR gates | **20/20 verts** |
| pool seed-only dry-run | **5 554** |
| batch | **50** |
| source requests | **10** |
| before Public Search | **50/50** |
| before technical display | **50/50** |
| apply production | **50/50** |
| post-write `fresh_confirmed` | **50/50** |
| post-write `public_sitemap_presence` | **50/50** |
| typed evidence | **50/50** |
| Public Search avant → après | **50 → 50** |
| technical display avant → après | **50 → 50** |
| Dar Agadir `seed_only` | **6431 → 6381** |
| Dar Agadir `fresh_confirmed` | **102 → 152** |
| drift | **0 %** |

Registry post-write inchangé : `public_sitemap_only`, `canonical_link_only`, `external_tail_link_only`, TTL 14 jours, review `due_soon`.

Le batch reste persistant. Rollback complet disponible mais non exécuté car aucune dérive ni effet public inattendu n’a été observé.

Conclusion importante : les 50 URLs étaient déjà présentes dans `public_search_representations_v1` et technical display **avant** le write. La mutation freshness n’a donc pas créé ces représentations ; elle a seulement ajouté une preuve de fraîcheur typée et traçable.

# Prochain lot DATA — DATA-4.3H

## Controlled Expansion to 500

Objectif : monter progressivement de **50 persistées vers 500 maximum**, avant re-certification obligatoire.

Règles :

1. batches déterministes ≤100/run ;
2. cumul inclut les 50 déjà persistées ;
3. Registry + sitemap revalidés avant chaque batch ;
4. seulement `seed_only` sans `public_sitemap_presence` ;
5. snapshot + rollback par batch ;
6. Public Search + technical display mesurés avant/après ;
7. TTL 14 jours ;
8. drift ≤1 % ;
9. stop fail-closed sur partial apply / policy drift / sitemap drift / effet public inattendu ;
10. aucune modification display/publication policy ;
11. aucune page détail/content reuse ;
12. re-certification obligatoire à 500 avant extension supplémentaire.

Gate fondamentale : **4.3H prouve la répétabilité des batches ; il n’autorise pas une promotion bulk des ~5,5K lignes.**

# Business parallèle

**Agenz = priorité partenariat/feed** : 4 490 normalized, 1 227 fresh, 1 146 decision-structured, hidden/internal-only.

# UX

## P1A.4 ✅ PR #350

Map Design System certifié : map-first, cockpit flottant, responsive 390/768/1280, 30 captures/0 finding, score final 9,3/10.

## Prochain UX — P1A.5 Territorial Explorer

Construire l’exploration **Maroc → ville → quartier** au-dessus du Map Design System certifié, sans modifier le contrat URL ni inventer de géométrie/proximité, puis auditer 390/768/1280 avec seuil ≥9/10.
