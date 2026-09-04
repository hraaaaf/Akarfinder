# AKARFINDER SEO CANONICAL

> **Chantier principal : Référencement organique / SEO AkarFinder**
>
> Boussole de reprise : lire ce fichier, puis vérifier `main` / branche / PR / CI / LIVE avant d'agir.

**Statut : ACTIVE — SEO-0 remédiation technique validée sur le code ; merge final en cours de closeout. SEO-1 benchmark initial terminé. SEO-2 qualification data initiale terminée. SEO-3 gate V1 préparé sur branche enfant, non activé.**  
**Dernière mise à jour : 2026-09-04**  
**Repo : `hraaaaf/Akarfinder`**  
**PR baseline : `#999` — `fix/seo-baseline-p1`**  
**Preuve détaillée : `AKARFINDER_SEO_AUDIT_2026-09-04.md`**

---

## 1. GOAL GLOBAL

Faire du SEO un avantage compétitif d'AkarFinder : transformer l'index immobilier en acquisition organique utile, mesurable et scalable au Maroc.

### Succès

- impressions/clics organiques non brandés ;
- Top 10 / Top 3 sur intentions cibles ;
- ratio pages utiles indexées / pages publiées ;
- trafic organique vers résultats et sources ;
- croissance des domaines référents et recherches de marque.

### Preuve principale

**Google Search Console**, complétée par analytics, logs/crawl, SERP observées et tests techniques.

Aucun objectif numérique n'est inventé avant baseline GSC.

---

## 2. THÈSE

Moat : **stock + normalisation + fraîcheur + valeur locale/data + architecture propre + transparence + autorité.**

> **Une combinaison de filtres n'est pas automatiquement une page SEO.**

Une page n'est indexable que si intention, stock, diversité des sources, qualité, contenu distinctif, canonical, maillage et sitemap le justifient.

---

## 3. SEO-0 — BASELINE

### Vérifié

- `/search` : `noindex,follow`, canonical `/search`, hors sitemap.
- `/map` : canonical `/map` ajouté dans PR #999.
- `/immobilier/{city}` : SSR indexable + self-canonical.
- `/immobilier/{city}/{district}` : indexable seulement si registre `validated + seo_eligible`, self-canonical + Breadcrumb JSON-LD.
- surface statique actuelle : **5 villes SEO + 11 quartiers SEO**.
- faux `lastModified: new Date()` retiré du sitemap.
- hostnames SEO/JSON-LD concernés centralisés sur `siteConfig.siteUrl`.
- `/acheter` et `/louer` sont des hubs nationaux ; le helper SEO réserve déjà `/immobilier/{ville}/{acheter|louer}`.
- `/neuf` reste `index,follow` mais aucun programme suffisamment documenté n'est affiché : statut SEO à réévaluer avant scale.

### P0 externes/non prouvés

1. domaine final `akarfinder.ma` non activé lors du baseline ;
2. Search Console non disponible comme preuve dans cette session.

### CI baseline

Sur le HEAD produit final avant le dernier refresh documentaire :

- Canonical Baseline Validation ✅ ;
- Canonical Baseline Compile Validation ✅ ;
- scraper regression ✅ ;
- TypeScript ✅ ;
- Production build ✅ ;
- Phase 1 P1 User Journey ✅ ;
- Phase 1 P1 Final Sweep ✅ ;
- Phase 1 P2 Residual ✅ ;
- UX Gate 0 ✅.

Trois guards Mon Projet obsolètes ont été corrigés pour viser `MonProjetWizardP2` (#19G, #19H, workspace UX). **Aucun changement UI Mon Projet.**

---

## 4. SEO-1 — BENCHMARK MAROC

**Initial terminé le 2026-09-04.**

- **Kaynly** : ville×transaction, ville×transaction×type, quartiers/résidences, prix/m², volumes, fraîcheur, multi-portails.
- **Mubawab** : domination transactionnelle classique ville/type/quartier.
- **Yakeey** : profondeur locale/facettes + référentiels prix.
- **AlerteImmo** : agrégation, ville/type, médiane, FAQ, alertes.

Décision : ne pas copier la profondeur combinatoire. Priorité = **gate stock/qualité → landings prouvées → data moat**.

---

## 5. SEO-2 — SNAPSHOT DATA DE CLOSEOUT

### Source

`public.public_search_representations_v1`

Sous-ensemble strict :

```text
display_eligibility = eligible_primary
freshness_status = fresh_confirmed
```

**Snapshot revalidé au closeout du 2026-09-04 :**

- **2 445** représentations strictes ;
- **8** domaines source distincts ;
- `updated_at` le plus récent observé : **2026-09-03 13:13:24 UTC**.

Un relevé intermédiaire utilisait une représentation antérieure du read-model ; ses chiffres ont été **écartés** au profit de ce snapshot final revalidé.

### Ville × intention après normalisation

Normalisation intention : `sale|buy|achat → acheter`, `rent|location → louer`.

| Ville | Acheter | Sources | Louer | Sources |
|---|---:|---:|---:|---:|
| Agadir | 115 | 4 | 173 | 4 |
| Casablanca | 260 | 5 | 198 | 5 |
| Marrakech | 216 | 6 | 254 | 6 |
| Rabat | 186 | 4 | 165 | 4 |
| Tanger | 161 | 4 | 160 | 4 |
| Fès | 102 | 5 | 106 | 3 |

**Conclusion :** les 10 couples acheter/louer des **5 villes SEO actuelles** franchissent largement le floor V1 `≥20 représentations + ≥3 sources`. Fès le franchit aussi côté data mais n'est pas encore dans le `CitySlug` SEO actuel.

### Ville × intention × type

Normalisation minimale :

- `appartement → apartment` ;
- `terrain → land` ;
- `bureau → office` ;
- `local commercial|local_commercial → commercial`.

Au floor exploratoire `≥20 + ≥3 sources`, **47 combinaisons** passent sur Agadir, Casablanca, Fès, Marrakech, Rabat et Tanger.

Répartition :

- Agadir : 6 ;
- Casablanca : 11 ;
- Fès : 3 ;
- Marrakech : 12 ;
- Rabat : 9 ;
- Tanger : 6.

Ce floor est un **gate d'availability SEO**, pas une certification statistique de marché et pas un équivalent déclaré du niveau DB `strong`.

### Quartiers

Contrôle croisé DB observé :

- 96 métriques quartier inspectées ;
- 92 `insufficient`, 4 `limited`, 0 certifiée ;
- `public_activation=false` sur les segments observés ;
- aucune publication correspondante retrouvée dans `published_neighborhood_intelligence` pour les 11 slugs SEO actuels.

Décision : **ne pas étendre la surface quartier avant franchissement d'un gate data défendable**. Les 11 pages existantes ne sont pas modifiées dans #999.

---

## 6. SEO-3 — GATE DYNAMIQUE

### Taxonomie cible

`/acheter` ou `/louer`  
→ `/immobilier/{ville}/acheter` ou `/immobilier/{ville}/louer`  
→ type seulement après gate.

`/search?...` reste **noindex**.

Le niveau `/{ville}/{segment}` contient déjà `[district]`. Pour éviter toute collision Next.js, les intentions seront des routes **statiques** `acheter/` et `louer/`, pas un deuxième segment dynamique.

### Gate V1 préparé

Branche enfant : `feat/seo-eligibility-gate-v1`.

Contrat :

1. normalisation intention/type partagée ;
2. lecture serveur du read-model public ;
3. filtre strict `eligible_primary + fresh_confirmed` ;
4. floor `20 représentations + 3 sources` ;
5. fail-closed si inventaire indisponible ;
6. **aucune activation sitemap/robots/route dans SEO-3A** avant CI dédiée.

---

## 7. RÉFÉRENCES TECHNIQUES

Priorité : Google Search Central.

- Faceted navigation : `https://developers.google.com/search/blog/2024/12/crawling-december-faceted-nav`
- Canonicalisation : `https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls`
- Sitemaps : `https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap`
- Structured data : `https://developers.google.com/search/docs/appearance/structured-data/search-gallery`

---

## 8. ROADMAP

- **SEO-0** : remédiation technique validée ; merge/post-merge + GSC/domaine final restent séparés.
- **SEO-1** : benchmark initial ✅.
- **SEO-2** : qualification data initiale ✅.
- **SEO-3A** : gate V1 préparé, non activé ; prochaine preuve = CI dédiée.
- **SEO-3B** : intégration contrôlée sitemap/indexation après preuve.
- **SEO-4** : premières landings transaction×ville qualifiées.
- **SEO-5** : data moat prix/m²/volumes/fraîcheur avec méthodologie défendable.
- **SEO-6/7** : technical SEO + maillage.
- **SEO-8** : autorité.
- **SEO-9** : boucle GSC.
- **SEO-10** : scale gates.

---

## 9. NEXT EXACT

1. certifier le dernier HEAD documentaire de PR #999 ;
2. si vert : merger #999 et vérifier `main` ;
3. **aucun déploiement Vercel** ;
4. rattacher/rebaser `feat/seo-eligibility-gate-v1` sur le `main` mergé ;
5. lancer la CI SEO-3A ;
6. seulement si verte : intégrer le gate à la taxonomie/sitemap dans SEO-3B.

Human gates : **déploiement Vercel, activation domaine final, accès Search Console si nécessaire**.
