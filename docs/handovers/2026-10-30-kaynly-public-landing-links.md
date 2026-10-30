# AkarFinder — Kaynly public landing link acquisition (2026-10-30)

**Goal:** Faster independent URL discovery via sitemap and permitted landing pages, without /resultats, API access, protections bypass or direct downloading of photos.

**Pilot actually observed:** 20 public city/category pages (10 cities x sale/rent), 180 distinct direct source URLs: 60 Mubawab, 65 Avito, 28 Yakeey, 25 Sarouty, 2 Noura. Sources and source-page provenance at https://app.notion.com/p/40977c66336281c7ae78c5757dd10c16 . Published sitemap advertises 1452 landing pages; not 1452 listings. Comparison after independent capture: 60 Mubawab IDs vs existing 934 Mubawab candidates → 13 overlaps, 47 new; +120 other-platform references = 1101 platform-ID references. None certified as unique physical properties or active offers.

**Implemented:** scripts/acquisition/kaynly-open-links/collector.py, offline tests, 60-page GitHub Actions probe and evidence artifacts. Neither /api nor /resultats requested by this collector; stops on access restriction/429. No production DB, images, merge, Vercel deployment or commercial reuse license.

**Next exact:** inspect CI and artifact on HEAD, compare further new source IDs against 1101, then expand only authorized sitemap landing coverage if reliable. Fiche details/photos separately require access/rights. PR DRAFT pending human validation.


## 2026-10-30 — closeout du pilote 60 pages réelles

**Preuve vérifiée à la source, pas seulement CI :** sur HEAD `bd062f2681b16fbe594e48fa723e7a8e6c837fce`, 3/3 workflows SUCCESS, notamment [Kaynly Public Landing Source Links #41125175281](https://github.com/hraaaaf/Akarfinder/actions/runs/41125175281), artefact `kaynly-source-link-evidence` ID `13010852042`. Archive téléchargée, JSONL comptés et ZIP validé.

- 60 pages publiques HTTP 200, sur 1452 pages de landing listées dans le sitemap. Les pages utilisées étaient **54 locations et 6 ventes**, biais d'échantillonnage à corriger.
- **537 références uniques** de portails : Avito 257 ; Mubawab 241 ; Yakeey 21 ; Sarouty 16 ; Noura 2. `source_links.jsonl` et `provenance.jsonl` contiennent chacun 537 lignes ; `stop_reason=page_budget`.
- Comparaison **après collecte** du lot de 241 ID Mubawab contre l'inventaire indépendant de 934 : 3 ID présents des deux côtés, **238 ID Mubawab hors baseline**. Les 296 autres références viennent des quatre autres portails. **Union 1468 références (ID qualifié par portail)**, pas 1468 biens physiques distincts ni des annonces vivantes garanties.
- Livrable privé Library : `/AkarFinder/Acquisition/Kaynly-Public-Landings-2026-10-30/AkarFinder_Kaynly_60_pages_537_liens_comparaison_20261030.zip` SHA256 `51c9732cc69567fd3dd0b7f8b7d639e6471896d395cfa945842a1e28ab331ec2`, CRC OK. Contient les preuves brutes GitHub, comparaison JSON et fichiers des 238 nouveaux ID / 3 recoupements.
- Pas de téléchargement des fiches originales ou des photos ; aucune écriture Supabase, aucun merge, aucune publication Vercel ; droits de rediffusion commerciale non démontrés. Les liens directs ne suffisent pas à certifier les annonces actives.

**Next exact :** répartir équitablement les prochains échantillons `/vente/` et `/location/` sur plusieurs villes depuis le sitemap autorisé, collecter un nouveau lot plafonné puis comparer par identifiant de portail au corpus 1468. Documenter si une page disparaît ou renvoie HTTP 403/429. Les conditions de réutilisation restent un point distinct.

## 2026-10-30 — second balanced audit queued via PR

Previous pilot verified 60 pages / 537 direct source links / 3 exact Mubawab overlap with prior independent 934 = 1468 portal-scoped candidate references. **New goal:** independent robots-allowed sitemap acquisition of 60 *different* landing pages with target 30 sale + 30 rental, spread round-robin by city and alternating transaction type. No old listing IDs used to discover, exclude the original 60 landing URL positions by deterministic published ordering. New report fields: `selection`, `selected_type_counts`, `selected_city_count`, `selected_overlap_prior_60`. Updated GitHub workflow archives new artifact `kaynly-balanced-source-link-evidence`; gate checks selection validity, no first-60 overlap, >=40 successful pages, 25+ planned pages of each type, and no access refusal. Local/CI tests required; **results of second live run not yet observed**. The original artifact and PR stay preserved. Compare new source ID union only *after* acquiring second artifact. No Vercel, prod DB, merge or gallery download.

## 2026-10-30 — Lot 2 équilibré : réalisé, preuves et rapprochement net

**Goal** : sortir du biais du lot 1 (54 locations / 6 ventes) sans relire ses pages de landing, et calculer la valeur incrémentale plutôt que compter les liens bruts. **Atteint sur le périmètre échantillonné** : la méthode `balanced-new` a sélectionné 30 pages vente et 30 location, réparties sur **47 villes**, à partir des 1452 URL de landing dans le sitemap. **Zéro chevauchement avec les 60 pages du premier lot**.

**Preuve technique :** HEAD code `a1461e443bd32fa2991db220f14326656423cfb7`; [GitHub Actions #41133617860](https://github.com/hraaaaf/Akarfinder/actions/runs/41133617860) **SUCCESS**, artefact `kaynly-balanced-source-link-evidence` ID `13015520151` téléchargé et inspecté : 60 pages HTTP 200, stop `page_budget` normal, 537 URL/ID sources uniques, 537 lignes de provenance, 0 refus. Distribution : **Avito 259, Mubawab 251, Yakeey 14, Sarouty 9, Noura 4**. L'archive brute SHA256 `56d8231a8b6eb683aed87fb5106960fc4ea9b015dbc910e8ab2ec171173927a5`, ZIP CRC OK.

**Comparaison indépendante post-collecte** vs union de 934 références Mubawab + 537 liens Kaynly du premier lot (= 1468 références distinctes sous clé plateforme/ID) : sur les 537 références du lot 2, **177 doublons connus**, **360 net nouvelles références**, soit **1828 références de portails cumulées**. Nouveaux par source : **Mubawab 181, Avito 156, Yakeey 11, Sarouty 8, Noura 4**. Chevauchements : Avito 103, Mubawab 70, Sarouty 1, Yakeey 3 ; total 177. Les captures de page ne constituent pas 1828 biens uniques physiquement.

**Preuve durable / reprise hors réseau** : Library privée `/AkarFinder/Acquisition/Kaynly-Public-Landings-2026-10-30/AkarFinder_Kaynly_Lot2_60_pages_360_nouveaux_20261030.zip`, **SHA256 `9b9f4c994056133c2ffeebcd1d87413481d015a658c0bdf18665788f4cceb1d2`**, CRC vérifié, 8 entrées : les deux archives préexistantes SHA vérifiées, artefact brut GitHub, `comparison.json`, `new_net_source_urls.jsonl` (360), `overlap_source_urls.jsonl` (177), script reproductible `compare_balanced.py`, README de restrictions. Le comparateur n'utilise l'historique **que pour comparer**, jamais pour amorcer la découverte. L'archive a aussi été sauvegardée en Library.

**Qualité et gouvernance** : aucune fiche originale ni photo téléchargée, statut actif non vérifié, droit de réutilisation commerciale non prouvé, pas de déduplication physique, pas de Vercel, pas d'écriture DB prod, pas de merge. Robots et garde-fous respectés ; Kaynly interdit toujours `/resultats` et `/api/`.

**Next exact** : vérification des checks CI du HEAD de documentation ; ensuite construire le plan de couverture du reste des landing URLs **sans réinterroger** les deux lots (120 pages) et mesurer le rendement marginal par type/ville ; enrichissement des fiches et images sous conditions d'accès et de droits séparées. PR DRAFT : validation humaine avant fusion.
