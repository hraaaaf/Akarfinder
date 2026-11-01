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
