# Akarfinder scraper V6.4.6 — V6.4.5 safety audit fixes

- Refuses rental/category/agency and encoded-path mixing; only `https://www.mubawab.ma/fr/{st,sd,cd}/.../appartements-a-vendre` accepted for the bounded pilot.
- Fetches and hashes current robots.txt **before** any listing fetch/SQLite mutation; fail-closed if inaccessible or disallowing the requested path.
- SQLite migration adds `source_search_url` and `transaction_type`; legacy rows remain `NULL` until legitimately reobserved.
- Price-per-m² medians compare the same transaction type; explicit rentals rejected by sale pipeline.
- V6.4.5 immutable proof: [real run #41327076337](https://github.com/hraaaaf/Akarfinder/actions/runs/41327076337); [diagnostics](https://github.com/hraaaaf/Akarfinder/actions/runs/41327076337/artifacts/13091343743) + [SQLite](https://github.com/hraaaaf/Akarfinder/actions/runs/41327076337/artifacts/13091518100).
- **V6.4.6 P1 live (04/11/2026):** 3/3 first-page canaries passed on historical code `7766b2c`: 32+32+33 distinct source IDs across pages (97 total), with HTTP 200 and 100% price/surface/locality recognition on eligible cards. This is NOT proof of active/unique physical listings, commercial reuse permission or scalable yield. [Canonical report](../../../docs/reviews/MUBAWAB_V646_DIRECT_CANARY_RUN_2026-11-04.md).
- **Later network patch (Draft PR #1154):** Playwright now admits only the exact authorized top-level document plus same-origin script/CSS requests; it aborts `image`, `fetch`, `xhr`, media, fonts, third-party and ambiguous routes, disables service workers, closes WebSockets, and instruments route counts in future canary JSON. The **new policy has NOT been live-tested on Mubawab**; historical page visits must not be silently repeated.
- **Synthetic Chromium proof:** [classification JSON](artifacts/v646-network-guard-synthetic-20261104.json) shows 8 synthetic HTTP requests intercepted and aborted, 1 WebSocket closed, zero site requests. Test uses a policy mirror and DOES NOT certify actual response MIME or behavior on a live page; Chromium regression source is [here](tests/test_browser_network_guard_chromium.py), and it is skipped in lightweight CI without Playwright.

Run `python -m unittest discover -s tests -v` after installing `requirements.txt`. This GitHub standalone lane runs guard/robot regression tests; **full package with 116 local passing tests and previous run artefacts** is shared in this conversation as `Akarfinder_V646_with_verified_proofs.zip`.

**Legal boundary:** Respect robots.txt and site terms, which currently restrict mass extraction and competitor database creation. Robots permission alone is not reuse permission. No Supabase/Neon writes, Vercel, scheduling or merge.

**Redirect safety:** HTTP requests have `allow_redirects=False`; Chromium rejects any `page.url != requested_url`. This prevents a redirected rental/category page from being counted as a sale shard. The offline test covers the HTTP behavior.

### Publication locale vérifiable (contre-audit du 6 novembre)

**Ne jamais traiter les anciens fichiers `akarfinder_data.json`, `akarfinder_report.md`,
`akarfinder_price_*.json` ou `akarfinder_quality_signals.json` comme un lot actuel
sans contrôler le marqueur `akarfinder_publication.json`.** Chaque tentative
change ce marqueur atomiquement : `running` au départ, `failed` à tout échec,
`complete` uniquement après publication des six exports. Le statut `complete`
inclut les SHA-256 des six exports et de `akarfinder.db` ; il ne vaut que si tous
les fichiers sont encore inchangés. Vérifier juste avant de lire :

```bash
python verify_v646_publication.py --root .
```

Sortie `valid: true` et exit `0` requis. Toute absence de marqueur, ancien lot,
publication interrompue, fichier modifié ou échec de collecte donne `valid: false`
et exit `1` ; **ne pas consommer les exports**. En cas d'exit `5` du scraper,
SQLite peut être commitée alors que certains fichiers sont incomplets :
réconcilier/rejouer explicitement, jamais réutiliser les fichiers sans validation.
Ce protocole fournit une cohérence *vérifiable pour les consommateurs qui utilisent
le garde* ; il ne constitue pas une transaction ACID entre SQLite et le système
de fichiers et ne bloque pas un lecteur tiers qui ignore la vérification.

### Round 4 — intégrité WAL, signature, lectures et limites de sécurité

Le manifeste de publication **version 2** contient `db_logical_sha256`, calculé sur un instantané logique SQLite (`backup()`), y compris les commits résidant dans un journal **WAL**. Le SHA du fichier `.db` reste contrôlé, mais **n'est plus la seule preuve**.

Pour empêcher qu'un acteur puisse remplacer à la fois les données et leurs SHA dans le manifeste, la certification exige une **clé HMAC-SHA256 de 32 octets** conservée **hors du répertoire de publication et hors Git/artefacts**. Elle est fournie au producteur **et au lecteur autorisé** par la variable `AKAR_V646_PUBLICATION_HMAC_KEY_HEX` (exactement 64 caractères hexadécimaux). Ne jamais mettre de vraie clé dans un fichier de test, les logs ou une sortie JSON. Les tests disposent uniquement d'une clé de fixture, qui **n'est jamais une clé de déploiement**. Protéger et provisionner ce secret relève de l'exploitant. Sans clé, le producteur peut exécuter un pilote synthétique mais le manifeste est marqué `unsigned_untrusted` et **aucune lecture ne peut obtenir `valid: true`**.

**Ne jamais faire** `verify_v646_publication.py` suivi d'une réouverture des fichiers par chemin : cela introduit un TOCTOU. Lire plutôt les octets vérifiés **dans la même opération** :

```bash
python verify_v646_publication.py --read-export akarfinder_data.json > verified_data.json
```

Ou, dans le même processus Python :

```python
from akarfinder_scraper import read_verified_publication
with read_verified_publication(".") as publication:
    contents = publication.read_export("akarfinder_data.json")
    rows = publication.db.execute("SELECT id, price_mad FROM listings").fetchall()
    # contents et publication.db sont deux snapshots déjà vérifiés.
```

L'objet retourné conserve des **octets immuables** et une copie mémoire cohérente de SQLite, y compris WAL ; des modifications ultérieures des fichiers originaux n'affectent pas ces lectures. Le contrôle sans `--read-export` est un **diagnostic ponctuel**, **pas** une autorisation pour ouvrir un fichier ultérieurement.

Si la toute première écriture du marqueur échoue, le producteur refuse de démarrer et tente de supprimer le marqueur précédent. Si le système de fichiers empêche à la fois son remplacement **et sa suppression**, aucun processus local ne peut garantir l'invalidation : bloquer les consommateurs par une politique externe (permissions, retrait de service). La clé HMAC n'empêche ni la falsification par un acteur possédant aussi la clé, ni le rejeu d'anciens ensembles signés ; utiliser un registre externe de versions monotones si ce modèle de menace est requis. **Aucun GO réseau/live/production n'est conféré par ce protocole.**

### Round 5 — cohérence DB/JSON et rejet du rejeu de générations anciennes

**Vérification sémantique obligatoire** : une signature HMAC correcte et des SHA-256 corrects ne suffisent pas. La publication de statut `complete` compare désormais **toutes les lignes et toutes les colonnes persistées de `listings`** à `akarfinder_data.json`, dans une copie logique SQLite incluant le WAL. Les deux champs dérivés du JSON (revues) ne remplacent pas les valeurs source SQL. Une divergence d'ID, de nombre de lignes ou de prix entraîne `database_export_mismatch` **avant la signature**, puis est contrôlée à nouveau lors de `read_verified_publication()`. Un échec après le commit SQL retourne 5 et laisse une publication non certifiée. Cette garantie initiale concerne le tableau SQL `listings` et son export JSON ; voir ci-dessous la **vérification supplémentaire du Markdown** introduite après le contre-audit Round 5.

**Contre-rejeu conditionnel :** le HMAC seul n'empêche pas le rejeu d'un ancien lot signé. Une génération numérique signée est maintenant enregistrée dans un **état de confiance séparé du répertoire d'exports**. Configurer avant toute publication certifiée les DEUX variables :

- `AKAR_V646_PUBLICATION_HMAC_KEY_HEX` : 32 octets de secret externe (64 caractères hexadécimaux), identique pour le producteur et son lecteur autorisé. Ne pas publier dans Git, ZIP, logs ni manifestes.
- `AKAR_V646_TRUSTED_HEAD_PATH` : chemin **absolu** du registre de génération, dont le répertoire parent existe, **en dehors** du dossier contenant `akarfinder_data.json`, `akarfinder.db` et `akarfinder_publication.json`. Protéger l'accès et surtout empêcher sa restauration à une ancienne version (stockage monotone, versionnement immuable ou témoin externe).

À chaque tentative, le producteur fait d'abord avancer ce registre à `running`, puis à `failed` ou `complete`. Le lecteur exige **le même `run_id`, la même génération et l'état `complete`** dans le registre externe et dans le manifeste signé. Restaurer uniquement l'ancien dossier d'exports après une tentative ultérieure est détecté. Si la configuration du registre manque lorsque la clé HMAC est présente, le programme refuse de lancer le lot (code 3) **avant toute navigation**. Sans clé, un pilote synthétique peut être exécuté, mais ses rapports restent `unsigned_untrusted` et non certifiables.

**Limite de sécurité majeure :** un *fichier local* signé, même extérieur au dossier d'exports, reste rejouable si l'attaquant peut **aussi** restaurer ce fichier et toutes les données précédentes. Le code ne crée **pas** un stockage intrinsèquement anti-rollback. Pour une certification réelle, l'opérateur doit fournir un registre externe résistant au rollback, une gestion de clé appropriée et la synchronisation sécurisée des écritures. Tant que cela n'est pas prouvé, **NO-GO LIVE et NO-GO production**. Ne pas utiliser la simple présence du fichier comme preuve d'une protection anti-rejeu complète.

L'instantané SQL remis au lecteur passe par une **interface en lecture seule** : les commandes UPDATE/INSERT/DELETE et PRAGMA de modification sont refusées dans l'API publique. Ce n'est pas une isolation contre du code Python arbitraire dans le même processus. Pour consommer un export, utiliser `read_verified_publication()` ou la sortie `--read-export`, jamais vérifier puis rouvrir un chemin.

### Après le verdict Round 5 (7,2/10) — producteurs concurrents et rapport Markdown

**Exclusivité du producteur, mono-hôte/système de fichiers partagé :** avant de lire le numéro de génération, le programme acquiert des verrous OS `fcntl.flock(LOCK_EX | LOCK_NB)` sur **deux portées** : `akarfinder_publication.json.producer.lock` dans le dossier des exports (même en mode sans clé) et, si une clé HMAC est configurée, `<trusted_head>.producer.lock` dans le répertoire externe de confiance. Tous les verrous sont conservés **jusqu'à la dernière publication** de l'état `complete`/`failed`. En cas de concurrence, le second producteur retourne **code 3** sans toucher le registre ni les exports ; une exécution séquentielle ultérieure incrémente la génération normalement. Les fichiers verrouillés ne doivent jamais être supprimés pendant une opération : leurs répertoires doivent être protégés et les processus doivent coopérer au verrouillage. Cette solution est **locale**, non un lock distribué : multi-hôte, volumes ne respectant pas `flock`, déploiement Windows et processus non coopérants nécessitent un verrou distribué externe ; aucun GO pour ces configurations.

**Cohérence des annonces Markdown ↔ JSON ↔ SQLite :** le rapport est produit avec le même rendu canonique par annonce que celui utilisé à la vérification. Lors de la signature `complete` puis à la lecture authentifiée, chaque annonce affichée (au maximum 50) est rapprochée par lien de l'enregistrement JSON, lui-même comparé à SQL : **titre, prix, surface, secteur, pièces, chambres, salles de bains, statut prix, revue prix/m², dernière vue, lien**. Le compte de lignes affichées et le `Total cumulé` sont vérifiés. Une ligne `Prix : 7 777 777 MAD` lorsqu'export JSON et SQL affichent `1 200 000 MAD` provoque `markdown_database_mismatch` même si l'attaquant recalcule le SHA et connaît une clé de test pour produire un HMAC valide. Avant signature, l'échec donne code 5 et un état non certifié.

**Limites déclarées :** cette vérification prouve les *lignes d'annonces visibles* et le total cumulé, pas l'exactitude externe des annonces, ni les compteurs de traitement historiques (`Nouvelles`, `Modifiées`, `Prix suspects`, navigation), qui restent des indicateurs de pipeline à auditer séparément. Elle ne couvre pas les autres exports JSON spécialisés au niveau sémantique, bien qu'ils soient signés par empreinte. Le registre séparé reste **restaurable** en l'absence d'une infrastructure réellement anti-rollback et d'une gestion de clé opérateur.

**Validation synthétique hors ligne :** 8 nouveaux tests (deux producteurs simultanés en `asyncio`, `flock` entre processus, tentative sans clé pendant un run signé, prix Markdown re-signé contradictoire, signature refusée, titre/surface falsifiés, suppression de ligne) ; suite locale **188 tests : 183 PASS, 5 SKIP, 0 FAIL** avec l'unique test Chromium marqué SKIP faute de binaire. Une CI du HEAD GitHub reste requise pour toute conclusion officielle.
