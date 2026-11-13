# AKARFINDER V7 — FEENWAY PROVENANCE — 2026-11-13

## Goal / Succès / Preuve

**GOAL:** préparer les 82 166 annonces de l'archive FeenWay dans le parcours V7 existant, sans falsifier la provenance de l'annonce originale.

**SOURCE:** ZIP privé SHA256 bbf2b383729957d2dd3da95e36da322c144f9d5cd2c91ea08e33afb8b5f959db ; 82 166 objets JSON, sept champs, 82 166 URLs FeenWay uniques. Les URLs et IDs des portails amont sont **absents** de l'archive.

**AUDIT HORS LIGNE:** 14 395 quartiers inconnus, six villes numériques, 346 URL de photos hors contrat HTTPS, 2 584 collisions supplémentaires de première photo (jamais un doublon immobilier confirmé). Indices de portail basés sur domaine d'image : Avito 40 175, Mubawab 27 657, Yakeey 3 365, Agenz 1 627, Sarouty 1 202, Masaken 994. Ce sont uniquement des indices, jamais une identité. Périodes de prix tirées du titre non certifiées.

**CODE:** [PR Draft #1211](https://github.com/hraaaaf/Akarfinder/pull/1211), empilée sur [PR Draft V7 #1204](https://github.com/hraaaaf/Akarfinder/pull/1204). Code exact testé 6b6bdd11b1c307d23f84734143fbf40cef4b6fee ; nouvel adaptateur hors ligne scripts/acquisition/v7_multisource/feenway_provenance.py, 7 tests et workflow V7 branché. La validation facultative d'une observation source ne prouve que le format URL/ID du validateur V7 existant et ne permet aucune admission.

**PREUVE:** exécution sur vraie archive, 82 166/82 166 en quarantaine, 0 admission, 0 HTTP, 0 DB. 7/7 tests locaux PASS. [Run V7 #43418060191](https://github.com/hraaaaf/Akarfinder/actions/runs/43418060191) SUCCESS, étape FeenWay et régressions V3/PostgreSQL SUCCESS ; cron SKIPPED. [CI policy #43418060195](https://github.com/hraaaaf/Akarfinder/actions/runs/43418060195) SUCCESS.

## Contrôles ciblés des deux fiches FeenWay

- FeenWay ID 199629 : la fiche propose un lien Avito ID 58894239, mais celui-ci redirige aujourd'hui vers une page générique : impossible de valider la fiche amont. Le titre annonce 900 DH/nuit ; la description évoque 900 MAD de loyer sans période vérifiée. QUARANTINE.
- FeenWay ID 222666 : la fiche propose Mubawab ID 8423416 ; la page Mubawab individuelle est lisible, 160 000 MAD, 222 m², photo commune. Mais FeenWay indique Appartement à vendre, alors que le titre Mubawab indique Terrain à louer et sa classification propre indique Appartement : **contradiction transaction/type**. QUARANTINE.

Ces contrôles ponctuels n'apportent ni HTML original immuable avec SHA indépendant, ni précision statistique certifiée, ni fraîcheur, ni disponibilité. Un manifeste observé avec un URL Mubawab de format canonique donne 1 Q_UPSTREAM_MAPPING_FORMAT_ONLY + 82 165 Q_UPSTREAM_ORIGINAL_IDENTITY_MISSING et 0 admission.

## Frontière et séquence restante

1. Retrouver/exporter par voie autorisée les liens originaux depuis les pages FeenWay déjà collectées, ou fournir un échantillon de vraies fiches HTML avec traces indépendantes.
2. Vérifier l'identité amont, type/transaction/période prix, localisation, dates et prix au regard d'une annotation indépendante ; maintenir en quarantaine les contradictions/redirections.
3. Réutiliser les adaptateurs source-first V7 vers AkarParser V3/Radar10 en staging privé, avec replay, rejets, dédup URL/ID et doublons physiques probables séparés.
4. Tests et revue de qualité ; gates distincts avant toute écriture DB, merge, activation source live/cron ou Vercel.

**Pas de source LIVE, DB, merge, cron ni déploiement Vercel.** V7 reste à 2/8 jalons clôturés, pourcentage global inconnu. Cette PR est un durcissement du premier portail, pas une certification du portail.

Fichier canonique parent : docs/data/AKARFINDER_V7_MULTISOURCE_GITHUB_ACTIONS_2026-11-12.md.


## Pilote élargi — 10 fiches, 6 portails / 8 originaux vérifiés

Un sondage déterministe de 8 autres fiches de l'archive (tirage seed 20261113, répartition : 2 Avito, 2 Mubawab, 1 Yakeey, 1 Agenz, 1 Sarouty, 1 Masaken) complète les deux contrôles ci-dessus : **10/10 fiches FeenWay affichent un lien d'annonce originale**, ce qui ne permet aucune généralisation à la totalité du ZIP.

Sur les 8 pages des portails originaux consultées : **6 fiches individuelles accessibles**, **1 Avito redirige vers une page générique**, **1 Sarouty retourne HTTP 410**. Ce sont des constats ponctuels, pas une mesure de couverture nationale.

Exemples :
- FeenWay 273928 → Avito 58688662 : Bureau Anfa à louer 225 m², 40 000 DH, fiche originale accessible.
- FeenWay 239051 → Mubawab 8421954 : villa Ain Atig 250 m² / 4,05 M MAD, fiche originale accessible.
- FeenWay 183868 → Yakeey CA096674 : appartement Beausejour 132 m² / 1,88 M MAD, fiche originale accessible.
- FeenWay 186197 → Agenz 169490 : location appartement 84 m² / 7 500 MAD, fiche originale accessible MAIS le V7 Agenz actuel n'accepte que la **vente appartement**, donc toujours non admissible par cet adapter.
- FeenWay 179960 → Sarouty listing_id 896796 : HTTP 410, annonce indisponible.
- **FeenWay 180678 → Masaken 14564 : FeenWay dit 3 900 DH/mois, Masaken original indique 3 900 DH/jour. Incohérence majeure, rejet obligatoire.**

L'archive n'a toujours pas de lien amont ; les liens ci-dessus sont des observations ponctuelles consultées après réception du ZIP. Une extraction à grande échelle exige une source enrichie ou des captures autorisées ; ne pas commencer 82 166 requêtes FeenWay par défaut.

Le poste utilisateur DESKTOP-3MAJEEH a été vérifié **Offline**, dernier contact annoncé 55 heures auparavant : les fichiers du collecteur indiqués par le rapport ZIP ne peuvent pas être relus via Desktop Commander à ce stade. Le prochain gate est donc externe : rendre les fichiers source existants accessibles ou fournir une exportation incluant source_url et source_offer_id.

**Livrable local vérifié :** feenway_v7_FINAL_pilot_quarantine_2026-11-13.zip (SHA256 7619888ca3d7c662a19754a574634751c81dc0a89dbdebdd78c44234eae15f76) : audit initial, 82 166 candidats, 10 URLs de pilote, une observation d'ID seulement formelle et rapport. Aucun fichier de données privées intégré dans GitHub.

## <2026-11-13> — FeenWay HTML source-link gate (second sub-lot)

**Goal:** relier, en OFFLINE, une vraie page de détail FeenWay à un URL/ID d'annonce amont depuis un **snapshot HTML brut fourni**, sans reconstruire ni crawler les portails et sans admettre une annonce.

**Code SHA fonctionnel:** `5c6166d92c32306874188c6a86cf100ad2171ac8` sur la même [PR Draft #1211](https://github.com/hraaaaf/Akarfinder/pull/1211). Module `scripts/acquisition/v7_multisource/feenway_snapshot_links.py` et 12 tests unitaires adversariaux `scripts/acquisition/__tests__/test_v7_feenway_snapshot_links.py`, intégrés au workflow V7. Reuse de `v7_multisource.snapshot_evidence.verify_evidence` réel : hash SHA256, longueur, capture type, URL FeenWay, timestamp, statut, HTML brut ; exigence d'un pin SHA prévu extérieurement. En plus : canonical/og:url exacts dans HEAD, un seul lien explicite « Voir sur <portail> », URL HTTPS domaine allowlisté, ID source dérivé seulement de l'URL explicite, refus d'URL host-spoof, requêtes parasites, contradiction marque/domaine et double lien.

**Preuve CI au code SHA exact :** [V7 run #43421661472](https://github.com/hraaaaf/Akarfinder/actions/runs/43421661472) SUCCESS ; 12/12 tests FeenWay snapshot links PASS sur **vrai vérificateur V7** (logs job 131872876338), compilation PASS, régressions V7 V3/PostgreSQL et Radar10 PASS, cron `ten-minute-gate` SKIPPED. [CI policy #43421661482](https://github.com/hraaaaf/Akarfinder/actions/runs/43421661482) SUCCESS. Le banc local initial 12/12 employait un shim pour isoler les imports ; **la preuve de branche/CI est celle du vrai module**.

**LIMITE :** ces 12 fixtures sont synthétiques, pas 12 captures de vraies pages. Le module produit exclusivement `SUPPLIED_HTML_SELF_DECLARED_LINK_QUARANTINE_ONLY`. Un manifeste et un pin auto-cohérents ne certifient pas indépendamment le réseau d'origine. L'ID original est un indice de lien ; fraîcheur, disponible, transaction, unité prix, unicité physique et permission ne sont pas vérifiées. `eligible_for_radar10_private_staging=false` et `eligible_for_public_admission=false`.

**Preuve issue du ZIP et du pilote :** archive originale 82 166 lignes ; 10 liens amont observés sur 10 FeenWay, 6 destinations originales individuelles accessibles sur 8 contrôlées, 2 destinations invalides/redirigées, 2 originales non contrôlées. Le bundle privé `feenway_v7_snapshot_link_pilot_2026-11-13.zip` contient 10 mappings explicitement non admissibles et le contrat de captures, SHA256 `f01213f2d0178391a1b31db1c590cbca1fdfeb290d3d41eb73433d8b8821f660`. Il n'a PAS d'HTML brut original fiable. Zéro sortie vers PostgreSQL, Supabase ou Vercel.

**Accès Windows constaté :** AI Machine Bridge signale la machine en ligne en mode `presence_only`, sans commande ni accès fichiers. Desktop Commander indique `DESKTOP-3MAJEEH` Offline (dernier contact historique 55 h). Il est donc impossible à ce jour de récupérer les fichiers bruts `feenway_mp_scraper` par ces canaux.

**Next exact :** réexporter localement, depuis les fichiers bruts déjà collectés (priorité zéro nouvelle requête réseau), le lien `Voir sur` / URL de fiche originale et ID amont, ou donner les captures HTML originales immuables avec empreinte indépendante ; puis qualifier les champs des portails source et la dédup avant staging privé V3/Radar10. Pas de promotion sans nouveau gate. V7 reste **2/8 jalons clôturés**, pas de pourcentage projet établi.


## 13 novembre 2026 — Sous-lot de revue photo-ID Mubawab (OFFLINE, pas d'identité source)

**Goal :** explorer une piste de triage sans refaire 82 166 appels FeenWay. Les photos ne sont pas des URL/ID de l'annonce originale.

**Code :** `scripts/acquisition/v7_multisource/feenway_photo_id_hints.py`, tests `scripts/acquisition/__tests__/test_v7_feenway_photo_id_hints.py`, CI branchée. Analyse très stricte du chemin de la **première photo** `www.mubawab-media.com/ad/d/ddd/dddF/h/...` comme **indice non authentifié**. Les photos `/m/` (miniatures d'autres annonces observées) ne peuvent jamais produire d'ID principal ; rejet des hôtes trompeurs et schémas HTTP. Aucun URL original fabriqué et aucune admission.

**Rapport sur le vrai ZIP :** 82 166 / 82 166 annonces parcourues ; 27 328 premières photos avec chemin Mubawab strict et ID *candidat* ; 1 680 groupes de collision de cet indice (1 803 occurrences supplémentaires) en revue uniquement ; 3 646 galeries vides, 51 192 lignes sans indice strict. **Zéro vrai doublon confirmé**, 0 ID de source certifié, 0 suppression, 0 DB, 0 requête réseau. Les IDs photo peuvent être trompeurs ; deux exemples déjà reliés manuellement à un lien de fiche original ne constituent pas une mesure de précision globale.

**Preuves locales :** 9/9 tests PASS. ZIP privé `feenway_v7_mubawab_photo_hints_audit_2026-11-13.zip` (279 377 octets ; SHA256 `548de2f3f94244277fd18c3bb14281158b6bfde1aee7552a43c84ea3afcebb0e`) CRC ZIP PASS, contient le rapport et 27 328 indices JSONL.gz en quarantaine et CSV des collisions. La CI au SHA de code poussé doit être constatée avant certification GitHub.

**Next exact :** exploiter les candidats pour sélectionner des échantillons prioritaires de correspondance avec les vrais liens originaux (HTML d'origine ou fichiers bruts du collecteur), puis confrontation prix/type/transaction/dates et dédoublonnage avant la moindre admission dans V3/Radar10. **V7 reste 2/8** jalons clos.


## Closeout technique — FeenWay / Mubawab indices photo, 13 novembre 2026

**Code V7 vérifié au SHA exact :** `fbea07bf29ae92a56e9168105b7e2486af2f3dba`. [Run V7 #43424248483](https://github.com/hraaaaf/Akarfinder/actions/runs/43424248483) **SUCCESS** : 9 tests du module `feenway_photo_id_hints.py` PASS, anciens tests FeenWay et régressions V3/PostgreSQL/Radar10 PASS, compilation PASS, job cron `ten-minute-gate` **SKIPPED**. [CI Policy #43424248495](https://github.com/hraaaaf/Akarfinder/actions/runs/43424248495) **SUCCESS**.

**Résultats effectivement calculés sur le ZIP utilisateur :** 82 166 lignes, 27 328 lignes avec ID Mubawab **candidat** extrait strictement de la première image `/ad/d/ddd/dddF/h/...`; 51 192 sans cette structure primaire, 3 646 galeries vides. 1 680 groupes de collision de l'ID photo candidat (1 803 répétitions supplémentaires), dont 419 groupes avec des prix textuels différents, 329 avec des surfaces textuelles différentes, 31 avec des noms de villes différents et 68 avec des transactions vente/location différentes. Ces groupes sont **seulement des signaux de revue** : 0 doublon physique certifié, 0 source originale certifiée, 0 suppression/fusion, 0 admission.

**Nouveau livrable ZIP privé :** `feenway_v7_mubawab_photo_hints_audit_2026-11-13.zip`, 279 377 octets, SHA256 `548de2f3f94244277fd18c3bb14281158b6bfde1aee7552a43c84ea3afcebb0e`, CRC PASS. Contenu : rapport JSON, 27 328 indices candidats en JSONL.gz en quarantaine, CSV des 1 680 groupes collisionnels, code et tests. Archives et données privées non poussées sur GitHub.

**Réserve méthodologique :** FeenWay peut réutiliser dans une galerie les miniatures `/m/` d'autres annonces Mubawab ; le module exige donc le premier chemin primaire `/h/` et ne tire **aucune URL source** des images. L'ID reste une hypothèse à confronter à une vraie fiche source ; le doublon de photos n'est pas le doublon de biens.

**Gates restantes :** collecteur Windows brut inaccessible (Desktop Commander offline ; AI Machine Bridge présence seule). Réexport du dossier brut avec vraies URLs amont et snapshots source ou accès authentifié aux documents de collecte ; validation par échantillons puis staging privé V3/Radar10 et gates DB/merge séparés. FeenWay toujours NOT_INTEGRATED dans la couverture live ; V7 2/8 jalons clos.


## 13 novembre 2026 — Collecteur Windows original reçu / diagnostic déterministe

**Nouveaux fichiers utilisateur effectivement lus** : `scraper_multiprocess.py` (SHA256 `6c8bf7e9d2f27b2f61e69fe332990e74c50f0e044ab6df0fe17b5a6071b30dcf`), `requirements.txt`, `README(4).md`, `feenway_urls.json` (SHA256 `da5bb0d3b08e5bbcf149e22334ffcdb5a3e6fd1d46d77af75d6f6ed160aa3acf`), benchmark 100 annonces, rapports benchmark/final.

**Preuve croisée OFFLINE** : les 82 166 URL uniques du fichier `feenway_urls.json` correspondent **exactement** aux 82 166 URL du ZIP source (`feenway_akarfinder_import.zip`) ; 0 manquante et 0 ajoutée. ZIP CRC PASS. Rapport original *déclare* 82 166/82 166 sans échec, 4 workers × 8 connexions et 4 065,18 secondes : compte rendu de collecte, pas vérification de l'activité des offres.

**Cause racine du blocage identifiée dans le vrai code source** :
- `extract_listing()` extrait du JSON-LD exactement `nom_annonce, url, ville, quartier, superficie, prix, liens_photos` ; il **n'extrait pas** les liens explicites « Voir sur Avito / Mubawab / ... » présents dans les fiches HTML.
- `fetch_one()` n'enregistre pas `response.text` ni l'en-tête de redirection / preuve d'origine, et `write_jsonl()` ne sauvegarde que les sept champs dans `feenway_part_<pid>.jsonl`.
- **Correction du précédent next :** demander uniquement `feenway_parts` ne pourra donc **pas** restituer les URL/ID originaux, sauf s'il existe ailleurs un cache HTML/HAR qui n'a pas été fourni. Les nouveaux fichiers confirment la perte d'information lors du premier scraping.

**Correctif préparé et vérifié en local, non commité dans la PR** : `feenway_collector_source_origin_patch_2026-11-13.zip` (16 470 octets ; SHA256 `bd2e93ab07e7a96dfa34c6ff0027176142c6d998c1cf55024b9a07636703e511`) contient le collecteur enrichi, ses 22 tests, les 10 URL de pilote, README PowerShell, requirements, manifeste SHA. Il conserve le schéma des 7 champs et enregistre séparément, sur les **futures** réponses HTML, le lien explicite du portail et l'ID extrait de son URL avec SHA256 + horodatage et statuts de quarantaine. URL source observée ≠ URL source vivante certifiée, aucun doublon certifié. Six portails supportés par l'extracteur ; les autres/ambigus restent en quarantaine. **22/22 tests unitaires hors ligne PASS**, syntaxe Python compilée, `--capture-origins` sans validation de masse refusé. **Aucune requête réseau et aucune DB n'ont été exécutées** ; ne pas attribuer ces tests à GitHub CI.

**Next exact réaliste** : le pilote de 10 URL FeenWay doit être collecté en environnement autorisé avec les nouvelles options `--capture-origins --benchmark-only`, **dans un dossier neuf** (les checkpoints existants seraient insuffisants). Mesurer proportion de liens source explicites, URL/ID parseables, pages originales accessibles, divergences période prix/type/transaction. Ensuite décider du coût et de la charge d'un enrichissement plus large, avec gate séparé avant source live/DB. Le pipeline original V7 reste à 2/8 jalons, PR Draft, 82 166 candidats en quarantaine, 0 admission, pas de merge, cron ni Vercel.

**Addendum vérifié du même correctif local, sans nouvelle collecte :** 22/22 tests offline PASS. La version finale vérifie aussi les règles `robots.txt` pour le User-Agent déclaré et la route `/listings/` avant l'exécution, bloque les redirections des pages et conserve les ancres HTTPS des portails encore inconnus uniquement en champ non fiable à examiner, sans inventer d'identité amont. L'archive finale de 16 470 octets a passé CRC et vérification octet-par-octet du manifeste. L'ancienne référence de bundle et de 16 tests est remplacée par la version finale ci-dessus.


## 13 novembre 2026 — Pilote FeenWay réellement exécuté dans GitHub Actions (PC non requis)

**Décision opérationnelle :** le poste Windows n'est **pas nécessaire** au pilote. Le logiciel V7 existant `snapshot_evidence.capture_approved_once` + `feenway_snapshot_links.review_feenway_snapshot` a été réutilisé depuis un job GitHub Actions borné, sans modification de DB, staging ni déploiement.

**Code pilote** sur commit `4b388e7d9c178b646dd20e9ea40d3dc64ce8654c` : `scripts/acquisition/v7_multisource/feenway_actions_pilot.py`, 10 URLs fixes `feenway_pilot_10_urls.json`, 14 tests adversariaux `test_v7_feenway_actions_pilot.py`, workflow `.github/workflows/akar-v7-feenway-10-pilot.yml`. Le workflow ne déclenche la capture que sur un **push du fichier de workflow** sur la branche dédiée ; il ne tourne ni sur schedule, ni sur l'ensemble des PRs, et il n'est pas activé sur main. Il vérifie `robots.txt` et son User-Agent, exige une approbation réseau interne au job, refuse les redirections, ne suit pas les 401/403/429, reste séquentiel et plafonne à **10 GET de fiches** (hors contrôle robots). Pas de HTTP vers les sites sources ; URL source au stade de lien auto-déclaré.

**Preuves réelles GitHub :**
- [Pilote run #43440398205](https://github.com/hraaaaf/Akarfinder/actions/runs/43440398205) **SUCCESS**, job `bounded-original-link-pilot` SUCCESS, 14/14 tests PASS sous Python 3.11, capture 10/10 pages FeenWay et **10/10 liens d'origine extraits au format**, `blocked_reason=null`, `db_writes=0`, `eligible_for_public_admission=0`. Robots policy SHA256 `b8decc4112b8c13966cd7d10fd90a0eda7078e9f47b6309e84107e2431e42612`.
- Sur dix observations : Avito 3, Mubawab 3, Yakeey 1, Agenz 1, Sarouty 1, Masaken 1. **Échantillon connu et choisi**, pas un taux représentatif pour les 82 166. Les dix pages originales n'ont **pas** été vérifiées par ce run.
- Artefact GitHub [#14046020698](https://github.com/hraaaaf/Akarfinder/actions/runs/43440398205/artifacts/14046020698) conservé un jour, ZIP CRC PASS, SHA256 `28b49a0bb5c2331c92483f7dd12c440b971f6025dc5da9b49db52baae2f2c539`, contenant uniquement le rapport et les 10 observations de liens en quarantaine (ni HTML brut ni images). Archive téléchargée et relue en local.
- [V7 CI #43440408179](https://github.com/hraaaaf/Akarfinder/actions/runs/43440408179) SUCCESS et [CI Policy #43440408276](https://github.com/hraaaaf/Akarfinder/actions/runs/43440408276) SUCCESS sur commit de code pilote. Le nouveau test est maintenant intégré **aussi à la CI V7 offline récurrente**, sans répéter le job réseau.

**Limites de preuve** : le lien original est une déclaration dans la fiche FeenWay, pas une preuve de disponibilité/activité/fraîcheur ni de transaction/type/période prix ; 0 source amont indépendamment consultée dans ce pilote. Il n'existe aucune raison de certifier ou importer toutes les 82 166 annonces sur cette preuve. Conserver l'enrichissement prudent en quarantaine. **NEXT :** revue/admission après validation indépendante des pages amont pour les 10 candidats, qualité des prix/périodes, représentativité, doublons, avant un éventuel pilote multi-portails élargi sous gate distinct. **Aucun Vercel, DB, merge, cron live.** Roadmap V7 demeure **2/8 jalons clôturés**.


## 13 novembre 2026 — Closeout du pilote 10 pages d'origine via GitHub Actions

**GOAL:** vérifier de façon indépendante, par des requêtes bornées et conformes au contrôle robots propre à chaque portail, les dix liens « Voir sur » retrouvés lors du pilote FeenWay (six domaines). **Succès attendu :** preuves ou motifs précis de non-preuve par fiche, sans admissions ni contrôle informatique Windows. **Résultat :** 10/10 fiches qualifiées en états explicites, 1 identité de page amont confirmée par URL canonique sur Agenz, **0 disponibilité ou cohérence prix/surface certifiée**.

**Code + CI :**
- Premier commit d'audit `cc2176a2e5e0cc47719158779fc1d9e6da36ad2e` ; [GitHub Actions run original #43445997766](https://github.com/hraaaaf/Akarfinder/actions/runs/43445997766) **SUCCESS**, 22/22 tests sécurité PASS, 6 domaines/10 candidats.
- Bug réel détecté : `UnicodeEncodeError` lors de l'utilisation directe d'URLs Avito accentuées avec `urllib`, sans requête métier exploitable. Correctif au commit `1b410921acc8999ac8f37c39abe2b460d726d24f` : encodage ASCII RFC de la portion path seulement, contrôle que le domaine et l'ID de fiche restent identiques, raison d'échec explicite dans le rapport. [Second run #43446700779](https://github.com/hraaaaf/Akarfinder/actions/runs/43446700779) **SUCCESS**, **24/24 tests** du nouveau sous-lot PASS, [CI V7 #43446712582](https://github.com/hraaaaf/Akarfinder/actions/runs/43446712582) SUCCESS et [CI Policy #43446712504](https://github.com/hraaaaf/Akarfinder/actions/runs/43446712504) SUCCESS.
- Deux runs source volontairement one-shot avec entrée figée ; aucun scan élargi, aucun retry HTTP de contournement, aucune redirection suivie, aucun import/DB/cron/Vercel.

**Statut final du second run sur les 10 offres :**
1. `feenway/186197` → **Agenz 169490**, HTTP 200, URL canonique `agenz.ma` porte le bon ID. Le parseur V3 n'extrait **ni prix, ni surface, ni transaction, ni type** ; le titre source indique une location cohérente avec la claim FeenWay, mais la comparaison détaillée et la disponibilité restent indéterminées. Donc **observation d'identité de fiche seulement**, non admission.
2. `feenway/199629` → Avito : **HTTP 403** une fois après correctif ; les **2 autres Avito** (`273928, 197602`) arrêtées avant requête selon stop-on-denial. Aucun contournement.
3. Trois Mubawab (`222666,239051,219504`) : réponses non reconnues comme document HTML brut par le validateur (`NOT_HTML_DOCUMENT`), **pas** une redirection prouvée, pas d'ID canonique établi dans ce run. Ne pas déduire une fiche supprimée.
4. Yakeey `183868` et Masaken `180678` : `robots.txt` injoignable/non utilisable (HTTPError) ; aucune requête fiche. Sarouty `179960` : redirection sur `robots.txt` refusée ; aucune requête fiche.

**Statuts rapport second run :** 1 `SOURCE_CANONICAL_ID_MATCH`, 3 `ROBOTS_BLOCKED_OR_UNAVAILABLE`, 4 `SOURCE_FETCH_UNAVAILABLE` (dont 1 HTTP403 et 3 `NOT_HTML_DOCUMENT`), 2 `PORTAL_ACCESS_STOPPED` (Avito non tentées). Le premier run avait 1/3/6 selon ces trois premières catégories et incluait le bug de transport Avito. **Ne pas interpréter le statut technique SUCCESS du workflow comme validation des annonces.**

**Artefacts réellement téléchargés et contrôlés :**
- Première passe : [#14046954140](https://github.com/hraaaaf/Akarfinder/actions/runs/43445997766/artifacts/14046954140), ZIP SHA256 `df1e6acdd9078278eb0d9313a93c064ba268f8f26e3d1af45bf6e6c08aa38596`, CRC PASS.
- Deuxième passe : [#14047988025](https://github.com/hraaaaf/Akarfinder/actions/runs/43446700779/artifacts/14047988025), ZIP SHA256 `2a63e4a486999b3bdbe1536e004fd091e3c1bd74fe77b99ef4f422284153f756`, CRC PASS.
- Livrable local audit croisé `feenway_v7_original_portals_10_checked_2026-11-13.zip` (8 333 octets), SHA256 `b890b7b86b017b6084659052db20a20ee135978d2a5feb2f52ef262da757edfb`, CRC PASS, 10 statuts rapprochés aux deux observations GitHub. Aucune capture HTML brute originale dans les artefacts distribués.

**Conséquence sur la roadmap :** 82 166/82 166 observations FeenWay restent inéligibles à une admission publique, aucun doublon immobilier certifié, V7 toujours **2/8 jalons clôturés**. Le problème d'accès Windows est résolu pour les contrôles via Actions. **Gate restant réel :** sans accès autorisé exploitable à un HTML original pertinent et sans champs métiers corroborés, ne pas injecter V3/Radar10. Ne pas relancer les mêmes URLs restreintes en boucle ; étudier des canaux première partie autorisés / export original/caches apportés, et améliorer le parser V3 depuis preuve brute autorisée avant tout élargissement. PR #1211 Draft non mergée, aucun Vercel/DB.


## 13 novembre 2026 — Agenz original 169490 : correction du contrat AkarParser V3 et preuve réelle

**RÉSULTAT :** un défaut de l'adaptateur **d'audit** FeenWay a été éliminé. `akarparser_v3_raw_bulk.parse_raw()` renvoie un dictionnaire `fields` ; `feenway_upstream_10_audit._source_parser_summary()` recherchait à tort `extracted`. Ainsi, les quatre anciens `null` ne constituaient pas une preuve de défaut du parseur V3. Correctif `e = row.get("fields") or {}` et ajout des chemins `field_evidence_paths` pour contrôler les origines des valeurs.

**ACTIONS / SHA :** premier commit `4b41dafedd1efd7580d1b7ea53155185ec4619f7` ajoutant la correction, un workflow GitHub Actions dédié à **un seul** GET original Agenz et tests du véritable contrat V3. [Premier run #43451638553](https://github.com/hraaaaf/Akarfinder/actions/runs/43451638553) FAILED sur une fixture de contrôle de lot qui créait un doublon de candidats ; l'étape réseau Agenz était SKIPPED, donc **aucun GET original n'a été lancé**. Correction de cette fixture au commit `da7c7769d747019dfa7ccf29948970169f2b8fc9`, plus intégration des tests Agenz à la CI V7 offline.

**Preuve réelle définitive :** [GitHub Actions Agenz #43452034762](https://github.com/hraaaaf/Akarfinder/actions/runs/43452034762) **SUCCESS**, 25 tests offline du contrôle des dix portails + 8 tests du sous-lot Agenz PASS. Garde robots Agenz passé, **un seul** GET original `https://agenz.ma/fr/annonces/immo-marrakech/location-appartements/route-de-casablanca/169490` : HTTP 200, canonical/og:url correspond à l'identifiant source `169490`. SHA256 de la réponse HTML **`a2b8e683b921af7897a7ecb85da2cfb7b54490e1c037faa22dd896762c9e29c5`**.

AkarParser V3 extrait sur cette réponse : `price_mad=7500.0`, `surface_total_m2=84.0`, `transaction_type=rent`, `property_type=apartment`. Les quatre valeurs concordent avec les champs de l'observation FeenWay `186197` ; état V3 `complete_requires_freshness` **et NON ready_internal**. Comparaisons `v3_price=MATCH`, `v3_surface=MATCH`, `v3_transaction=MATCH`, `headline_transaction=MATCH`, mais `headline_price_period=UNVERIFIED`. **Origine technique des champs :** prix `visible_text.price` (regex générique, sans certification de bloc primaire), transaction `agenz.detail_url.transaction`, type `agenz.detail_url.property_type` (la route URL seule ne prouve pas l'annonce active), surface **sans chemin de preuve V3 attribué** (`field_evidence_paths.surface_total_m2=null`). Le SHA prouve l'intégrité de la capture transitoire, pas la disponibilité actuelle ou une autorisation de publication.

[Artefact vrai du run #14050801710](https://github.com/hraaaaf/Akarfinder/actions/runs/43452034762/artifacts/14050801710) : `feenway-agenz-v3-quarantine-2026-11-13.zip`, 922 octets, SHA256 `2f156c438f8c48d557a4fff10e17e1b9b221f5caf7dc293e4aeecaa5b11c1a6a`, CRC PASS, une synthèse JSON et pas d'HTML/images. **CI au commit corrigé** : [V7 #43452284032](https://github.com/hraaaaf/Akarfinder/actions/runs/43452284032) SUCCESS, [Policy #43452284365](https://github.com/hraaaaf/Akarfinder/actions/runs/43452284365) SUCCESS.

**SUCCESS/GATE :** le bug de lecture de contrat V3 est corrigé et prouvé sur une réponse originale ; la provenance du **champ surface** n'est pas assez explicite, la source du prix reste une extraction textuelle non bornée, la période **/mois** n'est pas corroborée par le titre original, et l'activité du bien ainsi que son unicité physique restent NON vérifiées. `eligible_for_radar10_private_staging=false`, `public_admission_authorized=false`. Toutes les **82 166 observations FeenWay** demeurent en quarantaine (0 DB, 0 merge, 0 Vercel, 0 cron live). V7 toujours **2/8 jalons clôturés**.

**Next exact :** améliorer la preuve structurée du prix et de la surface (bloc primaire/JSON-LD du portail sans réutiliser des prix annexes), établir l'unité temporelle du loyer depuis la source primaire et une fraîcheur indépendante avant tout staging V3/Radar10 ; pour les autres portails déjà restreints, passer par un export/flux autorisé ou une capture brute provenant de la source, pas par répétition de GET refusés. Aucun nouveau réseau massif.


## 13 novembre 2026 — ORIGINAL AGENZ 169490 : prix contradictoires de la même fiche, garde V7 prouvé

**OBJECTIF / DÉCISION** : empêcher la promotion d'une annonce FeenWay « apparemment conforme » lorsque **le portail original affiche deux loyers différents** dans ses propres blocs métier. FeenWay `186197` signale 7 500 MAD/mois ; le source Agenz 169490 a la même URL canonique et une surface 84 m². Le premier rapprochement V3 semblait 4/4 concordant, mais il ne contrôlait pas les différents prix présents sur la page.

**Preuve primaire observée dans la même fiche Agenz** `https://agenz.ma/fr/annonces/immo-marrakech/location-appartements/route-de-casablanca/169490` : bloc listing **« Coût mensuel » = 7 500 DH/mois** ; bloc **« Description » : « Location longue durée : 7 700 DH/mois »** ; bloc **« Caractéristiques » = « Surface 84 m² »**. Des recommandations (« Annonces similaires ») contiennent d'autres prix/surfaces et sont **explicitement exclues** de la comparaison. Ces valeurs sont les **déclarations contradictoires du portail** : elles ne permettent pas de deviner laquelle est contractuellement correcte. La période mensuelle du prix est visible dans les deux blocs mais ne valide ni montant ni disponibilité.

**Code dédié V7** : commit `8176617589b30a0e60ac123f76aca71cb3295b0c` sur [PR #1211 Draft](https://github.com/hraaaaf/Akarfinder/pull/1211) :
- `scripts/acquisition/v7_multisource/feenway_agenz_primary_scope.py` compare les sections HTML primaires `main / Description / Caractéristiques / Coût mensuel` ; ne prend ni snippets globaux, ni cartes similaires ni financements pour des valeurs du bien. En cas d'absence ou d'ambiguïté il échoue en **revue manuelle**.
- `scripts/acquisition/__tests__/test_v7_feenway_agenz_primary_scope.py` : **10 tests adversariaux** (conflit prix, même prix non admissif, recommandations exclues, plusieurs prix/surfaces, absence de rubrique/main, absence de prix, entrée invalide) ; **10/10 PASS local**, et test branché dans CI V7.
- `feenway_agenz_v3_replay.py` réutilise le même contrôle robots + **un seul** GET original autorisé, et ajoute `primary_source_scope` et `source_price_conflict_needs_manual_review` au rapport ; aucun write DB ni accès aux cinq autres portails bloqués.
- `.github/workflows/akar-v7-feenway-agenz-primary-once.yml` est un workflow **one-shot déclenché sur push de son propre YAML** sur la branche, non récurrent, sans déploiement.

**Preuve effective GH Actions** [run #43454575703](https://github.com/hraaaaf/Akarfinder/actions/runs/43454575703) **SUCCESS** : 10/10 tests du contrôle de sections + 8/8 tests du replay Agenz PASS, garde robots accepté, un GET original HTTP 200 et canonical/og:url = ID `169490`. **Sur le vrai HTML source**, `primary_source_scope` retourne `primary_rent_mad=7500`, `primary_rent_period=month`, `description_long_term_rent_mad=7700`, `description_period=month`, `characteristics_surface_m2=84`, `primary_price_description_conflict=true`, `manual_review_reasons=['AGENZ_PRIMARY_VS_DESCRIPTION_RENT_PRICE_CONFLICT']`, `needs_manual_review=true`, `public_admission_authorized=false`. SHA256 du HTML brut `a2b8e683b921af7897a7ecb85da2cfb7b54490e1c037faa22dd896762c9e29c5` — **identique** à la première capture Agenz du run #43452034762, donc même contenu brut constaté. Aucune disponibilité ou unicité physique validée.

**Preuve artifact** [GitHub #14052912845](https://github.com/hraaaaf/Akarfinder/actions/runs/43454575703/artifacts/14052912845) : ZIP `feenway-agenz-primary-conflict-2026-11-13.zip`, **1 138 octets**, CRC PASS, SHA256 `f6d93772e707a0d425d07e8af324d6004b2114dfc2103124e39a096e83b5956a`; uniquement JSON structuré, pas de HTML brut / image. La CI [V7 #43454588305](https://github.com/hraaaaf/Akarfinder/actions/runs/43454588305) **SUCCESS**, [CI Policy #43454588311](https://github.com/hraaaaf/Akarfinder/actions/runs/43454588311) **SUCCESS** au commit du garde-fou.

**Qualificatif indispensable :** le V3 `parse_raw` proprement dit déclare encore `human_review_required=false` et `quality.status=complete_requires_freshness` car cette contradiction est désormais détectée dans le **contrat de provenance V7 FeenWay**, pas encore dans le moteur V3 générique. **Interdire tout bypass du garde V7 lors du futur staging privé** ; une intégration finale devra propager la raison de revue à V3 avant la moindre admission. L'annonce Agenz 169490 / FeenWay 186197 reste **NO-GO** pour staging et publication. Les **82 166** candidates FeenWay sont toujours en quarantaine ; 0 DB/merge/cron live/Vercel.

**NEXT exact** : traiter cette contradiction à la source (correction ou statut officiel du propriétaire/annonceur) puis contrôler l'extraction structurée des champs et propager la revue V7 à V3 avant un pilote privé ; pour les autres sites, uniquement sources originales permises (flux/export/source HTML première partie), pas de GET répété sur les 403/robots indisponibles. V7 demeure **2/8 jalons clos**, projet global non quantifié.


## 13/11/2026 — J2 FeenWay : propagation NO-GO prix source V7 → AkarParser V3

**GOAL :** s'assurer qu'un prix contradictoire dans le source original Agenz ne disparaisse pas entre la preuve scopée V7 et la décision d'admission/tri V3, y compris si tous les champs de l'annonce semblent complets.

**Précédent prouvé sur le vrai HTML Agenz 169490 (FeenWay 186197) :** `primary_rent_mad=7500`, `description_long_term_rent_mad=7700`, tous deux `month`, `characteristics_surface_m2=84`, garde V7 `AGENZ_PRIMARY_VS_DESCRIPTION_RENT_PRICE_CONFLICT` actif. [Source one-shot #43454575703](https://github.com/hraaaaf/Akarfinder/actions/runs/43454575703) SUCCESS et [CI V7 #43454588305](https://github.com/hraaaaf/Akarfinder/actions/runs/43454588305) SUCCESS au code SHA `8176617589b30a0e60ac123f76aca71cb3295b0c`. L'ancien V3 `human_review_required=false` résultait de l'absence de propagation et **non** d'une confirmation de prix.

**Code du premier garde de propagation (SHA `2fb3359edf54ef0de5f79d09ee2e5a89d5113fe0`, PR Draft #1211) :**
- `akarparser_v3_raw_bulk.parse_raw(..., source_review_reasons=())` ajoute un **paramètre interne explicite**. Autorise uniquement le motif `AGENZ_PRIMARY_VS_DESCRIPTION_RENT_PRICE_CONFLICT`, pour `agenz.ma` avec HTML source original fourni ; type et nombre stricts, rejette les raisons inconnues et les domaines étrangers. Ce paramètre est **uniquement dégradant** : il n'augmente ni prix ni score ni autorisations d'admission.
- Le motif est ajouté à `quality.review_reasons`, `human_review_required=true` et, hors statut préalablement plus strict (`quarantine` ou `source_snippet_only`), `quality.status=requires_manual_review`, même si la classification précédente était `complete_requires_freshness`. Le statut de revue permet l'orientation vers le bucket V3 `review` au lieu d'un traitement `ready_internal`.
- Le replay source `feenway_agenz_v3_replay.py` appelle d'abord `agenz_primary_scope.evidence(html)`, puis transmet exclusivement le **conflit effectivement extrait** à `_source_parser_summary` → vrai `parse_raw` V3 ; il échoue fermé si le résultat V3 ne signale pas `requires_manual_review` et le motif exact.
- Tests dédiés `test_akarparser_v3_source_review_gate.py` (7 scénarios) + `test_v7_feenway_agenz_v3_replay.py` (preuve synthétique passage V7→V3) et compilation/étape dédiée CI V7. **Le test n'a pas besoin de reconsulter Agenz ni les cinq portails restreints.**

**Frontière de vérité :** le paramètre de revue est fourni par un **appel interne de V7 après observation de source** ; un appel direct à V3 sans le contrôle de provenance V7 ne certifie pas automatiquement l'absence de contradiction. L'intégration source-first J2 doit imposer ce chemin avant tout staging. Les 82 166 annonces restent en quarantaine et la contradiction 7500/7700 n'est pas résolue par le code.

**Preuve CI de ce SHA :** à renseigner seulement après run GitHub sur le vrai code V7 + V3 (état non encore établi au moment d'écrire ce closeout documentaire). Aucune DB, merge, activation cron live ni Vercel.

**Roadmap canonique inchangée :** J2 FeenWay EN COURS → J3 Agenz multi-exemples → J4 Avito/Yakeey/Sarouty → J5 autres sources → J6 staging privé durable anti-rejeu → J7 canarys/cron 10 min avec GO distinct et 24 h d'observation. L'état de référence **2/8 jalons clôturés** ne change pas ; ce sous-lot n'est pas équivalent à une mise en service de FeenWay.


## 13 novembre 2026 — Closeout probant du sous-lot J2 FeenWay V7 → V3 : 55 tests PASS

**Goal effectivement rempli (périmètre étroit) :** lorsqu'un contrôle HTML premier portail constate `AGENZ_PRIMARY_VS_DESCRIPTION_RENT_PRICE_CONFLICT`, le chemin V7 FeenWay transmet le motif au vrai parseur V3 et celui-ci doit classer la fiche dans `requires_manual_review` avec `human_review_required=true`. Cette mutation n'est **jamais** une preuve que l'annonce est fraîche ou que 7 500 DH prime sur 7 700 DH.

**Preuve GitHub Actions au SHA exact du workflow** `2e026a2fcaa9aa7a2ec09efbea28862f3454cbb4` : [Run #43465539660](https://github.com/hraaaaf/Akarfinder/actions/runs/43465539660) **SUCCESS**, vrai code du dépôt sous Python 3.11, compilation PASS, **55 tests OFFLINE PASS** : 7 contrats V3 du motif/allowlist/human-review ; 9 tests V7→V3 replay ; 10 tests des sections Agenz ; 29 tests de non-régression des adaptateurs de portails AkarParser V3. Logs : 0 échec, 0 erreur. **Aucun GET, aucun accès DB/PostgreSQL ni annonce originale revisitée pendant ce run**. Le workflow est one-shot sur son YAML propre, sans schedule et sans activation sur main. Code fonctionnel déjà dans la PR au SHA `2fb3359edf54ef0de5f79d09ee2e5a89d5113fe0` ; doc canonique au SHA `29787374b31bef7bf7657cb48dadad73717abe52`.

**Conservation des limites** : moteur V3 brut, lorsqu'il est appelé seul *sans source_review_reasons*, ne peut pas inférer le conflit à partir de son parseur générique ; le chemin V7 FeenWay est obligatoire pour cette source. Le garde n'invente ni prix officiel ni disponibilité. **La CI complète V7 avec PostgreSQL et Radar10 n'a pas été redéclenchée à ce nouveau code via PR** ; elle demeure une validation requise avant tout staging/merge et ne doit pas être marquée PASS à ce SHA. Le run ciblé 55/55 est suffisant pour certifier la correction de propagation, pas pour certifier l'architecture entière.

**Frontière J2** : le conflit source demeure non résolu tant que le portail/annonceur ne confirme pas le vrai montant, la fraîcheur et l'activité ne sont pas indépendamment certifiées et le rapprochement des autres portails n'est pas complet. Les 82 166 FeenWay restent en quarantaine, aucune admission V3/Radar10, 0 DB, 0 merge, 0 cron live, 0 Vercel. **Roadmap V7 reste 2/8 jalons clos, J2 en cours.**

**Next exact** : obtenir une clarification source exploitable 7 500 vs 7 700 DH/mois, ou maintenir la fiche NO-GO ; poursuivre J2 par jeux de source primaire autorisés et revue/anti-doublon, puis exécuter full V7/V3/PostgreSQL/Radar10 sur une CI non saturée avant tout staging privé. Puis J3 → J4 → J5 → J6 → J7 selon roadmap.

## 13 novembre 2026 — J2 FeenWay : CI complète V7/PostgreSQL/Radar10 certifiée, sans accès source live

**GOAL du lot technique :** exécuter une fois le vrai gate V7 complet sur la branche FeenWay après l'ajout du motif `AGENZ_PRIMARY_VS_DESCRIPTION_RENT_PRICE_CONFLICT` dans le vrai AkarParser V3. Ne pas confondre tests verts et admission des 82 166 annonces.

**Test ciblé préalable :** [GitHub Actions V3→V7 #43465539660](https://github.com/hraaaaf/Akarfinder/actions/runs/43465539660), SUCCESS, 55/55 tests. Le signal de revue V7 est bien conservé par V3 : `quality.review_reasons`, `human_review_required=true`, `status=requires_manual_review`. Tests adversariaux de domaine et motifs falsifiés PASS.

**Gate complet effectivement exécuté sur GitHub Actions** : Workflow copie **one-shot sur branche dédiée, sans schedule**, `.github/workflows/akar-v7-feenway-full-ci-once.yml` au code SHA `6dbd41106816a115bfed7295346614b8e9095e03`. [Run #43471067596](https://github.com/hraaaaf/Akarfinder/actions/runs/43471067596) **SUCCESS**, job `multi-portal-offline` SUCCESS et `ten-minute-gate` SKIPPED. **191 tests Python PASS répartis en 16 suites** : V3 régressions par portail, L4, bridges, snapshots, V7 multisource, ZIP FeenWay, liens sources, CDN candidates, pilote 10, originaux 10, replay Agenz, HTML Agenz scopé, propagation V3 et Radar10. Compilation PASS, tests Node de collecteurs réutilisés PASS, PostgreSQL 17 éphémère de GitHub CI PASS, fixture V646 HMAC épinglée. Les lignes `ERROR` PostgreSQL dans les logs concernent des insertions/restrictions volontairement rejetées par les **tests négatifs** ; le job entier est SUCCESS. **Aucune opération Supabase PROD ni collecte réseau sur les portails originaux.** Le workflow de source 10 min n'est pas installé ni actif en production.

**Contre-épreuve du HEAD** : une modification de commentaire du workflow canonique `akar-v7-multisource-gate.yml` au SHA `eb99a037275bea6857f8a8c8c050034e23026d84` n'avait pas lancé de CI PR ; ne pas compter cette modification comme un test. Le clone exact du job de test V7 (sans événement schedule), au SHA `6dbd4110`, a réellement lancé et prouvé la CI complète. La future documentation peut se situer sur un SHA distinct sans changement de code ; la preuve fonctionnelle porte sur `6dbd4110`.

**J2 FeenWay reste EN COURS — NO-GO import.** Les 82 166 candidats restent en quarantaine. Fiche originale Agenz 169490 ↔ FeenWay 186197 : **7 500 / 7 700 DH/mois contradictoires**, clarification du portail/annonceur non obtenue, disponibilité/fraîcheur et unicité physique non établies. Les portails qui refusaient robots ou HTTP 403 n'ont pas été sollicités. Aucun merge ni DB, Vercel ou cron live. Parent PR #1204 a avancé séparément ; aucune assimilation à une certification de cette tête parent actualisée.

**Next exact, après la CI :** prendre le chemin autorisé pour preuves primaires (corriger/clarifier le loyer Agenz, flux/export d'origine pour les autres sources) et annotations indépendantes, revue/dédup ; puis staging V3/Radar10 **privé** sous gate distinct. J2 en cours → J3 Agenz multi-exemples → J4 Avito/Yakeey/Sarouty → J5 autres portails → J6 staging durable/anti-rejeu → J7 canary + éventuel cron 10 min sous GO et monitoring 24 h. **V7 : 2/8 jalons clôturés** ; pas de % global certifié.
