# Vivre Ici — L2-B : fiche quotidienne > cadre de vie > biens
**07/11/2026 · CANDIDATE DRAFT · Non fusionnée, non déployée · Base dépendante de L2-A (#1177) et L1 (#1175).**

## GOAL
Donner un véritable ordre de décision au rail Maârif : **Vie quotidienne → Cadre de vie / source / couverture → Biens**. Aucun prix, score de sécurité ou temps de trajet sans preuve fraîche. Conserver le passage géolocalisé vers Search.

## BEFORE / référence
- [L1 responsive #42358643944](https://github.com/hraaaaf/Akarfinder/actions/runs/42358643944) : 20 captures aux formats 390×844, 430×932, 768×900 et 1280×900 ; Maârif direct et parcours national. Ce sont les captures source de référence, pas le résultat L2-B.
- Rail antérieur `P4MapDecisionRail.tsx`: pseudo-onglets non actionnables `Vue d'ensemble`, `Vie locale`, `Prix`; « Indicateurs disponibles » à Rabat même si endpoint prix en erreur ; trois pseudo-statuts en tuiles ; catégories/vraies ancres uniquement si source fraîche ; CTA Search réel.
- [Cible L2 validée documentaire #1174](https://github.com/hraaaaf/Akarfinder/blob/audit/vivre-ici-current-main-20261106/docs/reviews/VIVRE_ICI_L2_UX_TARGET_2026-11-07.md), sections 3–5.

## Mockup fonctionnel / SUCCESS
```text
[Casablanca · Maârif] — couverture et précision signalées
Vie quotidienne
  Si données récentes : catégories et lieux réels, avec provenance
  Sinon : message explicite sans faux chiffre
Cadre de vie
  Couverture: documentée / partielle / indisponible
  Aucun indice ni distance extrapolé
Biens
  [Voir les biens disponibles à Maârif] — conserve city + district
```
Le contenu est réellement visible et lisible sur mobile; CTA et attributs des liens fonctionnels; aucune pseudo-onglet sans action, pas de valeurs `0 vérifiés` lorsqu'une source a expiré.

## Changements candidats
- Dans `components/map/P4MapDecisionRail.tsx`, retire les pseudo-onglets inactifs ; ajoute une section quotidienne avec fallback honnête, conserve le guide POI si ancrages récents seulement, n'affiche la grille de chiffres que si `anchor_count>0`.
- Dans la partie `Cadre de vie`, annonce la couverture `covered` / `partial` / autre indisponible sans affirmer que les indicateurs de prix sont disponibles ; laisse explicitement absents les prix et temps de trajet.
- Dans `Biens`, conserve exactement `searchHref`, son `p4-premium-primary-action` et la fiche quartier lorsque légitime.
- Test structurel de non-régression ajouté à `scripts/scrapers/__tests__/p1a6-responsive-hardening.test.ts`.

## PROOF manquante / gates
1. Build TS + required gate sur HEAD exact.
2. Test P1A.6 et autres parcours identiques, zéro nouveau finding, captures **AFTER quatre viewports** ; vérifier l'état Maârif sans POI récents, CTA réellement visible et aucune collision mobile.
3. Revue visuelle BEFORE/AFTER avec score argumenté. Pas de certification avant ces preuves.
4. Ne pas confondre ce lot avec L2-C : la bottom sheet rétractable reste à implémenter/valider. P1B.2 prix Supabase inaccessible reste un blocage externe, ne pas falsifier un passage au vert.

**Interdits** : aucun merge, DB prod, Vercel ou promotion du contour Maârif en `shadow/reviewed:false` sans autorisation distincte.
