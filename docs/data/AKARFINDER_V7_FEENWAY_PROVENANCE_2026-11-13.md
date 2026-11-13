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

**Correctif préparé et vérifié en local, non commité dans la PR** : `feenway_collector_source_origin_patch_2026-11-13.zip` (15 250 octets ; SHA256 `a740c387d39bcc5e2c3f635c62fcbda1305b43fe2fb57f846debc10d60ba9c84`) contient le collecteur enrichi, ses 16 tests, les 10 URL de pilote, README PowerShell, requirements, manifeste SHA. Il conserve le schéma des 7 champs et enregistre séparément, sur les **futures** réponses HTML, le lien explicite du portail et l'ID extrait de son URL avec SHA256 + horodatage et statuts de quarantaine. URL source observée ≠ URL source vivante certifiée, aucun doublon certifié. Six portails supportés par l'extracteur ; les autres/ambigus restent en quarantaine. **16/16 tests unitaires hors ligne PASS**, syntaxe Python compilée, `--capture-origins` sans validation de masse refusé. **Aucune requête réseau et aucune DB n'ont été exécutées** ; ne pas attribuer ces tests à GitHub CI.

**Next exact réaliste** : le pilote de 10 URL FeenWay doit être collecté en environnement autorisé avec les nouvelles options `--capture-origins --benchmark-only`, **dans un dossier neuf** (les checkpoints existants seraient insuffisants). Mesurer proportion de liens source explicites, URL/ID parseables, pages originales accessibles, divergences période prix/type/transaction. Ensuite décider du coût et de la charge d'un enrichissement plus large, avec gate séparé avant source live/DB. Le pipeline original V7 reste à 2/8 jalons, PR Draft, 82 166 candidats en quarantaine, 0 admission, pas de merge, cron ni Vercel.
