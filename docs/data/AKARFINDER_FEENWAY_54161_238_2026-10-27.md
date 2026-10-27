# AkarFinder — FeenWay : 54 161 URL / canari 238 origines — 27 octobre 2026

## Goal, réussite et preuves

**Goal** : industrialiser la découverte d'URL FeenWay et qualifier des identifiants source, sans inventer de nouvelles annonces actives ni modifier les bases.

**Résultat technique prouvé** :
- GitHub [run `40478471659`](https://github.com/hraaaaf/Akarfinder/actions/runs/40478471659) **SUCCESS** sur commit `d3ff4343cc9ccd1782994d9d7bbbb09a67622df2`, **5/5 tests**, contrôle `robots.txt`, six sitemaps XML originaux publiquement accessibles, aucun accès page détail sur ce run.
- [Artifact `12721712627`](https://github.com/hraaaaf/Akarfinder/actions/runs/40478471659/artifacts/12721712627) : **54 161 URL uniques**, 0 collision d'URL dans les six sitemaps ; cinq groupes de **10 000** et un de **4 161**. `discovery.jsonl` **54 161 lignes**, `sample.jsonl` **240 lignes**, `summary.json`. SHA256 manifeste `fec482fc39ece6909bb5a46abc57e5372c16a6e7ef9e00810af6bfcf469d0d4b` et sample `274863a241bb54d327506c767b72b15d39700510b40861a9fbf1fc890f910fcc` vérifiés dans le ZIP téléchargé. SHA256 ZIP `33b0466d73406893844247549d60cd08e96215eb4d28f1063f6c8c171194c60b`. Artifact expirera **26 novembre 2026**. **Un lien n'est ni un bien ni une annonce active.**
- Échantillon de 240 : **2 FeenWay IDs déjà vus** dans le canari 100 (`232862` et `235452`), retirés → **238 fiches** nouvelles par identifiant FeenWay. Reçues depuis ces 238 pages publiques : **237 liens vers l'original** et **237 identifiants source** ; une `186991` reste sans source, à vérifier ultérieurement.
- **231 références** absentes par identifiant source du précédent canari 100 **et** de l'archive historique Neon consultée ; **2** connues dans Neon (`191671`, `220237`), **4** programmes Mubawab `/pa/` (`185308`, `185871`, `218486`, `225951`), **1** sans lien original. **0** identité source répétée dans les 237 et **0** exacte collision d'URL ancienne. Décomposition fermée 231+2+4+1=238.
- Sources observées : **Mubawab 97**, **Avito 97**, **Sarouty 18**, **Yakeey 14**, **Agenz 7**, **Masaken 4**, **1 non identifiée**. Échantillon stratifié 40 par sitemap initial, 2 retraits.
- Rapprochement en SQL `SELECT` sur projet Neon `ancient-violet-43534870`, branche archive `br-cold-mouse-b2a50yaa`, DB `AkarFinder`, **151 900 sources** ; clés numériques `source_name + source_offer_key` et `listing_url`. La présence d'une clé est une preuve d'identifiant déjà observé, **pas** de bien réellement doublonné. Les 231 « absentes » le sont **uniquement de cette archive et de ce canari**, pas de tous les historiques possibles.

## Preuves ligne à ligne et QA

- [Sitemap script](https://github.com/hraaaaf/Akarfinder/blob/data/200k-fresh-parser-v2/scripts/acquisition/feenway-sitemap-inventory-v1.mjs) ; [workflow sitemaps](https://github.com/hraaaaf/Akarfinder/blob/data/200k-fresh-parser-v2/.github/workflows/feenway-sitemap-inventory-v1.yml).
- [238 échantillons](feenway-next238-public-sitemap-sample-2026-10-27.jsonl), [80 premières pages](feenway-next238-origin-discovery-part1-2026-10-27.jsonl), [79 suivantes](feenway-next238-origin-discovery-part2-2026-10-27.jsonl), [79 dernières](feenway-next238-origin-discovery-part3-2026-10-27.jsonl), [registre consolidé et gates](feenway-next238-origin-reconciled-neon-2026-10-27.jsonl).
- [Test 238](../../scripts/data/__tests__/feenway-canary238-origin-ledger.test.mjs) ajouté à CI FeenWay existante ; le résultat de ce **nouveau run doit être vérifié** (ne pas déduire succès des 5 tests du workflow sitemaps).
- Incident corrigé : premier parseur d'extraction de 80 liens utilisait un constructeur URL indisponible dans le runtime ; il classait faussement les 80 origines comme absentes. Diagnostic public témoin, remplacement intégral du fichier `part1` au commit `9d843f51be22939536c60ae771a6eaa850fef9ed` → **79/80** liens vérifiés ; ne jamais réutiliser les premiers faux négatifs.
- Le fournisseur d'extraction a imposé un plafond **150 URL/min** lors d'une tentative, respecté sans contournement. Le dernier sous-lot 79 a été lu ensuite normalement et complet.
- Sont **non démontrés** sur les 231 : disponibilité commerciale, 5 champs confirmés sur l'original, unité et période du prix, unicité physique entre portails, date de publication réelle, conformité de réutilisation. Tous les 238 portent `eligible=false`, aucun import DB ni déploiement, aucune publication.

## Séquence restante / Next exact

1. Vérifier CI du registre 238 sur commit et run exact, corriger tout échec.
2. Sur les **231**, vérifier champs primaires/validité de la transaction, en lots respectant les protections et débit de chaque portail ; classer conflits et modèles `pa:` séparément, et distinguer prix total, loyer/mois, location/nuit, prix/m², pas-de-porte.
3. Réconciliation physique avec archive Neon **en lecture seule**, aux seuils prudents ; jamais fusion automatique par prix/surface/quartier.
4. Avant publication : disponibilité réelle, fraîcheur, provenance et droits à republier. Le stock **226 286 URL** du gel historique ne peut pas être reconstitué depuis l'artifact `10910779576` expiré (HTTP 410) ; ne pas le substituer silencieusement.
5. Tests CI, mise à jour Notion / canonique, PR; **aucun merge ni déploiement Vercel sans contrôle approprié / autorisation**.

**Fichier canonique** : `docs/handovers/2026-10-05-200k-fresh-listings-parser-v2-handover.md`.
