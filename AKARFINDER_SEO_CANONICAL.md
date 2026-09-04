# AKARFINDER SEO CANONICAL

> Boussole de reprise du chantier SEO AkarFinder.
> À toute reprise : lire ce fichier puis vérifier `main`, branche/PR, CI, LIVE, Vercel, domaine final et Search Console avant d'agir.

**Statut : ACTIVE**  
**Dernière mise à jour : 2026-09-04**  
**Repo : `hraaaaf/Akarfinder`**  
**Main vérifié : `1e88e74b2c00be764103c943afdfa9bb5be58ca0`**  
**Branche active : `feat/seo-gated-neighborhood-indexation-v1`**  
**Preuve baseline : `AKARFINDER_SEO_AUDIT_2026-09-04.md`**

---

## 1. GOAL

Faire du SEO l'avantage compétitif principal d'AkarFinder : transformer l'index immobilier multi-source en acquisition organique utile, mesurable et scalable au Maroc.

### Succès

- croissance des impressions/clics organiques non brandés ;
- progression Top 10 / Top 3 sur intentions cibles ;
- pages indexées majoritairement utiles et alimentées ;
- trafic organique vers Search et les sources ;
- croissance des domaines référents et recherches de marque.

### Preuve principale

Google Search Console + analytics + logs/crawl + SERP observées + tests techniques.

**Aucun objectif numérique n'est inventé avant baseline GSC.**

---

## 2. THÈSE

Moat SEO : **stock + normalisation + fraîcheur + diversité de sources + data locale + architecture propre + transparence + autorité.**

> Une combinaison de filtres n'est jamais automatiquement une page SEO.

Une surface n'est publiée/indexable que si elle franchit un gate de données et apporte une valeur distincte.

---

## 3. BASELINE / BENCHMARK — VÉRIFIÉS

### Technique

- `/search` : `noindex,follow`, canonical propre, hors sitemap ;
- `/map` : canonical propre ;
- faux `lastModified: new Date()` retiré du sitemap ;
- hostnames SEO/JSON-LD centralisés sur `siteConfig.siteUrl` ;
- 5 villes SEO + 11 quartiers existants au baseline ;
- `/acheter` et `/louer` : hubs nationaux existants ;
- helper metadata déjà prévu pour `/immobilier/{ville}/{acheter|louer}`.

### Benchmark Maroc initial

- Kaynly : agrégation, déduplication, ville×transaction×type, quartiers/résidences, prix/m², fraîcheur ;
- Mubawab : forte occupation transactionnelle classique ;
- Yakeey : profondeur locale/facettes + référentiels prix ;
- AlerteImmo : agrégation + ville/type + données/alertes.

**Décision : ne pas gagner par une ferme à URLs. Gagner par la qualité des pages publiées et les données propriétaires.**

---

## 4. GATE SEO V1

Source ville : `public.public_search_representations_v1`.

Sous-ensemble strict :

```text
display_eligibility = eligible_primary
freshness_status = fresh_confirmed
```

Gate :

```text
>= 20 offres strictes
ET >= 3 domaines source distincts
```

Fail-closed si preuve absente/invalide/indisponible.

Normalisation :

- `sale|buy|achat -> acheter` ;
- `rent|location -> louer` ;
- aliases principaux de type normalisés avant décision.

Snapshot de conception revalidé le 2026-09-04 : **2 445** représentations strictes, **8** sources.

---

## 5. SEO-3A — GATE CENTRAL ✅ MERGÉ

PR **#1000**.  
Merge : `d409d32db127e74bd59515718c97ccfd76add715`.

Livré :

- gate pur 20/3 ;
- loader serveur read-only ;
- source stricte ville ;
- normalisation intentions/types ;
- fail-closed ;
- tests dédiés dans Canonical Baseline ;
- aucune écriture DB.

CI finale #1000 : **7/7 gates SUCCESS**.

---

## 6. SEO-3B1 — SITEMAP VILLE ✅ MERGÉ

PR **#1001**.  
Merge : `58bbe0837ae6050c52656b65a49d40acb88ba245`.

Livré :

- sitemap dynamique ;
- ville publiée seulement si `acheter` OU `louer` passe le gate ;
- parent ville insuffisant => quartiers exclus ;
- aucun changement UI ;
- aucune nouvelle route ;
- aucun déploiement Vercel observé après merge.

Preuves pertinentes : Canonical Baseline ✅, Compile/Build ✅, P0/P1/P2 ✅, UI Inventory ✅.

---

## 7. SEO-3B2 — METADATA VILLE ✅ MERGÉ

PR **#1002**.  
Merge / `main` actuel : `1e88e74b2c00be764103c943afdfa9bb5be58ca0`.

Livré :

- page ville toujours accessible ;
- `index,follow` si gate ville passe ;
- `noindex,follow` si gate échoue/indisponible ;
- self-canonical conservé ;
- ISR `revalidate = 3600` ;
- aucun changement visuel.

Preuves avant merge : SEO Eligibility Gate ✅, TypeScript ✅, Production build dédié ✅, P0/P1/P2 ✅, UX ✅, UI Inventory ✅.

Post-merge : **0 déploiement Vercel observé**.

---

## 8. SEO-3B3 — QUARTIERS — EN COURS

Branche : `feat/seo-gated-neighborhood-indexation-v1`.

### Preuve data revalidée

Source territoriale : `public.odm_neighborhood_offer_shadow_listing_v1`.

Filtre strict :

```text
display_eligibility = eligible_primary
freshness_status = fresh_confirmed
```

Sur les 11 quartiers SEO actuels, le 2026-09-04 :

- maximum observé : **10 offres strictes** ;
- maximum observé : **2 sources strictes** ;
- donc **0/11 quartier passe le gate 20/3**.

Exemples :

- Rabat/Agdal : 10 offres strictes, 2 sources ;
- Marrakech/Guéliz : 9, 2 ;
- Agadir/Founty : 9, 2 ;
- Casablanca/Maarif : 2, 2.

Le flag DB `public_activation` du shadow reliability view est encore hardcodé `false` par politique de phase ; il n'est donc **pas** utilisé comme décision SEO.

### Implémenté sur la branche

- loader quartier read-only et fail-closed ;
- même floor 20/3 appliqué aux offres territoriales strictes ;
- quartier publié dans le sitemap uniquement s'il passe son propre gate ;
- page quartier reste accessible mais devient `noindex,follow` si le gate échoue ;
- self-canonical conservé ;
- aucun changement JSX visuel ;
- tests de contrat étendus.

### Goal / succès / preuve

Goal : empêcher les pages quartier faibles d'entrer/rester dans l'index.  
Succès : sitemap et metadata utilisent exactement le même gate quartier.  
Preuve : CI + diff + snapshot DB ci-dessus.

---

## 9. TAXONOMIE CIBLE

```text
/acheter | /louer
  -> /immobilier/{ville}/acheter | /immobilier/{ville}/louer
  -> /immobilier/{ville}/{intention}/{type} uniquement après gate
```

`/search?...` reste `noindex`.

Le niveau `/{ville}/{segment}` possède déjà `[district]` : `acheter/` et `louer/` seront des routes **statiques**, pas un second `[intent]` dynamique.

---

## 10. ROADMAP

- SEO-0 : baseline/remédiation ✅
- SEO-1 : benchmark initial ✅
- SEO-2 : qualification data ✅
- SEO-3A : gate central ✅
- SEO-3B1 : sitemap ville ✅
- SEO-3B2 : metadata ville ✅
- SEO-3B3 : gate sitemap + metadata quartier — **EN COURS**
- SEO-4 : landings ville×transaction qualifiées
- SEO-5 : data moat prix/m² / volumes / fraîcheur
- SEO-6/7 : technical SEO + maillage interne
- SEO-8 : autorité / backlinks / études data
- SEO-9 : boucle Search Console
- SEO-10 : scale uniquement par preuves

---

## 11. HUMAN GATES / RISQUES

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

## 12. NEXT EXACT

1. ouvrir la PR SEO-3B3 sur le HEAD final ;
2. certifier CI ;
3. corriger tout échec exact ;
4. si preuves suffisantes : merge + post-merge `main` + vérification Vercel ;
5. ensuite SEO-4 `ville × acheter/louer` ;
6. **SEO-4 crée de nouvelles pages visibles : protocole UI/UX BEFORE -> Goal -> référence/mockup -> implémentation -> AFTER devient obligatoire.**
