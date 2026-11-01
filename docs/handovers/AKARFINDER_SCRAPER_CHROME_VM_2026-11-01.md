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

## CI #41266257228 GREEN — les 2 blocs non-annonces identifiés

- [Run #41266257228](https://github.com/hraaaaf/Akarfinder/actions/runs/41266257228) : SUCCESS, Chromium HTTP 200.
- Carte DOM n° 8 : `listingBox adBoostBox`, promotion `IMMOBILIER NEUF`, bâtiment professionnel à Tamesna, sans lien `/fr/a/`, hors catégorie de résultats recherchée.
- Carte DOM n° 34 : `listingBox emptyBox brightness`, élément vide sans texte, titre, prix ou lien.
- Conclusion vérifiée : **32 fiches avec lien, titre, prix, surface parmi 34 blocs HTML** ; les deux blocs restants ne sont pas des annonces d'appartements perdues.
- Limite : le parseur V6.3 a été validé sur 2 vraies cartes HTML mais pas sur l'ensemble brut des 32 cartes d'une page unique. Aucun taux de bypass universel certifié.
- Statut : sondes terminées, 3 runs SUCCESS ; V6.3 ZIP livrée localement, 36/36 tests hors ligne.
- Next : test `parse_listings` sur le HTML complet si un artefact de ce type est ultérieurement disponible ; pas d'autre run lourd sans nécessité.

## 2026-11-01 — CI #41309034221 : validation de TOUS les 34 blocs DOM

- [GitHub Actions #41309034221 — SUCCESS](https://github.com/hraaaaf/Akarfinder/actions/runs/41309034221), SHA de test `710a81ec2acaef2c1093260ef62c59c2728ee4d4`. Le même job Ubuntu installe Chromium, ouvre une seule page Rabat (HTTP 200), capture le DOM épuré de tous les 34 blocs `.listingBox` dans `listing_cards_dom.html`, puis exécute `scripts/probes/inspect_html.py`. [Artefact : HTML, coverage.json, diagnostic.json, screenshot](https://github.com/hraaaaf/Akarfinder/actions/runs/41309034221/artifacts/13084641532). L'inspecteur dans ce run est un contrôle léger du DOM, **pas** le parseur complet V6.4.1.
- **Vérification indépendante locale** de cet HTML (198245 octets) avec l'original inchangé `akarfinder_v6_4_1/akarfinder_scraper.py` et `inspect_html.py` : 34 blocs ; 2 ignorés à juste titre (1 `adBoostBox`, 1 `emptyBox`) ; 32 cartes éligibles ; **32/32 parsées**, 0 rejet, 0 identifiant dupliqué ; **32/32 surfaces**, **32/32 quartiers**, **32/32 villes**, **29/32 prix numériques**, 29/32 pièces, 32/32 chambres et 32/32 salles de bains. `acceptance_rate=100%`, `price_coverage=90.62%`, `surface_coverage=100%`, `quality_accepted=true`.
- Les **3 annonces sans prix numérique** sont explicitement marquées « Prix à consulter » sur le site : IDs **8323267**, **7650484**, **7133634**. Ce sont des valeurs source non renseignées, pas des erreurs de sélecteur.
- Un prix **15 000 DH pour 101 m²** (fiche **8441628**) est réellement affiché tel quel sur la page d'appartements à vendre. Valeur inhabituelle à **signaler pour vérification**, ne pas la corriger ni la rejeter automatiquement sans autre preuve.
- Les tests locaux V6.4.1 ont été relancés : **57 tests OK**, aucun `skip` dans cet environnement ; les 2 tests Chromium peuvent être `skipped` dans les environnements dépourvus de binaire.
- **Décision** : ne pas promettre « 32 prix » alors que trois annonces sont « Prix à consulter » ; ne pas supprimer les fallback historiques ; différer les changements de seuil / architecture sans corpus plus large.
- **Limites** : cette validation couvre une page de résultats dans un état observé, pas toute la pagination, la qualité des données métier ou le bypass universel des challenges ; les critères quartier/ville ne sont pas encore inclus dans le fail-closed de V6.4.1, bien qu'observés à 100 % sur cette page.
- **Next exact** : cibler le prix atypique sans modifier sa valeur brute ; compléter la politique de confirmation des prix suspects (éviter 3 relances le même jour) et traiter le cas localité unique, avec tests isolés avant nouvelle montée de version.
