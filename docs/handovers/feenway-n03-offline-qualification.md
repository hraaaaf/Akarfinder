# FeenWay N03 — Qualification offline des URL N01 (30 octobre 2026)

## Goal / succès / preuve

**Goal exact :** reconstituer les URL FeenWay N01 depuis leurs archives originales, vérifier intégrité et unicité d'identité **au niveau de l'URL**, distinguer cohortes et versions historiques, préparer la qualification métier sans aucune promotion DB.

**Succès observable de ce sous-lot :** toutes les archives trouvées analysables localement sans accès réseau ; manifeste de revue explicite pour chaque URL, preuve chiffrée des recouvrements ; aucun champ inconnu inféré et aucune annonce marquée disponible ou éligible.

**Preuve locale :** 40 ZIP téléchargés depuis des artifacts GitHub par leur ID, empreintes SHA-256 des ZIP recalculées et gelées dans [inventaire](../data/feenway-n03-artifact-inventory-2026-10-30.json). Chaque manifeste JSONL a été relu, sa somme SHA-256 comparée à son rapport d'origine, ses URL/provenances vérifiées et la complétude des lots contrôlée. **4/4 tests de sûreté locaux PASS**. [Rapport agrégé](../data/feenway-n03-qualification-evidence-2026-10-30.json). Aucun accès Internet n'est fait par le code de qualification. **La CI du workflow N03 ne rejoue que les tests et les invariants du rapport**, elle ne retélécharge pas les 40 archives et n'est donc pas une deuxième preuve indépendante de la reconstitution intégrale.

## Résultats et divergence découverte

| Mesure | Réellement observé | Interprétation |
|---|---:|---|
| Six XML de la dernière archive, 30/10 | **58 513** | URLs de fiches distinctes, et non biens actifs |
| 35 lots de pages publiques | **1 736/1 736** pages distinctes et complètes | Couverture de la file N01 définie, non exhaustivité du site |
| Cohorte principale : six XML + 35 lots + dernière archive villes + dernier échantillon initial | **73 708** | Unicité des chemins `/listings/<id>` dans ce jeu d'archives sélectionné |
| Union de toutes les 40 archives retrouvées (versions antérieures villes/échantillon incluses) | **73 715** | **7 URLs** anciennes supplémentaires par rapport à la cohorte principale |
| Total N01 annoncé dans le handover historique | **73 710** | **Non réconcilié exactement : +2 vs principale, -5 vs historique** |
| Liens historiques « hors XML » retrouvés dans les XML récents | **65** | *Dérive de snapshot* entre dates : ne pas les additionner deux fois |
| Identifiants source URL distincts dans l'union totale | **73 715** | Clés syntaxiquement distinctes ; pas des biens physiquement uniques |
| Fiches qualifiées `URL + ville + quartier + prix MAD + surface m²` **par ces seuls manifests URL** | **0** | Aucun de ces quatre champs ne figure dans ces URL-only manifests |
| Fraîches / disponibles / unicité physique / droits / éligibilité commerciale certifiés | **0** | **Aucune promotion en DB** |

**Divergence à ne pas masquer :** l'ancien total de **73 710** n'est pas directement reproductible à l'identique avec le jeu disponible sans l'authentique manifeste consolidé antérieur et son SHA-256. Les lots des différentes dates utilisent plusieurs versions du sitemap XML : certains liens classés « hors sitemap » lors d'un lot sont aujourd'hui présents dans l'XML récent. Il serait incorrect de fusionner naïvement les nombres de chaque lot, ou de retirer arbitrairement cinq URL uniquement pour atteindre 73 710. Le compteur 73 715 **n'est pas** une estimation du stock actuel : il est l'union de plusieurs observations historiques.

**Règle critique :** statut unique `review_url_only`, jamais `eligible`; tous les champs métier inconnus restent `null`. Les résultats antérieurs FeenWay « 81 candidats / 49 correspondances numériques » appartiennent à un **autre échantillon de validation des fiches sources**, et ne permettent pas de remplir automatiquement les 73 715 lignes. Même pour les 49, l'activité, les droits et l'unicité physique n'étaient pas certifiés.

## Reproduction et conservation

- Code : `scripts/acquisition/feenway-n03-offline-qualify.py` (Python standard library uniquement), 4 tests `scripts/data/__tests__/test_feenway_n03_offline_qualify.py`.
- Les ZIP sources originaux sont fournis dans le **bundle offline associé** ; ils restent archivés sous leurs noms d'origine, avec l'inventaire des `artifact_id` GitHub, l'empreinte des ZIP et le rapport de qualification. Le fichier local de bundle n'est pas stocké dans GitHub : conserver sa copie à part, car les artifacts GitHub expirent.
- Réexécution depuis la racine du bundle : `python3 scripts/acquisition/feenway-n03-offline-qualify.py --root archives --inventory docs/data/feenway-n03-artifact-inventory-2026-10-30.json --out results --export-review`.
- Exports URL-only en JSONL : cohortes principale (73 708) et toutes observations (73 715), chaque enregistrement gardant l'identifiant `source_id`, les archives de provenance et l'état conservateur. **Aucune photo, description, donnée personnelle ou contenu de fiche récupérée par N03.**
- Vérifier les empreintes des deux manifests dans le rapport avant leur usage. **Aucune écriture en base ni activité réseau par cet audit.**

## Next exact / gates

1. **CI N03** : vérifier le run déclenché par la PR #1105, sa conclusion et le nombre de tests sur le HEAD exact ; distinguer ce test fixture de la validation locale des 40 ZIP.
2. **Résoudre la divergence** uniquement en retrouvant le manifeste consolidé N01 original et en le comparant à ses SHA-256 enregistrés (`xml 5e2af7…`, `off-XML 22406be5…`), ou la documenter définitivement comme divergence historique si la preuve est indisponible. Ne pas forcer le chiffre de 73 710.
3. **Qualification 5 champs, présence et fraîcheur :** commencer par un échantillon de fiches d'origine **déjà autorisées et disponibles** (canari FeenWay 81, benchmark 60), évaluer fiabilité prix/surface/quartier, transaction et disponibilité, puis préparer un plan de contrôle incrémental conforme. Les URL-only ne suffisent pas. Droits de réutilisation séparés.
4. Ne passer en DB qu'après preuve indépendante disponibilité + fraîcheur + unicité physique + cinq champs + droits et human gate. Aucune réutilisation/photo non autorisée.

**Statut :** diagnostic N03 offline local audité ; preuve CI séparée à confirmer. **PR #1105 DRAFT**, aucun merge, déploiement Vercel, accès DB ou import. Les certifications Mubawab/Sarout restent bloquées séparément par l'archive historique expirée `10910779576` (HTTP 410).

## N03b — liaison avec le canari source 81 déjà archivé (30 octobre 2026)

**Source :** `docs/data/feenway-canary81-source-fivefields-2026-10-26.jsonl` à 81 lignes et 81 identités FeenWay distinctes, lue au HEAD `22a67ee5`. Jointure exacte `feenway_id` ↔ `source_id` du manifeste N03 : **81/81 présents dans la cohorte principale (73 708), 81/81 dans l'union historique (73 715), 0 manquant**. Contrôle par lecture des 81 IDs et des deux manifestes complets en mémoire ; pas de requête web des annonces.

**Qualification indépendante des 81 (preuve antérieure, non étendue aux 73K) :** `source_five_fields_strict=true` **53/81** ; `review_source_5of5_matches_feenway` **49/81** ; métadonnée de date source **35/81** ; `quarantine_source_unavailable` **4/81** ; `review_economic_semantics` **1/81** ; `review_incomplete_or_conflicting` **27/81**. **0 droits, 0 disponibilité/éligibilité commerciale certifiés**. Ces nombres sont des preuves de qualité **sur ce canari historique précis**, pas une estimation de fiabilité sur toutes les URL. Dans les 73 715 exports URL-only, tous ces champs restent volontairement `null` : ne pas mélanger la présence des cinq champs à la source dans 53 dossiers et le contenu des manifests N01 qui n'en possèdent pas.

**Next exact ajusté :** faire un *join* offline durable champ par champ de ces 81 fiches et d'autres preuves source autorisées, avec drapeaux économiques, dates et conflits, produire un sous-ensemble `review_enriched` **sans jamais l'appeler `eligible`** ; la certification N01 globale (incluant son delta 73 710) et les gates actifs/droits restent ouverts. CI N03 `41102231522` observée `queued` (pas certifiée verte), aucun déploiement ou DB.

## N03c — review enrichie du canari 81 (30 octobre 2026)

**Goal :** produire un registre contrôlé sur les 81 preuves de portails d'origine déjà archivées, sans enrichir artificiellement la cohorte des 73 708 ou les 73 715 URL-only. **Critère observable :** 81 lignes `review_only` avec champs observés, identités sources, preuves de date au titre de métadonnées, et alertes économiques ; 0 ligne `eligible_for_db`.

**Constats vérifiés sur le corpus local :** 81 identifiants FeenWay et 81 identités sources distinctes ; **53/81** avec cinq champs techniques ; **49/81** concordances numériques, dont **2** comportent un signal économique explicite, donc **47/81** sans anomalie économique déjà identifiée (aucune certifiée pour autant). **35** dates de publication source en métadonnées, **4** sources indisponibles, **27** incomplets/conflits et **3** avertissements économiques : `233683` prix au m², `234551` prix quotidien, `236104` pas-de-porte.

**Implémentation :** `scripts/acquisition/feenway-n03c-canary-review.mjs` ; tests `scripts/data/__tests__/feenway-n03c-canary-review.test.mjs` ; CI `.github/workflows/feenway-n03c-canary-review.yml` (statut à vérifier, pas annoncé vert). Interdiction de promouvoir les dates en preuve de fraîcheur, un montant numérique en prix total ou loyer mensuel, une fiche accessible en disponibilité commerciale, ou des cinq champs en droits de réutilisation. **Aucun HTTP, DB, Vercel, merge ni crawl**.

**Next exact :** vérifier la CI N03c sur le HEAD, télécharger l'artifact JSONL, recalculer les totaux/empreinte et synchroniser Notion ; puis documenter les preuves réellement manquantes pour qualifier une première annonce, sans publication. Le delta N01 73 710 demeure ouvert.

### N03c — certificat exact-HEAD et sommes vérifiées (30 octobre 2026)

**Run :** [41118972903](https://github.com/hraaaaf/Akarfinder/actions/runs/41118972903), `completed/success`, SHA testé `22f1bc9d43eb1105e41523c6f1f6f7246f837c0f`, **5/5 tests PASS**, 0 FAIL. Artifact GitHub `13007401875` nommé `feenway-n03c-81-review-evidence` ; archive ZIP SHA-256 **`0d93c3d0a007e4cf54ac7904d6d254808b961fc97e0d97009259047226a4bca7`** (recalculé localement, égal au digest GitHub). Rapport `summary.json` + `review-enriched.jsonl` lus dans le ZIP ; SHA-256 exact JSONL **`2abd0e92672d10d2ba92d77d7d5aed9b6bc414e93129cfb33320505d2a8bd16b`**, indépendant et égal au rapport. SHA-256 de l'entrée archivée **`1bbf4f60ef6cc9b4e6c38f5ad76bbe38232301c6d62ec5e06ebe0fbef3bde545`**.

**Recalcul indépendant :** 81 lignes, 81 `feenway_id` distincts, 81 identités sources distinctes, 53 cinq champs stricts, 49 concordances numériques, 47 sans avertissement économique identifié, 35 dates comme métadonnées, 3 alertes (`233683` prix/m², `234551` prix/jour, `236104` pas-de-porte). Répartition exclusive : **47 review_numeric_match_not_commercial**, **3 review_economic_semantics**, **27 review_incomplete_or_conflicting**, **4 quarantine_source_unavailable**. Toutes les 81 lignes portent `eligibility=review_only`, `eligible_for_db=false`, `publishable=false`. Aucun dossier commercialement certifié et aucune nouvelle information sur les 73 708 / 73 715 URL-only. La présence d'une date de source ne prouve pas la disponibilité actuelle. Le résultat N03c ne valide pas les droits de réutilisation.

**Closeout N03c technique :** code + CI + sortie réelle concordants ; contrôle de l'archive complet. L'**exhaustivité FeenWay**, l'écart **73 710 ↔ 73 708 / 73 715**, et la vérification active/droits restent **ouverts**. La PR #1105 reste DRAFT ; pas de merge, DB ni Vercel. **Next exact :** préparer une matrice des preuves positives manquantes (activité, disponibilité, source, sémantique économique, unicité physique, droits) sur les 81 lignes, sans classement `eligible` ni accès aux fiches hors autorisation.
