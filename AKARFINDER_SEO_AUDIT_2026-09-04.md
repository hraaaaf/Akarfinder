# AkarFinder SEO Audit — 2026-09-04

## Goal

Établir le baseline SEO réel, corriger les défauts techniques sûrs, mesurer le gap concurrentiel et dériver un premier gate stock/qualité depuis les données AkarFinder.

## Git

- Repo : `hraaaaf/Akarfinder`
- Base auditée : `main` @ `82128a865149b0ded2f2ba5b408cd69bbda39a08`
- Branche : `fix/seo-baseline-p1`
- PR : `#999`
- Aucun déploiement Vercel demandé ou effectué par ce chantier.

## Baseline technique

| Surface | Indexation | Canonical | Sitemap | Décision |
|---|---|---|---|---|
| `/search` + paramètres | `noindex,follow` | `/search` | non | conserver hors index |
| `/map` + paramètres | indexable | `/map` ajouté dans #999 | oui | canonicaliser les variantes |
| `/immobilier/{city}` | indexable villes contrôlées | self | oui | conserver, gate avant scale |
| `/immobilier/{city}/{district}` | registre `validated + seo_eligible` | self | oui | ne pas étendre sans gate data |
| `/acheter`, `/louer` | indexable | pas de canonical explicite au baseline | hubs | parents de la future taxonomie transactionnelle |
| `/neuf` | `index,follow` | pas de canonical explicite au baseline | oui | réévaluer avant scale |

Surface statique : **5 villes SEO + 11 quartiers SEO**.

### Corrections #999

- canonical `/map` ;
- URLs SEO/JSON-LD concernées centralisées vers `siteConfig.siteUrl` ;
- faux `lastModified: new Date()` retiré du sitemap.

### Gates externes non prouvés

- domaine final `akarfinder.ma` non activé lors du baseline ;
- Search Console non disponible dans cette session.

## CI

Trois guards Mon Projet obsolètes attendaient `MonProjetWizardP1A` alors que le produit monte `MonProjetWizardP2` : #19G, #19H et `mon-projet-workspace-ux.test.ts`. Ils ont été corrigés sans changement UI.

Sur le HEAD produit avant le dernier refresh documentaire :

- Canonical Baseline Validation ✅ ;
- Canonical Baseline Compile ✅ ;
- scraper regression ✅ ;
- TypeScript ✅ ;
- Production build ✅ ;
- User Journey ✅ ;
- P1 Final Sweep ✅ ;
- P2 Residual ✅ ;
- UX Gate 0 ✅.

## Benchmark concurrentiel initial

- **Kaynly** : ville×transaction, ville×transaction×type, quartier/résidence, prix/m², volumes/fraîcheur, multi-portails.
- **Mubawab** : très fort sur ville/type/quartier transactionnel.
- **Yakeey** : profondeur locale, facettes, référentiels prix.
- **AlerteImmo** : agrégation, ville/type, médiane, FAQ, alertes.

Lecture : AkarFinder ne doit pas répondre par une explosion combinatoire d'URLs. Son angle doit être **fraîcheur + normalisation + provenance + qualité + data utile**.

## Snapshot data final revalidé

### Read-model

`public.public_search_representations_v1`

Filtres :

```text
display_eligibility = eligible_primary
freshness_status = fresh_confirmed
```

Revalidation de closeout :

- **2 445** représentations ;
- **8** domaines source ;
- `max(updated_at)` = **2026-09-03 13:13:24 UTC**.

Un snapshot intermédiaire utilisait une représentation antérieure du read-model. Il est écarté ; les chiffres ci-dessous sont ceux de la revalidation finale.

### Ville × intention normalisée

`acheter = sale|buy|achat`, `louer = rent|location`.

| Ville | Acheter | Sources | Louer | Sources |
|---|---:|---:|---:|---:|
| Agadir | 115 | 4 | 173 | 4 |
| Casablanca | 260 | 5 | 198 | 5 |
| Marrakech | 216 | 6 | 254 | 6 |
| Rabat | 186 | 4 | 165 | 4 |
| Tanger | 161 | 4 | 160 | 4 |
| Fès | 102 | 5 | 106 | 3 |

Les **10 couples** acheter/louer des 5 villes SEO actuelles passent le floor V1 `≥20 + ≥3 sources`. Fès le passe aussi côté data.

### Ville × intention × type

Aliases : `appartement→apartment`, `terrain→land`, `bureau→office`, `local commercial|local_commercial→commercial`.

Au même floor exploratoire `≥20 + ≥3 sources`, **47 combinaisons** passent :

- Agadir 6 ;
- Casablanca 11 ;
- Fès 3 ;
- Marrakech 12 ;
- Rabat 9 ;
- Tanger 6.

Ce floor sélectionne des **surfaces candidates** ; il ne certifie ni un prix de marché ni la représentativité statistique.

## Quartiers

Contrôle DB :

- 96 métriques inspectées ;
- 92 `insufficient`, 4 `limited`, 0 certifiée ;
- `public_activation=false` sur les segments observés ;
- aucune publication correspondante dans `published_neighborhood_intelligence` pour les 11 slugs SEO actuels.

Décision : ne pas étendre les quartiers avant gate data. Réutiliser la politique de fiabilité existante plutôt que créer un système statistique parallèle.

## Taxonomie retenue

Le helper SEO prévoit déjà :

`/immobilier/{ville}/{acheter|louer}`

Comme `[district]` occupe déjà le second segment dynamique, l'implémentation sûre est :

- `/immobilier/[city]/acheter/page.tsx` ;
- `/immobilier/[city]/louer/page.tsx` ;
- pas de second `[intent]` dynamique.

`/search?...` reste `noindex`.

## SEO-3A préparé

Branche enfant : `feat/seo-eligibility-gate-v1`.

Le code préparé :

- normalise intentions/types ;
- lit `public_search_representations_v1` côté serveur ;
- exige `eligible_primary + fresh_confirmed` ;
- applique `20 représentations + 3 sources` ;
- fail-closed si inventory indisponible ;
- n'active encore aucune URL/sitemap/robots.

## Conclusion

Chemin court :

1. certifier/merger #999 ;
2. rattacher SEO-3A au `main` mergé et obtenir sa CI ;
3. si verte, activer progressivement `transaction × ville` ;
4. types seulement après gate ;
5. pages prix/data seulement avec méthodologie statistique défendable.

## Next exact

`CI final #999 → merge → post-merge Git → SEO-3A CI → SEO-3B activation contrôlée`.

**Aucun déploiement Vercel sans autorisation explicite.**
