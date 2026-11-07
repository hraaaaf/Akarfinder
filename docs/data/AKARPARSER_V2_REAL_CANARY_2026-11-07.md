# AkarParser V2 — Q1E réel : exécuteur canary privé

**Statut vérifié :** code et tests livrés. Exécution sur les 151 900 vraies lignes privées **pas encore effectuée** dans cet environnement, car le lac SQLite/export complet est sur le poste Windows. Le préflight Neon SQL précédent n'est pas une validation de précision du parseur.

## Goal / Success / Proof

- **Goal** : sélectionner de façon déterministe 1 000 véritables lignes de source (pas 1 000 URL fictives), lancer le parseur V2 et préparer 100 revues de champs.
- **Success technique** : 1 000 lignes traitées, traces et comptes par provenance/complétude ; aucune écriture sur le fichier source ; sortie re-jouable identique ; aucun statut `active` / droit d'exploiter inventé, zéro publication.
- **Success qualité (gate humain)** : prix, surface, type ≥ 98 % de précision sur une revue annotée d'au moins 100 fiches. Il faut **effectivement relire les preuves**, pas seulement générer une file de revue. Les 1 000 lignes et la revue de 100 restent à faire sur le vrai export privé.
- **Proof** : empreintes source et sorties, `aggregate_report.json`, contrôle des sorties, `private_review_queue_100.jsonl.gz` complété et confronté à l'archive brute.

## Sources privées à utiliser — ordre recommandé

1. `neon_recovery_export_20261107.jsonl.gz` sur le Bureau : 151 900 lignes rapportées comme structurées. **Ce fichier est le meilleur point de départ**, sous réserve que sa structure corresponde bien aux alias du parseur. Une première exécution mesure justement ce point.
2. Copie SQLite privée des fiches `property_listings` avec `listing_sources` joinable par `property_listing_id` (si les deux tables et colonnes existent). Ne pas utiliser `candidate_lake_Q1C_staging.sqlite` comme si ses 327 514 URL étaient des fiches : ce staging sert à l'index de candidats.
3. `observations_detailed_union_20261107.jsonl.gz` en complément séparé, avec l'objectif d'auditer les 9 990 observations déjà reconnues, pas de les recompter comme nouvelles.

## Commande Windows (depuis la racine du dépôt local)

```powershell
$private = 'C:\Users\lenovo\Desktop\AkarFinder-DataMass-2026-11-07'
python scripts/acquisition/akarparser_v2_canary.py `
  --input "$private\neon_recovery_export_20261107.jsonl.gz" `
  --out "$private\Q1E_CANARY_REAL_1000_20261107" `
  --sample-size 1000 --audit-size 100
```

La commande échoue si l'entrée contient moins de 1 000 lignes ou si le dossier de sortie est non vide. Le runner lit le fichier en streaming, conserve un échantillon de 1 000 lignes déterministe par SHA-256 et répartit au mieux les cas entre **Mubawab, Avito, Agenz, Domio, autres** et quatre niveaux de données. Il appelle ensuite le parseur Python V2, produit les métriques de complétude et la file privée de 100 contrôles. Les valeurs générées ne sont pas une preuve de précision, et les statuts `ready_internal` ne sont pas des annonces publiables.

## Sorties **strictement privées**, à ne pas joindre à GitHub / Notion

- `private_sample_1000.jsonl.gz` : 1 000 **lignes brutes authentiques**, pouvant contenir des données de contact.
- `parser_output/records.jsonl.gz` : les sorties JSON structurées, avec preuves.
- `parser_output/quarantine.jsonl.gz`, `duplicates.jsonl.gz`, `errors.jsonl.gz` : anomalies et dossiers séparés.
- `private_review_queue_100.jsonl.gz` : 100 dossiers non annotés, à relire avec sources.
- `aggregate_report.json` : **seuls des agrégats et hashes** ; peut être transmis à ChatGPT après contrôle de confidentialité et des noms de fichiers.

## Tests automatisés exécutés dans ChatGPT

- Suite `test_akarparser_v2*.py` : **18/18 PASS**.
- Test d'intégration : SQLite synthétique de 1 200 lignes, 5 sources et 4 niveaux ; canary stratifié de **1 000 lignes** → 250 ready_internal, 250 complete_candidate, 250 partial, 250 candidate_url, 0 erreur.
- Deux exécutions de ce même fixture ont produit les **mêmes SHA-256** pour l'échantillon privé, la queue de revue et les JSONL de sortie ; `sha256` du SQLite original inchangé.
- Validation sur le véritable snapshot Windows : **non effectuée**. Aucune observation supplémentaire certifiée ; compteur détaillé **9 990/200 000** inchangé.

## Gates et suites

1. Vérifier le SHA-256 et l'existence de l'export privé ; obtenir `aggregate_report.json`.
2. Si les valeurs manquent à cause d'une structure imbriquée non reconnue, étendre les alias et re-tester, sans inventer de champs.
3. Faire annoter 100 fiches avec preuves originales ; calculer précision champ par champ, corriger les faux positifs.
4. Passer à 10k puis 151 900 par lots privés seulement si les seuils sont atteints, avec frais et droits d'exploitation toujours séparés.

**Aucune écriture Neon/Supabase, merge, publication ni déploiement Vercel n'est autorisée par cette étape.**

## Q1E — enrichissement OpenSerp hors ligne (07/11/2026)

Le canary GitHub Actions à quatre cohortes versionnées a été exécuté (run [42412143865](https://github.com/hraaaaf/Akarfinder/actions/runs/42412143865), quatre checks SUCCESS) : **885 représentations historiques** traitées, dont 300 Mubawab structurées (280 `complete_candidate`, 20 `partial`), 305 découvertes OpenSerp (305 `partial`), 250 fiches du corpus qualité OpenSerp (250 `partial`), 30 P0 structurées (23 `complete_candidate`, 7 `partial`). Ces représentations ne sont pas 885 biens physiques uniques ni 885 offres publiables.

L'audit hors ligne des archives JSONL a confirmé une lacune de lecture : les 305 enregistrements OpenSerp contiennent un objet `extracted` avec ville/type/transaction, **86** avec prix et **202** avec surface, et le corpus qualité utilise des colonnes `extracted_*`. Correctif V2 : lire ces indices comme **données SERP de confiance faible**, sans les assimiler à l'HTML de l'annonce originale ; conserver URL canonique et snippet comme preuves de découverte, sans forcer de pays, date d'observation, identité vérifiée, activité ou droit. Les éléments de cette provenance restent `partial` (jamais `ready_internal` ni `complete_candidate`) et ne créent pas de `CanonicalPropertyV1` publiable. Deux tests de non-promotion SERP et de récupération des champs imbriqués ont été ajoutés. **20 tests locaux PASS** avant commit. Le nouveau HEAD devra subir sa propre CI.

**Gate ouvert :** le vrai export privé de 151 900 fiches n'est pas sur GitHub Actions ; source Neon read-only limitée à mettre en place sur workflow de confiance avant 1 000 vraies fiches privées et revue humaine de 100 cas. Les URL candidates ne s'ajoutent pas aux **9 990 observations détaillées certifiées**. Aucun fichier privé, secret ou PII n'est uploadé dans la PR, aucun merge / Vercel / write cloud.

## Q1E — OpenSerp canary proof closeout (07/11/2026)

- **HEAD examiné** `c1e75e85c52d6a0d1df013f8a2aded5595155335`, GitHub Actions [run 42412616722](https://github.com/hraaaaf/Akarfinder/actions/runs/42412616722) : **20 tests Python PASS**, **4/4 workflows CI SUCCESS**, canary sur les 885 représentations historiques du dépôt effectué sans écriture cloud.
- Après lecture des champs imbriqués et colonnes `extracted_*`, **71/305** représentations OpenSerp découverte et **30/250** représentations corpus qualité disposent des six champs cœur détectés (un gain de **101 représentations avec champs cœur détectés**, pas 101 nouvelles annonces, et sans preuve d'exactitude indépendante). Avant correctif : **0/305** et **0/250**. Les 555 résultats OpenSerp restent **`partial`**, avec `serp_snippet_not_detail_observation`, sans statut actif ni publication ; 300 Mubawab = 280 `complete_candidate` / 20 `partial`, 30 P0 = 23 / 7.
- Garde-fou ajouté au workflow : les cohorts OpenSerp doivent conserver au moins 71 et 30 indices de champs cœur respectivement, mais **zéro `complete_candidate` et zéro `ready_internal`**, sans changement de droit ou de date. Prochain HEAD et ses CI à vérifier indépendamment.
- **Limite** : ceci vérifie la collecte d'indices SERP, **pas** la précision de l'extraction sur 1 000 vraies fiches privées Neon/Windows ni la revue manuelle de 100 dossiers. Le compteur certifié reste 9 990 / 200 000. Aucun merge, aucune mutation Neon/Supabase, aucun Vercel.
