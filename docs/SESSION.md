# AkarFinder — Session courante

**Mise à jour : 2026-08-07**  
**Lot DATA acquis : DATA-4.3C — Dar Agadir Sitemap-Presence Freshness Shadow ✅ PR #351**  
**Prochain lot DATA : DATA-4.3D — Freshness Evidence Canary Design**  
**Lot UX acquis : CARTE-QUARTIER-P1A.3 — Map State & Navigation ✅ PR #349**  
**Prochain lot UX : CARTE-QUARTIER-P1A.4 — Map Design System**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

`main` inclut notamment :

- CARTE-QUARTIER-P1A.0 ✅ PR #327 ;
- CARTE-QUARTIER-P1A.1 ✅ PR #328, score **9,5/10** ;
- CARTE-QUARTIER-P1A.2 ✅ PR #334 ;
- CARTE-QUARTIER-P1A.3 ✅ PR #349, score contractuel **9,3/10** ;
- DATA-1.1 → DATA-1.6B ✅ ;
- DATA-4.0 ✅ PR #341 ;
- DATA-4.1A ✅ PR #343 ;
- DATA-4.2 ✅ PR #344 ;
- DATA-4.3A ✅ PR #347 ;
- DATA-4.3B ✅ PR #348 ;
- DATA-4.3C ✅ PR #351, merge `25ecc1a`.

Invariants : no-bypass, capability ≠ permission, Source Registry avant activation, volume technique ≠ inventaire public, Search reste canonique et Map son complément spatial.

# DATA — Dar Agadir

## DATA-4.3A ✅ PR #347

Sur 6 533 lignes :

- `ELIGIBLE_SHADOW` : **5** ;
- `SEED_ONLY_REVALIDATION_REQUIRED` : **6 425** ;
- `NON_NORMALIZED` : **46** ;
- `INSUFFICIENT_STRUCTURE` : **57** ;
- duplicate : **0** ;
- policy blocked : **0**.

Conclusion : impossible de considérer le réservoir comme frais sans nouvelle preuve.

## DATA-4.3B ✅ PR #348

Canal Registry autorisé : `public_sitemap` uniquement.

Preuve live :

- **5 905** URLs dans le sitemap actuel ;
- **5 749** URLs du reservoir AkarFinder encore présentes ;
- **5 673 `seed_only`** encore présentes ;
- **784** URLs existantes absentes ;
- 10 requêtes source : robots + sitemaps same-origin ;
- 0 page détail ;
- 0 content reuse ;
- 0 DB/freshness write ;
- 0 policy change ;
- 0 activation.

Présence sitemap = **signal de présence uniquement**, pas `fresh_confirmed`.

## DATA-4.3C ✅ PR #351

Freshness shadow read-only : la seule hypothèse ajoutée est

`seed_only + sitemap_present_now → sitemap_present_shadow`

avec maintien obligatoire de : normalization complète + `city + property_type + intent` + quality≥40 + display evidence + non-duplicate.

Preuve live finale :

| Classe | Volume |
|---|---:|
| **SHADOW_READY** | **5 566** |
| dont `seed_only` | **5 564** |
| `NOT_PRESENT_IN_CURRENT_SITEMAP` | 784 |
| `SITEMAP_PRESENT_BUT_INSUFFICIENT_STRUCTURE` | 148 |
| `SITEMAP_PRESENT_NON_NORMALIZED` | 35 |
| duplicate | **0** |
| policy blocked | **0** |

Sécurité :

- source requests : **10 / 40 max** ;
- DB writes : **0** ;
- freshness writes : **0** ;
- policy changes : **0** ;
- detail-page fetches : **0** ;
- content reuse : **0** ;
- production activation : **false**.

Conclusion : Dar Agadir possède désormais un **potentiel de freshness massif** : 5 564 lignes seed-only satisfont déjà structure/qualité/display et sont encore présentes dans le sitemap courant. Cela justifie un canary freshness séparé, pas une activation directe.

# Prochain lot DATA — DATA-4.3D

## Freshness Evidence Canary Design

Objectif : formaliser le signal sitemap comme preuve de freshness traçable et réversible avant tout write.

Étapes :

1. inspecter le modèle Freshness / Observation Ledger existant ;
2. identifier où stocker la provenance `sitemap_presence` sans écraser l’état historique ;
3. conserver `max_revalidation_interval_days=14` comme TTL/gate ;
4. définir un canary limité et réversible ;
5. simuler puis éventuellement écrire uniquement le signal de freshness sur le canary ;
6. mesurer l’effet sur display eligibility ;
7. aucune activation SERP automatique ;
8. rollback explicite obligatoire ;
9. aucune page détail / aucun content reuse / aucun bypass ;
10. Source Registry reste autoritaire.

Gate fondamentale : **DATA-4.3D ne peut pas transformer les 5 564 lignes en inventaire public en une seule étape.** Le canary freshness et l’activation SERP sont deux décisions séparées.

# Business parallèle

**Agenz = priorité partenariat/feed** : 4 490 normalized, 1 227 fresh, 1 146 decision-structured, mais hidden/internal-only. Aucun changement Registry/produit avant autorisation écrite.

# UX — P1A.4

Prochain lot : **Map Design System** — hiérarchie visuelle, couleurs, marqueurs, contrôles, panneau quartier, responsive/accessibilité, audit visuel et score ≥9/10.