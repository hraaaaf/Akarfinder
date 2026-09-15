# AkarFinder — `/map` Carte Interactive Premium — Handover 2026-09-15

## Goal

Remplacer le contenu de `/map` par un mock front-end premium isolé : navigation `National → Région → Ville → Quartier`, 12 régions, données quartier fictives regroupées uniquement dans `useMapData()`, aucun appel/écriture Supabase, et liens `Explorer` vers `/immobilier/{ville}/{quartier}`.

## Succès observable

- composant client isolé `components/map/PremiumInteractiveMap.tsx` ;
- D3 geo/zoom + TopoJSON ADM1 + Framer Motion ;
- 12 régions dans une seule famille bleu/gris-bleu ;
- 8 villes supportées dans le mock, 45 quartiers ;
- vocabulaire exact `repère prix`, `repère vérifié`, `disponible/indisponible` ;
- shell AkarFinder conservé : header/logo, theme toggle, metadata SEO et footer ;
- captures `390×844`, `768×900`, `1280×900`, `1440×900` + dark `1280×900` ;
- zéro requête Supabase observée par le gate ;
- aucun déploiement Vercel.

## État vérifié

### Dernier gate vert sur le cœur visuel

- HEAD testé : `f6330d1918a18adca61c264d3cc1e589fa52afa5`
- run : `34969344839` — SUCCESS
- artifact : `10395808839`
- digest : `sha256:ebab8edda8e3382e8cf0e1f1069f84e5ab224b072dfa82890168c6e27abbcf2f`
- TypeScript : SUCCESS
- build : SUCCESS
- 12 régions / 12 entrées liste
- Casablanca : 10 quartiers, route Maârif exacte `/immobilier/casablanca/maarif`
- overflow horizontal : `0`
- remplissage SVG inactif : `rgb(234, 243, 255)` ; bug noir corrigé
- dark theme : `dark`
- label dark testé : `rgb(96, 165, 250)` ; contraste navy corrigé
- requêtes Supabase observées : `0` sur les quatre viewports light + `0` en dark
- DB write : `0`
- Vercel : `0`

### Candidate final avec shell restauré

- HEAD produit candidate : `4dfdd13044702382c1b3102c31dd5a75362d620c`
- restaure `SiteHeader searchMode fluid`, logo AkarFinder, metadata SEO et `SiteFooter`
- gate enrichi : header présent, logo présent, titre SEO, thème réel `akarfinder-theme`, capture top déterministe, zéro Supabase
- run final : `34969848444`
- état au dernier contrôle : `queued`, aucun runner attribué (`runner_id=0`)
- autres runs `in_progress` du repo au même contrôle : `0`
- ce HEAD n'est donc PAS encore certifié final.

## BEFORE / référence

- dernier BEFORE produit prouvé : commit `5060ed138237d0e1f08533f2d7ebdcb32fa42b9a`
- run `34572349452` — SUCCESS
- artifact `10188312451`
- `1716488be8095a6077ebde6ba1f2cf26e6197b10` ne modifiait ensuite que la documentation, donc ce BEFORE reste valide pour comparaison.

## Architecture / données

- `useMapData()` est l'unique couche mock ; commentaire `// MOCK` explicite.
- aucune requête Supabase dans le composant.
- TopoJSON ADM1 geoBoundaries ; validation 12 régions.
- frontières quartiers volontairement schématiques/non cadastrales.
- `Explorer` n'imite pas la recherche immobilière : il sort vers les routes produit réelles.

## PR #1025 — divergence importante

État re-fetch 2026-09-15 :

- PR `#1025` OPEN, non mergée, `mergeable=false`
- branche : `docs/3-vivre-ici-akarfinder`
- HEAD : `449729b77bd076b1c3916fbcaaa0e9bc5d0b765f`
- latest `main` : `cc748ec5eb24f422216cb1261e4c01977e7f25d0`
- PR vs latest main : `231` commits devant / `72` derrière, statut `diverged`
- spike premium vs PR : architecture également divergente ; la PR contient déjà N3/C7, MapLibre 3D, decision rail, synthetic market lane et plusieurs gates.

Conclusion : ne PAS intégrer automatiquement le mock dans #1025. Cela remplacerait des fonctionnalités plus récentes et constitue désormais un choix stratégique/human gate, pas un merge mécanique.

## Risques / limites

- le lot est un mock front-end, pas une activation production ;
- les statistiques quartier sont fictives par conception ;
- le TopoJSON est chargé depuis une source distante de prototype ;
- la PR #1025 contient une architecture plus avancée et divergente ;
- aucun Vercel sans autorisation explicite.

## Next exact

1. Re-vérifier une fois le run `34969848444`.
2. Si SUCCESS : télécharger l'artifact, inspecter les captures `390 / 768 / 1280 / 1440 + dark`, comparer aux BEFORE mêmes viewports, attribuer un score visuel honnête et mettre à jour `3-vivre-ici-akarfinder.md`.
3. Si FAIL : diagnostiquer le job exact, corriger, tester puis relancer si sûr.
4. Après certification du spike : human/strategic gate avant toute intégration dans PR #1025, car cette PR a divergé de 32 commits depuis le merge-base du spike et contient une architecture fonctionnelle différente.
5. Aucun Vercel sans autorisation explicite.

## REPÈRES

- chantier/lot : Carte Interactive Premium `/map`
- branche : `spike/vivre-ici-maplibre-morocco`
- HEAD produit candidate : `4dfdd13044702382c1b3102c31dd5a75362d620c`
- dernier HEAD visuel prouvé : `f6330d1918a18adca61c264d3cc1e589fa52afa5`
- run final : `34969848444` — queued
- PR #1025 : OPEN / HEAD `449729b77bd076b1c3916fbcaaa0e9bc5d0b765f` / mergeable=false
- main : `cc748ec5eb24f422216cb1261e4c01977e7f25d0`
- deployment : aucun
- DB : aucun write ; zéro requête Supabase sur le dernier gate vert
- blocage réel : runner GitHub non attribué au run final
- Next exact : recheck run `34969848444`, puis artifact/captures/closeout si vert
