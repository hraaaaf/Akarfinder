# AkarFinder — FeenWay RAW: premiers 120 liens distincts, structure JSON-LD vérifiée

Contrôle local daté du 27 octobre 2026, depuis les **trois premiers artifacts** chiffrés de collecte en lecture seule ; clé privée hors GitHub, déchiffrement en mémoire et SHA256 validés sur chaque capture.

## Mesure exacte

- Artifacts `12729082396` (1 capture), `12728298597` (40 captures) et `12728554315` (40 captures) : **81 versions RAW capturées**, **80 URL distinctes** ; la référence FeenWay `186991` est capturée deux fois. Les octets de ces versions peuvent différer et ne sont pas fusionnés : chaque version reste traçable.
- Artifact `12729405466` (offset 80, 40 nouvelles URL) : **40/40 captures**, déchiffrement et SHA256 vérifiés ; volume brut **4 593 108 octets**, ZIP chiffré SHA256 `1ba5f3e27d2cfe3006a3ba322afd4930059783c50a1c0fe3e7aec8ae42a12879`.
- **Total confirmé sur quatre artifacts** : **121 versions RAW, 120 URL distinctes** (dont un doublon inter-lots volontairement conservé comme version historique). **0 DB, 0 Vercel, 0 publication.**

## PULPER — sondage de structure (non certifiant)

À partir des 120 URL distinctes, les pages HTML ont été déchiffrées en RAM, sans envoyer de texte brut à GitHub/Notion. Chaque page contient **exactement un** JSON-LD de type `RealEstateListing`. Présence des champs :
- **120/120** : prix MAD structuré (dans `offers.price` + `offers.priceCurrency`), ville dans `spatialCoverage.address`, texte contenant un indice `m²`, `datePosted` déclarée et `offers.availability` déclaré.
- **109/120** : région structurée (`addressRegion`).
- **0/120 certifié commercialement disponible** : `availability` dans le JSON-LD est une affirmation de la source, pas la vérification indépendante du statut actuel ; `datePosted` est une date déclarée, pas l'âge réel garanti ; une mention `m²` dans un texte ne distingue pas automatiquement la superficie habitable du terrain.

L'analyse locale enregistre uniquement les **signaux/booleans**, sans titres/descriptions ni coordonnées personnelles. Les 120 dossiers restent `review_structured_source_metadata`, `eligible=false`. Cela prouve la faisabilité d'un adaptateur HTML/JSON-LD dans le pulper et justifie la conservation RAW avant correction progressive des moules.

**Suivant** : vérifier [run 40493297128](https://github.com/hraaaaf/Akarfinder/actions/runs/40493297128) du lot offset 120 ; déchiffrer et contrôler son artifact, puis lot offset 160 sur le restant de l'échantillon 238. Raccorder un stockage chiffré durable : les artifacts GitHub expirent dans 30 jours. Ne rien admettre dans la DB sans fraîcheur commerciale, disponibilité, unicité physique et droits.
