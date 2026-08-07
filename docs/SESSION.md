# AkarFinder — Session courante

**Mise à jour : 2026-08-07**  
**Lot DATA actif : DATA-1.3B — Common Crawl URL Index Live Evidence**  
**Lot UX actif : CARTE-QUARTIER-P1A.0 — Contrat produit & documentaire**

Ce fichier est le handover opérationnel court du projet. L’historique détaillé reste dans Git, les PR et les preuves techniques. `docs/ROADMAP.md` reste l’unique roadmap canonique.

## Main canonique

- `main` inclut la roadmap DATA consolidée ;
- dernier merge de synchronisation documentaire : **PR #325** ;
- `main` confirme **Mon Projet P1B ✅ PR #318** ;
- DATA-1.1 / DATA-1.2 / DATA-1.3A sont mergés ;
- aucune migration DATA-1 ;
- aucune écriture Source Registry automatique ;
- aucun bypass.

## Lots DATA-1 acquis

### DATA-1.1 — Domain Census Core ✅

PR **#322**, mergée.

- core déterministe/offline ;
- normalisation URL/domain ;
- agrégation providers, dates, villes et signaux techniques ;
- états Registry explicites ;
- fail-closed sur preuves contradictoires ;
- aucune permission ou policy inférée ;
- adaptateur B3 `reserve_unregistered_source` ;
- priorité de revue `HIGH / MEDIUM / LOW / NOISE` ;
- gate CI dédiée.

### DATA-1.2 — Existing Reserve Census ✅

PR **#323**, mergée.

Snapshot Production read-only du 2026-08-07 :

- **37 009** lignes = **37 009 URLs distinctes** dans `reserve_unregistered_source` ;
- **7 051 domaines distincts** ;
- **554 HIGH / 9 280 URLs** ;
- **429 MEDIUM / 4 880 URLs** ;
- **6 050 LOW / 17 468 URLs** ;
- **18 NOISE / 5 381 URLs** ;
- premier batch prioritaire : **983 domaines HIGH + MEDIUM**.

La réserve prouve que la découverte existe déjà à grande échelle ; le goulot prioritaire devient la qualification et la policy.

### DATA-1.3A — Common Crawl URL Index Contract ✅

PR **#324**, mergée avec **19/19 workflows verts**.

- ne remplace pas les harvesters CDX existants ;
- vise les hosts inconnus du Census via le URL Index Parquet ;
- crawl initial : `CC-MAIN-2026-25` ;
- lane A : `MA_TLD_REAL_ESTATE` ;
- lane B : `MOROCCO_EXTERNAL_REAL_ESTATE` ;
- réutilise `ALL_ACQUISITION_CITIES` ;
- SQL reproductible + manifest `warcFetchAllowed=false` ;
- rapport `KNOWN_TO_CENSUS / NEW_TO_CENSUS` ;
- tout candidat reste `UNREVIEWED` avec `effectivePolicy=null` ;
- aucun WARC fetch, aucune ingestion, aucune nouvelle dépendance produit.

## Doctrine DATA active

Invariant :

`DISCOVERED ≠ AUTHORIZED ≠ INGESTIBLE ≠ DISPLAYABLE`

Pipeline de qualification :

`DISCOVERY → CENSUS → SOURCE REVIEW → POLICY → CONNECTOR CANDIDATE → INGESTION/INDEXATION SI ÉLIGIBLE`

Une capacité technique ou un résultat Common Crawl ne vaut jamais autorisation.

## État produit acquis

- Accueil P1 ✅
- Neuf P1 ✅ — score 9,1/10
- Acheter P1 ✅ — score 9,1/10
- Louer P1 ✅ — score 9,0/10
- Mon Projet P1A ✅ — PR #314
- Mon Projet P1B ✅ — PR #318
- Source Registry v2 ✅
- Freshness Engine ✅
- Discovery Expansion B3 ✅
- Coverage Gap Auditor ✅
- Partner Feed B3.4.x ✅
- DATA-1.1 / 1.2 / 1.3A ✅

## Audit Carte / Quartier confirmé sur `main`

Audit initial global : **7,4/10**.

Fondations déjà présentes :

- `/map` = vraie MapLibre interactive ;
- `/search` = Atlas des résultats + positions exactes certifiées + intelligence quartier ;
- `/immobilier/[city]/[district]` = page quartier SEO canonique ;
- `geo-entity-registry` = identité géographique canonique ;
- `canonical-neighborhood-data.ts` = adaptateur canonique existant ;
- géométries quartier déjà amorcées, notamment Casablanca.

Failles confirmées :

- `/map` consomme encore directement `lib/map/neighborhood-data.ts` au lieu de la couche canonique ;
- fallback benchmark quartier → ville sans scope public explicite ;
- commodités seedées en code sans provenance item-level suffisante ;
- `/map` ne porte essentiellement que `city` dans l’URL ;
- page quartier → carte perd `district` ;
- page quartier → Search utilise encore `city + q` ;
- Search ne possède pas encore `district` comme filtre structuré dans son contrat de requête ;
- fond MapLibre clair/sombre reste trop générique et insuffisamment AkarFinder.

## Vision Carte / Quartier verrouillée

- Search = moteur de recherche canonique ;
- Map = moteur d’exploration spatiale et d’intelligence ;
- hiérarchie : `Maroc → Ville → Quartier → Zone → Bien` ;
- route quartier canonique conservée : `/immobilier/[city]/[district]` ;
- URL Map cible : `city + district + layer + intention utile + project_id si fourni` ;
- villes puis quartiers différenciés par couleur en mode Explorer uniquement avec géométries réelles ;
- couches préparées : Explorer, Marché, Densité, Style de vie ;
- une couleur = une signification active ;
- prix public = `DISTRICT / CITY / UNAVAILABLE` ;
- positions de biens exactes uniquement lorsqu’elles sont certifiées ; le reste est agrégé par zone ;
- Map Design System AkarFinder : plus graphique, chaleureux et premium, sans imitation Google Maps ni copie de Waze ;
- buildings/landmarks utilisables à fort zoom à partir de géodata traçable ;
- illustrations de landmarks séparées de la vérité géographique ;
- mobile = carte plein écran + bottom sheet ;
- desktop = carte dominante ~65–70 % + intelligence ~30–35 %.

## Gate qualité UX/UI désormais obligatoire

Après **chaque étape UX/UI** :

1. double-check fonctionnel et visuel ;
2. score documenté ;
3. **minimum 9,0/10** pour avancer ;
4. si score < 9,0/10 : reprise immédiate, nouveau double-check et nouveau score ;
5. aucune dette visuelle connue ne doit être maquillée en « polish futur » si elle appartient au périmètre du lot ;
6. fin de lot : `README.md`, `docs/ROADMAP.md`, `docs/SESSION.md` relus et alignés avant merge.

## Lot UX actif — CARTE-QUARTIER-P1A.0

Branche : `agent/carte-quartier-p1a0-contract`.

Périmètre : documentation/contrat uniquement.

Livrables :

- correction de la roadmap obsolète Mon Projet P1B (#315 → #318) ;
- inscription de la roadmap CARTE / QUARTIER P1A/P1B/P2 ;
- doctrine Map/Search/Geo ajoutée au README ;
- gate UX/UI ≥ 9/10 ajoutée aux règles d’exécution ;
- maintien explicite de DATA-1.3B comme lane DATA active ;
- aucun code applicatif, aucune migration.

Gate P1A.0 : cohérence architecture/produit/documentation ≥ 9/10, puis PR/merge avant P1A.1.

## Lot DATA actif — DATA-1.3B

Objectif : exécuter réellement les deux requêtes URL Index définies par DATA-1.3A avec un moteur compatible Parquet/Common Crawl, puis mesurer le gain net du Census.

Preuves obligatoires :

- moteur utilisé : Athena, DuckDB ou Spark ;
- crawl exact ;
- SQL exact ;
- volume scanné/coût si applicable ;
- hosts lane A / lane B ;
- overlap avec les **7 051 domaines DATA-1.2** ;
- nombre net de `NEW_TO_CENSUS` ;
- top nouveaux hosts par volume de signal ;
- échantillon de faux positifs ;
- confirmation : aucun WARC fetch.

## Prochaines actions exactes

### UX

1. certifier et merger **CARTE-QUARTIER-P1A.0** ;
2. repartir du `main` synchronisé ;
3. ouvrir **P1A.1 — Geo Canonical Core** ;
4. inventorier les consommateurs directs des trois couches géographiques avant modification ;
5. supprimer le bypass de `/map` vers `neighborhood-data.ts` sans modèle parallèle ;
6. tester l’identité canonique Map/Search/SEO/Mon Projet ;
7. double-check + score ; ne pas ouvrir P1A.2 tant que P1A.1 < 9/10.

### DATA

1. poursuivre la PR **#326 — DATA-1.3B** sans la mélanger au chantier UX ;
2. exécuter/valider les deux lanes URL Index ;
3. mesurer `NEW_TO_CENSUS` contre les **7 051 domaines** ;
4. auditer les faux positifs ;
5. ne créer/modifier aucune policy Source Registry avant revue explicite ;
6. ne faire aucun WARC fetch.
