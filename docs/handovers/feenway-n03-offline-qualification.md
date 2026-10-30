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
