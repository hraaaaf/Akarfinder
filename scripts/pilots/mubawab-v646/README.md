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
