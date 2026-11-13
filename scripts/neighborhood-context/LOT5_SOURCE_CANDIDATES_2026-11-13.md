# NCI L5/L6 — Sources potentielles de POI, admission stricte (13/11/2026)

## Pourquoi ce document
Le seed ANN-L5 `2026-08-16T11:08:32.249Z` expire après 30 jours ; les six modèles publics ne peuvent plus produire d'ancres actuelles. La PR #1197 **ne publie rien**. Il faut une nouvelle acquisition `hors render path` puis identité, géolocalisation, source, fraîcheur et relation au quartier contrôlées avant admission.

## Candidats externes effectivement identifiés
1. **Éducation — Ministère de l'Éducation nationale / data.gov.ma.** [Liste des établissements scolaires publics](https://data.gov.ma/data/fr/dataset/api_dataset/listes-des-etablissements-scolaires-publics) : CSV de noms et adresses, licence ODbL signalée. Usage envisagé : correspondance identité/adresse primaire. **Non démontré** : coordonnées GPS fiables par établissement et date de vérification actuelle ; pas de pin.
2. **Santé — Ministère de la Santé / data.gov.ma.** [Liste des hôpitaux](https://data.gov.ma/data/dataset/la-liste-des-hopitaux) : fichier des hôpitaux par province/région, contenu indiqué 2025 ; portail modifié au 29/10/2026. Candidat de vérification institutionnelle **et non preuve d'activité/GPS en novembre 2026**. Ne pas confondre date de modification de la fiche avec date d'inspection d'un établissement.
3. **Transport — opérateur Casablanca.** [Casatramway : ligne T1](https://www.casatramway.ma/horaires/horaires-de-services/ligne-tram-t1) et [plan officiel tramway/busway](https://files.casatramway.ma/s3fs-public/documents/La%20carte%20r%C3%A9seau%20globale%20casatramway%20%26%20casabusway.pdf?VersionId=iqd69Y.0dOx4R6Mh_klxO5J2pW12GRsS) : lignes/stations nommées mais pas d'export GPS vérifié à la précision nécessaire. Candidat pour recoupement du nom d'arrêt et de sa desserte, non source de lat/lon.
4. **OSM / Overpass** : [Export OpenStreetMap](https://www.openstreetmap.org/export), [wiki Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API). Utile comme source de candidats datés + identifiants, **pas un second témoin indépendant lorsqu'on compare deux miroirs d'OSM** ; l'`osm_base` Overpass date le serveur, pas automatiquement une vérification de commerce ouvert.

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
