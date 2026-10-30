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
