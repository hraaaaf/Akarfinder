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
