# AkarFinder — Carte intelligence marché — N2 Ville → Quartiers — CLOSEOUT CANONIQUE

Dernière mise à jour vérifiée : 2026-08-24

## Statut

**CLOSED — 100 % = 5/5 gates fermés**

1. BEFORE / baseline N1 : CLOSED
2. Target visuel + Human Gate : CLOSED
3. Implémentation N2 : CLOSED
4. AFTER certification 390 / 430 / 768 / 1280 : CLOSED
5. Comparatif final + score + merge + closeout : CLOSED

## Goal

Étendre la hiérarchie **Maroc → Ville** vers **Ville → Quartier** sans inventer de frontières territoriales ni de métriques marché, en conservant la vraie basemap MapLibre/OpenFreeMap comme support principal.

## Résultat vérifié

- Casablanca : **1 617** labels/quartiers sourcés ;
- **134** repères cartographiques valides ;
- **0** contour quartier certifié/publié ;
- Maârif OSM sélectionnable sur le canvas réel ;
- `QUARTIER MAARIF` Barid sans coordonnées trouvable par recherche ;
- CTA Search conserve `city + district` ;
- vraie basemap MapLibre/OpenFreeMap présente sous l’overlay ;
- 390 / 430 / 768 / 1280 : **overflow 0** ;
- aucune erreur navigateur critique ;
- aucun faux fill/polygone quartier ;
- score visuel final : **9,4/10** (target >= 9,3).

## Certification finale

- Branche certifiée : `map/national-neighborhoods-n2`
- HEAD certifié : `2a4ed4493a8524986fd943784a317a1904ea61e0`
- Run : `32704717514`
- Job : `97363261159`
- Conclusion : **SUCCESS**
- TypeScript : SUCCESS
- Production build : SUCCESS
- Chromium : SUCCESS
- Four viewport city neighborhood certification : SUCCESS
- Artifact : `carte-national-neighborhoods-n2-after-32704717514`
- Artifact ID : `9511892515`
- Digest : `sha256:369d1618b4490d22c025649a9dfd68d0146d9f86186c1e689ac43c8765b63394`
- Artifact : 12 captures (base / Maârif actif / fallback postal × 4 viewports) + `report.json`.

Le `report.json` final est `ok: true` avec `mappedSelection=true`, `noCenterFallback=true` et `searchHandoff=true` pour les 4 viewports.

## Diagnostic fermé

Les échecs successifs ont été résolus sans augmenter artificiellement les timeouts :

1. lifecycle `style.load` / bridge : overlay non monté ;
2. readiness robuste après publication de l’instance MapLibre ;
3. hit-test dense : le premier feature MapLibre pouvait sélectionner un voisin ;
4. correctif final : sélection du repère géographiquement le plus proche du tap/clic dans un rayon adapté au tactile.

Le run final prouve que source, layers, interactions et fallback sont tous opérationnels.

## Validation visuelle

Comparaison effectuée contre la baseline N1 et `docs/CARTE_NATIONAL_N2_TARGET.md` :

- fond réel conservé ;
- carte dominante ;
- repères/labels au-dessus de la basemap ;
- fiche Maârif compacte ;
- fallback sans faux point ;
- mobile et desktop cohérents.

Score final : **9,4/10**.

Défaut mineur accepté : sur mobile, la recherche flotte près du CTA ville, sans overflow ni perte fonctionnelle.

## Git / merge

- PR : **#888**
- PR : MERGED
- Merge commit : `fd58022385ca2cd3624192cc1d286ee199ad04d8`
- Base au merge : `main`
- Merge effectué exact-head sur `2a4ed4493a8524986fd943784a317a1904ea61e0`.
- Les changements concurrents de `main` étaient limités à ingestion/sécurité et n’avaient aucun fichier en intersection avec N2 depuis le merge-base réel.

## Vercel

**Aucun déploiement Vercel autorisé ni effectué pour N2.**

## Next

N2 est fermé. Le lot suivant doit être déterminé depuis la roadmap/canon existant avant toute nouvelle implémentation ; ne pas inventer un N3 s’il n’est pas défini.
