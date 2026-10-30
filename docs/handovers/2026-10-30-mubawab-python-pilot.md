# Handover — Mubawab Python pilot (2026-10-30)

## Goal and status

Goal: establish a small, restartable Python parser for public Mubawab listings, test it against one real Casablanca page, and hand off a bounded next step. The pilot is complete; nationwide coverage and production ingestion are not.

This is an exploratory companion to the existing acquisition code. The repository already contains `scripts/acquisition/mubawab-exhaustive-enumerator.mjs`, `scripts/acquisition/mubawab-marocannonces-public-adapter.mjs`, and `scripts/acquisition/mubawab-reconciliation-audit.mjs`. Review and reuse those paths before expanding this Python utility or starting a parallel crawler.

## Verified evidence

- Site page: `https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre`
- Captured 2026-10-30 10:30:20 UTC. One authorized page returned 31 distinct `/fr/a/` or `/fr/pa/` listing links; 31/31 had parsed price, area, city, district; 30/31 had a room count.
- Listing cards contained 432 photo URLs across 30 listings (median 11). URL presence does not verify image availability, original resolution, uniqueness, listing activity, or reuse rights.
- HTML SHA-256: `bae727bf6283f562926fe5b2697ff655cd5ee753233c04b3bb1a3f44ba98e6dd`.
- `robots.txt` returned HTTP 200 and the `*` group contains `Disallow: /*:`. The script's robots matcher denied the legacy `:p:2` URL before a request. No second page was fetched; pagination is unresolved.
- 12 local tests passed for parsing, restart state, repeated/empty pages, robots matching, HTTP 403 stop, sitemap XML, and export. The live HTML fixture is intentionally not committed.
- The source data export and raw HTML are not committed here. The CSV/JSONL and full evidence bundle are in the user's Library and the linked Notion handover.

## Files in this branch

- `scripts/acquisition/mubawab-python/mubawab_full.py` — one-file CLI and SQLite state.
- `scripts/acquisition/mubawab-python/test_mubawab.py` — offline unit checks.
- `scripts/acquisition/mubawab-python/requirements.txt` — pinned Python dependencies.
- This handover.

The image-download phase is explicitly disabled. Details/gallery parsing is not certified on real listing pages. No database write, merge, or deployment was performed.

## How to run checks

```sh
python -m pip install -r scripts/acquisition/mubawab-python/requirements.txt
cd scripts/acquisition/mubawab-python
python -m unittest -v test_mubawab.py
```

## Order of mission for the next agent

1. Read this handover and compare the Python path with the existing exhaustive enumerator and public adapter. Do not replace or duplicate their canonical flow without a short design note describing scope and provenance.
2. Re-read the current Mubawab `robots.txt`. The known colon pagination is disallowed. Do not request `:p:2`, encode it to bypass the rule, or infer support from the page-one success.
3. From an allowed base page, inspect only linked public shards/URLs permitted by robots, using the existing enumerator's request budget, provenance, stop handling, and output format. Start with a small dry-run and no database writes.
4. If that path adds value, compare parser output against the existing canonical listing schema and deduplicate by source ID/canonical URL. Preserve source URL, capture time, page provenance, and unknowns. Do not fetch images or telephone numbers.
5. Report counts by page, parse-field coverage, robots exclusions, errors, duplicates, and exact artifacts. Expand only after a successful bounded comparison.

Success for the next lot: a reproducible, robots-compliant small sample with independent counts and a documented decision to reuse, integrate, or retire the Python parser. Do not claim exhaustive Mubawab coverage.


## Reprise du 2026-10-30 — audit comparatif et décision provisoire

**État :** PR #1134 encore DRAFT ; ni merge, ni déploiement, ni écriture DB. Les résultats 31 annonces / 432 liens images restent ceux du pilote d'origine, et ne prouvent aucune couverture nationale.

### Matrice technique

| Critère | Énumérateur JS L8 (déjà dans main) | Pilote Python dans cette PR |
| --- | --- | --- |
| Découverte | `cc → ct → cd → sd` par liens de shards, budget 40 requêtes et profondeur 4 par défaut | Graines villes/transactions, sitemap ou liens de page |
| Réconciliation de couverture | Compteur affiché, statuts `complete-leaf`, `split-required`, `coverage-gap` | Compte cartes et champs, pas de rapprochement avec le compteur total |
| Champs | URL / ID, pas de parsing des prix/surfaces | Prix DH, surface, ville, quartier, pièces, chambres, salles de bains, URLs d'images |
| Reprise | Pas de checkpoint durable | SQLite, ID source comme clé |
| Limites sécurité observées | `robots.txt` non rechargé à chaque exécution, pas de temporisation explicite, HTTP 403 ne stoppe pas toujours ; redirections suivies | Chargement fail-closed de `robots.txt`, minimum 2 s, stop 403/429 ; pagination legacy incompatible avec robots |
| DB | Zéro écriture | Zéro écriture |

**Choix :** conserver L8 JavaScript comme moteur **candidat** de découverte de shards et de réconciliation ; évaluer le parseur de cartes Python comme **composant complémentaire hors production**, sans construire un deuxième crawler national autonome. Le L8 nécessite un durcissement de sécurité **avant tout lancement live** ; le qualificatif `exhaustive` est un nom historique, pas un résultat certifié.

### Correctifs effectués sur la branche de cette PR

- Collecte Python bornée par défaut à **une seule page par seed** ; `--max-pages=0` ou `>1` refusés par la CLI.
- Un checkpoint à `next_page=2` n'émet plus `:p:2`, même avec une implémentation HTTP injectée. L'état signale `pagination_disallowed_by_policy`, sans inventer une fin de catalogue.
- Phase détails bornée par défaut à 10 URL ; CLI refuse les limites 0 ou supérieures à 20.
- Régressions offline ajoutées pour continuation interdite, reprise, CLI non bornée et contrôle anti-boucle.
- Workflow de tests offline ajouté : `.github/workflows/mubawab-python-pilot-offline.yml`. **Ne jamais confondre workflow créé et tests passés : regarder la conclusion GitHub Actions.**

### Contrat d'intégration futur (aucune DB touchée)

- `source = mubawab` et `id` deviennent `source_id` / `external_offer_id` ; `url` devient `source_url`.
- `price_dh` → `offer.price_amount` en MAD seulement si prix explicite ; `area_m2` → `surfaces.surface_total_m2`.
- `city` → `location.city`. `district` **candidat** pour `location.neighborhood`, à normaliser avec le dictionnaire territorial : ne pas traiter le texte brut comme un quartier validé.
- `bedrooms` → `layout.bedrooms_count`. `rooms`, photos et extraits restent des attributs exploratoires tant qu'un mapping canonique et des droits d'usage ne sont pas vérifiés.
- Clé anti-doublons initiale : `(source_id, external_offer_id)` et URL canonique, puis moteur existant `cross_source_dedupe.py` pour comparaison entre sources. Conserver URL, date de capture, URL du shard et méthode d'extraction comme provenance ; ne jamais inventer un statut actif.

### Gates restant ouverts

1. **CI Python** : exécution réelle des tests sur le HEAD de la PR, conclusion verte et nombre de tests.
2. **L8 JavaScript** : vérification `robots.txt` fraîche au runtime, respect du crawl-delay et d'un budget très faible, arrêt immédiat sur 403/429, redirections et encodages invalides traités en refus sûr ; tests offline.
3. **Pilote live** : seulement lorsque ces garde-fous et le contact public du bot sont en place ; 1 à 3 URL de shards explicitement permises, zéro DB write et aucun téléchargement d'image ; produire un journal (URL, statut HTTP, compteur, IDs uniques, doublons, exclusions, champs et erreurs). Dans cet environnement de reprise, aucune nouvelle requête live du script n'a été exécutée. La lecture web du `robots.txt` est un snapshot indexé et ne prouve pas son contenu exact à l'instant du crawl.
4. **Qualité / droits** : vérifier les conditions applicables à la réutilisation des données et photos ; ne pas utiliser les 432 URLs comme licence d'images.
5. **Human gate** : revue du rapport comparatif, puis seulement envisager une intégration ; pas de merge ni déploiement implicite.

**Next exact :** examiner la CI offline du HEAD actuel, corriger tout échec, puis durcir le runner L8 avec tests avant d'exécuter le moindre nouveau test HTTP réel.


### L8 JavaScript — durcissement proposé après la comparaison (30/10)

Sur la même branche **draft**, sans lancer de réseau ni modifier la DB :

- `mubawab-exhaustive-enumerator.mjs` : contrôle fail-closed du `robots.txt` **récupéré à chaque run** pour l'agent par défaut. La politique actuelle est reconnue par une liste conservative de règles ; une règle `Disallow` inconnue, un robots inaccessible ou un agent non reconnu bloquent toute requête de shard. C'est volontairement **une politique restrictive**, pas un parseur robots universel.
- `isRobotsSafeUrl` : refuse les chemins à deux-points, y compris encodés, et normalise les slashs répétés pour les chemins sensibles.
- Fetch : `redirect: manual` ; stop immédiat sur `403` ou `429` ; `requestCount` = vraies tentatives de shards, `robotsRequestCount` = requête préalable, `coverageCertified: false`.
- Cadence de production : temporisation minimale entre les requêtes via le `fetch` par défaut (2,5 secondes configurées, au moins 2 secondes) ; un `crawl-delay` générique plus long est pris en compte.
- Tests JS existants complétés : politique robots connue/inconnue, 403/429, URLs encodées, compteurs et arrêt avant premier shard si robots invalide.
- CI `.github/workflows/mubawab-python-pilot-offline.yml` : tests Python + JS, compilation Python ; conformité `CI Workflow Efficiency Policy` avec `concurrency` par PR et annulation des runs obsolètes. Un échec de gouvernance lié à la concurrence manquante a été diagnostiqué sur un ancien commit et corrigé ; **attendre une preuve CI sur le nouveau HEAD avant toute certification**.

**Restrictions maintenues :** pas de claim exhaustive, pas de photos téléchargées, pas d'ingestion DB, aucun test HTTP direct effectué pendant cette reprise, pas de merge et pas de déploiement. L'absence d'un pilot live laisse le gate « rendement réel des shards » OUVERT. Les règles d'usage et réutilisation des photos sont à vérifier avant publication des données.

**Next exact :** contrôler le run offline + politique d'efficacité du dernier HEAD ; en cas d'échec, corriger et retester. Si vert, préparer un pilote de 1 à 3 pages de shards autorisés avec provenance et budget explicite, sans DB ni photos, puis comparer les IDs et champs Python/JS avant la décision d'intégration.

## GATE CONTRACTUEL CRITIQUE — 2026-10-30

**Nouvelle décision prioritaire : ne plus exécuter de crawl HTTP réel Mubawab, même borné et conforme à robots.txt, pour l'acquisition commerciale AkarFinder sans autorisation écrite / licence ou validation juridique documentée.** Le plan précédent de « 1–3 shards live après CI » est **suspendu et remplacé** par ce gate. Le code et les tests offline restent utilisables pour préparer une intégration future légalement autorisée.

Sources primaires consultées :
- [Mubawab — Conditions d'utilisation, section 5.1](https://www.mubawab.ma/fr/privacy) : engagement d'usage personnel/non lucratif et restriction de l'extraction et réutilisation commerciale sans autorisation.
- [Mubawab — Conditions d'utilisation, sections 7.1, 7.3, 7.4](https://www.mubawab.ma/fr/privacy) : contenus et photos, interdiction exprimée d'extraction substantielle et constitution/maintenance de base concurrente, absence de licence de réutilisation.
- [Version anglaise](https://www.mubawab.ma/en/privacy) pour recoupement ; l'interprétation définitive dépend du droit applicable et d'un conseil juridique qualifié.

**Robots.txt n'est qu'une indication technique d'exploration, pas une licence d'exploitation commerciale.** La publication de liens, photos ou extraits dans AkarFinder doit être évaluée séparément. Aucun droit n'a été établi par ce chantier. La lecture de ces CGU n'est pas un avis juridique.

**Next exact révisé :** résoudre toute CI offline sur le HEAD actuel, puis obtenir une autorisation/licence/API officielle définissant les usages permis (liens, prix, détails, images, fréquence, stockage, retrait) ou un avis juridique écrit et traçable. **Si autorisé** : contrôler le robots.txt actuel et réaliser ensuite seulement un dry-run strictement borné, lecture seule, avec journal et zéro image copiée. **Sinon** : mettre Mubawab hors périmètre d'acquisition directe et privilégier des flux partenaires explicitement licenciés. Aucun merge ni Vercel sans autorisation.

### Défense opérationnelle supplémentaire — accès réel fermé par défaut

- Commande Python `main` : `list`/`details` refusent tout démarrage HTTP sauf si `MUBAWAB_AUTHORIZED_ACCESS=yes` **et** `MUBAWAB_CONTACT` non vide ; `export` local reste disponible sans accès réseau. Le refus intervient avant même l'ouverture de SQLite.
- Commande Node L8 `runCli` : même verrou `MUBAWAB_AUTHORIZED_ACCESS=yes` avant toute requête réseau. C'est une attestation opérationnelle à n'activer qu'après obtention et archivage d'une autorisation juridique valable, **pas une licence en soi**.
- Régressions hors ligne ajoutées pour les deux chemins ; le run GitHub sur HEAD exact reste la preuve d'exécution nécessaire.
- **Aucun run live Mubawab n'est autorisé dans la présente mission.** Toute ancienne instruction « tester des URL autorisées par robots » est désormais subordonnée au gate juridique ci-dessus.


## Closeout de vérification offline — 2026-10-30 (lot de reprise)

**Preuves CI réellement obtenues sur HEAD `b4ad6068f34b4cc4a849c8cc2270d1260c563422`:**

- [Mubawab Python Pilot Offline, run 41044270434](https://github.com/hraaaaf/Akarfinder/actions/runs/41044270434) : **SUCCESS**. Logs : **11 tests JavaScript PASS**, **14 tests Python exécutés (13 PASS, 1 SKIPPED)** ; le test HTML réel historique est ignoré car la fixture est volontairement absente du dépôt public.
- [CI Workflow Efficiency Policy, run 41044270437](https://github.com/hraaaaf/Akarfinder/actions/runs/41044270437) : **SUCCESS**, 1 workflow modifié vérifié, 0 échec.
- [Canonical Baseline Compile Validation, run 41044270623](https://github.com/hraaaaf/Akarfinder/actions/runs/41044270623) : **SUCCESS**, contrôle TypeScript terminé.

**Durcissement additionnel après ces succès :** le point d'entrée JavaScript exporté `enumerateMubawab()` (et pas seulement son CLI) refuse maintenant l'accès réseau réel par défaut si `MUBAWAB_AUTHORIZED_ACCESS` n'est pas `yes` ; test hors ligne dédié. **Ce durcissement postérieur doit encore passer les CI sur son nouveau HEAD exact**, ne pas réutiliser abusivement les preuves du HEAD précédent.

**Suivi juridique créé :** [GitHub issue #1135 — autorisation de réutilisation commerciale des données et images Mubawab](https://github.com/hraaaaf/Akarfinder/issues/1135). Les CGU officielles réservent explicitement certaines réutilisations (articles 5.1, 7.1, 7.3–7.5). Le rôle de `robots.txt` est distinct d'une licence de réutilisation. Aucun pilot HTTP réel supplémentaire ne peut être déclaré autorisé.

**Décision actuelle :** garder la PR #1134 DRAFT, code hors production, pas de merge, pas de déploiement Vercel, pas de DB write ni collecte live. Préparer en parallèle un chemin légal (flux partenaires, accord Mubawab) si l'autorisation tarde.

**Next exact :** vérifier le résultat CI du nouveau HEAD ; corriger tout échec ; consigner son SHA et la preuve finale sans relancer de crawl. Blocage humain ensuite = obtenir l'autorisation commerciale documentée ou décider d'abandonner l'acquisition Mubawab.


## Audit des derniers points d'entrée — retrait du legacy Mubawab (2026-10-30)

Audit complémentaire : le fichier `scripts/acquisition/mubawab-marocannonces-public-adapter.mjs` restait un second chemin d'acquisition Mubawab non soumis au contrôle `robots.txt` frais de L8. Le flux réseau réel Mubawab de ce module mixte a donc été **désactivé** : résultat `stoppedEarly=legacy_live_disabled_use_authorized_L8`, `urls=[]`, `requests=[]`. Les tests synthétiques avec `fetchImpl` injecté restent disponibles pour les contrats de parsing. **MarocAnnonces est indépendant** et n'est pas affecté par ce retrait. Une réutilisation future de Mubawab devra passer par L8 après obtention des autorisations requises.

Nouveau test offline : vérifie qu'un appel réel par défaut du module mixte ne fait **aucune requête Mubawab**, même si `MUBAWAB_AUTHORIZED_ACCESS=yes`. Le workflow PR inclut désormais aussi le test de l'adaptateur mixte. Aucun test live.

### Statut de validation

- **HEAD `bd7d76a50d8d04c1758821c31d9b103c2fe33ec1`** : trois CI SUCCESS, dont [offline 41047438880](https://github.com/hraaaaf/Akarfinder/actions/runs/41047438880) (**12 JS PASS**, **14 Python exécutés : 13 PASS, 1 SKIPPED**), [efficiency 41047438879](https://github.com/hraaaaf/Akarfinder/actions/runs/41047438879) et [baseline 41047439022](https://github.com/hraaaaf/Akarfinder/actions/runs/41047439022).
- **La dernière modification de l'adaptateur legacy + tests est postérieure à ce HEAD**. Revalider **les trois checks sur le nouveau HEAD exact** et rapporter séparément leurs conclusions. Ne pas confondre les résultats précédents avec la nouvelle version.

**Gate non technique toujours bloquant :** [issue #1135](https://github.com/hraaaaf/Akarfinder/issues/1135), autorisation commerciale écrite / licence / validation juridique documentée. Le ticket contient l'adresse de contact officielle et un projet de message **non envoyé**. Sans autorisation, aucun crawl, image, import, ni mise en production de ces collecteurs.

**Next exact :** lire les 3 runs du dernier HEAD ; s'ils sont verts, faire le handover final dans PR et Notion, puis stopper à ce gate humain réel. Sinon : corriger le défaut prouvé, relancer tests, conserver PR DRAFT.


## Reprise 2026-10-30 — import effectif du pilote historique depuis la Library

**Goal du lot :** retrouver les données déjà détenues, les importer dans une archive locale reprenable et vérifier les chiffres de façon indépendante, sans nouvel accès réseau ni écriture dans Supabase.

**Sources authentiquement récupérées** depuis la Library utilisateur :
- `Mubawab_pilote_verifie.zip` contenant notamment `evidence/mubawab_casablanca.jsonl` et `evidence/mubawab_report.json` ;
- `mubawab_casablanca.csv` (CSV séparateur point-virgule, UTF-8 BOM).
Le pilote historique rapporte **31 cartes / 31 annonces, 432 URL photos réparties sur 30 annonces**, 0 photo téléchargée. La pagination `:p:2` figurait parmi les URL refusées dans le rapport historique ; aucun nouveau passage sur cette page n'a eu lieu.

**Implémentation réelle :**
- `scripts/acquisition/mubawab-python/archive_import.py` : import hors ligne HTML listes/détails, **JSONL déjà exportés**, SQLite, idempotence par chemin et SHA-256, validation d'identifiants/domaines, déduplication par ID, manifests JSONL/CSV et fichier de preuve avec SHA des exports ;
- `scripts/acquisition/mubawab-python/test_archive_import.py` : 9 tests synthétiques incluant garde réseau, import JSONL idempotent, identité de domaine, erreurs atomiques, provenance, budgets ;
- `scripts/acquisition/mubawab-python/README_ARCHIVE.md` : usage et commandes.
- workflow `mubawab-python-pilot-offline.yml` étendu pour lancer `test_mubawab.py test_archive_import.py` sans crawler.

**Preuves locales réellement obtenues** (contenu historique, pas nouvelle collecte) :
- **31 lignes JSONL**, **31 ID distincts**, **31 lignes CSV** ; les ensembles d'ID sont identiques ;
- **432 URL photos** dans le JSONL et **432** selon le CSV/rapport historique ; chaque annonce conserve exactement le même nombre de références photo après import ;
- SQLite reconstruit : **31 annonces**, **432 références photo**, **0 détail HTML**, **0 image locale**, **0 erreur d'import** ;
- seconde exécution : **1 fichier JSONL déjà traité**, **0 nouvelle annonce**, **0 erreur** ;
- tests Python locaux : **9/9 PASS**, compilation Python réussie.
- archive livrable pilote : `mubawab_pilot_casablanca_offline.zip`, SHA-256 `1ef825faf5d675764cee25d7ae8086686115397ef5967292347304be7916acb7` ;
- archive code v2 : `mubawab_offline_archive_20261030_v2.zip`, SHA-256 `bfa232d8aa26bd747c0c78bff452ecb4dca66d9b53bde26e143bc4753042db45`.
- les 2 ZIP ont été sauvegardés dans la Library `/AkarFinder/Mubawab/`. Ne pas présumer d'un fichier ZIP commité dans GitHub.

**Limites vérifiées :** aucune capture brute HTML ni fichier de photos réels dans ce pilote fourni ; il contient seulement les **URL photos**. L'archive ne prouve pas que 31 biens sont encore en ligne ni que toute l'offre Mubawab est couverte. Aucun nouveau crawl, aucune image téléchargée, aucun déploiement, aucun merge, aucun write DB de prod.

**Gate de clôture technique :** vérifier le résultat de la CI sur HEAD correspondant aux nouveaux fichiers ci-dessus. Si vert, le lot « import du pilote historique » est clos. **Gate externe séparé** pour une copie intégrale Mubawab : accès/autorisation et protections du site restent non résolus ; issue [#1135](https://github.com/hraaaaf/Akarfinder/issues/1135).

**Next exact :** relever les trois checks sur le dernier HEAD ; consigner leur statut exact dans la PR et Notion. L'étape suivante techniquement permise est d'importer d'autres exports déjà en possession de l'utilisateur et de réconcilier les nouvelles références sans dupliquer l'inventaire.
