# AkarFinder SEO Audit — 2026-09-04

## Goal

Établir le baseline SEO réel avant toute expansion de pages, corriger les défauts techniques sûrs, puis mesurer le gap concurrentiel sur les intentions immobilières marocaines prioritaires.

## Snapshot Git

- Repo : `hraaaaf/Akarfinder`
- Base auditée : `main` @ `82128a865149b0ded2f2ba5b408cd69bbda39a08`
- Branche : `fix/seo-baseline-p1`
- PR : `#999`
- HEAD après correction du guard Mon Projet : `792583552f421514df503430f01d5a97824a520f`
- Aucun déploiement Vercel demandé ou effectué dans ce lot.

## Baseline technique vérifié

| Surface | Crawl / index | Canonical | Sitemap | Rendu / contenu | Action |
|---|---|---|---|---|---|
| `/search` + paramètres | `noindex,follow` | canonical `/search` | hors sitemap | recherche utilisateur | conserver hors index |
| `/map` + paramètres | indexable | canonical `/map` ajouté dans PR #999 | présente dans sitemap | carte UX | empêcher la duplication par paramètres |
| `/immobilier/{city}` | indexable pour villes contrôlées | self canonical | oui | SSR, données ville + liens quartiers + aperçu annonces | conserver, renforcer selon stock |
| `/immobilier/{city}/{district}` | indexable si registre `validated + seo_eligible` | self canonical | oui | SSR, Breadcrumb JSON-LD, contexte local + aperçu annonces | conserver avec futur gate stock/qualité |
| ville/quartier non éligible | non publié / `notFound` selon route | n/a | non | n/a | conserver fermé |

### Surface actuellement contrôlée

Le registre géographique ouvre explicitement :

- 5 villes SEO : Casablanca, Rabat, Marrakech, Tanger, Agadir ;
- 11 quartiers SEO : Casablanca 4, Rabat 3, Marrakech 2, Tanger 1, Agadir 1.

L'éligibilité est actuellement statique (`validation_status="validated"` + `seo_eligible=true`). Elle n'est pas encore conditionnée par un seuil dynamique de stock ou de qualité de données.

## Défauts classés

### P0 — gate stratégique

1. **Domaine final non activé** : le chantier SEO ne doit pas accumuler volontairement de l'autorité sur un hostname transitoire avant décision/activation du domaine final. Aucun changement DNS/Vercel dans ce lot.
2. **Search Console non disponible comme preuve dans cette session** : indexation Google réelle, impressions, clics, canonicals choisis par Google et couverture sitemap restent non prouvés.

### P1 — corrigés dans PR #999

1. `/map` indexable sans canonical alors que la page accepte des paramètres → canonical `/map` ajouté.
2. URLs SEO/JSON-LD codées en dur sur l'hostname Vercel dans plusieurs générateurs → utilisation de la config SEO centralisée.

### P2 — corrigé dans PR #999

1. `sitemap.ts` utilisait `lastModified: new Date()` pour toutes les URLs à chaque build → faux signal de fraîcheur supprimé en l'absence d'une vraie date de modification métier.

### P1 — restant avant scale

1. **Gate d'éligibilité SEO dynamique** : une ville/quartier peut rester `seo_eligible` même si le stock devient trop faible. Le seuil numérique ne doit pas être inventé ; il sera dérivé de la distribution réelle du stock.
2. Vérifier avant expansion : détails annonce, pagination, profondeur de clic, pages orphelines, Core Web Vitals et comportement des URLs retirées/expirées.

## Incident CI indépendant du SEO

Le premier run de PR #999 a échoué sur `#19G Homepage & Search Entry Orchestration V1`, pas sur les fichiers SEO.

Preuves :

- 1 835 / 1 835 tests scrapers passaient ;
- les contrats #11 à #19F passaient ;
- l'échec venait d'une assertion exigeant `<MonProjetWizardP1A` alors que `main` rend déjà `<MonProjetWizardP2` ;
- PR #999 ne modifiait aucun fichier Mon Projet.

Correction minimale sur la branche : le guard #19G vise désormais le composant réellement monté `MonProjetWizardP2` et conserve les assertions transition/search/continuity.

## Benchmark SERP / web observé le 2026-09-04

> Limite : observations de moteur de recherche web public, pas export Google Search Console et pas garantie de position Google personnalisée.

### Kaynly

Surfaces observées :

- ville × transaction : `https://kaynly.com/vente/casablanca` ;
- ville × transaction × type : `https://kaynly.com/vente/casablanca/appartements` ;
- quartier : `https://kaynly.com/vente/casablanca/bourgogne-est` ;
- baromètre : `https://kaynly.com/barometre/casablanca` ;
- maillage villes/quartiers/résidences ;
- données visibles : volumes, médiane, prix/m², comparaison locale, répartition par type, fraîcheur du relevé, source d'origine.

Observation du 31 août 2026 exposée par le site : environ 100 055 annonces agrégées depuis cinq portails.

### Mubawab

Fort sur les intentions transactionnelles directes :

- `Appartement à vendre à Casablanca` ;
- `Location appartement à Rabat` ;
- `Terrain à vendre à Casablanca` ;
- pages quartier telles que Maârif.

Les pages exposent de gros volumes d'annonces et un maillage de catégories/localisations.

### Yakeey

Surfaces observées :

- ville × type ;
- pagination ;
- facettes de prix crawlables ;
- référentiel de prix immobilier par quartier ;
- maillage de recherches populaires ville/quartier/type.

### AlerteImmo

Concurrent agrégateur apparu dans les résultats observés :

- pages `acheter/{ville}/{type}` ;
- volume + prix médian ;
- annonces multi-portails ;
- FAQ locale ;
- proposition de valeur forte sur l'alerte temps réel.

### Autres gagnants observés

- Masaken sur certaines requêtes quartier/type ;
- SoukImmobilier sur certains terrains ;
- Palm Estates Pro sur `prix immobilier Casablanca`.

## Gap analysis initiale

| Dimension | Kaynly | Mubawab / Yakeey | AlerteImmo | AkarFinder actuel | Lecture |
|---|---|---|---|---|---|
| Couverture ville | forte | forte | forte | faible contrôlée | concurrents meilleurs |
| Transaction × ville | oui | oui | oui | non comme landing SEO dédiée | opportunité prioritaire |
| Type × ville | oui | oui | oui | non comme landing SEO dédiée | opportunité prioritaire |
| Quartier | très profond | profond | partiel | 11 pages contrôlées | qualité possible, couverture faible |
| Prix / prix m² | oui | Yakeey fort | médiane | partiel selon read-model | gap important |
| Fraîcheur explicite | oui | variable | promesse temps réel | à structurer | opportunité AkarFinder |
| Déduplication / multi-source | oui | n/a portail / variable | oui | architecture prévue | angle différenciant à prouver |
| Contexte local utile | limité à data marché | variable | FAQ | read-model quartier + carte | AkarFinder peut être meilleur |
| Transparence source / limites | forte | variable | moyenne | forte dans les pages actuelles | AkarFinder peut être meilleur |
| Scale gate qualité | non observable | non observable | non observable | registre contrôlé mais statique | à transformer en gate stock/qualité dynamique |

## Conclusion prouvée

AkarFinder ne doit pas répondre au gap par une explosion combinatoire d'URLs. Le chemin court est :

1. terminer/merger les corrections techniques sûres de PR #999 ;
2. dériver un **gate stock + qualité** à partir des données AkarFinder ;
3. prioriser ensuite les landings `transaction × ville` puis `transaction × ville × type` uniquement quand elles passent ce gate ;
4. construire les pages data/prix seulement lorsque l'échantillon et la méthodologie rendent les statistiques défendables.

## Next exact

- CI PR #999 → vérifier le nouveau run quand nécessaire ;
- si vert : mettre à jour le canonique principal, merger #999, vérifier `main` ;
- sans déploiement Vercel ;
- poursuivre SEO-1 par la query/gap map puis SEO-2 sur les intentions prioritaires.
