# AKARFINDER SEO CANONICAL

> Boussole de reprise du chantier SEO AkarFinder.
> À toute reprise : lire ce fichier puis vérifier `main`, branche/PR, CI, LIVE, Vercel, domaine final et Search Console avant d'agir.

**Statut : ACTIVE**  
**Dernière mise à jour : 2026-09-04**  
**Repo : `hraaaaf/Akarfinder`**  
**Main vérifié : `62633b3d4f8e27654ded8f3bb17c451d90b697a4`**  
**Branche active : `fix/seo-neuf-noindex-until-inventory`**  
**Preuve baseline : `AKARFINDER_SEO_AUDIT_2026-09-04.md`**

---

## 1. GOAL

Faire du SEO l'avantage compétitif principal d'AkarFinder : transformer l'index immobilier multi-source en acquisition organique utile, mesurable et scalable au Maroc.

### Succès

- croissance impressions/clics organiques non brandés ;
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

## 3. BASELINE TECHNIQUE — VÉRIFIÉE

- `/search` : `noindex,follow`, canonical propre, hors sitemap ;
- `/map` : canonical propre ;
- faux `lastModified: new Date()` retiré du sitemap ;
- hostnames SEO/JSON-LD centralisés sur `siteConfig.siteUrl` ;
- `/acheter` et `/louer` : hubs nationaux existants ;
- helper metadata déjà prévu pour `/immobilier/{ville}/{acheter|louer}` ;
- pages ville et quartier accessibles aux humains même lorsqu'elles sont `noindex`.

Benchmark initial : Kaynly, Mubawab, Yakeey, AlerteImmo.

**Décision : ne pas gagner par une ferme à URLs. Gagner par la qualité des pages publiées et les données propriétaires.**

---

## 4. GATE SEO V1

Gate commun :

```text
>= 20 offres strictes
ET >= 3 domaines source distincts
```

Fail-closed si preuve absente/invalide/indisponible.

Ville : `public.public_search_representations_v1`, filtre :

```text
display_eligibility = eligible_primary
freshness_status = fresh_confirmed
```

Quartier : `public.odm_neighborhood_offer_shadow_listing_v1`, même filtre strict.

Normalisation :

- `sale|buy|achat -> acheter` ;
- `rent|location -> louer` ;
- aliases principaux de type normalisés avant décision.

Snapshot ville revalidé le 2026-09-04 : **2 445** représentations strictes, **8** sources.

---

## 5. LOTS MERGÉS

### SEO-3A — gate central ✅

PR **#1000** — merge `d409d32db127e74bd59515718c97ccfd76add715`.

Livré : gate 20/3, loaders read-only, normalisation, fail-closed, tests. CI finale 7/7 gates SUCCESS.

### SEO-3B1 — sitemap ville ✅

PR **#1001** — merge `58bbe0837ae6050c52656b65a49d40acb88ba245`.

Livré : sitemap dynamique ; ville publiée seulement si `acheter` OU `louer` passe le gate ; quartiers exclus si parent ville insuffisant.

### SEO-3B2 — metadata ville ✅

PR **#1002** — merge `1e88e74b2c00be764103c943afdfa9bb5be58ca0`.

Livré : `index,follow` si gate ville passe ; `noindex,follow` sinon ; self-canonical ; ISR 3600 ; aucun changement visuel.

### SEO-3B3 — quartiers ✅

PR **#1003** — merge / `main` actuel : `62633b3d4f8e27654ded8f3bb17c451d90b697a4`.

Preuve data au 2026-09-04 :

- 11 quartiers SEO observés ;
- maximum strict : **10 offres** ;
- maximum strict : **2 sources** ;
- **0/11** passe le gate 20/3.

Livré :

- loader quartier read-only fail-closed ;
- quartier publié dans sitemap seulement s'il passe son propre gate ;
- metadata quartier pilotées par le même gate ;
- page toujours accessible avec `noindex,follow` si insuffisante ;
- self-canonical conservé ;
- aucun changement visuel.

CI #1003 : Canonical Baseline ✅, Compile/build ✅, P0 ✅, P1 ✅, P2 ✅, UX ✅, UI Inventory ✅.

Post-merge : `main = 62633b3d…` confirmé ; **0 déploiement Vercel observé**.

---

## 6. SEO-3C — `/neuf` — EN COURS

Branche : `fix/seo-neuf-noindex-until-inventory`.

### Preuve data

Snapshot strict revalidé le 2026-09-04 :

- `sale` : 1 256 offres strictes / 7 sources ;
- `rent` : 1 150 / 6 ;
- intention inconnue : 38 / 6 ;
- `buy` : 1 / 1 ;
- **aucune offre stricte avec intention `new/neuf`**.

La page `/neuf` utilise actuellement `ProgramsSection programs={[]}` et ses CTA pointent vers `transaction_type=new`.

### Goal

Éviter qu'une verticale sans inventaire réel soit indexée comme surface SEO active.

### Implémenté sur la branche

- `/neuf` reste accessible ;
- self-canonical explicite ;
- `robots: noindex,follow` ;
- `/neuf` retiré du sitemap ;
- test de contrat ajouté ;
- aucun changement visuel ;
- aucune DB write ;
- aucun déploiement Vercel.

### Réactivation future

Ne réindexer `/neuf` qu'après existence d'un inventaire/programme réel et vérifié, avec une source de vérité dédiée et un gate défendable.

---

## 7. TAXONOMIE CIBLE

```text
/acheter | /louer
  -> /immobilier/{ville}/acheter | /immobilier/{ville}/louer
  -> /immobilier/{ville}/{intention}/{type} uniquement après gate
```

`/search?...` reste `noindex`.

Le niveau `/{ville}/{segment}` possède déjà `[district]` : `acheter/` et `louer/` doivent être des routes **statiques**, pas un second `[intent]` dynamique concurrent.

---

## 8. ROADMAP

- SEO-0 : baseline/remédiation ✅
- SEO-1 : benchmark initial ✅
- SEO-2 : qualification data ✅
- SEO-3A : gate central ✅
- SEO-3B1 : sitemap ville ✅
- SEO-3B2 : metadata ville ✅
- SEO-3B3 : gate quartier ✅
- SEO-3C : `/neuf` noindex jusqu'à inventaire réel — **EN COURS**
- SEO-4 : landings ville×transaction qualifiées
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

1. ouvrir PR SEO-3C sur le HEAD final ;
2. certifier test SEO + TypeScript + Production build + gates proportionnels ;
3. corriger tout échec exact ;
4. si vert : merge + post-merge `main` + vérification Vercel ;
5. ensuite SEO-4 `ville × acheter/louer` ;
6. SEO-4 crée de nouvelles pages visibles : protocole UI/UX **BEFORE -> Goal -> mockup/référence -> implémentation -> AFTER mêmes viewports -> comparaison/tests -> score visuel** obligatoire.
