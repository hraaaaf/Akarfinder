# AkarFinder SEO Audit — 2026-09-04

## Goal

Établir le baseline SEO réel avant toute expansion de pages, corriger les défauts techniques sûrs, mesurer le gap concurrentiel et dériver le premier gate stock/qualité depuis les données AkarFinder.

## Snapshot Git

- Repo : `hraaaaf/Akarfinder`
- Base auditée : `main` @ `82128a865149b0ded2f2ba5b408cd69bbda39a08`
- Branche : `fix/seo-baseline-p1`
- PR : `#999`
- HEAD produit avant ce closeout documentaire : `c0c9d9f7869ed0e62ef788272bc05d7fbaaf410f`
- Aucun déploiement Vercel demandé ou effectué par ce chantier.

## Baseline technique vérifié

| Surface | Crawl / index | Canonical | Sitemap | Rendu / contenu | Action |
|---|---|---|---|---|---|
| `/search` + paramètres | `noindex,follow` | canonical `/search` | hors sitemap | recherche utilisateur | conserver hors index |
| `/map` + paramètres | indexable | canonical `/map` ajouté dans PR #999 | présente dans sitemap | carte UX | empêcher la duplication par paramètres |
| `/immobilier/{city}` | indexable pour villes contrôlées | self canonical | oui | SSR, données ville + liens quartiers + aperçu annonces | conserver, renforcer selon stock |
| `/immobilier/{city}/{district}` | indexable si registre `validated + seo_eligible` | self canonical | oui | SSR, Breadcrumb JSON-LD, contexte local + aperçu annonces | ne pas étendre sans gate data |
| ville/quartier non éligible | non publié / `notFound` selon route | n/a | non | n/a | conserver fermé |
| `/acheter`, `/louer` | indexable | aucun canonical explicite au baseline | hubs nationaux | contenu + aperçu annonces | conserver ; utiliser comme parents de la future taxonomie |
| `/neuf` | `index,follow` | aucun canonical explicite au baseline | oui | aucun programme suffisamment documenté affiché | réévaluer avant scale |

### Surface actuellement contrôlée

- 5 villes SEO : Casablanca, Rabat, Marrakech, Tanger, Agadir ;
- 11 quartiers SEO : Casablanca 4, Rabat 3, Marrakech 2, Tanger 1, Agadir 1.

L'éligibilité est actuellement statique (`validation_status="validated"` + `seo_eligible=true`). Elle n'est pas encore conditionnée par le stock public réel.

## Défauts classés

### P0 — gates stratégiques

1. **Domaine final non activé lors du baseline** : ne pas construire volontairement l'autorité finale sur un hostname transitoire. Aucun changement DNS/Vercel dans ce lot.
2. **Search Console non disponible comme preuve** : indexation Google réelle, impressions, clics, canonicals choisis par Google et couverture sitemap restent non prouvés.

### P1 — corrigés dans PR #999

1. `/map` indexable sans canonical alors que la page accepte des paramètres → canonical `/map` ajouté.
2. URLs SEO/JSON-LD codées en dur sur l'hostname Vercel → utilisation de la config SEO centralisée.

### P2 — corrigé dans PR #999

1. `sitemap.ts` utilisait `lastModified: new Date()` pour toutes les URLs à chaque build → faux signal retiré en l'absence d'une vraie date métier.

## Incidents CI indépendants du SEO

Trois guards Mon Projet obsolètes ont été trouvés successivement :

- #19G Homepage/Search Entry ;
- #19H User Continuity ;
- Phase 1 P1 User Journey / `mon-projet-workspace-ux.test.ts`.

Ils attendaient encore `MonProjetWizardP1A` alors que le produit monte `MonProjetWizardP2`. Les guards ont été alignés sur P2 sans changement UI Mon Projet.

Preuve historique : le run Canonical Baseline initial exécutait **1 835 / 1 835 tests scrapers avec succès** avant l'échec du guard obsolète.

## Benchmark SERP / web observé le 2026-09-04

> Limite : observations du web public, pas export Google Search Console et pas garantie de position personnalisée.

### Surfaces concurrentes

- **Kaynly** : ville × transaction, ville × transaction × type, quartier, résidence, baromètre prix/m², volumes/médianes/fraîcheur, multi-portails.
- **Mubawab** : intentions transactionnelles ville/type/quartier avec gros volume.
- **Yakeey** : ville/type, facettes, longue traîne locale, référentiels prix.
- **AlerteImmo** : agrégation, ville/type, médiane, FAQ locale, alertes.
- **Autres observés** : Masaken, SoukImmobilier, Palm Estates Pro selon les requêtes.

### Gap principal

| Dimension | Concurrence | AkarFinder | Lecture |
|---|---|---|---|
| Couverture villes/quartiers | forte | 5 villes / 11 quartiers | gap de couverture, à ne pas combler sans gate |
| transaction × ville | présente | helper URL prévu, route non publiée | meilleure première expansion potentielle |
| transaction × ville × type | présente | non publiée | seulement après normalisation + stock multi-source |
| prix / prix m² | forte | partiel | data moat à construire seulement avec méthodologie défendable |
| fraîcheur explicite | variable/forte | read-model disponible | opportunité |
| transparence source/limites | variable | forte | avantage potentiel |

## SEO-2 — distribution du stock public

### Read-model utilisé

`public.public_search_representations_v1`

Qualification stricte :

```text
display_eligibility = eligible_primary
freshness_status = fresh_confirmed
```

Volume brut observé de ce sous-ensemble avant autres filtres : **3 216 représentations**.

### Ville × intention

| Ville | Vente | Sources | Location | Sources |
|---|---:|---:|---:|---:|
| Agadir | 173 | 4 | 115 | 4 |
| Casablanca | 260 | 6 | 198 | 6 |
| Marrakech | 215 | 4 | 254 | 4 |
| Rabat | 166 | 5 | 161 | 6 |
| Tanger | 184 | 4 | 282 | 4 |
| Fès | 102 | 5 | 106 | 4 |

Conclusion : les 5 villes SEO actuelles ont chacune un stock strict multi-source conséquent pour **vente et location**. Fès est également crédible côté data mais n'est pas encore dans le `CitySlug` SEO.

Anomalie : une représentation Marrakech porte `buy` au lieu de `sale`.

### Normalisation minimale avant type-level

- `buy → sale`
- `appartement → apartment`
- `terrain → land`
- `bureau → office`
- `local commercial → commercial`

### Premier floor ville × intention × type

Floor exploratoire pour la query map : **≥20 représentations strictes + ≥3 sources distinctes**.

Ce floor n'est pas déclaré identique au gate DB `strong` ; le sous-ensemble est déjà filtré `eligible_primary + fresh_confirmed` et ce test sert uniquement à sélectionner les premières surfaces candidates.

Combinaisons qui passent après alias mapping :

- **Appartement vente + location** : Agadir, Casablanca, Fès, Marrakech, Rabat, Tanger ;
- **Villa vente** : Tanger.

Les autres combinaisons observées ne franchissent pas simultanément ce floor de volume et diversité de sources.

## Quartiers — contrôle croisé avec la politique data existante

État DB observé :

- 96 métriques quartier inspectées ;
- 92 `insufficient` ;
- 4 `limited` ;
- 0 certifiée ;
- `public_activation=false` sur les segments observés ;
- aucune publication correspondante retrouvée dans `published_neighborhood_intelligence` pour les 11 slugs SEO actuels.

La DB possède déjà une politique de fiabilité plus stricte, avec notamment des seuils d'échantillon, couverture, fraîcheur, diversité des sources, dispersion et outliers.

Conclusion : ne pas créer un deuxième gate statistique divergent pour les quartiers. Réutiliser cette politique autant que possible avant toute expansion SEO quartier.

## Taxonomie retenue

Le repo contient déjà le helper canonical pour :

`/immobilier/{ville}/{acheter|louer}`

Décision :

`/acheter` / `/louer` hubs nationaux  
→ `/immobilier/{ville}/{acheter|louer}`  
→ future surface type uniquement après gate.

`/search?...` reste `noindex` et ne doit pas devenir la surface SEO de facettes.

## Conclusion prouvée

AkarFinder ne doit pas répondre au gap par une explosion combinatoire d'URLs.

Le chemin court est maintenant :

1. certifier et merger PR #999 ;
2. implémenter un **gate unique** : normalisation → stock public frais → diversité des sources → décision d'indexation ;
3. commencer par les landings `transaction × ville` déjà soutenues par le stock ;
4. n'ouvrir les landings type que lorsqu'elles franchissent le gate ;
5. réserver les pages data/prix aux segments statistiquement défendables.

## Next exact

- certifier la CI du HEAD final PR #999 ;
- si vert : merger puis vérifier `main` ;
- aucun déploiement Vercel ;
- lot suivant : SEO-3, implémentation du gate dynamique + tests + intégration sitemap/indexation.
