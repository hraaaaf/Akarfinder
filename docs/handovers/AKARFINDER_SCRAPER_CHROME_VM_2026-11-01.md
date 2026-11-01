# Akarfinder — VM Chromium et correction DOM — 2026-11-01

## Goal et preuve
Goal : exécuter Chromium dans GitHub Actions et vérifier les sélecteurs d'annonces sur la page Rabat.

- Repo : `hraaaaf/Akarfinder` ; branche expérimentale `sandbox/akar-chrome-probe-20261101`.
- [Run #41265251345 — SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/41265251345) : Ubuntu, Chromium Playwright 141, HTTP 200, 34 `.listingBox`, 32 liens `/fr/a/`, 0 `.listingTitle`, 0 `.hardPrice`. [Capture 1280×800 et diagnostic](https://github.com/hraaaaf/Akarfinder/actions/runs/41265251345/artifacts/13067132388).
- [Run #41265412731 — SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/41265412731) : extrait HTML limité à deux cartes, révélé `.listingTit`, `.priceTag`, `.adDetails .adDetailFeature`. [Artefact HTML et capture](https://github.com/hraaaaf/Akarfinder/actions/runs/41265412731/artifacts/13066198723).
- V6.3 corrigée et validée **hors ligne** avec 36 tests. Les 2 vraies cartes donnent : ID 8432690, prix 2 600 000, 110 m², 4 pièces, 3 chambres ; ID 8438377, prix 7 000 000, 218 m², 4 pièces, 3 chambres.
- Le code V6.3 reste livré séparément comme archive dans la conversation ; seul le probe Chromium est ici sur GitHub. Aucune modification de la branche `main`.

## Verdict
Une navigation Chromium a réussi sans challenge observé. **Cela ne prouve pas un bypass universel de Cloudflare.** L'exhaustivité (34 cartes → 32 liens) et les autres pages n'ont pas encore été certifiées.

## Next exact
Sur une exécution bornée, contrôler les champs prix/titre/surface de toutes les cartes de la page puis documenter les 2 éléments sans lien de fiche ; poursuivre seulement si le rapport de qualité est satisfaisant.

## Restrictions d'exécution
La branche et le workflow sont **expérimentaux**, uniquement sur push ciblé. Ne pas merger le workflow lourd dans `main`, et aucun déploiement Vercel sans autorisation.

## CI #41265663831 — couverture complète du premier écran — GREEN

- [Run #41265663831](https://github.com/hraaaaf/Akarfinder/actions/runs/41265663831) : SUCCESS sur HEAD `92ca023e19ec553c9433b3a4855ab20c0b04bb48` ; HTTP 200 avec Chromium 141.
- `.listingBox` : 34 ; liens de fiche : **32** ; titres : 33 ; prix : 33 ; surfaces : 32 ; pièces : 29 ; chambres : 28 ; **32 cartes** avec titre/prix/surface/lien, soit **94,1 % des blocs `.listingBox`**.
- Cartes sans lien : positions 8 et 34 (indices DOM 7 et 33) ; nature encore inconnue. Le compteur 34 ne doit donc pas être annoncé comme 34 annonces complètes.
- [Diagnostic et capture](https://github.com/hraaaaf/Akarfinder/actions/runs/41265663831/artifacts/13067375176).
- En parallèle, V6.3 locale : **36/36 tests OK**, `py_compile` OK, et `inspect_html` sur les deux vrais fragments retourne `parsed_listings_count=2`, `diagnostic=ok`.

## Investigation résiduelle (CI en cours)

- Commit `4c759e57faa29aa5cd830ed17341734c62130ca5` ; [run #41266257228](https://github.com/hraaaaf/Akarfinder/actions/runs/41266257228) en cours au dernier contrôle ; documentera les deux blocs sans lien et leurs attributs.
- Next exact : lire les deux échantillons ciblés, conclure si éléments non-annonces ou erreurs de sélecteur, corriger seulement si preuve de perte de vraie annonce ; mettre à jour ce handover.
