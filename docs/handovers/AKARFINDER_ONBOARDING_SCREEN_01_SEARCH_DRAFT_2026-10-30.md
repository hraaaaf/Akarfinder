# AkarFinder — Onboarding produit 01 : SEARCH (fiche de décision PROPOSÉE)

**État : préparation d'onboarding, aucun arbitrage demandé/obtenu.** Date : 2026-10-30. Référence de comparaison : `main@c02d0b73`; les HEAD PR et valeurs techniques doivent être re-vérifiés le jour de la séance.

## Goal / succès / preuve

**Goal utilisateur :** offrir sur `/search` une recherche immobilière premium, claire sur mobile, cohérente liste/carte, sans sacrifier vérité des annonces.

**Succès observable :** filtres prévisibles et accessibles, affichage `Liste / Mixte / Carte` pertinent selon viewport, visuels de types identiques entre filtres et cartes, photos/prix certifiés, zéro résultat honnête, performance et continuité URL/session ; comparaison BEFORE/TARGET/AFTER aux **390, 430, 768, 1280**.

**Preuves acquises ici :** noms des fichiers modifiés des PR, topologie PR, SHA des composants ciblés, lecture du code de `QuickFilters`, `SearchViewSwitcher`, `SearchPriceExplorerDock`, `PropertyTypeVisualSelector` et de la page `app/search/page.tsx`. **Aucun AFTER navigateur ou score visuel actuel vérifié ici.**

## Regroupement par responsabilité

| PR | HEAD abrégé | Rôle exact | Recommandation provisoire |
|---|---|---|---|
| [#1035](https://github.com/hraaaaf/Akarfinder/pull/1035) | `bafaec3d8` | Search P3 : mobile Liste/Carte, desktop Liste/Mixte/Carte, barre & filtres, density, dock contextuel | **EXTRAIRE** les interactions pertinentes après audit visuel, pas fusionner tout le P3 historique |
| [#1102](https://github.com/hraaaaf/Akarfinder/pull/1102) | `e5946aa46` | Source visuelle des types et composants filtres/cartes | **GARDER la direction visuelle** seulement après correspondance assets avec types et tests |
| [#622](https://github.com/hraaaaf/Akarfinder/pull/622) | `6bdd68484` | Search Gateway refuse toute annonce non éligible Source Policy Registry | **GARDER INVARIANT** en séparant son SQL/provider du travail UI ; migration seulement validée sur DB réelle |
| [#936](https://github.com/hraaaaf/Akarfinder/pull/936) | `21622733f` | Refus de quartier explicite contradictoire et noms POI junk | **GARDER INVARIANT** ; réconcilier avec #1090 Vivre Ici |
| [#1029](https://github.com/hraaaaf/Akarfinder/pull/1029) | `53704393f` | Unification des représentations sources au niveau DB/acquisition | **DÉPENDANCE DATA**, non une décision UI autonome |
| [#1104](https://github.com/hraaaaf/Akarfinder/pull/1104) | `841686654` | Audit vérité sémantique prix/transaction | **DÉPENDANCE DATA**, ne pas prétendre certificats actuels avant DB readback |
| [#938](https://github.com/hraaaaf/Akarfinder/pull/938) | `68bf5d23f` | Canoniques SEO publics, y compris Home et autres routes | **DÉPENDANCE SEO**, validation globale distincte |

### Conflit et preuve source

**Conflit réel** : les PR #1035 et #1102 changent toutes deux `components/search/QuickFilters.tsx`.

- Blob `main` : `56454fb725810cbda3279a154d5083f6b94c8e56` (158 lignes observées).
- Blob #1035 : `844f6acc0c15053959f4c0df40923028d66f3544` (174 lignes observées). Sa version compte les filtres transaction et quartier et contient des ajustements d'ergonomie mobile ; le ViewSwitcher #1035 expose mobile Liste/Carte plutôt qu'un menu simple, avec garde du mode split.
- Blob #1102 : `aa279cf0b2cbe32fecbff9dd11b0d4226a7233c9` (158 lignes observées), distincte de `main`. Son `PropertyTypeVisualSelector` ajoute le variant `search-target`, tandis que `main` n'offre pas ce variant.
- `SearchPriceExplorerDock.tsx` : #1035 = `892882cb...` vs main = `a6e53c4...` ; #1035 empêche le dock en zéro listing (`visibleListings.length === 0`). Cette condition doit être comparée au composant réel avant adaptation.
- #622 agit dans `app/api/search/gateway/route.ts`, `lib/search-gateway/search-gateway-normalizer.ts` et migration SQL, **pas** comme un thème visuel.
- #936 agit sur `lib/search/database-search.ts` et lecture géographique, à conserver comme garde vérité si compatible avec le schéma réel.

**Point critique :** si les changements de #1035 écrasent les visuels #1102, l'utilisateur perd la cohérence des types ; si #1102 écrase #1035, les améliorations P3 mobile peuvent être perdues. Ne jamais « résoudre » le conflit en privilégiant l'ordre de merge arbitraire.

## Trois options à montrer au commanditaire

**A — RECOMMANDÉE : composition minimale cohérente.** Sur branche actuelle de `main`, reprendre le P3 utile du ViewSwitcher/filtres/rendu mobile (#1035), appliquer la source visuelle unifiée des types (#1102), conserver la vérité des annonces à la couche data (#622/#936). Un seul QA responsive et state-driven. **Avantage :** expérience premium fonctionnelle et maintenable. **Inconvénients :** effort de portage ciblé, nécessité de recertification globale (aucun score garanti), dépendances DB hors UI.

**B — Patch visuel uniquement (#1102).** Plus court, mais ne corrige pas forcément les incohérences Liste/Carte, filtres mobiles, zero-state et density. À retenir seulement si le BEFORE prouve que `main` a déjà une navigation satisfaisante.

**C — Merger les PR par date.** **DÉCONSEILLÉ** : les deux patchent `QuickFilters.tsx` et ciblent des objectifs d'époques différentes ; l'addition aveugle peut casser responsive, types et interactions.

## Actions avant l'arbitrage visuel

1. Capturer le **BEFORE réel `/search`** sur la même version, mobile 390/430, tablette 768, desktop 1280, avec filtres ouverts, menu vues, 0 résultat et fiche avec photo. **Montrer les captures à l'utilisateur**, conformément aux instructions.
2. Préparer la comparaison mockup TARGET (assets locked Search et design system), même viewports. Vérifier que le screenshot prouve la route réelle, pas un storybook isolé.
3. Établir le scénario utilisateur : Acheter Casablanca, louer Rabat, budget min/max, bascule Liste/Carte, quartier et retour navigateur.
4. Noter les états **KEEP / MODIFIER / ABANDONNER**, signaler 2–3 objections et demander décision produit sur la direction A/B.
5. Après décision : PR unique ciblée avec tests unitaires, navigateur/a11y, desktop/mobile, sécurité Source Policy ; AFTER identiques et revue indépendante ; **aucun merge ni déploiement Vercel sans gate explicite**.

## Décision

**Recommandation de l'assistant : Option A, PROPOSÉE.**  
**Avis utilisateur : NON COLLECTÉ.**  
**Note visuelle actuelle : NON CERTIFIÉE.**  
**Statut livraison : NON DÉMARRÉ.**

**Next exact :** achever l'audit préalable des autres PR et les droits sources, puis préparer les captures BEFORE Search avant de présenter la fiche interactive d'onboarding au commanditaire.
