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

## 13/11/2026 — Probe XLSX officielle sur GitHub Actions (version primaire)

- Catalogue : [MENPS primaire](https://data.gov.ma/data/fr/dataset/liste-des-etablissements-publics-primaire), ressource id \`f98bdb47-19a8-4f4d-8407-ae08b56305d5\`.
- Lien exact de la ressource officielle : https://data.gov.ma/data/fr/dataset/4de8f7dc-c536-44e8-93a8-3efd2aca2c52/resource/f98bdb47-19a8-4f4d-8407-ae08b56305d5/download/etablissements_publics_primaire_juillet-2026.xlsx .
- Probe **uniquement dans le workflow GitHub Actions L7 existant**, via \`l7-probe-official-xlsx.ts\` ; pas de modification workflow YAML, pas de test local. Limites 3 Mio et 18 s, HTTPS data.gov.ma strict, contrôles ZIP et en-têtes du premier onglet.
- Sortie : \`official-menps-primary-xlsx-header.json\` dans l'artefact qualité L7, avec téléchargement, octets, SHA256 et en-têtes candidats uniquement. **Le fichier brut et les lignes ne sont pas inclus dans l'artefact**.
- Les horodatages \`dataset_as_of\`, \`fetched_at\`, \`individual_verified_at\` restent séparés. \`gps_columns_candidate=true\` n'est jamais \`gps_values_verified=true\`.
- Contrat immutable du probe : \`accepted_public_pois=0\`, \`public_publish_allowed=false\`. L1/L2/L6 restent les seules gates métier ; pas de promotion automatique depuis un XLSX.
- Issue effective à compléter **après run** ; ne pas déclarer le fichier reçu avant son SHA256 vérifié.

## Diagnostic CI L7 de la récupération officielle — 13 novembre 2026

- [GitHub Actions L7 #43475687847](https://github.com/hraaaaf/Akarfinder/actions/runs/43475687847) : 62 tests PASS, mais le probe MENPS primaire fournit \`fetch failed\`, 0 octets et aucun SHA du XLSX.
- La source primaire reste le [portail MENPS](https://data.gov.ma/data/fr/dataset/liste-des-etablissements-publics-primaire), ressource \`f98bdb47-19a8-4f4d-8407-ae08b56305d5\`. L'index CKAN annonce 649 492 octets, sans somme de contrôle fournie.
- Tentative de correction côté transport sur runner GitHub Actions : après erreur réseau \`fetch failed\` de Node, \`curl\` accepte uniquement le même lien officiel HTTPS et le proxy du runner ; **aucun redirect inter-domaine ni relâchement de certificat**. Tout échec conserve 0 POI et produit un diagnostic. 2 tests supplémentaires de filtrage en CI.
- Prochaine preuve requise : rapport \`official-menps-primary-xlsx-header.json\` sur le nouveau SHA, avec soit vrai SHA256, soit erreur structurée de \`curl\`. La conformité du workflow CI ne valide **aucun** GPS, aucune identité, aucune observation individuelle.

## 13 novembre 2026 — MENPS primaire XLSX : contrôle réel et préparation des candidats

**Acquisition prouvée dans GitHub Actions** ([run L7 #43479523683](https://github.com/hraaaaf/Akarfinder/actions/runs/43479523683)) : fichier officiel primaire juillet 2026, **649492 octets**, SHA256 `e3967f57b114c01c07e5664b01a02fab6393796af4be28fb66d59945880ab148`. Première feuille déclarée `A1:G7964`, colonnes `NOM_ETABL`, `NOM_ETABA`, `AdresseL`, `AdresseA`, `LL_COM`, `LL_PROV`, `LL_REG`. **Aucune latitude/longitude**. Ne pas annoncer 7963 établissements sans compter les lignes réellement lues.

Prochain rapport de préqualification `identity_text_candidates`, généré par le **même workflow GitHub Actions L7**, lit les lignes de la première feuille pour trouver au maximum 3 exemples par ville pilote (Rabat, Casablanca, Marrakech), leurs adresses, communes et provinces, et des mentions textuelles des quartiers ciblés (Agdal, Maârif, Guéliz). **Aucune attribution de coordonnées, aucun usage public, aucune vérité de frontière**. Une école nommée « Agdal » n'est pas automatiquement située à Agdal. Échantillons destinés uniquement au recoupement officiel/indépendant de l'identité et du GPS, et à une vérification individuelle récente.

Aucun nouveau téléchargement supplémentaire ni traitement dans le navigateur/serveur de production. Si le fichier échoue au runner, résultat fail-closed sans échantillon et sans publication. Les gates L1/L2/L6 restent inchangées.

## 13 novembre 2026 — Dossiers d'écoles Maârif, corroboration et homonymes

**Identités à contrôler (primaire public, fichier MENPS juillet 2026 SHA256 e3967f57b114c01c07e5664b01a02fab6393796af4be28fb66d59945880ab148)** : ATTABARI (ligne 227, 76 rue Oussama Bnou Zaid), AL IMAM MALIK (228, rue Mustapha Chokri Petchou), SAKINA BENT AL HOSSEIN (229, rue Soumaya Derb Ghalef), tous déclarés « El Maarif (Arrond.) » **sans démonstration d'appartenance au quartier central ciblé**.

- [MENPS, liste Écoles pionnières 2026](https://www.men.gov.ma) : Imam Malik 01442S, Sakina Bent Al Hossein 01443T, direction Casablanca Anfa. Codes **potentiels**, pas jointure vérifiée au XLSX.
- [Fondation Mohammed VI, adresse régionale de Casablanca](https://www.fm6education.ma/ar/%D8%A7%D9%84%D8%A7%D8%AA%D8%B5%D8%A7%D9%84/) : « près de l'école Attabari, Maârif », corroboration de repère seulement, pas d'activité individuelle datée.
- **Conflits d'homonymes** à ne pas confondre : [Collège Attabari Lissasfa](https://www.telecontact.ma/college-attabari/ecole/casablanca/3110569), [école privée Attabari Guercif](https://www.annuaire-gratuit.ma/ecoles-privees/attabari-s234191.html), [école Imam Malik Moulay Rachid](https://www.etenma.com/ecole.php?code_ecole=79030P31), [Sakina Bent ElHousseine Sidi Othmane](https://www.telecontact.ma/annonceur/ecole-sakina-bent-elhousseine/3112439/casablanca.php).
- Annuaire local et miroir de fichiers historiques **ne démontrent pas** des preuves indépendantes (risque de recopie).
- **Dossier machine lisible** : `LOT5_MAARIF_THREE_PRIMARY_SCHOOLS_EVIDENCE_2026-11-13.json`. GPS NULL, date de vérification d'activité individuelle NULL, appartenance au polygone Maârif central non vérifiée ; statut `rejected` et publication désactivée. Quatre nouveaux tests adversariaux du dossier sous GH Actions L7 uniquement.

**Prochaine preuve manquante** : identifiant unique de l'établissement + coordonnées du bâtiment contrôlées par une source indépendante, activité actuelle datée de moins de 30 jours et relation géographique au périmètre réellement certifié. Aucun simple point OSM/géocodage par adresse ne suffit seul à cette certification.
