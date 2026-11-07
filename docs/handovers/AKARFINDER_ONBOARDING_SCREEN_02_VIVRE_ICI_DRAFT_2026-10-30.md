# AkarFinder — Onboarding produit 02 : VIVRE ICI (fiche PROPOSÉE)

**Statut : AUDIT STRUCTUREL seulement ; aucune validation visuelle actuelle et aucune décision produit utilisateur collectée ici.** Date : 2026-10-30. `main@c02d0b73` de référence.

## Goal, succès, preuve

**Goal :** avoir une carte nationale puis ville/quartier compréhensible immédiatement, avec limites de quartier bien lisibles, bâtiments discrets, POI sourcés et rail de décision immobilier cohérent, sans perdre l'identité premium AkarFinder.

**Succès observable :** Maârif, puis au moins des villes/quartiers indépendants, respectent la hiérarchie carte/limites/repères/rail, restent fluides et crédibles aux **390 / 430 / 768 / 1280** ; aucune géométrie de quartier fabriquée et aucune coordonnée de bien extrapolée. Captures BEFORE/TARGET/AFTER comparables, score indépendant et validation humaine.

## PR regroupées et topologie

| PR | Branche / statut du snapshot | Rôle | Décision PROPOSÉE |
|---|---|---|---|
| [#1090](https://github.com/hraaaaf/Akarfinder/pull/1090) | DRAFT, base `main` | Produit national → ville → quartier, couches, rail, composition | **GARDER comme base métier/architecture**, ne pas adopter tout le 3D |
| [#1108](https://github.com/hraaaaf/Akarfinder/pull/1108) | DRAFT, base branche #1090 | **Flat Living Map** : caméra flat, volumes bâtiments supprimés, palette plus calme | **DIRECTION FAVORITE provisoire**, à certifier par captures |
| [#1112](https://github.com/hraaaaf/Akarfinder/pull/1112) | DRAFT, base branche #1108 | Tests source-only, Al Qods + Boukhalef sur quatre viewports | **KEEP TESTS** sans prétendre qu'ils certifient l'expérience nationale |
| [#1111](https://github.com/hraaaaf/Akarfinder/pull/1111) | DRAFT, base main | Audit national des centres quartiers fondé sur provenance | **GARDER PROVENANCE** ; des centres ne sont pas des polygones |
| [#487](https://github.com/hraaaaf/Akarfinder/pull/487) | ancien PR main, 1 migration | Fondations library visuelle Rabat en SQL | **REVIEW / ne pas intégrer** avant audit du provider et de la politique de stockage |

**Dépendances transversales :** #936 (filtrage URL quartier / POI junk), #938 (`app/layout.tsx` commun à #1090), #1082 (DB / read paths carte), #1104 (sémantique annonce), #1101 (writer).

## Collision de code et erreurs à éviter

**10 fichiers communs entre #1090 et #1108** :
`app/map/quartier-target-couche3.css`,
`components/map/MapLibreNeighborhood3D.tsx`,
`components/map/NationalMapRouter.tsx`,
`components/map/NationalTerritoryExperience.tsx`,
`lib/map/akarfinder-territorial-style.ts`,
`scripts/audits/carte-lot8-casablanca-visual-after.mjs`,
`scripts/audits/carte-lot8-multicity-browser.mjs`,
`scripts/audits/carte-national-neighborhoods-n2.mjs`,
`scripts/audits/carte-poi-language-after.mjs`,
`scripts/audits/carte-rue-proximite-after.mjs`.

#1090 `MapLibreNeighborhood3D.tsx` = blob `58f567d264cd15df140896529ec41dc8de19677e` (1 273 lignes observées) ; #1108 = `f86aab33ad47163c0c3ae12feacb7718cccbc3a4` (1 555 lignes) ; `main` = `98e6f75e87f911c36bb6d66550e948ff10487b2e` (386 lignes). **La branche enfant n'est pas un petit changement esthétique : elle contient la base parente, donc toute comparaison visuelle doit vérifier le delta ciblé.**

#1112 partage `scripts/audits/carte-national-neighborhoods-n2.mjs` avec #1108 et `components/map/P4MapDecisionRail.tsx` avec #1090. Leurs bases de PR révèlent une chaîne, pas trois merges indépendants.

#487 ajoute `supabase/migrations/20260811133410_rabat_neighborhood_visual_library_foundation.sql` : fichier **absent du main observé**. Ne pas le fermer comme « déjà mergé » ou l'appliquer sans preuve DB/provider/permission média.

## Choix que je recommande lors de l'onboarding

**A — RECOMMANDÉE : flat premium + quartiers bien délimités.** Garder les données/POI/hiérarchie nationales de #1090 ; appliquer le pivot flat #1108 ; donner la priorité au **contraste/relief léger de la limite du quartier**, aux bâtiments moins gras, aux repères exploitables et au rail immobilier lisible. Les zones ne doivent pas être simulées si leurs limites ne sont pas sourcées. Valider à Maârif puis généraliser par **contrat territorial réutilisable**, pas par hacks CSS Maârif.

**B — Poursuivre 3D dense.** Éventuellement intéressant pour quelques vues bâtiment, mais risque de masquer les limites et de rendre la lecture mobile bruyante. Je le déconseille comme expérience par défaut.

**C — Réduire à simple carte de points.** Plus facile mais abandonne la différenciation « Vivre Ici », n'explique pas les quartiers et peut créer un résultat générique.

**Trois risques importants :** (1) polygones non fondés sur données, (2) stack CSS/maplibre par site hors d'échelle sur 12 régions, (3) une belle Maârif ne prouve pas le national/responsive.

## Ordre de validation

1. Avant tout changement UI, capturer le vrai **BEFORE de `/map` sur main** et la cible de référence aux quatre viewports. Montrer chaque capture à l'utilisateur.
2. Construire un mockup TARGET explicitement accepté avant l'intégration (limite, bâti, POI, rail, états vides).
3. Reproduire techniquement la direction A sur une branche unifiée issue de main, sans merger aveuglément #1090 puis #1108 puis #1112.
4. TESTS : navigation territoire, provenance POI, source-only, frontières réelles, regression sur plusieurs villes, desktop/mobile, perf/A11y et zoom/pan.
5. AFTER sur exactement les mêmes viewports/états, comparer à la cible, scoring indépendant, décisions utilisateur, closeout. **Aucun Vercel deploy ou DB write, aucun merge sans gate humain.**

**Recommandation A : PROPOSÉE.** Décision utilisateur : **EN ATTENTE**. Score actuel : **NON CERTIFIÉ**. Validation géo : **NON CERTIFIÉE**.

**Next exact :** compléter l'audit probatoire préalable, puis BEFORE /map et comparaison #1090 ↔ #1108 avec ciblage Maârif.
