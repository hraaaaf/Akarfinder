# M7-F — External SERP UI

Date: 2026-08-24
Status: CLOSED — PASS

## Goal

Faire des résultats externes AkarFinder un SERP immobilier dense et lisible, avec le total réel dominant, sans les maquiller en annonces natives et sans afficher de contenu source non autorisé.

## BEFORE vérifié

- Production Casablanca : `total_count=387`, première page `100`, `has_more=true`.
- Le total réel existait déjà côté gateway, mais le rendu mobile pouvait présenter `100 résultats` comme s’il s’agissait du total.
- Les résultats externes étaient de grosses cartes illustrées façon portail, peu denses.
- Le BEFORE production présente une erreur d’hydratation React `#418`; elle préexiste à M7-F et n’est pas introduite par ce lot.

## Références externes

- Mubawab : volume global avant la liste, tri puis résultats séquentiels.
- Rightmove : total global, tri/map puis liste dense.
- Doctrine AkarFinder : logique SERP + provenance + lien source, sans recopier les détails protégés des portails.

## Implémentation

- Le total global reste le nombre dominant.
- Aucun compteur `N chargés` concurrent.
- Résultats externes en liste continue compacte.
- Source visible avant le titre.
- Métadonnées minimales inline.
- `external_minimal_index` : aucun faux emplacement photo, aucune illustration de substitution, aucun prix indicatif inféré.
- Disclaimer compact : prix/photos/détails à vérifier sur la source.
- CTA explicite `Ouvrir la source` et navigation même onglet.
- Pagination curseur existante conservée : première page 100, continuation ensuite.

## Preuve finale

HEAD produit + contrats : `7a530264aa1c7e946d22b9774842386a29789266`

Gate dédié : `M7-F External SERP UI` run `32765757715` — SUCCESS.

Artifact : `m7f-external-serp-ui-proof`, id `9534417550`, digest `sha256:a6ddb26d77a3ae22c047d60ca85b1e1765cb7b42d84af84b2f8d9ae908acc8e6`.

AFTER sur 390 / 430 / 768 / 1280 :

- `387 résultats` présent : 4/4.
- lignes de preuve : 24/24 sur chaque viewport.
- hauteur lignes : 131–138 px, seuil <= 140 px.
- overflow horizontal : 0/4.
- erreurs runtime AFTER : 0/4.
- faux compteur `N chargés` : 0/4.

Le harness AFTER réutilise les vrais composants M7-F ; il ne constitue pas un déploiement production de `/search`.

## Validation croisée

- Run dédié exact-head M7-F : PASS.
- `Property Type Visual Option A` : PASS après alignement du contrat externe minimal.
- `SEARCH Indicative Price Source Check` : PASS après suppression de l’attente de prix inféré sur le lane minimal.
- Les CI historiques qui exigent encore une image/illustration Gateway externe sont des contrats obsolètes contradictoires avec le Goal media-free ; elles ne justifient pas de réintroduire du faux média.

## Score visuel

**8,8 / 10**

- Lisibilité / hiérarchie : 9,2
- Densité SERP : 9,3
- Honnêteté du rendu externe : 9,6
- Responsive : 9,1
- Finition graphique : 8,3
- Richesse visuelle volontairement limitée par le contrat minimal : 7,5

## Conclusion

M7-F est CLOSED : le résultat externe se comporte désormais comme un index de recherche source-first et non comme une fausse annonce native.

Aucun déploiement Vercel effectué.
