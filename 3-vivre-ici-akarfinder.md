# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — ROADMAP CANONIQUE V2 / PR #1090 DRAFT / L3 QUARTIER + RUE HUMAN GATES APPROVED**  
**Dernière mise à jour : 2026-09-30**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche active : `feat/akar-map-quartier-target-couche3`**  
**PR canonique : #1090 — base `main` — DRAFT**  
**HEAD produit de départ de cette roadmap : `02b9c7f9e7961e1b22ffc1c5a4ddcd2dcdd3ef7d`**  
**Score visuel interne L3 actuel : 8.8/10 — Human Gate Quartier APPROVED le 2026-09-30**  
**Merge : NON AUTORISÉ**  
**Vercel : aucun déploiement sans autorisation explicite d’Achraf.**

---

## 0. DÉCISION PRODUIT — RESET VIVRE ICI

La phase précédente a prouvé que le shell, le responsive, MapLibre, la navigation et plusieurs truth gates peuvent être techniquement propres sans atteindre le niveau visuel recherché.

Le verdict humain sur le HEAD `02b9c7f9…` est **3/10**.

La nouvelle direction n’est donc pas un polish du rendu actuel. Elle devient un **Living Atlas immobilier progressif**, avec une hiérarchie cartographique claire :

`Maroc → Ville/Atlas → Arrondissement → Quartier → Urban Grain 3D → POI/Landmarks → Bien/Search`

### Principe central

Chaque niveau de zoom change de langage visuel et d’information.

- faible zoom = territoire ;
- zoom ville = grandes surfaces administratives + labels structurants ;
- zoom local = quartier + grain urbain ;
- zoom fin = bâtiments/repères ;
- immobilier = seulement quand la précision source est suffisante.

La carte ne doit plus ressembler à un nuage de points ou à un outil SIG générique.

---

## 1. GOAL / SUCCÈS / PREUVE

### Goal

Construire une carte immobilière territoriale premium, différenciante et truth-safe, qui permette de comprendre une ville avant de chercher un bien.

### Succès observable

- la hiérarchie `Maroc → ville → arrondissement → quartier → bâtiment → bien` se comprend sans explication ;
- chaque couche possède un TARGET visuel et un contrat de vérité ;
- la ville ne repose plus sur un nuage de points dominant ;
- les limites affichées correspondent exactement à leur statut réel ;
- la 3D utilise des footprints/hauteurs/étages sourcés quand disponibles ;
- les POI utilisent un langage iconographique AkarFinder cohérent ;
- les photos apparaissent dans les fiches contextuelles, pas comme bruit permanent sur la carte ;
- aucun pin immobilier exact n’est inventé ;
- 390×844 / 430×932 / 768×900 / 1280×900 validés ;
- revue visuelle indépendante + human gate avant merge.

### Preuve

Pour chaque couche :

1. BEFORE ;
2. TARGET écrit + référence visuelle ;
3. implémentation ;
4. AFTER aux mêmes viewports ;
5. tests/cartographie truth-safe ;
6. comparaison TARGET ↔ AFTER ;
7. score visuel strict ;
8. correction jusqu’au seuil du lot.

CI verte seule n’est jamais une preuve de convergence visuelle.

---

## 2. DOCTRINE CARTOGRAPHIQUE

### 2.1 Vérité géographique

Quatre statuts visuels maximum :

- **CERTIFIÉ** : géométrie revue et publiable → trait continu net ;
- **ADMINISTRATIF** : géométrie administrative sourcée → style distinct + disclosure ;
- **INDICATIF** : emprise dérivée / contexte → halo ou liseré diffus, jamais présenté comme frontière ;
- **REPÈRE** : centroïde/label uniquement → aucun polygone.

### 2.2 Vérité bâtiment

Trois niveaux :

- **A — hauteur métrique sourcée** : extrusion réelle ;
- **B — nombre d’étages sourcé** : extrusion dérivée, marquée comme dérivée ;
- **C — footprint seulement** : bâtiment plat / pseudo-profondeur visuelle non métrique.

Aucune hauteur arbitraire n’est présentée comme réelle.

### 2.3 Vérité immobilière

- pin exact seulement si coordonnées du bien réellement vérifiées ;
- sinon zone/cluster/CTA Search ;
- aucune fausse précision pour “faire riche”.

---

## 3. SOURCES / BENCHMARKS À CONSERVER

### Overture Maps — bâtiments

Overture fournit des footprints de bâtiments et, selon les objets, `height`, `num_floors`, `min_height`, ainsi que des `building_part` permettant des formes 3D plus détaillées.

Références :
- https://docs.overturemaps.org/schema/reference/buildings/building/
- https://docs.overturemaps.org/schema/reference/buildings/building_part/

### MapLibre GL JS — rendu 3D

MapLibre sait afficher les bâtiments en `fill-extrusion` et peut intégrer des couches 3D supplémentaires.

Référence :
- https://maplibre.org/maplibre-gl-js/docs/examples/

### OpenStreetMap — Simple 3D Buildings

OSM supporte notamment `height`, `building:levels`, `min_height`, `building:part`, roof/material/color.

Référence :
- https://wiki.openstreetmap.org/wiki/Simple_3D_Buildings

### Mapbox Standard — benchmark visuel uniquement

Benchmark pour hiérarchie cartographique premium : bâtiments extrudés, landmarks 3D, éclairage, POI, végétation, terrain.

Référence :
- https://docs.mapbox.com/map-styles/guides/standard-styles/

AkarFinder ne doit pas copier ce style ; il sert de niveau d’ambition.

---

# 4. TARGETS PAR COUCHE

## L0 — MAROC / NATIONAL

### TARGET

Une carte territoriale premium, simple et immédiatement lisible.

Visuellement :
- Maroc dominant ;
- régions/côtes clairement lisibles ;
- villes phares seulement au zoom initial ;
- aucune pollution de POI locaux ;
- identité AkarFinder bleu/navy ;
- densité très faible ;
- progression de zoom naturelle.

### Référence

Le système visuel national AkarFinder existant reste la référence de thème.

### Succès

- 6–8 villes phares visibles sans collision ;
- régions lisibles ;
- retour national évident ;
- aucun détail local prématuré ;
- 390/430/768/1280 cohérents.

### Anti-target

- nuage de labels ;
- pin wall ;
- satellite dominant ;
- villes secondaires qui masquent les principales.

---

## L1 — VILLE / ATLAS CASABLANCA

### TARGET

**Casablanca doit se lire comme un atlas territorial, pas comme une carte satellite avec points.**

La structure principale est polygonale.

### Géométrie disponible vérifiée

Le repo contient déjà 16 polygones d’arrondissements Casablanca issus de relations OSM :

`data/geo/casablanca-arrondissements-osm.json`

Audit :
`data/geo/casablanca-arrondissements-osm.audit.json`

État :
- 16 features ;
- topologies valides ;
- statut actuel `shadow` ;
- `reviewed:false`.

Ils peuvent servir de **squelette preview administratif**, mais ne doivent jamais être présentés comme “16 quartiers certifiés”.

### TARGET visuel

- 16 arrondissements = grandes masses territoriales ;
- bordures fines premium ;
- palette ton-sur-ton AkarFinder ;
- nom de l’arrondissement dans sa surface ;
- quartiers connus affichés comme labels secondaires à l’intérieur ;
- hover = élévation visuelle / accent ;
- click = drill-down ;
- satellite absent par défaut ou très secondaire ;
- index latéral compact, jamais dominant.

### Succès

Au premier regard, l’utilisateur doit comprendre :  
“Casablanca est composée de territoires ; je peux entrer dans l’un d’eux.”

### Anti-target

- 134 points bleus dominants ;
- gros panneau de recherche couvrant la carte ;
- 16 arrondissements présentés comme 16 quartiers ;
- choroplèthe “prix” par défaut.

---

## L2 — ARRONDISSEMENT

### TARGET

Un territoire administratif clairement focalisé, avec les quartiers/repères qu’il contient.

Exemple : arrondissement Maârif.

### Visuel

- arrondissement dominant au centre ;
- voisins atténués ;
- frontière administrative nette + badge explicite ;
- quartiers internes affichés uniquement selon statut réel ;
- axes structurants visibles ;
- rail/panneau contextuel réduit mais riche ;
- marché, mobilité, vie locale comme couches secondaires.

### Succès

L’utilisateur comprend la différence entre :
- arrondissement ;
- quartier ;
- zone indicative ;
- point de repère.

### Anti-target

- frontière administrative vendue comme quartier ;
- halo flou sans explication ;
- panneau qui masque le territoire.

---

## L3 — QUARTIER

### TARGET

Le TARGET Maârif existant reste la référence de composition locale :

- carte dominante ;
- focus territorial évident ;
- rail premium desktop ;
- map-first mobile ;
- POI sobres ;
- grain urbain riche ;
- aucune fausse géographie.

Le fichier de contrat existant reste actif :

`docs/handovers/AKARFINDER_MAARIF_TARGET_CONTRACT.md`

### Règles selon vérité disponible

#### Quartier avec contour certifié
- boundary net ;
- légère mise en relief ;
- surface distincte ;
- voisins secondaires.

#### Quartier sans contour certifié
- aucun faux polygone ;
- centroïde + halo indicatif ;
- wording “zone indicative” ;
- pas de claim métrique.

### Succès

Le quartier devient la scène principale.  
Routes, bâtiments et POI restent secondaires.

### Anti-target

- simple OpenFreeMap recoloré ;
- boundary fantôme ;
- densité bâtiment illisible ;
- mer dominante ;
- quartier perdu dans la ville.

---

## L4 — URBAN GRAIN / BUILDINGS 3D

### TARGET

Créer une vraie sensation de ville en volume, sans inventer la géométrie.

### Source prioritaire à auditer

1. Overture Buildings ;
2. Overture BuildingParts ;
3. OSM/OpenFreeMap existant ;
4. comparaison couverture/qualité avant choix final.

### POC obligatoire

Zone test :
**Maârif / Twin Center / Parc de la Ligue Arabe**

Mesures à produire avant implémentation large :
- nombre total de footprints ;
- % avec `height` ;
- % avec `num_floors` ;
- % avec `building_part` ;
- couverture relative Overture vs OpenFreeMap ;
- poids tiles / performance.

### Rendu

- vraie hauteur → extrusion ;
- étages → extrusion dérivée identifiable ;
- footprint-only → plat / faible pseudo-depth ;
- bâtiments secondaires plus légers ;
- landmarks majeurs plus lisibles ;
- éclairage doux, pas de rendu jeu vidéo.

### Succès

Le quartier doit sembler construit, pas dessiné.

### Gate

Si le POC Maârif n’apporte pas un gain visuel massif, l’approche 3D est rejetée avant généralisation.

---

## L5 — POI / LANDMARKS

### TARGET

Un **langage iconographique AkarFinder propriétaire**.

### Carte

Par défaut : pictogrammes, pas photos.

Familles initiales :
- éducation ;
- parc/nature ;
- santé ;
- commerce ;
- café/restauration ;
- sport ;
- transport ;
- culture/patrimoine.

### Landmarks majeurs

Twin Center, Stade Mohammed V, grands parcs, monuments :
- pictogramme/silhouette spécifique si nécessaire ;
- modèle 3D uniquement si source fiable et coût justifié.

### Photos

Les vraies photos apparaissent uniquement :
- au click/tap ;
- dans la fiche contextuelle ;
- dans le rail ;
- dans une story/preview locale.

Jamais en mosaïque permanente sur la carte.

### Succès

Les POI aident à comprendre le quartier sans devenir la carte.

### Anti-target

- dizaines de thumbnails ;
- icônes multicolores façon Google Maps ;
- labels qui masquent les bâtiments ;
- POI non sourcés.

---

## L6 — LIVING CONTEXT

### TARGET

Transformer la carte en outil de décision résidentielle.

Couches contextuelles activables :
- Vie locale ;
- Mobilité ;
- Éducation ;
- Santé ;
- Espaces verts ;
- Marché.

Ces couches ne doivent jamais toutes être actives simultanément.

### Succès

Une seule intention principale à la fois.

Exemple :
`Vie locale` → POI pertinents + rail adapté + buildings toujours lisibles.

---

## L7 — BIEN / SEARCH HANDOFF

### TARGET

Vivre Ici explique le territoire. Search vend/explore le stock.

### Carte

- pas de pins de biens par défaut dans l’Atlas ;
- CTA “Voir les biens” ;
- bascule explicite en mode immobilier ;
- pins/clusters uniquement quand la précision source le permet.

### Succès

Transition naturelle :

`Comprendre le quartier → Voir les biens disponibles`

---

## L8 — MARKET INTELLIGENCE

### TARGET

Price / density / listings restent une couche d’analyse séparée.

Jamais la couche cartographique principale.

### Succès

- couche activable ;
- légende claire ;
- provenance et date visibles ;
- aucune confusion entre territoire et donnée marché.

---

# 5. ROADMAP D’EXÉCUTION V2

## LOT A — Canon reset + TARGET locks

**Goal**  
Faire de ce document la source unique de roadmap Vivre Ici.

**Travail**
- [x] human gate 3/10 enregistré ;
- [x] architecture par couches définie ;
- [x] targets L0→L8 définis ;
- [x] anciennes certifications conservées comme historique, pas comme état visuel courant.

**Succès**
Aucune équipe/agent ne peut confondre CI verte avec TARGET atteint.

---

## LOT B — Casablanca Geometry Truth

**Goal**  
Qualifier le squelette territorial de Casablanca.

**Travail**
- auditer les 16 arrondissements shadow ;
- vérifier provenance/licence/topologie ;
- définir wording/style preview ;
- ne pas les publier comme quartiers ;
- préparer interaction hover/click.

**Gate**
16/16 géométries exploitables en preview administrative, ou matrice explicite des exclusions.

---

## LOT C — Casablanca Atlas V1

**Goal**  
Remplacer la ville “points + index” par une vraie lecture polygonale.

**Travail**
- surfaces arrondissements ;
- labels premium ;
- quartiers secondaires ;
- index compact ;
- drill-down ;
- palette AkarFinder ;
- pas de satellite dominant.

**TARGET**
L1.

**Gate**
Score humain ≥ 7/10 avant de poursuivre le polish local.

---

## LOT D — Arrondissement Drill-down

**Goal**  
Créer le niveau intermédiaire ville → quartier.

**Travail**
- focus territoire ;
- voisins atténués ;
- quartiers internes ;
- disclosures de vérité ;
- navigation retour ville / entrée quartier.

**TARGET**
L2.

---

## LOT E — Neighborhood Geometry Qualification

**Goal**  
Distinguer vrais contours quartier des simples labels/centroïdes.

**Travail**
- registre `certified / administrative / indicative / point-only` ;
- qualification progressive Casablanca ;
- aucun faux contour.

**TARGET**
L3 truth contract.

---

## LOT F — Building Truth Benchmark

**Goal**  
Décider le moteur 3D à partir de données réelles.

**Travail**
- extraction bbox Maârif depuis Overture ;
- comparaison OpenFreeMap/OSM ;
- métriques footprint / height / floors / parts ;
- licence/attribution ;
- performance.

**Gate**
Décision documentée : Overture / OpenFreeMap / hybride / reject.

---

## LOT G — Maârif Urban Grain POC

**Goal**  
Produire le premier quartier réellement volumétrique.

**Travail**
- footprints ;
- extrusions truth-safe ;
- hiérarchie bâtiments ;
- éclairage ;
- roads simplifiées ;
- focus quartier ;
- Twin Center / landmarks.

**TARGET**
L3 + L4.

**Gate**
Gain visuel évident vs HEAD `02b9c7f9…`.  
Si le POC n’est pas spectaculaire, ne pas généraliser.

---

## LOT H — AkarFinder POI Language

**Goal**  
Créer une iconographie locale cohérente.

**Travail**
- 8 familles max ;
- pictogrammes monochromes/duotone ;
- silhouettes landmarks ;
- règles collision/zoom ;
- fiche photo au click.

**TARGET**
L5.

---

## LOT I — Living Context

**Goal**  
Transformer l’atlas en outil de décision.

**Travail**
- Vie locale ;
- Mobilité ;
- Éducation ;
- Santé ;
- Espaces verts ;
- Market mode séparé.

**TARGET**
L6 + L8.

---

## LOT J — Search Handoff

**Goal**  
Relier compréhension territoriale et stock immobilier.

**Travail**
- CTA Search ;
- contexte city/district transmis ;
- aucun faux pin ;
- mode biens séparé.

**TARGET**
L7.

---

## LOT K — Multi-city Scalability

**Goal**  
Prouver que le système n’est pas Casablanca-only.

**Villes pilotes**
- Rabat ;
- Marrakech ;
- Tanger.

**Gate**
Même architecture, uniquement données/config spécifiques.

---

## LOT L — Final Certification

**Obligatoire**
- 390×844 ;
- 430×932 ;
- 768×900 ;
- 1280×900 ;
- BEFORE/TARGET/AFTER ;
- exact-head artifact ;
- truth tests ;
- performance ;
- deuxième revue visuelle indépendante ;
- human gate.

**Merge**
Seulement après human gate explicite.

**Vercel**
Seulement après autorisation explicite.

---

# 6. SCOREBOARD VISUEL

| Couche | État actuel | Target minimum lot | Final |
|---|---:|---:|---:|
| L0 Maroc | à revalider | 8/10 | ≥9/10 |
| L1 Ville Atlas | 3/10 | ≥7/10 | ≥9/10 |
| L2 Arrondissement | non certifié | ≥7/10 | ≥9/10 |
| L3 Quartier | **8.8/10 — Human Gate APPROVED** | ≥7.5/10 | Human Gate validé |
| L4 Urban Grain 3D | **POC Maârif prouvé / intégré à L3** | ≥8/10 POC | poursuivre au niveau Rue/Proximité |
| L5 POI | partiel | ≥8/10 | ≥9/10 |
| L6 Living Context | partiel | ≥8/10 | ≥9/10 |
| L7 Search handoff | fonctionnel | ≥8/10 | ≥9/10 |
| L8 Market Intelligence | séparé | ≥8/10 | ≥9/10 |

Aucun score automatique ne remplace le human gate.

---

# 7. ÉTAT FACTUEL COURANT

## Rue / Proximité — HUMAN GATE APPROVED

Human Gate Product Owner : **APPROVED — provisoire**, le 2026-10-05.

Exact validated HEAD :
`6c08d01974eaf2f5defe8dc5825f5727b871260c`

Preuves :
- score visuel interne sévère : **9.2/10** ;
- Rue AFTER : run **36775545052** ✅ ;
- artifact **11125453378** ;
- digest `sha256:6c0284b179e3dacb2c74413e3cbdc0c8d0d1009558a225799ff42e9cc0be3bc5` ;
- Multi-city **36775544854** ✅ ;
- Casablanca Visual **36775545113** ✅ ;
- N3 **36775544826** ✅ ;
- P1A.6 **36775544745** ✅ ;
- 390×844 / 430×932 / 768×900 / 1280×900 validés ;
- `architectural-paper-v2` ;
- aucun merge ;
- aucun déploiement Vercel.

Dette visuelle explicitement ouverte :
- **remplacer la photo actuelle du quartier Maârif** par une image plus premium et représentative ;
- cette dette n'annule pas le Human Gate Rue, mais doit être traitée avant le closeout final Vivre Ici.

---

## L3 Quartier Maârif — HUMAN GATE APPROVED

HEAD exact validé : `1af9dd1e5f51c90e528ac68fc1ce7db9434dc0bd`

Preuves :
- Human Gate explicite Product Owner : **APPROVED — Quartier** le 2026-09-30 ;
- score visuel interne sévère : **8.8/10** ; ce score n'est pas réécrit en 9.x ;
- basemap : `voyager-inspired-openfreemap-v1` ;
- bâtiments : `standard-inspired-overture-v1` ;
- polish : `material-relief-v3` ;
- labels : `akarfinder-owned` ;
- contexte : `raised-indicative-zone`, truth-safe, jamais présenté comme frontière de quartier ;
- Overture : 4 917 bâtiments chargés ; 772 hauteurs exactes ; 4 145 estimées depuis niveaux ;
- Visual AFTER : run **36751693759** ✅ ;
- artifact **11115097297** ;
- digest `sha256:7dc666f7e868342d3bf5b2e3e91e2bd178ad648c12218ed8b56b4e07f1078490` ;
- Multi-city **36751694080** ✅ ;
- N3 **36751693493** ✅ ;
- P1A.6 **36751693563** ✅ ;
- 390×844 / 430×932 / 768×900 / 1280×900 : preuves générées ;
- aucun déploiement Vercel ;
- PR #1090 reste DRAFT et non mergée.

Décision : **L3 Quartier est fermé visuellement par Human Gate.**
La suite canonique est **Rue / Proximité**, sans réouvrir la direction visuelle du Quartier sauf régression prouvée.

---

# 7B. ÉTAT FACTUEL AU RESET

## HEAD `02b9c7f9…`

Prouvé :
- audits navigateur ville N2 et Maârif verts ;
- TypeScript/build Maârif verts ;
- responsive sans overflow ;
- shell MapLibre = canvas parent ;
- 1 617 noms de quartiers/labels sourcés ;
- 134 repères positionnés ;
- 0 contour de quartier publié ;
- 16 polygones d’arrondissements Casablanca disponibles en shadow ;
- aucun merge ;
- aucun déploiement Vercel.

## Human gate

**REJECTED — 3/10**

Motif principal :
la carte reste trop proche d’un outil cartographique plat / point-cloud et trop éloignée d’un Living Atlas immobilier premium.

---

# 8. HISTORIQUE À NE PAS CONFONDRE AVEC L’ÉTAT COURANT

L’ancienne roadmap Territory Dictionary `53/53 pts` reste historiquement valide pour :
- dictionnaire ;
- hiérarchie ;
- collision ;
- navigation progressive ;
- couverture landmarks.

Elle est **SUPERSEDED comme roadmap produit visuelle** par la présente V2.

Les anciennes certifications 9.x ne constituent plus un score visuel courant.

---

# 9. NEXT EXACT

**LOT H — AKARFINDER POI LANGUAGE (L5)**

Goal :
créer une iconographie locale propriétaire, cohérente et truth-safe.

État d'entrée :
- L3 Quartier APPROVED ;
- Rue/Proximité APPROVED provisoire ;
- photo Maârif remplacée et humainement validée ; preuves CI exact-head en cours ;
- TARGET LOT H figé dans `docs/handovers/AKARFINDER_POI_LANGUAGE_TARGET_CONTRACT.md` ;
- BEFORE LOT H lancé avant toute modification visuelle.

Succès observable :
- ≤ 8 familles visuelles ;
- langage monochrome/duotone AkarFinder ;
- hiérarchie landmark > POI ordinaire ;
- collisions/zoom maîtrisés ;
- aucune catégorie/source/coordonnée inventée ;
- 390×844 / 430×932 / 768×900 / 1280×900 ;
- human gate avant fermeture.

Next exact :
1. obtenir le BEFORE POI exact-head ;
2. montrer les captures ;
3. implémenter le langage POI ;
4. AFTER exact-head + truth/responsive gates ;
5. score sévère ;
6. human gate LOT H.

Merge #1090 reste NON AUTORISÉ sans validation explicite.
Aucun Vercel sans autorisation explicite.

---

`3-vivre-ici-akarfinder.md — Vivre Ici AkarFinder — Living Atlas V2 — ACTIVE`
