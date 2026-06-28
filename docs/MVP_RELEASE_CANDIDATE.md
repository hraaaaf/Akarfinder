# MVP Release Candidate — CTA Context Audit

**Mission:** MVP-RC-1  
**Date:** 2026-06-28  
**Règle UX:** Les boutons/chips filter doivent rester dans l'espace courant OU naviguer vers /search uniquement avec un wording explicite sur la navigation.

---

## CTA CONTEXT MATRIX

| Page | Button / CTA | Mobile | Desktop | Current Dest | Expected Dest | Params | Status | Fix Applied | Justification |
|------|--------------|:------:|:-------:|-------------|--------------|--------|--------|-------------|---------------|
| /acheter | "Appartements" chip | ✅ | ✅ | `/search?transaction_type=buy&property_type=Appartement` | idem | property_type=Appartement | ✅ OK | **OUI** — label renommé (était "Type de bien") | Label correspond au param transmis |
| /acheter | "Villas" chip | ✅ | ✅ | `/search?transaction_type=buy&property_type=Villa` | idem | property_type=Villa | ✅ OK | **OUI** — chip ajouté (était "Acheter") | Label correspond au param transmis |
| /acheter | "Terrains" chip | ✅ | ✅ | `/search?transaction_type=buy&property_type=Terrain` | idem | property_type=Terrain | ✅ OK | **OUI** — chip ajouté (était "Prix max") | Label correspond au param transmis |
| /acheter | "Plus de filtres" chip | ✅ | ✅ | `/search?transaction_type=buy` | idem | transaction_type=buy | ✅ OK | NON (déjà OK) | Wording explicitement navigation |
| /acheter | Icône filtres (SlidersHorizontal) | ✅ | ✅ | `/search` | idem | — | ✅ OK | NON | aria-label="Filtres avancés", icône explicite |
| /acheter | "Voir tout" | ✅ | ✅ | `/search?transaction_type=buy` | idem | transaction_type=buy | ✅ OK | NON | Wording explicitement navigation |
| /acheter | Card "Voir le bien" | ✅ | ✅ | `/listings/[id]` | idem | — | ✅ OK | NON | Destination fiche detail |
| /acheter | "Préparer mon dossier pour ce bien" | ✅ | ✅ | `/onboarding?intent=acheter&listing=[id]` | idem | intent + listing_id | ✅ OK | NON | CTA onboarding avec contexte |
| /acheter | SimulateCreditButton | ✅ | ✅ | Modal/inline | idem | price + listing_id | ✅ OK | NON | Reste dans page |
| /acheter | "Créer mon dossier" (sidebar) | — | ✅ | `/onboarding?intent=acheter` | idem | intent=acheter | ✅ OK | NON | Onboarding explicite |
| /acheter | "Explorer les annonces" | ✅ | ✅ | `/search?transaction_type=buy` | idem | transaction_type=buy | ✅ OK | NON | Wording explicitement navigation |
| /acheter | EXPLORER_CITIES → ville | ✅ | ✅ | `/map?city=X` | idem | city=X | ✅ OK | NON | Destination carte ville |
| /louer | BUDGET_CHIPS (< 3 000 DH…) | ✅ | ✅ | `/louer?budget_max=3000` (+ CTA explicit `/search` si actif) | idem | budget_max/min | ✅ OK | **OUI** — chips restent sur /louer, server-side non filtrable, CTA conditionnel vers /search | Chips ne quittent plus l'espace louer; recherche budget explicite uniquement si chip actif |
| /louer | TYPE_CHIPS (Studio, Appartement…) | ✅ | ✅ | `/louer?property_type=Studio` | idem | property_type | ✅ OK | **OUI** — chips restent sur /louer, server-side filtering via searchListings | Label = param transmis, active state bronze, filtrage côté serveur |
| /louer | MEUBLE_CHIPS | ✅ | ✅ | — (static `<span>`) | idem | — | ✅ OK | NON | Non-link correct : DB non filtrable sur ce critère |
| /louer | "Voir tout" | ✅ | ✅ | `/search?transaction_type=rent` | idem | transaction_type=rent | ✅ OK | NON | Wording explicite |
| /louer | "Explorer toutes les locations" | ✅ | ✅ | `/search?transaction_type=rent` | idem | transaction_type=rent | ✅ OK | NON | Wording explicite |
| /louer | Favoris | ✅ | ✅ | `/favorites` | idem | — | ✅ OK | NON | — |
| /louer | Comparer | ✅ | ✅ | `/compare` | idem | — | ✅ OK | NON | — |
| /louer | "Créer mon dossier" | ✅ | ✅ | `/onboarding?intent=louer` | idem | intent=louer | ✅ OK | NON | — |
| /louer | Map section → /map | ✅ | ✅ | `/map` | idem | — | ✅ OK | NON | — |
| /neuf | "Voir le projet" (hero) | ✅ | ✅ | `#projet` | idem | — | ✅ OK | NON | Ancre sur même page |
| /neuf | "Espace promoteurs" (hero) | ✅ | ✅ | `/promoteurs` | idem | — | ✅ OK | NON | Navigation explicite entre sections produit |
| /neuf | "Parler à un conseiller AkarFinder" | ✅ | ✅ | `/onboarding` | idem | — | ✅ OK | NON | — |
| /neuf | "Présenter un projet" (sidebar) | — | ✅ | `/promoteurs` | idem | — | ✅ OK | NON | — |
| /neuf | "Être rappelé" | ✅ | ✅ | `/onboarding` | idem | — | ✅ OK | NON | — |
| /neuf | "Créer mon dossier acheteur" | ✅ | ✅ | `/onboarding` | idem | — | ✅ OK | NON | — |
| /neuf | "Découvrir l'espace promoteurs" | ✅ | ✅ | `/promoteurs` | idem | — | ✅ OK | NON | — |
| /neuf | "Accéder à AkarFinder Pro" | ✅ | ✅ | `/pro` | idem | — | ✅ OK | NON | — |
| /vendre | "Préparer ma vente" (hero TrackedLink) | ✅ | ✅ | `/vendre/dossier` | idem | — | ✅ OK | NON | Reste dans espace /vendre |
| /vendre | "Comparer avec le marché" (hero) | ✅ | ✅ | `#estimation` | idem | — | ✅ OK | NON | Ancre sur même page |
| /vendre | "Voir le détail par zone" | ✅ | ✅ | `/map` | idem | — | ✅ OK | NON | Section explicitement marquée "repères de zone" |
| /vendre | "Préparer ma vente" (section leads) | ✅ | ✅ | `/vendre/dossier` | idem | — | ✅ OK | NON | — |
| /vendre | "Voir les annonces dans la recherche" (annonces similaires) | — | ✅ | `/search?transaction_type=buy` | idem | transaction_type=buy | ✅ OK | **OUI** — était "Voir plus" (wording ambigu) → renommé | Wording désormais explicitement navigation |
| /vendre | Cards annonces similaires | ✅ | ✅ | `/listings/[id]` | idem | — | ✅ OK | NON | — |
| /vendre | "Préparer ma vente" (callout) | ✅ | ✅ | `/vendre/dossier` | idem | — | ✅ OK | NON | — |
| /vendre | "Comparer avec le marché" (callout) | ✅ | ✅ | `#estimation` | idem | — | ✅ OK | **OUI** — était `/search?transaction_type=buy` → ancre locale | Reste dans l'espace /vendre, scroll vers bloc estimation |
| /promoteurs | "Demander une page promoteur" (hero) | ✅ | ✅ | `/pro` | idem | — | ✅ OK | NON | — |
| /promoteurs | "Comparer les packs" (hero) | ✅ | ✅ | `#packs` | idem | — | ✅ OK | NON | Ancre sur même page |
| /promoteurs | "Voir la page de projet" | ✅ | ✅ | `/pro` | idem | — | ✅ OK | NON | — |
| /promoteurs | "Voir le reporting" | ✅ | ✅ | `/pro` | idem | — | ✅ OK | NON | — |
| /promoteurs | "Voir l'aperçu des leads" | ✅ | ✅ | `/pro` | idem | — | ✅ OK | NON | — |
| /promoteurs | "Découvrir l'aperçu WhatsApp" | ✅ | ✅ | `/pro` | idem | — | ✅ OK | NON | — |
| /promoteurs | Packs "Détails" | ✅ | ✅ | `/pro` | idem | — | ✅ OK | NON | — |
| /promoteurs | "Comparer les packs" (section) | ✅ | ✅ | `/pro` | idem | — | ✅ OK | NON | — |
| /promoteurs | "Accéder à l'espace Pro" (callout) | ✅ | ✅ | `/pro` | idem | — | ✅ OK | NON | — |
| /promoteurs | "Voir les projets neufs" | ✅ | ✅ | `/neuf` | idem | — | ✅ OK | NON | — |
| Homepage | SearchPanel tabs (Acheter/Louer/Neuf) | ✅ | ✅ | — (state local) | idem | — | ✅ OK | NON | Boutons `type="button"`, pas de navigation |
| Homepage | SearchPanel QUICK_CHIPS | ✅ | ✅ | — (applique état via `applyChip()`) | idem | — | ✅ OK | NON | `type="button"` remplit le formulaire, ne navigue pas |
| Homepage | "Rechercher" (hero SearchPanel) | ✅ | ✅ | `/search?{params}` | idem | tx_type + property_type + q | ✅ OK | NON | Bouton de recherche explicite avec état du formulaire |
| Homepage | "Créer mon dossier acheteur" (hero) | — | ✅ | `/onboarding` | idem | — | ✅ OK | NON | — |
| Homepage | "Voir la carte" (hero) | — | ✅ | `/map` | idem | — | ✅ OK | NON | — |
| Homepage | CityIntentGrid zones (Casablanca…) | ✅ | ✅ | `/search?city=X` | idem | city=X | ✅ OK | NON | Label = nom de ville, param city transmis |
| Homepage | "Voir les biens analysés" (CityGrid) | ✅ | ✅ | `/search` | idem | — | ✅ OK | NON | Wording explicitement navigation |
| Homepage | "Voir les biens analysés" (HomeFinalCTA) | ✅ | ✅ | `/search` | idem | — | ✅ OK | NON | — |
| Homepage | "Créer mon dossier acheteur" (HomeFinalCTA) | ✅ | ✅ | `/onboarding` | idem | — | ✅ OK | NON | — |
| Homepage | "Espace Pro" (HomeFinalCTA) | ✅ | ✅ | `/pro` | idem | — | ✅ OK | NON | — |

---

## Résumé des issues

### Issues critiques corrigées (INTENT-CTA-CONTEXT-FIX-1)

| # | Page | Problème | Fix |
|---|------|---------|-----|
| 1 | `/acheter` FILTER_CHIPS | "Acheter" (redondant), "Type de bien" (label filtre sans param), "Prix max" (label filtre sans param) → tous pointaient vers `/search?transaction_type=buy` | Remplacés par "Appartements", "Villas", "Terrains" — labels = params transmis |
| 2 | `/louer` BUDGET_CHIPS | Chips pointaient vers `/search?...maxPrice=X` — expulsaient hors de l'espace louer | Hrefs → `/louer?budget_max=X`, active state bronze, CTA explicite `/search` conditionnel (uniquement si chip actif) |
| 3 | `/louer` TYPE_CHIPS | Chips pointaient vers `/search?...property_type=X` — expulsaient hors de l'espace louer | Hrefs → `/louer?property_type=X`, server-side filtering, active state bronze |
| 4 | `/louer` page | Composant async avec fetch interne — incompatible avec searchParams Next.js 15 | Refactorisé en composant sync acceptant props, async fetch déplacé dans `app/louer/page.tsx` |
| 5 | `/vendre` "Voir plus" | Wording ambigu ("Voir plus") sur lien vers /search | Renommé "Voir les annonces dans la recherche" — wording explicite |
| 6 | `/vendre` "Comparer avec le marché" (callout final) | Envoyait vers `/search?transaction_type=buy` — expulsait de l'espace /vendre | Changé en `#estimation` — scroll local vers le bloc estimation |
| 7 | Homepage ListingPreview chips | Chips "Acheter/Louer/Neuf/MRE" pointaient vers `/search?type=buy/rent/new` | Corrigés vers `/acheter`, `/louer`, `/neuf`, `/mre` — espaces dédiés |

### Issues inexistantes (zéro problème)

- `/neuf` — tous les CTAs ancrés ou vers /promoteurs/onboarding/pro
- `/promoteurs` — tous les CTAs vers /pro, /neuf, ou ancres internes
- Homepage SearchPanel — tabs et QUICK_CHIPS sont des boutons `type="button"` qui modifient l'état local, aucune navigation cachée

---

## Statut RC-1

| Critère | Statut |
|---------|--------|
| Audit CTA complet (6 pages) | ✅ Terminé |
| Issues critiques résolues | ✅ 7/7 fixées (INTENT-CTA-CONTEXT-FIX-1) |
| Build propre | ✅ `npm run build` — zéro erreur TS (2026-06-28) |
| Smoke test 9 routes HTTP 200 | ✅ `/` `/acheter` `/louer` `/louer?property_type=Studio` `/louer?budget_max=3000` `/neuf` `/vendre` `/promoteurs` `/search` |
| Chips budget restent sur /louer | ✅ Vérifié HTML |
| Chips type restent sur /louer | ✅ Vérifié HTML |
| /vendre callout → #estimation | ✅ Vérifié HTML |

---

## Fix appliqué — diff /acheter

```diff
- const FILTER_CHIPS = [
-   { label: "Acheter",         href: "/search?transaction_type=buy" },
-   { label: "Type de bien",    href: "/search?transaction_type=buy" },
-   { label: "Prix max",        href: "/search?transaction_type=buy" },
-   { label: "Plus de filtres", href: "/search?transaction_type=buy" },
- ];
+ const FILTER_CHIPS = [
+   { label: "Appartements",    href: "/search?transaction_type=buy&property_type=Appartement" },
+   { label: "Villas",          href: "/search?transaction_type=buy&property_type=Villa" },
+   { label: "Terrains",        href: "/search?transaction_type=buy&property_type=Terrain" },
+   { label: "Plus de filtres", href: "/search?transaction_type=buy" },
+ ];
```
