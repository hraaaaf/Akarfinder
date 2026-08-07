# AkarFinder — Session courante

**Mise à jour : 2026-08-07**  
**Lot DATA acquis : DATA-4.3D — Freshness Evidence Canary Design ✅ PR #353**  
**Prochain lot DATA : DATA-4.3E — First Bounded Freshness Write Canary**  
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
- DATA-4.3D ✅ PR #353, merge `019253c` ;
- P1A.3 ✅ PR #349 ;
- P1A.4 ✅ PR #350, merge `14c26bf`, **9,3/10**, audit final **30 captures / 0 finding**.

Invariants : no-bypass, capability ≠ permission, Source Registry avant activation, volume technique ≠ inventaire public, Search canonique, Map complément spatial.

# DATA — Dar Agadir

## DATA-4.3B ✅

- sitemap actuel : **5 905 URLs** ;
- overlap AkarFinder : **5 749** ;
- `seed_only` encore présentes : **5 673** ;
- 10 requêtes robots/sitemaps ;
- 0 détail/content reuse/write/activation.

## DATA-4.3C ✅

Freshness shadow :

- **5 566 SHADOW_READY** ;
- dont **5 564 seed-only** ;
- 784 absentes du sitemap ;
- 148 structure insuffisante ;
- 35 non normalisées ;
- 0 duplicate ;
- 0 policy blocked ;
- 0 DB/freshness write ;
- 0 activation.

## DATA-4.3D ✅ PR #353

Canary dry-run réversible :

| Mesure | Résultat |
|---|---:|
| Pool seed-only éligible | **5 564** |
| Canary | **100** |
| Canal | `public_sitemap_presence` |
| TTL | **14 jours** |
| Statut proposé | `fresh_confirmed` |
| Before/proposed/rollback | **100/100** |
| Seed-state reads | **100** |
| Source requests | **10** |
| DB writes | **0** |
| Freshness writes | **0** |
| Policy changes | **0** |
| Activation publique | **0** |

Certification : **20/20 workflows verts**, tests DATA-4.3D + régressions seed-freshness + TypeScript + build + live dry-run + proof gate.

Le système OpenSERP/Yandex n’a pas été détourné : son canal reste distinct. Le sitemap propose explicitement `public_sitemap_presence`.

Incident de certification résolu :

1. premier live run : timeout Supabase en lisant trop de `source_offer_seeds` ;
2. correction : lecture uniquement des 100 URLs du canary par petits chunks ;
3. deuxième run : robots ne déclarait temporairement aucun sitemap → fail-closed ;
4. relance sans changement de code : sitemap de nouveau déclaré, canary live vert ;
5. aucun write n’a eu lieu pendant ces échecs.

# Prochain lot DATA — DATA-4.3E

## First Bounded Freshness Write Canary

Objectif : effectuer le premier **write freshness réel mais minuscule**, sans changer l’affichage public.

Règles :

1. canary strictement inférieur à 100 URLs ;
2. sélection déterministe parmi les 5 564 éligibles ;
3. revalidation Registry + sitemap juste avant write ;
4. snapshot before obligatoire ;
5. write uniquement sur la freshness/evidence ;
6. canal `public_sitemap_presence` ;
7. TTL 14 jours ;
8. aucune page détail ;
9. aucun content reuse ;
10. aucune modification display/publication policy ;
11. post-write verification production ;
12. rollback rehearsal exact ;
13. activation SERP interdite.

Gate fondamentale : **un succès 4.3E prouve uniquement qu’on peut écrire et restaurer proprement une freshness evidence sitemap. Il ne rend pas automatiquement les 5 564 lignes publiques.**

# Business parallèle

**Agenz = priorité partenariat/feed** : 4 490 normalized, 1 227 fresh, 1 146 decision-structured, mais hidden/internal-only. Aucun changement Registry/produit avant autorisation écrite.

# UX

## P1A.4 ✅ PR #350

Map Design System certifié :

- carte map-first, cockpit clair et flottant ;
- bleu AkarFinder réservé à la sélection et aux actions ;
- confiance explicite, jamais portée par la couleur seule ;
- panneau quartier flottant sans réduire le viewport ;
- responsive 390 / 768 / 1280 ;
- MapLibre considéré prêt dès `style.load` pour éviter un faux loader ;
- URL P1A.3, Geo Registry, Search et continuité Mon Projet inchangés ;
- **30 captures / 0 finding** ;
- score final **9,3/10** après reprise du premier pass 7,8/10.

## Prochain lot UX — P1A.5 Territorial Explorer

Construire l’exploration **Maroc → ville → quartier** au-dessus du Map Design System certifié, sans modifier le contrat URL ni inventer de géométrie/proximité. Préserver Map ↔ Search ↔ Quartier ↔ Mon Projet, puis auditer 390 / 768 / 1280 avec seuil **≥9/10**.
