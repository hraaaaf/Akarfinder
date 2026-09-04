# AKARFINDER SEO CANONICAL

> **Boussole de reprise du chantier SEO AkarFinder.**
> À toute reprise : lire ce fichier puis vérifier `main`, branche/PR, CI, LIVE, domaine final et Search Console avant d'agir.

**Statut : ACTIVE**  
**Dernière mise à jour : 2026-09-04**  
**Repo : `hraaaaf/Akarfinder`**  
**Main vérifié après SEO-3A : `d409d32db127e74bd59515718c97ccfd76add715`**  
**Preuve baseline : `AKARFINDER_SEO_AUDIT_2026-09-04.md`**

---

## 1. GOAL

Faire du SEO l'avantage compétitif principal d'AkarFinder : transformer l'index immobilier multi-source en acquisition organique utile, mesurable et scalable au Maroc.

### Succès

- croissance impressions/clics organiques non brandés ;
- Top 10 / Top 3 sur intentions cibles ;
- pages indexées majoritairement utiles et alimentées ;
- trafic organique vers Search / sources ;
- croissance domaines référents et recherches de marque.

### Preuve principale

Google Search Console + analytics + logs/crawl + SERP observées + tests techniques.

**Aucun objectif numérique n'est inventé avant baseline GSC.**

---

## 2. THÈSE

Moat SEO : **stock + normalisation + fraîcheur + diversité de sources + data locale + architecture propre + transparence + autorité.**

> Une combinaison de filtres n'est jamais automatiquement une page SEO.

Une surface n'est publiée/indexable que si elle franchit un gate de données et apporte une intention/value distincte.

---

## 3. BASELINE ET BENCHMARK — VÉRIFIÉS

### Technique

- `/search` : `noindex,follow`, canonical propre, hors sitemap.
- `/map` : canonical ajouté.
- faux `lastModified: new Date()` retiré du sitemap.
- hostnames SEO/JSON-LD concernés centralisés sur `siteConfig.siteUrl`.
- 5 villes SEO + 11 quartiers existants au baseline.
- `/acheter` et `/louer` : hubs nationaux existants.
- taxonomie cible déjà cohérente avec `/immobilier/{ville}/{acheter|louer}`.

### Benchmark Maroc initial

- Kaynly : agrégation, déduplication, ville×transaction×type, quartiers/résidences, prix/m², fraîcheur.
- Mubawab : forte occupation transactionnelle classique.
- Yakeey : profondeur locale/facettes + référentiels prix.
- AlerteImmo : agrégation + pages ville/type + données/alertes.

**Décision : ne pas gagner par une ferme à URLs. Gagner par la qualité des pages publiées et les données propriétaires.**

---

## 4. SNAPSHOT DATA SEO-2

Source : `public.public_search_representations_v1`.

Sous-ensemble strict :

```text
display_eligibility = eligible_primary
freshness_status = fresh_confirmed
```

Snapshot revalidé le 2026-09-04 :

- **2 445** représentations strictes ;
- **8** domaines source distincts.

Les 10 couples `acheter/louer` des 5 villes SEO actuelles franchissaient le floor V1 `≥20 représentations + ≥3 sources`. Fès le franchissait également côté data mais n'était pas encore activée comme `CitySlug` SEO.

### Quartiers

Contrôle DB initial : 96 métriques inspectées, 92 `insufficient`, 4 `limited`, 0 certifiée ; `public_activation=false` sur les segments observés.

**Décision : aucune extension de surface quartier avant gate data défendable.**

---

## 5. SEO-3A — GATE D'ÉLIGIBILITÉ ✅ MERGÉ

PR **#1000**, merge commit : `d409d32db127e74bd59515718c97ccfd76add715`.

Gate V1 :

1. intentions normalisées : `sale|buy|achat → acheter`, `rent|location → louer` ;
2. types principaux normalisés ;
3. lecture serveur uniquement depuis `public_search_representations_v1` ;
4. filtre strict `eligible_primary + fresh_confirmed` ;
5. floor `≥20 représentations + ≥3 sources distinctes` ;
6. fail-closed si inventaire/count/preuve invalide ou indisponible ;
7. aucune écriture DB ;
8. aucune route/sitemap/indexation activée dans SEO-3A.

### Preuve CI SEO-3A

HEAD certifié `9d3d85cfd99f9539bbdad66760007cfbcaf09e79` :

- Canonical Baseline Validation ✅ run `33905147445` ;
- Canonical Baseline Compile ✅ `33905147504` ;
- P0 ✅ `33905147439` ;
- P1 ✅ `33905147474` ;
- P2 ✅ `33905147442` ;
- UX Gate ✅ `33905147443` ;
- CI Efficiency ✅ `33905147449`.

Post-merge : `main = d409d32d…` confirmé ; **0 déploiement Vercel** observé après merge.

---

## 6. SEO-3B — PUBLICATION CONTRÔLÉE

### SEO-3B1 — EN COURS

Branche : `feat/seo-gated-city-indexation-v1`.

Goal : brancher le gate sur le **sitemap existant**, sans créer de nouvelle URL ni modifier l'UI.

Règles implémentées sur la branche :

- `sitemap.ts` devient dynamique car l'éligibilité dépend du stock live ;
- une ville n'entre dans le sitemap que si `acheter` **ou** `louer` franchit le gate ;
- si une ville est exclue, ses quartiers le sont également du sitemap ;
- base routes stables conservées ;
- aucun nouveau `lastModified` synthétique ;
- test ajouté dans la suite SEO Eligibility déjà exécutée par la Canonical Baseline.

**SEO-3B1 n'est pas encore mergé ni activé en production.**

### SEO-3B2 — SUIVANT

Appliquer la même décision fail-closed aux directives `robots`/metadata des pages ville, afin d'aligner page-level indexability et sitemap.

---

## 7. TAXONOMIE CIBLE

```text
/acheter | /louer
  → /immobilier/{ville}/acheter | /immobilier/{ville}/louer
  → /immobilier/{ville}/{intention}/{type} uniquement après gate
```

`/search?...` reste **noindex**.

Le niveau `/{ville}/{segment}` contient déjà `[district]` : les futures intentions doivent être des routes statiques `acheter/` et `louer/`, pas un second segment dynamique concurrent.

---

## 8. ROADMAP

- SEO-0 : baseline/remédiation technique ✅
- SEO-1 : benchmark initial ✅
- SEO-2 : qualification data initiale ✅
- SEO-3A : gate V1 ✅ mergé
- SEO-3B1 : gate sitemap ville/quartier — **EN COURS**
- SEO-3B2 : metadata/robots fail-closed
- SEO-4 : premières landings ville×transaction qualifiées
- SEO-5 : data moat prix/m² / volumes / fraîcheur
- SEO-6/7 : technical SEO + maillage interne
- SEO-8 : autorité / backlinks / études data
- SEO-9 : boucle Search Console
- SEO-10 : scale uniquement par preuves

---

## 9. HUMAN GATES / RISQUES

Human gate obligatoire :

- tout déploiement Vercel ;
- activation/migration domaine final `akarfinder.ma` ;
- accès Search Console si authentification/intervention utilisateur nécessaire.

Interdits :

- doorway pages ;
- facettes arbitraires indexables ;
- contenu généré en masse sans valeur propre ;
- copie/stockage d'images sans droits vérifiés ;
- seuil SEO inventé sans données.

---

## 10. NEXT EXACT

1. certifier SEO-3B1 par CI sur `feat/seo-gated-city-indexation-v1` ;
2. corriger tout échec exact ;
3. si vert : PR + merge + post-merge ;
4. aucun déploiement Vercel ;
5. enchaîner SEO-3B2 metadata/robots ;
6. seulement après cohérence sitemap + page-level indexability : SEO-4 routes `ville × acheter/louer`.
