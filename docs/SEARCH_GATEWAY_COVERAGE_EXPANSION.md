# Search Gateway Coverage Expansion

Mission : SEARCH-GATEWAY-COVERAGE-EXPANSION-1 (2026-07-05)
Baseline : docs/SEARCH_VOLUME_RELEVANCE_AUDIT.md (15,1 résultats/requête, A+B 71,5%)

## Diagnostic du plafond (avant)

1. **num=5 par appel provider** : `max_results_per_source` défaut 5, jamais
   surchargé par la route — alors que num=10 coûte le même crédit Serper.
2. **Variantes secondaires mortes** : elles exigeaient `city && q`, mais
   /search ne transmet que `q` — elles ne se déclenchaient jamais.
3. **Cap brut à 30** avant normalisation/dedupe → ~13-15 en sortie.
4. **Fetch séquentiel**, pas de backfill, homepages/staging non rejetés.

Réponses aux questions d'audit :
- Le provider retournait moins que possible (num=5 demandé).
- Volume perdu surtout par num trop bas + absence de variantes, pas par le
  filtrage immobilier ni le dedupe.
- Pagination provider : num=10 utilisé (coût identique) ; pas de multi-page.
- Sources sous-représentées : Logic-Immo (homepage uniquement → désormais
  rejetée), Mubawab/Agenz (num trop bas).

## Modifications

- `lib/search-gateway/search-gateway-query-expansion.ts` (new) :
  détection de transaction (rent/new/land/buy) depuis le texte libre,
  génération de ≤2 variantes cohérentes avec l'intention (jamais de mélange
  achat/location), round de backfill ≤6 requêtes (1 variante par source).
- `lib/search-gateway/search-gateway-page-quality.ts` (new) :
  rejet dur (hosts staging type stage-v1.*, homepages portail, articles
  /blog/), dépriorisation des pages référentiel de prix (weak → fin de SERP,
  jamais supprimées), heuristique annonce individuelle.
- `app/api/search/gateway/route.ts` :
  num=10 par requête, appels provider parallélisés (fail-soft, timeout 8s),
  round 2 de backfill uniquement si <30 résultats utiles, tri qualité de
  page, limite pages catégorie par source 1→3, cap final 30→50.

Coût provider : 6 appels (round 1) + ≤6 (round 2 conditionnel) = ≤12 appels
par recherche, num=10 (1 crédit Serper chacun, identique à num=5).

## Mesure avant / après (10 requêtes baseline, preview)

| Requête | Avant total | Après total | Avant A+B | Après A+B* | Sources dominantes après | Problèmes restants |
| --- | --- | --- | --- | --- | --- | --- |
| appartement casablanca | 12 | 27 | 67% | 96% | Avito 10, Sarouty 7, Yakeey 4 | 1 page prix en fin |
| location studio casablanca | 11 | 28 | 73% | 93% | Sarouty 9, Avito 8, Mubawab 5 | 2 hors-ville |
| villa rabat | 10 | 26 | 80% | 81% | Avito 10, Agenz 6, Mubawab 4 | 1 PDF, 2 pages nationales Agenz |
| appartement marrakech | 18 | 39 | 56% | 85% | Avito 10, Mubawab 8, Sarouty 7 | 5 pages prix (en fin) |
| location appartement rabat | 12 | 32 | 83% | 91% | Sarouty 9, Mubawab 8, Avito 7 | — |
| terrain marrakech | 16 | 38 | 94% | 84% | Avito 10, Sarouty 9, Agenz 8 | 5 pages prix (en fin) |
| programme neuf casablanca | 24 | 42 | 54% | 83% | Agenz 10, Yakeey 10, Avito 9 | 4 pages nationales |
| appartement agadir | 15 | 34 | 60% | 91% | Avito 10, Mubawab 8, Sarouty 7 | — |
| location tanger | 14 | 32 | 86% | 100% | Mubawab 9, Sarouty 9, Avito 8 | — |
| maison fes | 19 | 40 | 79% | 98% | Avito 10, Sarouty 10, Mubawab 10 | — |

\* A+B après = classification heuristique (mêmes critères ville/type/page que
la grille manuelle baseline). Spot-check manuel sur "villa rabat" : ~75-77%
en grille manuelle stricte — l'heuristique surestime de ~5-10 points ; la
fourchette manuelle réaliste globale est ~75-85%, au-dessus de la baseline
(71,5%) et du seuil de 60%.

## Totaux

- Moyenne résultats/requête : **15,1 → 33,8** (+124%)
- Requêtes ≥30 résultats : **7/10** (objectif ≥5/10)
- Requêtes <15 résultats : **0** (min 26)
- A+B heuristique : **89,9%** (304/338) ; estimation manuelle ~75-85%
- Staging en sortie : **0** (stage-v1.yakeey.com désormais rejeté)
- Homepages portail en sortie : **0** (Logic-Immo homepage rejetée)
- Blogs en sortie : **0**
- Hors Maroc : 0. Hors immobilier : 0.
- Doctrine conservée : can_show_contact=false, can_show_gallery=false,
  primary_cta=view_original, attribution "Résultat web externe" sur 100%
  des résultats.

## Critères de succès

| Critère | Cible | Résultat | Verdict |
| --- | --- | --- | --- |
| Moyenne résultats | ≥25 | 33,8 | ✅ |
| Requêtes ≥30 | ≥5/10 | 7/10 | ✅ |
| Aucune requête <15 | 0 | 0 (min 26) | ✅ |
| Pertinence A+B | ≥60% | ~75-90% | ✅ |
| Hors Maroc / hors immo | 0 | 0 | ✅ |
| URL staging | 0 | 0 | ✅ |
| /listings/137 | 404 | 404 | ✅ |
| Doctrine Gateway | conservée | conservée | ✅ |

Roadmap : 70% → 73% (critères atteints).

## Problèmes restants (pour BUY-RENT-SERP-RELEVANCE-TUNING-1)

- Pages nationales "throughout Morocco" (Agenz/Mubawab) sur requêtes ville.
- Pages prix/référentiel encore présentes en fin de SERP (voulues pour le
  volume, mais à réduire quand le volume A/B suffira).
- Toujours peu d'annonces individuelles A (13/338 ≈ 4%) — structurel côté
  index public ; l'inventaire partenaire est la vraie réponse.
- Mix achat/location dans les requêtes génériques ("appartement casablanca"
  renvoie aussi de la location) — c'est le cœur de la mission tuning.
