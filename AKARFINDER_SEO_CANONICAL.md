# AKARFINDER SEO CANONICAL

> Boussole de reprise du chantier SEO AkarFinder.
> À toute reprise : lire ce fichier puis vérifier `main`, branche/PR, CI, LIVE, Vercel, domaine final et Search Console avant d'agir.

**Statut : ACTIVE**  
**Dernière mise à jour : 2026-09-05**  
**Repo : `hraaaaf/Akarfinder`**  
**Main de départ SEO-4 UI : `f72b312fb0183218e879d0e4ef2c80e9116da60c`**  
**Branche active : `feat/seo4-city-intent-landings-v1`**  
**Preuve baseline : `AKARFINDER_SEO_AUDIT_2026-09-04.md`**

---

## 1. GOAL

Faire du SEO l'avantage compétitif principal d'AkarFinder : stock normalisé + fraîcheur + diversité de sources + pages utiles + architecture propre + mesure Search Console.

Règle centrale : **une combinaison de filtres n'est jamais automatiquement une page SEO.**

---

## 2. GATE SEO V1

```text
>= 20 offres strictes
ET >= 3 domaines source distincts
```

Fail-closed si preuve absente/invalide/indisponible.

Ville/intention : `public.public_search_representations_v1` avec `display_eligibility=eligible_primary` et `freshness_status=fresh_confirmed`.

Snapshot revalidé : les 10 couples `5 villes SEO V1 × acheter/louer` passent le gate 20/3.

---

## 3. LOTS MERGÉS

- SEO-3A — gate central — #1000 ✅
- SEO-3B1 — sitemap ville — #1001 ✅
- SEO-3B2 — metadata ville fail-closed — #1002 ✅
- SEO-3B3 — gate quartier — #1003 ✅
- SEO-3C — `/neuf` fail-closed — #1004 ✅ code / **PROD PENDING**
- SEO-4 PREP — contrat ville×intention — #1006 ✅, merge `503dd1caa12ee396db22f1682fde80b8b803324e`
- Closeout SEO-4 PREP — #1007 ✅, `main=f72b312f…`

Aucun déploiement Vercel autorisé/effectué dans ces lots.

---

## 4. SEO-4 UI — BEFORE / GOAL / RÉFÉRENCE

### BEFORE — PROUVÉ ✅

Capture LIVE `/immobilier/casablanca` produite via GitHub Actions, run **33945702517**, artifact **9963263361**.

Viewports : **390 / 430 / 768 / 1280**.

Preuve technique associée :

- HTTP 200 ;
- H1 `Casablanca, en données utiles` ;
- robots `index, follow` ;
- canonical `https://akarfinder.vercel.app/immobilier/casablanca`.

### Goal visuel

Créer `/immobilier/{ville}/acheter` et `/immobilier/{ville}/louer` comme extensions naturelles de la page ville :

- intention visible immédiatement ;
- preuve stock/source non assimilée au marché total ;
- résultats plus tôt, surtout mobile ;
- même langage visuel AkarFinder ;
- CTA Search préfiltré + carte ;
- metadata/indexation pilotées par le gate 20/3 ;
- aucune ferme à pages ni duplication de grille.

### Référence retenue

Réutiliser le shell actuel + `GeoResultPreview` existant. Pour les pages intention, supprimer le grand bloc carte du hero afin de faire remonter les résultats sur mobile ; garder la carte comme CTA secondaire.

---

## 5. SEO-4 UI — IMPLÉMENTATION EN COURS

Branche : `feat/seo4-city-intent-landings-v1`.

Implémenté avant certification :

- `components/seo/CityIntentLanding.tsx` ;
- builder serveur `lib/seo-city-pages/intent-route.tsx` ;
- routes statiques `app/immobilier/[city]/acheter/page.tsx` et `louer/page.tsx` ;
- self-canonical + metadata transactionnelles ;
- `robots index/noindex` via `getSeoCityIntentIndexability()` ;
- `revalidate=3600` ;
- Search préfiltré `buy/rent` ;
- sitemap ville×intention publié uniquement si le sous-gate correspondant passe ;
- tests source/contrat ajoutés dans `seo-city-pages.test.ts` ;
- aucun accès image ajouté ; aucune DB write.

**État : non certifié tant que CI + AFTER visuel ne sont pas passés.**

---

## 6. TAXONOMIE

```text
/acheter | /louer
  -> /immobilier/{ville}/acheter | /immobilier/{ville}/louer
  -> /immobilier/{ville}/{intention}/{type} uniquement après gate futur
```

`/search?...` reste `noindex`.

---

## 7. HUMAN GATES

Autorisation explicite obligatoire pour :

- tout déploiement Vercel ;
- activation/migration `akarfinder.ma` ;
- accès Search Console si intervention utilisateur nécessaire.

---

## 8. NEXT EXACT

1. ouvrir PR SEO-4 UI ;
2. certifier tests/TypeScript/build ;
3. produire AFTER 390/430/768/1280 via GitHub Actions sans Vercel ;
4. comparer BEFORE/AFTER + score visuel ;
5. corriger si nécessaire ;
6. closeout canonique ;
7. merge si preuves suffisantes ;
8. production reste derrière human gate Vercel.
