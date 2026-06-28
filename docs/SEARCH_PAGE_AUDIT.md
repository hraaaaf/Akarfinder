# SEARCH-PAGE-AUDIT-1 — Audit /search (avant refonte)

> Audit only — aucun code modifié, aucune UI changée. Diagnostic pour préparer
> **SEARCH-RELOOKING-1**. Date : 2026-06-28.

---

## 1. État actuel résumé

`/search` est une **marketplace immobilière fonctionnelle de style « Zillow clair »**,
riche en données et en filtres, mais visuellement **hors de la charte dark premium**
validée sur Acheter / Louer / Vendre / Neuf / Promoteurs (~9.5/10).

- Route : `app/search/page.tsx` (Server Component, `force-dynamic`).
- Fond : `bg-[#f8f9fa]` / `bg-[#f7f3ea]` (**clair**), bandeau hero `bg-deepblue`.
- Shell actif : `components/search/LightZillowSearchShell.tsx` (Client).
- Cards : `components/listings/PhotoFirstListingCard.tsx` (**cards blanches**).
- Filtres : `components/search/QuickFilters.tsx`.
- Données : seed `mockListings` puis remplacement par `GET /api/search`
  (pipeline réel `lib/search` → database/typesense/sqlite/supabase + fallback).
- Annexes : `CityMapPanel`, `MapSideCTA`, `CompareBar`, toggles Favoris / Comparer.

Captures (public/screenshots/) :
`search-desktop.png`, `search-mobile.png`, `search-buy-desktop.png`,
`search-rent-desktop.png`, `search-buy-apartment-desktop.png`.

---

## 2. Points forts

- **Données riches déjà câblées** : prix, prix/m², surface, ch./sdb, fraîcheur,
  fiabilité (badge + score), Indice AkarFinder, doublon possible, **package score**
  (Excellent/Bon/Correct), repère prix observé (cohérent/supérieur/inférieur), MRE.
- **Filtres complets** : recherche texte (debounce 300 ms), onglets transaction
  (Acheter/Louer/Neuf), ville, budget max, type de bien, surface min, fiabilité,
  **slider score min**, MRE-friendly, **Bon package**. Compteur de filtres actifs.
- **Chips de filtres actifs** avec suppression unitaire + « Tout effacer ».
- **Tri** : recommandé / meilleures annonces / prix ↑ / prix ↓.
- **Liste + Carte** (onglets mobile, panneau carte sticky desktop) → lien `/map`.
- **Favoris + Comparer** intégrés (CompareBar globale, toggles par card).
- **États gérés** : skeleton loading, empty state (reset), erreur silencieuse.
- **Accessibilité** : aria-labels sur filtres, slider aria-valuenow.
- API réelle robuste (fallback `database_fallback` si erreur, jamais de crash).

---

## 3. Points faibles

- **Thème clair** en rupture totale avec la DA dark premium du reste du site.
- **Cards blanches** « plates » vs cards dark premium (Acheter) qui « pop » sur fond sombre.
- **Visuels illustratifs SVG** (immeubles génériques « Visuel illustratif ») au lieu
  de vraies photos → impression de catalogue de démo, pas de marketplace crédible.
- **Flash mock → réel** : seed `mockListings` au 1er paint puis remplacement async
  (léger flicker / incohérence du compteur au chargement).
- **Pas de pagination** : `limit=100` fixe, aucun « charger plus » / page suivante.
- **`property_type` et prix min/max NON lus depuis l'URL** dans `page.tsx`
  (seuls `transaction_type`, `city`, `mre` sont parsés) → les deep-links
  `/search?...&property_type=apartment` sont **ignorés** (vérifié en capture).
- **Densité hétérogène** : bandeau hero + barre filtres + compteur + chips + grille
  + colonne carte = beaucoup d'éléments empilés, hiérarchie perfectible sur mobile.
- **Aucun CTA business** crédit / alerte sauvegardée / dossier locataire dans les
  résultats (seul un CTA « profil de recherche » → /onboarding en sidebar).
- **Densité grille** : 2 colonnes max (`xl:grid-cols-2`) → peu d'annonces visibles
  à l'écran sur grand desktop.

---

## 4. Incohérences avec la charte AkarFinder

| Élément | /search actuel | Charte (Acheter/Louer/…) |
|---|---|---|
| Fond | clair `#f8f9fa`/`#f7f3ea` | dark `#061027` / deepblue |
| Cards | blanches | dark premium, ring, glow bronze |
| Hero | bandeau deepblue compact | hero ambient + glow + eyebrow bronze |
| Barre filtres | carte crème | glass premium translucide |
| Visuels | SVG illustratif | ListingVisual premium + photos |
| Ton général | utilitaire/Zillow | premium/éditorial |

→ **Cohérence marque = principal écart.** Le reste (données, logique) est sain.

---

## 5. Composants à conserver (logique/data — restyler seulement)

- `PhotoFirstListingCard` : **garder toute la logique** (fiabilité, package score,
  repère prix, doublon, MRE, favoris, comparer) → **restyler en dark premium**
  (s'inspirer de `AcheterListingCard` dans `AcheterPageShell`).
- `QuickFilters` : garder l'état/logique des filtres → restyler en glass dark.
- `/api/search` + `lib/search` + `lib/package-score` + `lib/market` + `lib/proximity`
  : **inchangés** (pipeline data solide).
- `CityMapPanel`, `MapSideCTA`, `CompareBar`, `FavoriteToggleButton`,
  `CompareToggleButton`, `ReliabilityBadge`, `MreBadge` : garder, harmoniser styles.

## 5bis. Composants à refaire / supprimer

- **Refaire le thème** du shell (`LightZillowSearchShell`) : clair → dark premium.
- **Code mort à supprimer** (non importés par la page active — vérifié) :
  `components/search/SearchShell.tsx`, `SearchFilters.tsx`, `SearchResultsGrid.tsx`,
  `SearchResultsHeader.tsx`, `MapPreview.tsx`.
  (Seul `SearchShell` est référencé… par lui-même ; les autres : 0 import.)

---

## 6. Quick wins (avant ou pendant la refonte)

1. **Lire `property_type` + `min_price`/`max_price` depuis l'URL** dans `page.tsx`
   (≈ 4 lignes) → honore les deep-links venant des pages intention et de la home.
2. **Supprimer le flash mock** : démarrer liste vide + skeleton, ou SSR des vraies
   données, au lieu de seed `mockListings`.
3. **Supprimer le code mort search** (5 fichiers) → réduit la dette.
4. **Ajouter CTA business** dans la sidebar / sous la grille : Simuler le crédit,
   Créer une alerte (locataire), Dossier acheteur/locataire.
5. **Tracking** : câbler `hero_search_submit` / `*_cta_click` déjà dispo (Phase 2 OVERNIGHT).

---

## 7. Risques techniques (pour la refonte)

- **`PhotoFirstListingCard` est probablement réutilisée ailleurs** (favoris, listings) :
  vérifier les usages avant de la restyler en dur — préférer une variante `dark`
  ou un nouveau composant `SearchListingCard` pour éviter les régressions.
- `/api/search` & `lib/search` sont partagés avec `/map` : ne pas modifier la data.
- `CompareBar` / Favoris sont **globaux** (état persistant) : ne pas casser.
- Retrait de `mockListings` : s'assurer que l'état vide/erreur reste géré.
- Thème dark : attention au contraste des selects/inputs natifs (lisibilité).
- Ne pas toucher header/footer/logo (déjà figés) ni le wording sensible.

---

## 8. Recommandations pour SEARCH-RELOOKING-1

1. **Passer le shell en dark premium** (`bg-[#061027]`, hero ambient + glow,
   eyebrow bronze) en réutilisant les patterns de `AcheterPageShell`.
2. **Nouveau `SearchListingCard` dark** (clone restylé de PhotoFirstListingCard,
   sans toucher l'original) : card sombre, ring blanc/10, glow bronze, prix bronze,
   badges harmonisés, mêmes données.
3. **Barre de filtres en glass premium** (translucide + blur), onglets transaction
   bronze, chips actifs cohérents.
4. **Densité** : grille 3 colonnes sur grand desktop, 2 sur laptop, 1 mobile.
5. **Quick wins 1→5** intégrés (URL params, suppression mock, CTA business, tracking).
6. **Carte** : conserver le panneau, l'harmoniser dark.
7. **Pagination / charger plus** (optionnel) si volume réel le justifie.
8. Cible visuelle : **≥ 9.3/10**, aligné avec les pages intention.

---

## 9. Score actuel (honnête)

| Axe | Note |
|---|---|
| Desktop actuel | **7.0 / 10** |
| Mobile actuel | **6.5 / 10** |
| UX actuel | **7.0 / 10** |
| Cohérence marque | **4.5 / 10** |
| Potentiel après refonte | **9.5 / 10** |

**Synthèse** : moteur **fonctionnellement solide et data-riche**, mais **visuellement
hors-charte** (clair vs dark premium). La refonte est surtout un **reskin dark premium
+ quelques quick wins UX**, pas une reconstruction logique. Risque maîtrisé si on
clone la card au lieu de modifier l'originale partagée.

---

## 10. Prochaine étape exacte

**SEARCH-RELOOKING-1** (refonte visuelle, séparée) :
1. Vérifier les usages de `PhotoFirstListingCard` (favoris/listings) avant restyle.
2. Créer `SearchListingCard` dark (clone) + passer `LightZillowSearchShell` en dark.
3. Glass filters + densité grille + CTA business + quick wins URL/mock.
4. Build + smoke `/search` (+ variantes query) + captures avant/après + validation Achraf.
Aucune modif data/API. Ne rien déployer sans validation visuelle.
