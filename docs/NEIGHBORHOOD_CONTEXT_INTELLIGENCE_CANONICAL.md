# AkarFinder — Neighborhood Context Intelligence — CANONICAL

Date : 2026-08-26
Statut : **ACTIVE — Lots 1–4 CLOSED, Lot 5 ACTIVE**
Autorité : ce fichier est le document maître du chantier. Les anciens CONTRACT / ROADMAP / HANDOVER restent des preuves historiques et de reprise, mais toute décision nouvelle doit être réconciliée ici.

---

# 1. Vision

AkarFinder doit aider à décider **où habiter ou investir**, pas seulement à localiser une annonce.

La couche Neighborhood Context Intelligence transforme chaque quartier canonique en contexte immobilier utile :

`Quartier canonique → POI vérifiés → repères utiles → Carte → page quartier → annonce → Search`

Le produit ne cherche pas à reproduire Google Maps. Il sélectionne les **repères qui structurent réellement la vie et la décision immobilière**.

La vue quartier par défaut reste courte, lisible et décisionnelle : **5 à 8 anchors maximum lorsque la donnée le permet**, puis catégories détaillées à la demande.

---

# 2. Doctrine produit

1. **Vérité avant richesse** : mieux vaut 4 repères prouvés que 8 inventés.
2. **Même identité partout** : un POI garde le même `poi_id` et le même `canonical_neighborhood_id` sur Carte, quartier, homepage et annonce.
3. **Pas de fausse frontière** : un POI proche d’un centroïde n’est jamais présenté comme « dans le quartier » sans preuve territoriale.
4. **Wording sûr** : sans frontière certifiée, utiliser `autour du repère quartier` ou équivalent.
5. **Pas de faux temps** : aucune durée de trajet depuis un centroïde quartier.
6. **Semantic zoom** : national = silence POI ; ville = anchors structurants ; quartier = anchors utiles ; bien exact = proximité + routing/isochrones si autorisés.
7. **Sélection, pas annuaire** : maximum 2 anchors d’une même catégorie dans la sélection par défaut.
8. **Pas de score subjectif** de sécurité, prestige, qualité de vie, rentabilité ou attractivité sans chantier séparé et preuve défendable.
9. **Acquisition hors render path** : aucun appel implicite à un service communautaire au chargement d’une page produit.
10. **Provenance obligatoire** : source, attribution, droits/licence, date d’observation, fraîcheur et confiance sont conservées.
11. **Fail-closed** : donnée invalide, stale ou ambiguë = masquée ou état `insufficient`, jamais reconstruite.
12. **Continuité certifiée** : live prioritaire. Un snapshot certifié peut servir de seed temporaire s’il reste frais, conserve sa provenance et est explicitement marqué `certified_seed`.
13. **Aucun déploiement Vercel sans autorisation explicite.**

---

# 3. Fondations mergées à réutiliser

- ANN-L5 Geo Foundation — PR #739, merge `b44bd5d04299a18e778f7e42251cdcb07b364a77`, runs `31943466077` / `31943502557`.
- ANN-L6 Vivre ici — PR #743, merge `2c1cb0650189397c3c350d6bad30b8f8e1d3cecd`, run `31947615421`.
- P6 Ville/Quartier — PR #839, merge `e7f7ac753b1fbb41303cd19f0cb0377bff070512`.
- HVR-4 — PR #859, merge `993f3bc6d7107d3b9d08ce7efea1f1267c4e87cd`.
- Carte nationale N2 — PR #888, run `32704717514`.
- Partner → Neighborhood → Market Intelligence V2 — PR #896, merge `cbfd80af575c0eafc58ae0dc4a2273565a2e46d6`.

---

# 4. Contrats cibles

## NeighborhoodPoiV1
Identité stable, source, source entity ID, nom normalisé, catégorie `LivingHereCategory`, coordonnées, URL source, attribution/licence, `observed_at`, fraîcheur, confiance et statut.

## NeighborhoodPoiRelationV1
`canonical_neighborhood_id + poi_id + relation + distance + méthode/preuve + confiance`.
Relations : `inside_certified_boundary | authority_linked | near_certified_reference | unresolved`.

## NeighborhoodAnchorV1
Projection produit déterministe : quartier, POI, rang, catégorie, rôle, raison de sélection et wording territorial truth-safe.

## NeighborhoodContextReadModelV1
Projection aval unique pour Carte, page quartier, homepage et listing : identité canonique, anchors, catégories disponibles, `coverage_status`, provenance, fraîcheur et snapshot/version.

---

# 5. Roadmap opérationnelle

## Lot 1 — National POI Source + Registry Foundation — CLOSED ✅
- PR #904
- HEAD certifié `44e33c74d9a625be07cf46d4d2020ee742353549`
- run `32758616578` SUCCESS
- artifact `9531912146`
- capture score 9,2/10, validation humaine reçue
- merge `b2a899eaf11f945e980a3c39f4e195c51270b859`

## Lot 2 — Neighborhood Assignment + Anchor Selection — CLOSED ✅
- PR #906
- HEAD certifié `ee1356a7442112b4fba0d2f93894222fdcc52dea`
- run `32772338668` SUCCESS
- artifact `9536743646`
- 12 anchors, 0 faux inside, 0 truth finding
- capture score 9,4/10, validation humaine reçue
- merge `fb177022594f5cbc7a628e3edad3c4ffd5ec0ae5`

## Lot 3 — Neighborhood Context Read Model + API — CLOSED ✅
- PR #907
- HEAD certifié `a5660ba016d1525ea1fb6b8b3d1880af631fc963`
- run `32896269829` SUCCESS
- 27/27 tests + TypeScript + production build SUCCESS
- artifact `9581394884`
- digest `sha256:68e988877ff0123e24989d209b1196d85642c159b73ba208cc0f4297c5c1ef68`
- 6 read-models pilotes, 12 anchors uniques, 0 truth finding
- capture score 9,5/10, validation humaine reçue
- merge `c304e4bd0ae0b23334fe3a6c510459ecedf7c77f`

## Lot 4 — Carte Repères + Semantic Zoom — CLOSED ✅

### Goal atteint
Ajouter une couche `Repères` truth-safe sans dégrader la carte dominante.

### Résultat vérifié
- overlay `Repères` indépendant des modes Prix / Densité / Annonces ;
- national et ville sans quartier : 0 bruit POI ;
- quartier : anchors bornés du read-model L3 ;
- filtres contextuels déterministes ;
- popup POI compacte avec provenance, distance au repère et wording territorial ;
- aucune durée inventée ;
- aucun faux `Dans le quartier` ;
- hit targets ≥44 px ;
- raccords Rabat Market Intelligence, National Explore et carte générique ;
- sheet mobile Agdal compact pour préserver la carte ;
- popup mobile corrigée pour rester au-dessus des contrôles.

### Preuve finale
- PR **#913** ;
- HEAD exact certifié `3cf3ef6f3b2ce7ba6ac79870696485dc67507a67` ;
- run **`32947835434`** SUCCESS ;
- contrat présentation + TypeScript + production build + Chromium + AFTER gate SUCCESS ;
- 16/16 captures AFTER et preuves popup mobile/desktop ;
- artifact **`9599100679`** ;
- digest `sha256:e2a75f303ca1a90395231a9462eb5d3fd850df7be35e6faf5de4b463db1c91dd` ;
- score visuel **9,4/10** ;
- validation humaine explicite reçue le 2026-08-26 ;
- merge squash **`ff7ab0e9ba5acd59dd143084dc8cbb593eb62923`** ;
- aucun Vercel.

### Anomalie transverse consignée
Le smoke historique C5 attend encore une métrique visible dans le sheet mobile replié. L4 masque volontairement cette métrique jusqu'à `Détails` pour préserver la carte. Ce harnais devra être réaligné ; il ne constitue pas une preuve de régression produit L4.

---

## Lot 5 — Convergence Page quartier + Vivre ici + Homepage — ACTIVE

### Goal visuel
Faire converger page quartier, module `Vivre ici`, homepage et contexte listing vers **le même `NeighborhoodContextReadModelV1`**, sans source POI parallèle ni wording divergent.

### Succès
- mêmes `poi_id` / `canonical_neighborhood_id` sur les surfaces convergées ;
- suppression ou neutralisation progressive des `proximityHighlights` parallèles lorsqu'ils dupliquent Neighborhood Context ;
- états `covered / partial / insufficient / unavailable` visibles sans embellissement ;
- aucune donnée stale/rejected publiée ;
- mêmes règles de provenance et territorial wording que L3/L4 ;
- responsive 390/430/768/1280 ;
- score visuel cible ≥9,3/10 ;
- human gate explicite avant fermeture.

### Process obligatoire
1. auditer les surfaces et sources actuelles ;
2. captures BEFORE 390/430/768/1280 des surfaces touchées ;
3. Goal écrit + critères ;
4. mockup/wireframe avant implémentation ;
5. implémentation ;
6. AFTER mêmes viewports ;
7. comparaison BEFORE / target / AFTER + tests ;
8. score + validation humaine.

---

## Lot 6 — National Scale + Quality/Freshness Certification — OPEN
Couverture nationale mesurée, refresh reproductible, stale masqué, provenance complète, canaries et certification finale. Human gate final obligatoire.

---

# 6. Règle de fermeture des lots

`implémentation → tests → preuve → capture → validation utilisateur → merge/closeout → lot suivant`

**Aucun lot n’est CLOSED avant validation explicite de sa capture par l’utilisateur.**

---

# 7. Avancement

- Lot 1 : CLOSED ✅
- Lot 2 : CLOSED ✅
- Lot 3 : CLOSED ✅
- Lot 4 : CLOSED ✅
- Lot 5 : ACTIVE
- Lot 6 : OPEN

**Avancement global vérifié : 4/6 = 66,7 %.**

---

# 8. Git / gouvernance

Fichier maître : `docs/NEIGHBORHOOD_CONTEXT_INTELLIGENCE_CANONICAL.md`.

PR roadmap : #902. Lots : #904, #906, #907, #913.

---

# 9. Next exact

**Lot 5 — Convergence Page quartier + Vivre ici + Homepage**

1. inventorier les surfaces et leurs sources POI/contextuelles actuelles ;
2. identifier les `proximityHighlights` ou autres vérités parallèles ;
3. capturer les BEFORE sur 390/430/768/1280 ;
4. figer un mockup cible de convergence ;
5. seulement ensuite implémenter la convergence sur `NeighborhoodContextReadModelV1` ;
6. aucun Vercel.
---

## 10. Statut opérationnel au 9 novembre 2026 — ne pas confondre certification historique et données vivantes

- Les certifications L1/L2/L3 de 2026-08 restent des validations **historiques de code et de preuves à leur date** ; elles ne certifient pas que les POI sont encore frais en novembre. La ligne 4/6 de la roadmap est l'historique des clôtures, **pas un taux de couverture POI actuelle**.
- Le seed ANN-L5 a été observé le **16 août 2026**, TTL maximum de **30 jours**. Au **9 novembre 2026**, les six read-models de production rendent **0 ancre fraîche** et le statut **unavailable** ; aucune donnée n'est artificiellement rafraîchie. Une fiche vide peut être techniquement correcte et commercialement incomplète.
- L'ancien test L1 attendait 13 lignes dans un seed qui en contient **12**. Le test L3 attendait Agdal covered/5 dans la fixture datée 24 août, mais la source versionnée donne **partial/4** à cette date ; l'API réelle aujourd'hui doit donner **0** pour Agdal.
- Le rapport L3 dissocie maintenant **technical gate ok** et **live_coverage_ready=false**. Il mesure un **historical_fixture** gelé au 24 août (11 ancres sélectionnées avec les données actuelles du dépôt) et un **live runtime** (0 ancre au 9 novembre). Aucun retour à la fraîcheur sans provenance extérieure certifiée.
- Le pilote Geofabrik Maârif du 9 novembre fournit **415 candidats OSM en QA privée**, pas des pins publics. Les scripts et contrats sont documentés dans `scripts/neighborhood-context/MAARIF_GEOFABRIK_PRIVATE_QA.md`. Le contour arrondissement OSM reste *shadow* non certifié ; référence administrative prioritaire : plan homologué **décret n° 2.26.658 du 16 septembre 2026, BO n° 7548 du 1er octobre 2026** ([Agence urbaine de Casablanca](https://www.auc.ma/e-services-2/e-documents/)).
- Pour la PR Vivre Ici #1197, aucune attestation de couverture live, aucun merge, aucune activation de la frontière et aucun déploiement Vercel sans revue SIG et vérification opérationnelle des POI. Source et tests CI exact HEAD à vérifier avant clôture.

### 09/11/2026 — distinction PA 2026 / frontière d'arrondissement

- Référence de planification urbaine : [Agence urbaine de Casablanca, P.A Maârif 2026, décret 2.26.658, BO 7548](https://www.auc.ma/e-services-2/e-documents/). Un **plan d'aménagement** définit des règles d'usage du sol ; son périmètre n'est pas automatiquement une frontière administrative, ni la limite du quartier Maârif central.
- Source textuelle administrative : [Commune de Casablanca, situation géographique de l'arrondissement Maârif](https://maarif.casablancacity.ma/fr/article/420/situation-geographique). Pour homologuer une géométrie, obtenir l'acte et la cartographie de délimitation compétente et confronter les axes. [FAQ de l'Agence urbaine d'Agadir : distinction périmètre d'aménagement / périmètre urbain](https://aua.ma/faq/).
- **NO-GO** : ne pas qualifier le contour OSM shadow de limite officielle sur la seule base d'un PA 2026. Le preview contour arrondissement reste OFF en production ; le quartier central est un objet différent.

### 09/11/2026 — état de reprise LOT01-K (hors production)

- Sous-lot Geofabrik offline : 415 candidats OSM privés, 24 dossiers prioritaires, **0 admis** au sas de preview faute de revue indépendante complète ; aucune injection au read-model L1/L2, DB ou API. `scripts/neighborhood-context/maarif-offline-review-admission.mjs` + 11 tests négatifs. Le statut des sources numériques « modifiées récemment » ne signifie pas commerce ouvert ; âge de l'objet OSM distinct de la date du dump.
- Décision qualité : les deux parcours `NeighborhoodPoiV1` et `LivingHereModel` ne regroupent plus les POI différents par simple nom et proximité ; IDs distincts préservés, pas de déduplication de quais opposés. L1/ANN-L6 tests dédiés.
- CI L3 PR : légère (tests/TS/JSON vérité), le build et la capture graphique lourde seulement après fusion sur `main` dans un workflow séparé ; politique d'efficacité vérifiée localement. Les échecs L1/L2 Overpass du HEAD distant `91a33d1b` expriment l'absence de données vivantes, **pas un seuil à abaisser**.
- Reprise : finaliser preuves individuelles de GPS/activité/licence, conserver 0 dans UI tant qu'aucun dossier valide ; certifier limite administrative indépendante du PA 2026 ; captures BEFORE/AFTER comparables ; closeout CI/merge/human gate de release. **Aucun déploiement Vercel sans autorisation**.

### 09/11/2026 — Gouvernance CI L1/L2 (LOT01-N)

- La PR #1197 avait 2 échecs persistants L1/L2 sur HEAD `c610970d` : Overpass public dégradé, **aucune donnée réelle** ; seed ANN-L5 du 16/08/2026 désormais périmé.
- La validation de **code** est désormais isolée : workflows PR légers `Neighborhood Context L1 Contracts (NOT live coverage)` et `Neighborhood Context L2 Contracts (NOT live coverage)` avec tests déterministes, TypeScript et garde contre faux rapports. Les workflows n'interrogent plus les endpoints tiers pendant chaque PR, ne réclament pas de succès de couverture en tant que preuve métier.
- Le **contrôle opérationnel STRICT** reste séparé : `Neighborhood Context L1 L2 Live Availability (STRICT)`, job uniquement `main` au planning 05h17 UTC et manuel, L1/ L2 source réelle Overpass, seuils originaux intacts : **L1 ≥4/6**, **L2 ≥5 ancres**. Si l'amont échoue, cette vérification **échoue** et bloque la certification des données, malgré le succès technique des PR.
- Ces nouveaux jobs planifiés ne sont **pas activés avant un éventuel merge sur main** ; leur existence en Draft ne constitue aucune preuve de couverture ni autorisation de déploiement.
- Tests synthétiques de sécurité `neighborhood-context-l1-l2-availability-gates.test.mjs` : 7 assertions de refus ; 51/51 tests ciblés locaux, TypeScript PASS, YAML workflows 3/3, efficacité PR 3/3. Aucun changement au read-model runtime ni aux scores métier. **Aucune injection des 415 candidats Maârif ni des 24 dossiers non certifiés**.
- Sous-lot technique L1/L2 : candidat prêt pour révision CI, **pas certifié en PROD**. Next : push, CI exact HEAD, qualification des preuves POI et SIG, UI/UX, merge gate humain, aucun Vercel sans autorisation.

### 09/11/2026 — LOT01-O : garde-fou SIG Maârif

- **Deux périmètres sans interchangeabilité** : secteur central Maârif historique **environ 103 ha** (rapport AUC page imprimée 10), arrondissement Maârif **environ 1 240 ha**. Une aire similaire ne certifie ni la topologie ni la date de la géométrie.
- `lib/map/maarif-historical-sector-reference.ts` porte les axes historiques et **aucune géométrie** / aucune certification SIG actuelle. `MAARIF_TARGET_PILOT_BOUNDARY` identifie explicitement la relation OSM `2801474` comme **arrondissement, non secteur central**. Le routeur contrôle la portée avant de permettre une preview interne derrière son drapeau OFF par défaut.
- 6/6 tests unitaires dédiés verts ; **aucun changement UI public** et aucune publication de POI. Next : obtenir le vrai tracé SIG compétent, qualifier les POI, CI, merge/release gates.

### 09/11/2026 — LOT01-O : qualité de filiation des sources POI

- Les sources **Mapcarta et OpenAlfa** reprennent des POI OSM ; le sas `maarif-offline-review-admission.mjs` les **refuse** désormais comme preuves indépendantes d'identité ou GPS. Cas test : Armel / node 2824741221. 12/12 tests sas.
- Étude hors repo et lecture seule d'une liste Casabus **non documentée** : 3 879 enregistrements arrêts/lignes ; une correspondance plausible `LYCEE EL WALLADA` à **~4 m** de `node/5079740007`, lignes L050/L084, **3 autres arrêts prioritaires sans rapprochement probant**. Aucune date de service vérifiée ni autorisation de publication.
- QA privée Maârif : **17/24 avec indice externe**, **7/24 sans**, **0/24 certifiés** ; la proximité et le nom ne suffisent pas à une attestation d'activité, de GPS indépendant ou de quartier central.
- Contour arrondissement 1 240 ha et secteur central ~103 ha demeurent deux couches **distinctes et non certifiées en SIG actuel**. Next : sources primaires/contrôles humains, preview privée autorisée distinctement, UX final et closeout.

### 09/11/2026 — reprise J9/J10 : source primaire contradictoire, source SIG officielle recherchée

- J9 : `maarif-source-claims-qa.mjs` recoupe 7 adresses primaires de 4 POI, **1 contradiction** officielle 199/192 Bd d'Anfa pour Instituto Español Juan Ramón Jiménez, **3 dossiers manuels**, **0/24 POI admis**. Les nouvelles preuves ne justifient aucun changement read-model. Sources et règles dans `scripts/neighborhood-context/MAARIF_PRIMARY_SOURCE_QA.md`.
- J10 : index AUC P.A Maârif 2026 et iframe ArcGIS référencés avec URLs exactes, mais fichier SIG compétent du secteur central (≈103 ha historique) **absent/non validé**. Iframe porte titre « Hay Hassani » (signe d'audit, non preuve de fausse carte), documents rangés sous `/2020/05/` sans preuve suffisante de version ; il faut vérifier les fichiers, ne pas deviner. Audit : `scripts/neighborhood-context/MAARIF_SECTOR_SIG_SOURCE_AUDIT.md`. Arrondissement OSM ≈1 240 ha shadow OFF. Next : source vecteur officielle et QA de contenu/version; zéro mise en production/merge Vercel.

- **Nouvelle preuve J10 (09/11/2026)** : fichier **AUC PL-ENS.pdf** officiellement lié au P.A Maârif : cartouche AUC **01/2026**, **juillet 2026**, décret 2.26.658, BO 7548, échelle 1/5000 ; PDF de 59 646 409 octets SHA256 `07c4345f48ebc8943a5a256b1264190556f7b9d2cacf544fc1ab0bd718be3daa`, création metadata 09/10/2026. Le grand contour tracé est celui de l'**arrondissement** ; les sous-secteurs réglementaires du plan ne certifient pas automatiquement le **secteur Maârif historique ≈103 ha**. Source du plan 2026 retrouvée, géométrie centrale toujours null et NON-PUBLIABLE ; détaillé `scripts/neighborhood-context/MAARIF_SECTOR_SIG_SOURCE_AUDIT.md`.

### J9/J10 — 09/11/2026 : GPS opérateur et définition géographique Maârif

- **J9** : source officielle Fitness Park Racine (lien Google Maps recherche) donne centre de carte différent de **297,7 m** du node OSM ; cela **n'est pas une preuve d'erreur de pin**, le code QA `maarif-operator-map-hints-qa.mjs` interdit de certifier une entrée depuis un `@lat,lon` de caméra. **8 tests**, 0 POI admis.
- **J10** : le centre historique de prélèvement PBF est à **963,3 m** de `OSM place=quarter node/2186618782`. Sur 415 candidats de la première fenêtre, 76 se situeraient au-delà de 1,8 km du point OSM. Deux points **non certifiés** et une fenêtre d'échantillonnage ne créent aucune frontière. `lib/map/maarif-qa-reference-centers.ts` verrouille le statut. Municipalité : le nom quartier Maârif a un usage actuel plus large que son noyau historique. Secteur AUC historique ~103 ha / arrondissement ~1240 ha restent distincts.
- **SIG QA** : lecture des axes historiques via `maarif-historical-axis-osm-audit.py` depuis PBF Geofabrik épinglé, sortie privée seulement, `derived_polygon:null`. No GO frontière centrale ou publication. **Next** : véritables sources SIG / GPS indépendantes, revue humaine, then 4 viewport UX, closeout PR, gate Vercel explicite.

- **J9 CasaMaps 09/11/2026** : portail municipal `/api/arcgis/fr` 55 couches EPSG:4326, sous-échantillon 7 écoles + 72 pharmacies + 9 clubs, comparaison de 12 des 24 POI QA : **2 correspondances nom/proximité** (Wallada 10,7m ; Pharmacie Al Alia 19,3m), **2 faux positifs rejetés**. Lignée de données, dates et entrée/activité non vérifiées ; 0/24 admis. `maarif-casamaps-name-proximity-qa.mjs` (8 tests), rapport privé PC ; L2 PR doit couvrir ces régressions.
- **J10 axes historiques 09/11/2026** : sur PBF MD5 épinglé, indexation Osmium native, **2 754 090 ways**, **250 fragments possibles - 22 faux noms = 228 voies retenues** sur les 6 axes (N Khattabi 22 / Anfa 42, S Roudani 69, E Zerktouni 65, O Lybie 2 / Bir Anzarane 28). **Aucune continuité de frontière ni polygone central certifié**. Test script `maarif-historical-axis-osm-audit.py`, QA brute hors repo. Next : géométrie officielle, preuves GPS/activité des POI, UX final/closeout. Aucun changement de carte publique / Vercel.

### 10/11/2026 — J9/J10 recoupement municipal et voirie sans prétention de certification

- CasaMaps municipal expose 55 couches, dont 3 couches de POI testées dans bbox QA (13 écoles=7, 26 pharmacies=72, 53 sport=9). Appariement **12 prioritaires → 2 noms distinctifs + proximité plausibles**, 2 faux rapprochements catégories rejetés. **0 certifié**, car filiation, actualisation et ouverture non établies. Régression `maarif-casamaps-name-proximity-qa.mjs`.
- Fit­ness Park : centre de caméra du lien Google Maps à 297,7 m du point OSM ; ne doit jamais être promu comme pin précis sans preuve.
- Axes du secteur Maârif historique : analyse complète Geofabrik 25/60/69/65/3/28 segments associés aux six axes ; **250 associations**, zéro contour fabriqué. Exécution de l'audit `maarif-historical-axis-osm-audit.py` avec rapport privé et `derived_polygon:null`.
- **J9/J10 restent ouverts** ; prochaine action = source municipale/territoriale vectorielle réellement datée, vérification terrain/opérateur indépendante, revue licences, puis seulement intégration preview et QA UX. Branche Draft #1197 sans Vercel.
---

## 2026-11-13 — Vivre Ici / J18 : gel du candidat OSM non publié et preuves de QA de la PR #1197

**Décision de périmètre :** le lot de données indicatives OSM J18 reste un **candidat privé gelé, non publiable (NO-GO data)**. Cette décision documentaire ne supprime ni les objets privés ni les modules. L'achèvement de l'interface Vivre Ici (Quartier 2D, Rue zoom, panneau « Limites non disponibles ») est traité séparément de l'activation de l'API OSM. Elle n'est **pas** une acceptation produit, une autorisation de merge ni de déploiement.

**GOAL UI :** offrir la carte de quartier, la vue Rue et une explication honnête des limites sans afficher de périmètre Maârif central non homologué, sans présenter les POI expirés comme frais.

**PREUVES exactes du HEAD** `d6179842c8fdc845b7da097cf66e29964acca06e` : PR [#1197](https://github.com/hraaaaf/Akarfinder/pull/1197) OPEN/Draft ; 29 workflows terminés, **27 SUCCESS et 2 SKIPPED**. Rapports et captures téléchargés depuis les artefacts GitHub Actions :
- [Casablanca AFTER #43313181577](https://github.com/hraaaaf/Akarfinder/actions/runs/43313181577), artefact `13986034123` : **4/4** vues 390×844, 430×932, 768×900 et 1280×900, carte affichée, 0 erreur JS, 0 overflow, lien Search Maârif conservé ; certaines requêtes de navigation sont marquées `net::ERR_ABORTED`, sans diagnostic métier associé.
- [Multivilles #43313181504](https://github.com/hraaaaf/Akarfinder/actions/runs/43313181504), artefact `13986797679` : **11/11** scénarios sur Casablanca, Marrakech, Agadir, Fès, Tanger, 0 débordement et rendu de carte ; Fès/Tanger rendent honnêtement le **fallback ville**, pas une couverture quartier certifiée.
- [Vivre Ici annonce #43313181451](https://github.com/hraaaaf/Akarfinder/actions/runs/43313181451), artefact `13987311326` : **8/8** scénarios, aucun finding/console error/overflow ; 7 états avec carte et 1 état volontairement masqué.
- **Comparaison visuelle** : ancien artefact Casablanca [#42844148759](https://github.com/hraaaaf/Akarfinder/actions/runs/42844148759) `13777540528` comparé au HEAD `d6179842` sur les 4 mêmes formats. Aucune régression majeure visible dans les captures inspectées ; **aucun score UX 9,5/10 ni résultat VoiceOver/NVDA réel ne sont certifiés**. L'artefact historique n'est pas la production actuelle.
- **Verrou public en source** : `J18H_SOURCE_PUBLICATION_ENABLED=false` ; `app/api/geo/indicative-landmarks/route.ts` répond 404 tant que ce verrou reste désactivé et 503 sans contrôleur si jamais il est activé. `vercel.mjs` porte `git.deploymentEnabled=false`. Aucune preuve HTTP sur le futur déploiement n'est prétendue.
- **Intégrité J18** : manifeste privé SHA256 `e0aca1621c93328ef5dd83ed38d23593839ccf06e71b12e2103d51773b7f4950` vérifié antérieurement par Codex ; **1/1 339 tuile** distante rehashée, 1 338 non vérifiées. Métadonnées Vercel : store privé disponible, 1 340 objets, 9 448 167 octets, sans preuve d'inventaire ou de somme cryptographique complète. Le WAF personnalisé reste non configuré ; le quota Redis est testé isolément mais non intégré à une route publique. **NO-GO J18 publié maintenu**.

**SUCCESS technique limité :** gel non public du candidat J18 documenté, séparation explicite des gates de la carte Vivre Ici et de la future distribution OSM, CI et captures du HEAD revues. **NON ATTEINT :** score UX ≥9,5/10, accessibilité réelle VoiceOver/NVDA, validation de la géométrie du Maârif central, conformité des données POI fraîches, 1 339/1 339 SHA, WAF/identité/quota intégrés pour une publication, validation humaine finale.

**Next exact :** finir la revue produit UX et accessibilité réelle sur la build candidate en conservant la géométrie non certifiée invisible ; faire accepter ou corriger le périmètre réellement prouvé ; tenir la PR Draft tant que les gates sont ouverts. Si ces gates deviennent verts : recontrôler HEAD/CI, état des protections et captures, puis demander un **GO distinct** pour le merge et un autre **GO explicite** pour tout déploiement Vercel. Le chantier J18 de **publication OSM** reste dans la roadmap différée, sans endpoint public et sans activer Blob/Redis/WAF. [Handover Notion J18](https://app.notion.com/p/41777c66336281968368d299b5e79143).

**Interdictions maintenues :** pas de merge, Vercel, changement DB/Blob/WAF, activation de données ni déclaration « terminé/production-ready » sans preuves et autorisations.

### 2026-11-13 — contrôle final de la CI de gel et réserve QA

- **CI entièrement conclue au commit documentaire 59603e43c5347bbab2d10ec8d887b3c1ed453068** : 29 workflows PR, **27 SUCCESS / 2 SKIPPED / 0 FAILURE / 0 RUNNING**, dont Carte National Neighborhoods N2. Il s'agit de la preuve de ce SHA précis ; toute écriture documentaire ultérieure crée un **nouveau SHA** dont la CI doit être relue avant closeout.
- **QA déjà vérifiée avant cet addendum documentaire** : 4/4 captures Casablanca (390, 430, 768, 1280), 11/11 scénarios multivilles, 8/8 scénarios d'annonce et 4/4 passages axe historiques J17 ; captures BEFORE/AFTER examinées sur les quatre formats, sans régression majeure détectée. Les nouvelles suites ne sont pas des tests de lecteurs d'écran réels.
- **Réserve produit importante** : le modèle de données publiées ne fournit encore **aucun repère Maârif suffisamment récent/certifié**, comme le montre la fiche vide ; le bouton Repères ne prouve pas une couverture publique. La bonne information utilisateur reste « Aucun repère suffisamment récent n'est actuellement disponible ». **Évaluation UX cible ≥9,5/10 NON atteinte/certifiée** ; ancien score indicatif ~8/10, pas de nouvelle notation de validation humaine.
- **Gel documenté ≠ lot terminé** : J18 privé non publié et publication NO-GO, mais l'interface Vivre Ici possède encore un gate final sur valeur métier, accès VoiceOver/NVDA et validation humaine. Ne pas bloquer la QA d'interface par la lecture distante des tuiles privées ; celle-ci appartient à la future release OSM, séparée.
- **Next exact** : certifier la présence ou l'absence d'un problème visuel bloquant sur la version candidate et effectuer une vraie revue d'accessibilité ; trancher avec le propriétaire l'acceptation du périmètre **sans POI publics ni frontière SIG**, puis nouveau contrôle de PR/CI, closeout des docs et gates séparés de merge et déploiement. Aucun changement Blob/DB/WAF ou deployment autorisé par cet addendum.
### 2026-11-13 — GO utilisateur — acceptation du périmètre V1 limitée

**DÉCISION EXPLICITE DU PROPRIÉTAIRE (« Go » en réponse au choix V1 limitée)** : accepter le **périmètre fonctionnel** de Vivre Ici V1 comprenant exclusivement : (1) carte Quartier 2D, (2) Rue zoom, (3) panneau explicatif « Limites ». Aucun POI public Maârif non qualifié et aucune frontière administrative/sectorielle non certifiée ne seront présentés comme disponibles ou officiels. Le message d'absence de repère suffisamment récent reste honnête. **Ceci est une acceptation du périmètre V1, pas un PASS de qualité visuelle, d'accessibilité ni une autorisation de release.**

**Séparation formelle de la roadmap** : les 1 339 tuiles OSM indicatives, l'API publique dédiée, la vérification distante 1 339/1 339 SHA256, WAF + identité + quota distribué et la signature de publication sont **hors du chemin critique de cette V1** mais restent dans le chantier J18 OSM **gelé/non publié (NO-GO)**. Aucune modification des Blob, source PBF, DB, WAF, Redis ni ouverture de route. Le chantier OSM ne devient pas PASS par cette décision.

**Preuve de code du HEAD avant cet addendum** : [PR #1197](https://github.com/hraaaaf/Akarfinder/pull/1197) OPEN/DRAFT/non mergée, HEAD \`aea3fc2ca6ac3e24d4165a0ba38d6f5058c0502d\`, 29 workflows terminés : **27 SUCCESS / 2 SKIPPED / 0 FAIL / 0 RUNNING**. Preuves QA déjà documentées : Casablanca 4/4 viewports, multivilles 11/11, annonce 8/8 ; tests automatisés axe historiques J17 4/4 ; comparatifs BEFORE/AFTER 390/430/768/1280 conservés. Le verrou \`J18H_SOURCE_PUBLICATION_ENABLED=false\` et \`vercel.mjs\` \`git.deploymentEnabled=false\` sont maintenus. Un commit documentaire ultérieur exige une relecture de CI sur son propre SHA.

**Gates encore ouverts pour la V1 effectivement diffusée** :
- Score visuel UX cible \`>=9,5/10\` **non certifié**, revue manuelle des trois états et des quatre viewports insuffisante pour proclamer le résultat ;
- Audit VoiceOver/NVDA **réel** non exécuté ; l'absence de violations axe automatisées ne le remplace pas ;
- Pas de POI publics récents/qualifiés dans Maârif ; la V1 ne promet aucune couverture et le secteur central reste sans frontière SIG approuvée ;
- Approbations distinctes **avant merge** puis **avant tout déploiement Vercel** : le GO présent ne les couvre pas.

**Critère de clôture du sous-lot périmètre** : décision produit limitée enregistrée + CI et captures historiques identifiables + publication J18 hors scope. Ce sous-lot décisionnel est acté. **La release V1 demeure NO-GO** jusqu'aux contrôles qualité/validation nécessaires. **NEXT EXACT** : achever QA réelle sur la build candidate (trois modes / quatre viewports + lecteurs d'écran), produire score et rapport, corriger si nécessaire ; ensuite revalider HEAD/CI, closeout et ouvrir séparément les gates de merge et Vercel. Pas de pourcentage global sans dénominateur prouvé.

