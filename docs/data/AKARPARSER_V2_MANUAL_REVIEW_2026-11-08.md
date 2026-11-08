# Q1E — Revue indépendante de 100 observations privées AkarParser V2

**État observé au 08/11/2026** : le canary réel Windows de 1 000 lignes est exécuté (133 `ready_internal`, 349 `complete_candidate`, 485 `partial`, 33 `quarantine`, 0 erreur et 0 doublon exact). 100 dossiers sont préparés, **0/100 validé humainement**. Les comparaisons automatiques prix 65/65, surface 72/72 et type 100/100 sont des vérifications de cohérence entre colonnes stockées, **pas** une preuve de précision indépendante.

## Goal / Success / Proof

- **Goal** : confronter 100 sorties à des captures originales indépendantes du JSONL historique (pas au même champ de la même base), calculer précision observée prix MAD, surface m², type normalisé et documenter les absences.
- **Success de l'outil** : template privé de 100 dossiers, identifiants exacts, preuves déclarées, score reproductible, échecs explicites si un dossier ou une valeur reste non examiné, aucun import ni permission de publication automatique.
- **Proof qualité** : 100 revues authentifiées par une personne indépendante avec captures vérifiables, au moins 50 prédictions contrôlées pour chacun des 3 champs et **précision observée >= 98 % par champ**. Le programme **ne peut pas** authentifier les captures ou l'indépendance du réviseur : inspection externe nécessaire. Ce seuil sur 100 dossiers **n'est pas** une preuve statistique à 98 % de précision sur les 151 900 historiques.

## Exécution Windows — hors Git et hors logs partagés

Dans un worktree propre de la PR #1188 contenant le script de revue :

```powershell
$root = 'C:\Users\lenovo\Desktop\AkarFinder-DataMass-2026-11-07\Q1E_CANARY_20261107_233845'
$queue = Join-Path $root 'private_review_queue_100.jsonl.gz'
$annotations = Join-Path $root 'review_annotations_100.jsonl'
$report = Join-Path $root 'manual_review_aggregate.json'

python scripts/acquisition/akarparser_v2_review_scorecard.py prepare `
  --queue "$queue" --annotations "$annotations"
```

Le template est volontairement **vide**. Compléter **les 100** enregistrements, un par ligne JSON :

- `reviewer_id` : identifiant interne d'une personne qui contrôle réellement les **pages source ou captures indépendantes**, pas la sortie JSONL du parseur.
- `reviewed_at_utc` : date ISO 8601 UTC réelle (ex. `2026-11-08T12:00:00Z`).
- `independent_source.kind` : `source_page_snapshot`, `trusted_archive_snapshot` ou `source_document` ; `capture_sha256` : SHA-256 de la **capture originale conservée en privé** ; `captured_at_utc` : horodatage UTC de cette capture. Un hash arbitraire n'est pas une preuve.
- `reference.price_mad`, `reference.surface_total_m2`, `reference.property_type` : pour chaque champ, renseigner `status: verified` + `value` **lu dans la source indépendante**, `status: absent` + valeur `null` si la capture prouve l'absence, ou `status: unverifiable` + `null` si la source ne permet pas de trancher. Un champ non relu conserve `pending`.
- Les types doivent utiliser la valeur canonique de référence (`apartment`, `villa`, `house`, etc.), déterminée à partir de la page **sans voir la prédiction**. Le prix doit être en MAD et la surface en m², avec unité et contexte daté vérifiés. Une page actuelle différente de l'annonce historique est `unverifiable`, pas une erreur automatique de l'ancien parseur.

Après vérification humaine :

```powershell
python scripts/acquisition/akarparser_v2_review_scorecard.py score `
  --queue "$queue" --annotations "$annotations" `
  --out "$report"
```

Le scorecard refuse les identifiants absents, les preuves incomplètes et les résultats trop rares. Les cas `unverifiable` ne peuvent pas disparaître du dénominateur pour faire passer artificiellement un seuil. Une valeur absente dans la sortie, mais présente dans la source, est comptée comme **lacune d'extraction**, séparément de la précision positive.

## Interprétation et sécurité

- Ne partager **que les statistiques agrégées** du `manual_review_aggregate.json` après contrôle de confidentialité ; les SHA d'annotations et de file peuvent être communiqués, mais pas les captures, annonces, URL, fichiers JSONL ou identifiants source.
- `data_quality_gate_by_reviewer_declaration_passed = true` signifie uniquement que les déclarations humaines et les comparaisons chiffrées passent les règles de calcul. `independent_source_capture_authenticity_machine_verified = false` et `neon_import_authorized = false` restent **toujours** faux : revue externe des preuves, droits d'exploitation, activité/fraîcheur, unicité et validation distincte restent obligatoires.
- Les **0 descriptions**, 728 dates non prouvées, 487 identités incertaines et 33 conflits source ID/URL du canary doivent rester visibles : pas de remplissage fictif. Un résultat de précision >=98 % n'élimine pas ces autres blocages.
- Toutes les sorties de cette procédure sont **privées sur Windows**. Ne jamais les committer, les uploader dans GitHub Actions, les envoyer à Notion, ni écrire dans Neon.

**Next exact** : Codex `prepare`, relecteur indépendant examine les 100 captures, Codex `score` et rapporte uniquement chiffres/erreurs agrégés. Si aucune capture d'origine indépendante n'existe, statut `unverifiable` et gate bloqué; ne pas prétendre une précision certifiée.
