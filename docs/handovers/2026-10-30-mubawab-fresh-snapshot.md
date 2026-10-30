# AkarFinder — Mubawab fresh snapshot V0 / 2026-10-30

**Goal:** start independent fresh discovery with **zero historical seed**, then compare an actual fresh snapshot with already-held archives by stable ID/URL/photo, dedupe conservatively and retain provenance. The original goal of mirroring the entire Mubawab site including actual images is **not reached**.

## Scope and proof

- New Python implementation: `scripts/acquisition/mubawab-fresh/fresh_snapshot.py` is **not a fork** of old crawlers and has no baseline archive argument on `fresh`.
- `fresh`: uses fresh local SQLite queue, public site homepage as seed, obtains `robots.txt` before all site pages, 2+ second rate limit, stops on 403/429/unknown robots/network errors. Stores HTML by SHA-256, extracted listing records and URL image references. Bounded 1–100 discovery pages and 1–500 details by CLI. Does **not** bypass CAPTCHA/blockages or download image binaries. Each fresh run uses a new work directory; resume is explicit.
- `compare`: accepts a **separate** `.jsonl` / `.zip` / `.sqlite` historical baseline only after fresh snapshot exists. Hard-dedup by ID; preserves fresh-only, overlap, historical-only as three sets; changed fields; possible cross-ID photo matches/URL collisions are **review candidates**, not automatic physical merges.
- **Local tests 14/14 PASS** on synthetic fixtures, including no previous files as seeds, source-domain checks, robots-denied URLs, explicit 429 stop, HTML SHA preservation, photo references, historical SQLite, comparison with no network and ID collisions.
- **Real fresh attempt in this container failed before the first HTTP response:** DNS could not resolve `www.mubawab.ma` (requests `NameResolutionError`). `fresh_report.json`: `blocked`, `pages=0`, `details=0`, `photo_urls=0`, `coverage_certified=false`. No legitimate fresh-vs-history comparison has been executed.
- **Historical baseline** is separately stored in a private ZIP with 129 known saved listings and 530 photo URL references. It is **not** used as a fresh seed. Offline comparison algorithm was exercised with only synthetic fresh records (2 rows) vs that baseline: 1 overlapping ID, 1 new synthetic ID, 128 baseline-only IDs. This is a software dry-run, **not evidence of new listings or actual deletions**.

## Governance

- No new live listing retrieval, no photo downloads, no public data export to GitHub, no Supabase writes, no merge, no Vercel deployment.
- The current Mubawab terms restrict automated extraction and commercial database reuse; `robots.txt` permissions alone do not establish rights to republish content. Stop on server restrictions, no attempts to evade access controls.
- Old PR #1134 stays separate in DRAFT. This new fresh-snapshot PR uses an independent branch from `main`.

## Next exact

1. Verify GitHub CI tests for the new PR against the **exact** final HEAD.
2. Run `fresh` on a machine/network with normal DNS and permissible access; inspect `fresh_report.json`. If no successful detail extraction, don't run live comparison or make stock claims. If blocked by server policy or terms, document and stop.
3. If a real fresh JSONL is obtained, run `compare` with the private historical archive **afterwards**, validate ID overlaps, photo/URL review candidates, price changes and stale status without equating historical-only to deleted.
4. Human review/merge gate. No production deployment without explicit approval.

**Canonical file:** `docs/handovers/2026-10-30-mubawab-fresh-snapshot.md`. Completion % not estimated.

## Read-only independent link observation after failed native-DNS probe

Because the container cannot resolve `www.mubawab.ma`, a **separate page-reading service** (`TinyFish fetch_content`, `ttl=0`) was used for a **bounded verification of 4 ordinary public category pages** on 2026-10-30. Its upstream cache policy means origin live-freshness is **not independently certified**. This service did **not** run the new Python `fresh` CLI; do not merge these two evidence streams or claim they constitute a complete direct crawl.

- Casablanca /fr/ct/casablanca/immobilier-a-vendre: **31 listing URL IDs**
- Rabat: **32**
- Marrakech: **31**
- Tanger: **31**
- **125 distinct listing IDs among 125 observed category links**, 0 internal exact-ID duplicates.
- Historical archive was introduced **only after** these 125 links had been collected and IDs extracted: **129 old distinct IDs, 9 exact intersections, 116 links not among those 129 historical IDs, 120 old IDs not on these four pages**. This does not prove 116 newly created offers or 120 retired offers.
- Independent executable `compare` against the actual private `mubawab_combined_existing_archives.zip` confirmed **125 / 129 / 9 / 116 / 120**, `fresh_input_duplicates=0`, `coverage_certified=false`. No price changes or image overlap can be inferred from link-only records.
- A **2-detail-page read-only check** (IDs **8444113** Rabat and **8444186** Tanger) returned respectively **34 and 11 distinct ad photo URL references**, total **45 references**. Only six sample photo URLs are preserved in the probe evidence; **zero image bytes**, no complete gallery export.
- The separate private ZIP `mubawab_fresh_links_4cities_comparison_20261030.zip`, SHA-256 **`ceaf31e14b38fe766bf8e6a7cfa1f4d1d40c283096f80cb94a6cda9e1593cd23`**, is stored in Library `/AkarFinder/Mubawab/Fresh-2026-10-30/`. It contains `fresh_link_inventory.jsonl`, `fresh_link_inventory_ids.csv`, `compare_output/`, source scope README and `detail_probe_2.json`. **Individual listing URLs were not preserved in that local ZIP; only source-category URLs and verified listing IDs**. This limitation must not be hidden.

**Validation, first code HEAD `a7745fc621a0c6798a25a4a2cef62dafd293b4c1`:** [Mubawab Fresh Snapshot Offline #41074358335](https://github.com/hraaaaf/Akarfinder/actions/runs/41074358335) SUCCESS; [CI Workflow Efficiency Policy #41074358254](https://github.com/hraaaaf/Akarfinder/actions/runs/41074358254) SUCCESS; [Canonical Baseline #41074358304](https://github.com/hraaaaf/Akarfinder/actions/runs/41074358304) SUCCESS. Later documentation HEAD requires its own status check.

**Next exact:** verify CI status on the final documentation HEAD and keep PR DRAFT. Future real fresh capture must start from an empty SQLite database, with no historical seeds and access/terms respected; only then proceed to details, image references and after-the-fact old comparison. No merge, deployment or database write.


## Fresh relance complémentaire — sept villes, rapprochement hors ligne (30 octobre 2026)

L'exécution directe du collecteur Python depuis le conteneur reste bloquée par résolution DNS ; **aucune nouvelle collecte HTTP via ce script, 0 page HTML persistée par le script, 0 fichier image**. Pour éviter d'amorcer la collecte avec les anciens fichiers, une **lecture indépendante, bornée aux premières pages vente** a été faite avec le service de lecture externe sur sept catégories : Casablanca (31 IDs), Rabat (32), Marrakech (32), Tanger (31), Agadir (33), Meknès (33), Oujda (33). **225 IDs uniques sur 225 liens observés**, 0 doublon exact interne. La fraîcheur à l'origine reste incertaine (cache amont éventuel) et cela ne constitue pas une couverture complète du site.

Les routes conjecturées `/fr/ct/fes/immobilier-a-vendre`, `.../kenitra/...` et `.../sale/...` ont répondu 404 ; **ceci ne prouve pas l'absence de contenu pour ces villes**.

**Conservation des URL directes avec provenance** : sept pages privées enfants de [Notion AkarFinder Command Center](https://app.notion.com/p/3df77c663362816d8678c28ad6a49bcf), contenant chaque URL exacte :
- [Casablanca 31](https://app.notion.com/p/40977c66336281809039d9413882df8e)
- [Rabat 32](https://app.notion.com/p/40977c6633628184b101c7ba04365806)
- [Marrakech 32](https://app.notion.com/p/40977c6633628182bd4ee43a13ae253c)
- [Tanger 31](https://app.notion.com/p/40977c66336281e29dffda65bf671367)
- [Agadir 33](https://app.notion.com/p/40977c6633628187b68ddc4a47edf839)
- [Meknès 33](https://app.notion.com/p/40977c66336281f49880cd6b7373a51d)
- [Oujda 33](https://app.notion.com/p/40977c6633628191b262f31acc45f79f)

**Dédoublonnage exécuté après découverte** avec le comparateur `fresh_snapshot.py compare` et la base historique **129 identifiants** (ZIP `mubawab_combined_existing_archives.zip`) : `fresh=225`, `historical=129`, **8 IDs communs**, **217 IDs non présents dans l'ancien petit échantillon**, **121 anciens IDs non observés sur ces sept premières pages**. Aucune « nouvelle annonce publiée » ni « annonce supprimée » ne peut être inférée de ces différences. Pas de déduplication d'un même bien sous des ID différents possible faute de photos et détails frais.

**Livrable privé** `/AkarFinder/Mubawab/Fresh-2026-10-30/mubawab_fresh_7villes_dedoublonnage_20261030.zip`, SHA-256 `ac8dd577609111b700d815cdcc98281840f96f0d24bb74a57018ba0dd6b9a3e4`, contient CSV/JSONL d'IDs, source-category et URL Notion pour chaque ligne, listes de comparaison, preuve de compte et README des limites. Vérification ZIP CRC OK ; **14/14 tests locaux** du comparateur et crawler hors ligne PASS. Le ZIP n'inclut pas les URLs directes individuelles ; elles sont stockées dans les sept pages Notion.

**Statut technique** : snapshot de liens public et comparaison prouvés sur sept premières pages, **pas de capture intégrale ni des galeries**, aucune écriture Supabase, aucune fusion Git, aucun déploiement Vercel. PR reste DRAFT. **Next exact** : auditer les schémas de collecte, obtenir un environnement réseau et une base d'accès effectivement utilisable dans le périmètre autorisé ; ensuite capturer détails/photos autorisés, valider les preuves d'exhaustivité et seulement après faire la déduplication physique. Maintenir le droit d'usage comme gate séparé.



## 2026-10-30 — amélioration de la provenance du snapshot neuf

**Goal de ce lot :** ne perdre aucun lien découvert lorsque le crawler ne consulte pas les détails, est interrompu, ou reçoit un 403. L'historique reste entièrement séparé de la phase de collecte neuve.

**Code modifié** dans `scripts/acquisition/mubawab-fresh/fresh_snapshot.py` :
- nouvelle table locale SQLite `discoveries(source_url,target_url,target_id)`, clé unique sur source/URL ; chaque lien inséré depuis une **page réellement capturée par le crawler neuf** ;
- export systématique `discovered_listing_links.jsonl` (identifiant, URL directe, page source, état du détail), y compris en cas de refus du détail ;
- nouvelles métriques `discovered_unique_ids`, `discovered_urls`, `discovery_provenance_rows` dans `fresh_report.json` ;
- `--max-details 0` devient valide : audit des liens uniquement, sans demande de page détaillée.
- Le mode `compare` reste strictement hors réseau et inchangé. Aucune photo binaire récupérée, ni mécanisme pour contourner le robots ou les blocages.

**Tests supplémentaires** dans `test_fresh_snapshot.py` :
- export de 2 IDs et provenance de 2 pages collectées, dédoublement logique par ID et conservation de 4 liens source→ID ;
- mode liens uniquement : 0 détail demandé, 2 liens conservés ;
- sur 403 à la première fiche : arrêt immédiat, 0 détail, les 2 liens déjà découverts restent exportables.

**Preuve requise :** nouvelle CI GitHub sur le HEAD final avec 16 tests Python ; ne pas déclarer ce contrôle vert avant résultat. Essai réseau direct de ce contexte : DNS `www.mubawab.ma` toujours indisponible (vérifié aussi pour `github.com`) ; aucun crawl réel additionnel. L'inventaire public indirect le plus récent reste le relevé de **225 IDs sur 7 premières pages villes**, avec 8 recoupements exacts contre 129 IDs historiques ; la fraîcheur de l'origine n'est pas garantie.

**Next exact :** vérifier la CI du HEAD final et corriger tout échec ; maintenir PR #1140 DRAFT ; aucune écriture Supabase, aucun déploiement Vercel, aucun merge.


## Extension du lot Fresh : 10 villes, 322 IDs — 30 octobre 2026

**Correction de couverture :** la découverte des trois pages de vente qui avaient renvoyé 404 en slug ASCII a identifié leurs routes **accentuées** depuis les résultats officiels :
- [Fès](https://www.mubawab.ma/fr/ct/f%C3%A8s/immobilier-a-vendre) : 33 liens directs uniques ;
- [Kénitra](https://www.mubawab.ma/fr/ct/k%C3%A9nitra/immobilier-a-vendre) : 32 ;
- [Salé](https://www.mubawab.ma/fr/ct/sal%C3%A9/immobilier-a-vendre) : 32.

Ces 97 IDs s'ajoutent au relevé indépendant de **225 IDs** sur Casablanca (31), Rabat (32), Marrakech (32), Tanger (31), Agadir (33), Meknès (33), Oujda (33). **Total : 322 URLs de liens/IDs observés, 322 IDs distincts, 0 doublon exact interne**. Périmètre strict : **première page de vente** de chacune de 10 villes. Le service de lecture externe peut mettre du contenu en cache ; l'exacte actualité à l'origine et la couverture nationale sont incertaines.

**Après découverte uniquement**, rapprochement avec les 129 IDs historiques privés via `fresh_snapshot.py compare` :
- **8 ID communs** ;
- **314 ID de ce lot absents de l'échantillon historique** (pas nécessairement des annonces nouvellement créées) ;
- **121 anciens IDs non présents sur ces 10 premières pages** (pas une preuve de suppression).
- Aucun doublon physique fiable ne peut être établi en l'absence des nouvelles fiches détaillées et fichiers photos.

**Preuves sauvegardées** : sept pages privées Notion précédemment documentées, plus [Fès 33](https://app.notion.com/p/40977c66336281d29184cd0d47769979), [Kénitra 32](https://app.notion.com/p/40977c663362811ba93fce7bfafc25f5) et [Salé 32](https://app.notion.com/p/40977c663362811e9b6bcfee411c1112) conservent les liens exacts. Le ZIP privé `/AkarFinder/Mubawab/Fresh-2026-10-30/mubawab_fresh_10villes_dedoublonnage_20261030.zip` contient les 322 IDs, leurs pages source/Notion, l'export CSV/JSONL, rapports JSON et les listes de rapprochement ; **SHA-256 `a09a5bd31d672a76c25a222d86f8824146fd46e2e26a8663ce2f65f303e64ca9`**, intégrité CRC ZIP OK.

**Résultats non atteints** : pas de nouveau téléchargement direct HTTP via Python à cause du DNS de l'environnement ; aucun fichier photo téléchargé, aucune galerie complète, aucune déclaration d'exhaustivité Mubawab ; aucun merge, déploiement ou DB write. Le test technique du moteur reste **14/14 PASS** localement. La documentation modifie le HEAD de PR #1140 et **requiert relecture des checks de ce HEAD exact**.

**Next exact** : CI exacte du dernier HEAD → si verte, conserver PR en DRAFT et documentation à jour → résoudre l'accès réseau effectif et le cadre d'accès autorisé pour une collecte de fiches/images, puis dédoublonnage physique. Ne pas confondre les observations des 10 pages avec une copie du site.



## 2026-10-30 — changement de stratégie pour l'échelle : inventaire massif hors réseau

**Constat critique :** l'inspection manuelle des premières pages de 10 villes (~322 liens) ne permet pas une couverture complète à un rythme acceptable. Le goulot est la **découverte de la totalité des URL**, pas le `SELECT DISTINCT` SQL. Les CGU de Mubawab restreignent la copie massive et la réutilisation commerciale ; robots.txt seul ne vaut pas licence. L'inventaire d'URL n'est pas une autorisation de recopier les contenus ou photographies.

**Goal du lot technique :** absorber des inventaires externes d'URL (déjà obtenus légalement) en masse en mémoire bornée, attribuer une provenance, dédupliquer automatiquement, puis laisser la comparaison historique en étape ultérieure et séparée.

**Livré dans la PR #1140** :
- `scripts/acquisition/mubawab-fresh/bulk_url_inventory.py` : import XML, XML.GZ, CDXJ, JSONL, URL texte et ZIP ; parse XML en streaming, normalise les URL de fiches Mubawab, SQLite `ids/urls/provenance/sources`, export JSONL plus rapport ; historique **jamais** utilisé automatiquement ; aucun HTTP dans ce module ;
- `scripts/acquisition/mubawab-fresh/test_bulk_url_inventory.py` : 5 tests (normalisation/rejets, CDXJ, XML.GZ 100 000 URL, ZIP + dédoublonnage inter-fichiers, refus d'un input changé) ;
- `scripts/acquisition/mubawab-fresh/README_BULK.md` : instructions et limites ; workflow `.github/workflows/mubawab-fresh-offline.yml` étendu pour lancer les tests nouveaux en plus des 16 existants.

**Preuve LOCALE (synthétique, NON issue de Mubawab)** : suite de 5 tests **PASS** en **3,615 s**, dont import de **100 000 URL synthétiques** en XML.GZ produisant **100 000 IDs distincts, 100 000 URLs distinctes et 100 000 liens de provenance** ; réexécution `--resume` : même SHA-256 identifié, 0 réimport. Compilation Python PASS. **Il ne s'agit pas de 100 000 nouvelles annonces découvertes** et cela ne mesure pas le débit d'accès au site.

**Préparation du stock réel :** les 322 IDs issus des 10 premières pages et les archives historiques de 129 IDs restent des preuves distinctes. Il n'y a aucune nouvelle collecte directe depuis cet environnement : DNS de `www.mubawab.ma`, `index.commoncrawl.org` et `api.github.com` indisponible dans le conteneur. Le Common Crawl URL Index est une piste d'indexation passive, pas une preuve de fiches actives.

**Critère de sortie :** CI verte sur le HEAD exact, pas de merge, pas de déploiement ni DB prod. **Next exact :** trouver/fournir un export d'URL réellement exploitable et autorisé (sitemap/URL index), importer sur la nouvelle pipeline, vérifier le nombre de liens et leur provenance par source, puis comparer à l'historique ; accès direct aux fiches/photos reste un gate distinct.


## Closeout 2026-10-30 — Common Crawl réel, index par shards, union 934 IDs

**Goal du lot :** dépasser la découverte page par page par un index public de captures d'URL sans re-crawler Mubawab, importer les résultats **réels** dans SQLite, puis rapprocher l'ancienne archive seulement après.

**Nouveau code, mêmes branches/PR :**
- `scripts/acquisition/mubawab-fresh/commoncrawl_mubawab_probe.py` : 2 indices Common Crawl (`CC-MAIN-2026-43`, `CC-MAIN-2026-39`), requêtes publiques d'index URL, maximum 500 lignes/réponse, HTTPS + allowlist d'ID et d'URL, cadence >=1 s, limite de 3 Mo/réponse, 504/502 consignés et pas de requêtes à Mubawab.
- Après erreurs 504 sur `/fr/a/*`, la deuxième sonde a interrogé de manière **bornée** les préfixes d'identifiant `84*`, `83*`, `82*` pour `/fr/a/`, plus `/fr/pa/*`. **Ce périmètre ne couvre ni tous les préfixes ni toutes les archives Common Crawl.**
- `test_commoncrawl_mubawab_probe.py` : 5 tests locaux PASS sur normalisation/rejet, simulation index, erreurs explicites, dédoublonnage de capture et préfixes.
- Workflow `.github/workflows/mubawab-commoncrawl-index-probe.yml` : CI read-only dédiée, sauvegarde du rapport et des URL découvertes en artefact GitHub à durée de conservation courte.

**Preuves de vraies URL indexées (aucune invention de listings) :**
- 1ère exécution GitHub : [run #41093572404](https://github.com/hraaaaf/Akarfinder/actions/runs/41093572404), artefact ID `12995690351` : **105 URL / ID uniques** de type `/fr/pa/` ; 2 requêtes succès, 2 requêtes `/fr/a/` HTTP 504.
- Exécution shardée : [run #41094069488](https://github.com/hraaaaf/Akarfinder/actions/runs/41094069488), artefact ID `12995576102` : **574 URL / ID uniques**, 5 requêtes succès / 3 erreurs HTTP 502/504. Pour cette exécution, 53 entrées étaient indexées dans CC-MAIN-2026-43 et 521 dans CC-MAIN-2026-39.
- **Fusion indépendante dans `bulk_url_inventory.py`** des deux ZIP réellement téléchargés depuis GitHub : **616 IDs uniques**, **616 URL uniques**, **679 lignes de provenance index→URL** dans SQLite ; 2 fichiers sources, SHA contrôlés ; 0 erreur de parsing/import. Captures source datées entre le 05/09/2026 et le 18/10/2026 (les URL indexées ne sont PAS garanties encore actives).
- **Union postérieure** avec les **322 IDs** observés sur les premières pages de vente de 10 villes (fichier indépendant privé) : **934 IDs distincts** = 616 + 322 − 4 intersections. Dans l'export de l'union, les 616 ont leur URL directe de Common Crawl ; les 318 autres sont des IDs de pages-ville avec liens probants Notion, pas des URL directes jointes au ZIP.
- **Comparaison seulement après l'union**, vs 129 IDs historiques privés : **13 IDs communs**, **921 absents de ce petit échantillon historique**, **116 anciens non retrouvés dans l'union**. Aucun n'est qualifié de « publication récente » ou « suppression ».
- Les scripts locaux de comparaison ont produit `comparison.json` et les ensembles distincts sans doublons ni ID invalide.
- **Aucune capture HTML détaillée, aucun fichier photo téléchargé, aucune écriture Supabase, merge ou déploiement Vercel**. Cette technique ne démontre pas la couverture nationale ni le droit de copier les médias.

**Livrable privé final sauvegardé :**
- `/AkarFinder/Mubawab/CommonCrawl-Probe-2026-10-30/AkarFinder_Mubawab_Real_URL_Union_934_20261030.zip` en Library, SHA-256 `a90b91c51b76e44c2280a4adbae6819dfe32122e3bb6e032899e1ebdce7cd2ad`, CRC ZIP OK.
- Inclus : les deux ZIP originaux de Common Crawl, `url_index.sqlite`, 616 URL et provenance, `independent_discovery_union_934.jsonl`, comparaison historique et README de limitations.
- Exports bruts dans GitHub Actions, données privées **non commitées** au dépôt.

**Validation CI à l'instant du code HEAD `3dca7a07483ebb18abfccc95c53504252e6cf380` : 4/4 SUCCESS** (suite Fresh Offline, probe Common Crawl, Efficiency Policy et Canonical Baseline), tests unitaires de la sonde 5/5 et bulk 5/5 PASS. Un commit ultérieur de documentation doit être ré-audité sur son propre HEAD.

**Next exact :** certifier les checks après la documentation de closeout ; poursuivre l'extension des préfixes via des index publics de manière responsable ou importer d'autres inventaires accessibles. En cas de 502/504 répétés, basculer vers l'index Parquet Common Crawl prévu pour les recherches massives. Les fiches et images réelles nécessitent toujours un accès et des droits vérifiés ; la PR reste DRAFT en attente de revue humaine.


## 2026-10-30 — one bounded Common Crawl Parquet probe (experimental, not certified yet)

**Goal:** avoid repeat broad CDX API 502/504 failures by using the official Common Crawl Parquet URL index, with footer-only search for Mubawab's SURT key range. **No direct Mubawab request, images, detail HTML or production write.**

**Code:** `scripts/acquisition/mubawab-fresh/parquet_index_probe.py`, test `test_parquet_index_probe.py` and read-only workflow `.github/workflows/mubawab-commoncrawl-parquet-probe.yml`; README_PARQUET.md explains design and source docs.

**Limits for this first run:** one crawl `CC-MAIN-2026-43`; up to 16 file footers; up to 2 confirmed Parquet shards; max 10 000 URL index rows per shard; GitHub Action timeout 10 min; memory 768MB. Source manifest `crawl-data/CC-MAIN-2026-43/cc-index-table.paths.gz`; DuckDB metadata statistics `url_surtkey` for binary-search selection. Missing metadata, too many shards or HTTP errors fail closed, report in artifact. **This is a bounded experiment**, and SURT footer-based search has not yet been verified on actual Common Crawl data.

**Tests:** 7/7 local offline tests PASS, Python compilation PASS. These tests cover URL filtering, prefix/shard bounds, strict metadata/shard budgets and failed-setup report; **they do not validate an actual Parquet fetch**. Workflow will publish `report.json`, `parquet_urls.jsonl`, `parquet_provenance.jsonl` as private GitHub Actions artifact.

**Starting comparison baseline (from previous independent observations):** 934 candidate IDs = 616 indexed Common Crawl CDX + 322 city-page IDs - 4 IDs shared. Compare **only after a nonempty real Parquet export**, not as a seed.

**Next exact:** verify the one PR-triggered probe run against exact commit; if empty/error, inspect artifact and fix deterministically before any further heavy benchmark; if nonempty, import private artifact offline using bulk_url_inventory.py, join 934 candidate IDs and only then compare to historical 129 IDs. Keep PR DRAFT; no Vercel, DB, merge without gates.


## 2026-10-30 — diagnostic du premier run Parquet et correction du format

- **Premier run réel** [#41096204934](https://github.com/hraaaaf/Akarfinder/actions/runs/41096204934) : **FAIL, 0 URL extraite**. Tests 7/7 + installation DuckDB réussis ; `report.json` (artefact GitHub `12996601829`) prouve `ValueError: unexpected WARC Parquet shard count` avant toute lecture d'un shard. Fichier sauvegardé en Library privée `/AkarFinder/Mubawab/Parquet-Probe-2026-10-30/mubawab-parquet-first-run.zip`.
- **Root cause vérifiée dans code + documentation Common Crawl** : les fichiers du manifeste sont dans des partitions Hive `crawl=CC-MAIN-2026-43/subset=warc/`, et non `/CC-MAIN-2026-43/`.
- **Fix** : extraction `parse_manifest(text,crawl)`, filtre explicite `/crawl={crawl}/`, test unitaire avec chemins Hive exacts + rejet du crawl étranger et du subset robotstxt.
- **Nouvelle preuve locale** : **8/8 tests PASS** + `compileall` PASS ; ce résultat ne démontre pas encore la lecture distante des footers.
- **Next exact** : un seul nouveau run GitHub sur le HEAD correction, lire `report.json` et les éventuels `parquet_urls.jsonl`. Si autre échec, changer de stratégie après diagnostic (ne pas faire tourner une batterie de runs sans progresser) ; si URL réelles, union 934 + comparaison historique 129.


## 2026-10-30 — Parquet rouge : deuxième échec diagnostiqué, stratégie changée

**Incident exact :** [GitHub Actions #41096782493](https://github.com/hraaaaf/Akarfinder/actions/runs/41096782493), HEAD `5638f5de7dda98206cd883ed872d6ddb1dba07a2` — **FAIL**. L'artefact `12997031958` (<Library privée: `/AkarFinder/Mubawab/Parquet-Probe-2026-10-30/parquet-second-failure.zip`>) contient `report.json` : `manifest_shards=300`, huit footers inspectés, `selected_shard_indices=[]`, `distinct_ids=0`, `failures=[]`, `result="ok"`. **Ce zéro est un faux négatif**.

**Cause racine démontrée par les min/max réellement observés :** les shards `part-00000..00299` ne sont **pas classés globalement par `url_surtkey`**. Le code utilisait une recherche dichotomique sur un ordre inexistant (ex.: index 150 préfixe `com,musica...`, 225 `my,gov...`, 188 `ch,foto...`). Il n'est pas possible d'inférer une absence d'annonce à partir de huit métadonnées d'un total de 300.

**Correction de sécurité/fonction :**
- `pick_shards` abandonne la recherche dichotomique et exige l'inspection des footers de **tous les shards** d'un petit manifeste. Si `len(paths) > max_metadata`, arrêt explicite `metadata budget exceeded: UNSORTED ...`, *avant* tout fetch des fichiers Parquet. Un scan partiel ne peut plus afficher zéro comme résultat fiable.
- 2 tests nouveaux prouvent le fail-closed sur 300 shards sans aucune requête vers les footers, et la sélection exhaustive d'une petite liste de shards désordonnée. **10/10 tests locaux PASS**, Python compile PASS.
- CI `mubawab-commoncrawl-parquet-probe.yml` convertie en **Parquet Safety Gate** purement hors réseau (tests + garde 300 shards) : **plus aucun benchmark distant invalide**. Une vraie stratégie Parquet exige une carte indexée du domaine vers les partitions, ou une revue de budget pour lire tous les footers. Un CI Safety Gate vert ne signifie pas « URL Parquet récupérées ».

**Nouvelle voie d'acquisition qui a déjà produit des données réelles :** workflow `mubawab-commoncrawl-index-probe.yml` poursuit le **CDX index** par cinq autres préfixes `81,80,79,78,77`, sur les deux crawls septembre/octobre, 500 lignes/réponse max, >=1 s entre requêtes et 12 requêtes bornées. Le corpus historique de 934 IDs n'entre pas dans la découverte. L'artefact du nouveau run devra être récupéré, intégré, dédoublonné et comparé après coup. Aucune sollicitation du serveur Mubawab.

**État :** PR #1140 toujours DRAFT, aucun merge, DB prod ou Vercel ; 934 ID candidats de départ conservés ; aucune nouvelle photo ou page détaillée. **Next exact :** contrôler le run CDX de la branche à ce commit ; si URL nouvelles, télécharger artefact, importer, calculer union 934 + nouvelles URL, rapprocher avec 129 IDs historiques. Si HTTP 502/504, réduire les préfixes plutôt que revenir au Parquet aveugle. Certifier la CI de l'HEAD exact avant closeout.
