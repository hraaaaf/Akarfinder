# AKARFINDER SEO CANONICAL

> Boussole de reprise du chantier SEO AkarFinder.
> À toute reprise : lire ce fichier puis vérifier `main`, branche/PR, CI, LIVE, Vercel, domaine final et Search Console avant d'agir.

**Statut : ACTIVE**  
**Dernière mise à jour : 2026-09-05**  
**Repo : `hraaaaf/Akarfinder`**  
**Main de départ SEO-4 UI : `f72b312fb0183218e879d0e4ef2c80e9116da60c`**  
**Branche active : `feat/seo4-city-intent-landings-v1`**  
**PR active : #1009**  
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
- Closeout SEO-4 PREP — #1007 ✅, `main=f72b312f…`

Aucun déploiement Vercel autorisé/effectué dans ces lots.

---

## 4. SEO-4 UI — PROTOCOLE VISUEL

### BEFORE ✅

LIVE `/immobilier/casablanca` capturé via GitHub Actions :

- run **33945702517** ;
- artifact **9963263361** ;
- viewports **390 / 430 / 768 / 1280** ;
- HTTP 200 ;
- H1 `Casablanca, en données utiles` ;
- robots `index, follow` ;
- canonical `https://akarfinder.vercel.app/immobilier/casablanca`.

### Goal

Créer `/immobilier/{ville}/acheter` et `/immobilier/{ville}/louer` comme extensions naturelles de la page ville : intention immédiate, preuve stock/source explicite, résultats plus tôt sur mobile, Search préfiltré, indexation pilotée par gate, aucune duplication de grille.

### Référence

Shell visuel ville existant + `GeoResultPreview` existant. Suppression du grand bloc carte dans le hero intention ; carte conservée comme CTA secondaire.

### AFTER ✅

Le vrai composant `CityIntentLanding` a été rendu dans un harness local GitHub Actions non committé :

- run **33946136029** ;
- artifact **9963390475** ;
- viewports **390 / 430 / 768 / 1280** ;
- HTTP 200 sur les 4 captures ;
- H1 `Acheter à Casablanca` sur les 4 captures.

Comparaison vérifiée :

- 390/430 : intention immédiatement lisible, preuve 20/3 compacte, résultats remontés nettement avant le niveau où se trouvait la carte dans le BEFORE, aucun overflow observé ;
- 768 : grille 2 colonnes cohérente ;
- 1280 : hero intention + preuve équilibrés, grille 3 colonnes compacte ;
- le bandeau mobile fixe visible au milieu des screenshots full-page est un artefact de stitching Playwright des éléments `position: fixed`, pas une rupture de layout observée.

**Score visuel de revue : 9,5/10.**

Les PR temporaires de capture #1008, #1010 et #1011 ont été fermées sans merge.

---

## 5. SEO-4 UI — IMPLÉMENTATION #1009

Livré sur `feat/seo4-city-intent-landings-v1` :

- `components/seo/CityIntentLanding.tsx` ;
- builder serveur `lib/seo-city-pages/intent-route.tsx` ;
- routes statiques `app/immobilier/[city]/acheter/page.tsx` et `louer/page.tsx` ;
- self-canonical + metadata transactionnelles ;
- `robots index/noindex` via `getSeoCityIntentIndexability()` ;
- `revalidate = 3600` en littéral Next.js ;
- Search préfiltré `buy/rent` ;
- sitemap ville×intention uniquement si le sous-gate correspondant passe ;
- classification UI Inventory ajoutée pour les deux nouvelles routes dynamiques ;
- tests source/contrat ajoutés ;
- aucune DB write ;
- aucun nouveau droit image.

Corrections de certification déjà appliquées :

1. UI Inventory : ajout des fixtures `/immobilier/rabat/acheter` et `/immobilier/rabat/louer` ;
2. Next build : `revalidate` remplacé par la valeur littérale `3600` exigée par Next.js.

**État : visuel validé ; certification CI finale du HEAD #1009 encore à verrouiller avant merge.**

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

1. certifier le HEAD final de #1009 après ce closeout ;
2. si échec : diagnostiquer/corriger puis recertifier ;
3. si vert : merge #1009 ;
4. post-merge vérifier `main` + absence de déploiement Vercel ;
5. production reste derrière human gate Vercel ;
6. lot suivant : SEO-5 data moat prix/m² / volumes / fraîcheur, sans ouvrir de nouvelle surface faible.
