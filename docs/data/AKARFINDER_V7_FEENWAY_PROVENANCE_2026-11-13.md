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
