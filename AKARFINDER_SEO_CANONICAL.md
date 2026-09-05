# AKARFINDER SEO CANONICAL

> Boussole de reprise du chantier SEO AkarFinder.
> À toute reprise : lire ce fichier puis vérifier `main`, branche/PR, CI, LIVE, Vercel, domaine final et Search Console avant d'agir.

**Statut : ACTIVE**  
**Dernière mise à jour : 2026-09-05**  
**Repo : `hraaaaf/Akarfinder`**  
**Main vérifié : `93c54a04c243e4047c810cdbabe65f8bda37ea2d`**  
**SEO-4 UI : MERGED / PROD PENDING**  
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
- SEO-4 PREP — contrat ville×intention — #1006 ✅
- SEO-4 UI — landings ville×transaction — #1009 ✅, merge `93c54a04c243e4047c810cdbabe65f8bda37ea2d`

Aucun déploiement Vercel autorisé/effectué dans ces lots.

---

## 4. SEO-4 UI — PREUVES

### BEFORE ✅

LIVE `/immobilier/casablanca` capturé via GitHub Actions :

- run **33945702517** ;
- artifact **9963263361** ;
- viewports **390 / 430 / 768 / 1280** ;
- HTTP 200 ;
- H1 `Casablanca, en données utiles` ;
- robots `index, follow` ;
- canonical `https://akarfinder.vercel.app/immobilier/casablanca`.

### AFTER ✅

Le vrai composant `CityIntentLanding` a été rendu dans un harness local GitHub Actions non committé :

- run **33946136029** ;
- artifact **9963390475** ;
- viewports **390 / 430 / 768 / 1280** ;
- HTTP 200 sur les 4 captures ;
- H1 `Acheter à Casablanca` sur les 4 captures ;
- score visuel de revue : **9,5/10**.

Comparaison vérifiée : intention immédiate, preuve stock/source explicite, résultats remontés sur mobile, grille 2 colonnes à 768 et 3 colonnes à 1280, aucun overflow observé.

PR temporaires de capture #1008, #1010, #1011 fermées sans merge.

---

## 5. SEO-4 UI — LIVRÉ

PR **#1009** mergée sur `main`.

Livré :

- `components/seo/CityIntentLanding.tsx` ;
- builder serveur `lib/seo-city-pages/intent-route.tsx` ;
- routes statiques `/immobilier/[city]/acheter` et `/immobilier/[city]/louer` ;
- self-canonical + metadata transactionnelles ;
- `robots index/noindex` via le gate ville×intention ;
- `revalidate = 3600` ;
- Search préfiltré `buy/rent` ;
- sitemap ville×intention uniquement si le sous-gate passe ;
- classification UI Inventory des deux routes ;
- tests SEO source/contrat ;
- aucune DB write ;
- aucun nouveau droit image.

Preuves HEAD final avant merge :

- UI All Pages Inventory ✅ ;
- TypeScript ✅ ;
- Production build ✅ ;
- Scraper regression suite ✅ ;
- SEO Eligibility Gate V1 ✅ ;
- UX Gate 0 Contracts ✅ ;
- visual AFTER 4 viewports ✅.

Post-merge : `main = 93c54a04…` confirmé ; **0 déploiement Vercel après merge**.

**Production : non activée.** Ne pas appeler ces routes LIVE avant déploiement explicitement autorisé.

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

**SEO-5 — DATA MOAT**

1. inventorier les read-models de prix/m², volumes et fraîcheur déjà existants ;
2. définir une politique statistique de publication distincte du simple gate d'inventaire 20/3 ;
3. mesurer quelles villes/intentions ont assez de données pour publier une médiane ou un baromètre sans surpromesse ;
4. ne créer aucune nouvelle page data tant que la méthode, l'échantillon et la fraîcheur ne sont pas prouvés ;
5. production SEO-3C/SEO-4 reste derrière human gate Vercel.
