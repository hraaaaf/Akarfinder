# NCI L5/L6 — Sources potentielles de POI, admission stricte (13/11/2026)

## Pourquoi ce document
Le seed ANN-L5 `2026-08-16T11:08:32.249Z` expire après 30 jours ; les six modèles publics ne peuvent plus produire d'ancres actuelles. La PR #1197 **ne publie rien**. Il faut une nouvelle acquisition `hors render path` puis identité, géolocalisation, source, fraîcheur et relation au quartier contrôlées avant admission.

## Candidats externes effectivement identifiés
1. **Éducation — MENPS (jeu historique).** [Liste des établissements scolaires publics](https://data.gov.ma/data/fr/dataset/listes-des-etablissements-scolaires-publics) : ressources XLS visibles sur la fiche de 2021 (certains index affichent CSV), licence ODbL. Fiche modifiée en décembre 2021 : **ne pas confondre avec les nouveaux jeux de juillet 2026**. Colonnes exactes et coordonnées GPS non vérifiées, fichier brut non obtenu. Aucun pin.
2. **Santé — Ministère de la Santé / data.gov.ma.** [Liste des hôpitaux](https://data.gov.ma/data/dataset/la-liste-des-hopitaux) : fichier des hôpitaux par province/région, contenu indiqué 2025 ; portail modifié au 29/10/2026. Candidat de vérification institutionnelle **et non preuve d'activité/GPS en novembre 2026**. Ne pas confondre date de modification de la fiche avec date d'inspection d'un établissement.
3. **Transport — opérateur Casablanca.** [Casatramway : ligne T1](https://www.casatramway.ma/horaires/horaires-de-services/ligne-tram-t1) et [plan officiel tramway/busway](https://files.casatramway.ma/s3fs-public/documents/La%20carte%20r%C3%A9seau%20globale%20casatramway%20%26%20casabusway.pdf?VersionId=iqd69Y.0dOx4R6Mh_klxO5J2pW12GRsS) : lignes/stations nommées mais pas d'export GPS vérifié à la précision nécessaire. Candidat pour recoupement du nom d'arrêt et de sa desserte, non source de lat/lon.
4. **OSM / Overpass** : [Export OpenStreetMap](https://www.openstreetmap.org/export), [wiki Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API). Utile comme source de candidats datés + identifiants, **pas un second témoin indépendant lorsqu'on compare deux miroirs d'OSM** ; l'`osm_base` Overpass date le serveur, pas automatiquement une vérification de commerce ouvert.

## Découverte de meilleures références MENPS — juillet 2026 (vérifiées le 13/11/2026)

Quatre jeux institutionnels distincts contiennent des ressources XLSX versionnées « Juillet 2026 », mis à jour dans le portail **en septembre 2026** : leur existence est confirmée par la fiche officielle, **pas par le contenu du fichier**.

- [Établissements publics primaires](https://data.gov.ma/data/fr/dataset/liste-des-etablissements-publics-primaire) — version juillet 2026, fiche modifiée 16/09/2026.
- [Établissements publics collégiaux](https://data.gov.ma/data/fr/dataset/liste-de-etablissements-publics-collegial) — version juillet 2026, fiche modifiée 16/09/2026.
- [Établissements publics qualifiants](https://data.gov.ma/data/fr/dataset/liste-des-etablissements-publics-qualifiants) — version juillet 2026, fiche modifiée 16/09/2026.
- [Établissements privés](https://data.gov.ma/data/fr/dataset/liste-des-etablissements-prives-2023) — version juillet 2026, fiche modifiée 16/09/2026.
- [Hôpitaux MSPS](https://data.gov.ma/data/fr/dataset/la-liste-des-hopitaux) — données à fin 2025, fichier XLSX téléversé le 29/10/2026 ; date de mise en ligne **≠** observation fraîche d'un établissement.

**Acquisition du binaire :** tentative de récupération CKAN XLSX infructueuse depuis l'environnement d'exécution. **0 XLSX inspecté, 0 SHA256 du binaire acquis, 0 ligne contrôlée, 0 GPS vérifié, 0 admission.** Il est interdit de supposer la présence de colonnes latitude/longitude. Le catalogue est enregistré dans `lib/neighborhood-context/institutional-admission.ts` avec `resource_sha256=null` et `source_file_inspected=false`.

**Risque de fraîcheur identifié dans l'adaptateur actuel :** `adaptOsmNearbyResult` utilise `result.evidence.fetchedAt` comme `observed_at` pour les objets OSM retournés. Cela décrit la fraîcheur de la **lecture du fournisseur**, pas une preuve indépendante d'activité individuelle. Le sas institutionnel impose à part `individual_verified_at` et `independent_evidence_url/method` : aucune réutilisation automatique de la date de consultation pour qualifier un POI.

**Contrôle machine et statut :** `lib/neighborhood-context/institutional-admission.ts` et les tests L7 imposent un CSV/XLSX source effectivement examiné et haché, GPS fini dans l'emprise Maroc, horodatage par établissement <=30 jours, vérification indépendante, relation territoriale prouvée et validation humaine. Ce contrôle **ne publie jamais automatiquement** ; son rapport dans `artifacts/neighborhood-context-l7-refresh-quality/institutional-source-admission.json` affiche 5 jeux catalogués et 0 POI admis. Les seuils L1 >=4/6 et L2 >=5 anchors ne changent pas.

**Next exact :** obtenir les binaires officiels avec hashes, vérifier le schéma, identifier un petit nombre d'établissements (avec GPS réellement fourni ou corroboré), vérifier individuellement leur existence récente via source indépendante et assignation territoriale, puis soumettre le dossier à validation humaine avant tout changement du read-model. Tant que cette preuve manque, **no public POI**.

## Filtre d'admission non négociable
- Identité `poi_id/source_entity_id` stable, `source_url`, licence + attribution, `observed_at` de l'observation vérifiée, confiance, précision GPS et distinction adresse textuelle / point géographique.
- Toujours distinguer **appartenance à Maârif central** (aucune frontière certifiée) de **proximité au repère quartier**, sans déduire une géométrie d'un arrêt ou d'un centre géocodé.
- Une date de mise à jour d'un portail NE réinitialise PAS le TTL d'un POI individuel.
- 2 sources sérieuses et réellement indépendantes pour les assertions sensibles ; recoupement OSM vs OpenAlfa/Mapcarta ne vaut pas indépendance.
- Toute discordance d'adresse/station => dossier manuel, pas d'injection.
- Live thresholds L1 >= 4/6 quartiers pilotes ; L2 >= 5 ancres truth-safe ; L6 qualité/refresh ; aucune relaxation et aucun `production_provider_claim=true` sans preuves.
- Les 415 candidats QA privés et 1 339 tuiles OSM J18 restent OFF, hors ce sous-lot.
- Sans GPS + fraîcheur + admission, statut **CANDIDAT / NO-GO public**.

## NEXT
Acquérir hors rendu un export institutionnel versionné, vérifier son schéma (en particulier GPS, année et couverture), confronter aux sources indépendantes puis produire un rapport machine lisible `accepted / rejected / manual_review`. Les pilotes restent 0 POI frais tant qu'aucune preuve suffisante n'entre dans le read-model unique. Aucune modification live/DB/Blob/endpoint par cet inventaire.
