# AKARFINDER SEO CANONICAL

> Boussole de reprise du chantier SEO AkarFinder.
> À toute reprise : lire ce fichier puis vérifier `main`, branche/PR, CI, LIVE, Vercel, domaine final et Search Console avant d'agir.

**Statut : ACTIVE**  
**Dernière mise à jour : 2026-09-05**  
**Repo : `hraaaaf/Akarfinder`**  
**Main vérifié : `503dd1caa12ee396db22f1682fde80b8b803324e`**  
**Branche active : aucune branche produit ouverte après merge #1006**  
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

## 3. GATE SEO V1

Gate commun :

```text
>= 20 offres strictes
ET >= 3 domaines source distincts
```

Fail-closed si preuve absente/invalide/indisponible.

Ville/intention : `public.public_search_representations_v1`, avec :

```text
display_eligibility = eligible_primary
freshness_status = fresh_confirmed
```

Quartier : `public.odm_neighborhood_offer_shadow_listing_v1`, même filtre strict.

Normalisation :

- `sale|buy|achat -> acheter` ;
- `rent|location -> louer` ;
- aliases principaux de type normalisés avant décision.

Snapshot revalidé : les 10 couples `5 villes SEO V1 × acheter/louer` passent actuellement le gate 20/3.

---

## 4. BASELINE TECHNIQUE — VÉRIFIÉE

- `/search` : `noindex,follow`, canonical propre, hors sitemap ;
- `/map` : canonical propre ;
- faux `lastModified: new Date()` retiré du sitemap dans `main` ;
- hostnames SEO/JSON-LD centralisés sur `siteConfig.siteUrl` ;
- `/acheter` et `/louer` : hubs nationaux existants ;
- helper metadata prévu pour `/immobilier/{ville}/{acheter|louer}` ;
- pages ville/quartier accessibles aux humains même lorsqu'elles sont `noindex`.

Benchmark initial : Kaynly, Mubawab, Yakeey, AlerteImmo.

---

## 5. LOTS MERGÉS

- **SEO-3A** — gate central — PR #1000 ✅
- **SEO-3B1** — sitemap ville — PR #1001 ✅
- **SEO-3B2** — metadata ville fail-closed — PR #1002 ✅
- **SEO-3B3** — gate quartier + sitemap/metadata — PR #1003 ✅
- **SEO-3C** — `/neuf` fail-closed — PR #1004 ✅, **PROD PENDING**
- **SEO-4 PREP** — contrat ville×intention — PR #1006 ✅, merge `503dd1caa12ee396db22f1682fde80b8b803324e`

### Preuve #1006

CI finale : **6/6 SUCCESS** : Canonical Baseline, Compile, P0, P1, P2, UX.

Livré :

- `getSeoCityIntentIndexability(city, intent)` ;
- réutilisation stricte du gate 20/3 ;
- contrat metadata/canonical `/immobilier/{city}/{acheter|louer}` ;
- tests de délégation exacte au gate partagé ;
- aucune route visible ;
- aucun composant UI ;
- aucun sitemap modifié ;
- aucune DB write ;
- aucun déploiement Vercel.

Post-merge : `main = 503dd1ca…` confirmé ; **0 déploiement Vercel observé**.

---

## 6. SEO-3C — ÉTAT PROD

Le code `/neuf` est mergé mais non déployé.

État attendu après activation future :

- `/neuf` accessible ;
- self-canonical ;
- `noindex,follow` ;
- hors sitemap.

État LIVE précédemment observé avant déploiement : `/neuf` encore `index,follow` et présent dans le sitemap.

**Aucun déploiement Vercel sans autorisation explicite.**

---

## 7. TAXONOMIE CIBLE

```text
/acheter | /louer
  -> /immobilier/{ville}/acheter | /immobilier/{ville}/louer
  -> /immobilier/{ville}/{intention}/{type} uniquement après gate
```

`/search?...` reste `noindex`.

`acheter/` et `louer/` doivent être des routes statiques sous `[city]`, pas un second segment dynamique concurrent de `[district]`.

---

## 8. ROADMAP

- SEO-0 : baseline/remédiation ✅
- SEO-1 : benchmark initial ✅
- SEO-2 : qualification data ✅
- SEO-3A : gate central ✅
- SEO-3B1 : sitemap ville ✅
- SEO-3B2 : metadata ville ✅
- SEO-3B3 : gate quartier ✅
- SEO-3C : `/neuf` fail-closed ✅ code / **PROD PENDING**
- SEO-4 PREP : contrat ville×intention ✅
- SEO-4 UI : landings ville×transaction qualifiées — **BLOQUÉ VISUEL**
- SEO-5 : data moat prix/m² / volumes / fraîcheur
- SEO-6/7 : technical SEO + maillage interne
- SEO-8 : autorité / backlinks / études data
- SEO-9 : boucle Search Console
- SEO-10 : scale uniquement par preuves

---

## 9. SEO-4 — PRÉREQUIS VISUEL

SEO-4 crée de nouvelles pages visibles. Protocole obligatoire :

```text
BEFORE -> Goal -> mockup/référence -> implémentation -> AFTER mêmes viewports -> comparaison/tests -> score visuel
```

État vérifié :

- routes statiques `app/immobilier/[city]/acheter/` et `louer/` libres ;
- helper metadata + contrat d'indexabilité ville×intention prêts ;
- LIVE `/immobilier/casablanca` répond HTTP 200 ;
- capture navigateur locale bloquée par `ERR_BLOCKED_BY_ADMINISTRATOR` ;
- lien Vercel temporaire testé, même blocage navigateur ;
- fallback externe de capture également bloqué ;
- Product Design/Cloud Browser non disponible dans ce chat standard.

**Aucune capture BEFORE fiable n'a été produite. Ne pas implémenter la surface visible SEO-4 sans cette preuve.**

---

## 10. HUMAN GATES / RISQUES

Human gate obligatoire :

- tout déploiement Vercel ;
- activation/migration domaine final `akarfinder.ma` ;
- accès Search Console si authentification/intervention utilisateur nécessaire.

Interdits : doorway pages, facettes arbitraires indexables, contenu massifié sans valeur propre, images sans droits vérifiés, seuil SEO inventé sans données.

---

## 11. NEXT EXACT

1. obtenir une vraie capture BEFORE de `/immobilier/casablanca` dans un environnement navigateur autorisé ;
2. écrire Goal visuel + mockup/référence ;
3. créer d'abord `/immobilier/{ville}/acheter` et `/immobilier/{ville}/louer` uniquement pour les couples passant le gate ;
4. captures AFTER mêmes viewports + comparaison/tests + score visuel ;
5. mettre à jour ce canonique ;
6. merge si preuves suffisantes ;
7. aucun déploiement Vercel sans autorisation explicite.
