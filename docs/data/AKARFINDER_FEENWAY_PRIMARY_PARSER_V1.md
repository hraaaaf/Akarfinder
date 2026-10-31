# AkarFinder — parseur primaire multi-portails V1

**Goal exact** : extraire les prix, surfaces, villes, quartiers et transactions depuis le bloc principal de la fiche SOURCE (pas FeenWay ni des suggestions), avec identifiant de la source prouvé.

**Contrat technique** : adaptateurs Mubawab, Avito, Agenz, Yakeey, Masaken et Sarouty ; identification stricte, contrôle des redirections, programmes mis à part, valeur monétaire MAD, surface avec origine, transaction vente/location, prix par nuit, mois, m² et pas-de-porte en review. Les écarts et valeurs absentes sont explicites. Le parseur ne tente aucune collecte, ne touche pas la DB et ne certifie aucun droit ni disponibilité.

**Sûreté** : une annonce n'est JAMAIS eligible sur la seule base des cinq champs; résultat possible review_five_fields, review_missing_fields, review_economic_or_field_conflict, review_source_route_alias, review_program, quarantine_identity. Dates = métadonnées, pas preuve d'activité. Pour Masaken, le quartier dans la narration ne devient pas automatiquement quartier certifié.

**Preuve** : tests Node sur blocs source tirés de structures publiques observées, contrôle absence de fausses valeurs issues des recommandations. CI dédiée read-only doit finir success avant toute conclusion « validé ».

**Next exact** : exécuter tests, corriger les échecs, puis comparer ce parseur sur les 60 fiches originales du canari 231, classifier les erreurs, adapter et seulement ensuite examiner les 171 restantes. Cette V1 n'est pas le parseur final du cap 200K.

## Matrice des risques avant passage à l'échelle (non exhaustif)

**1. Identité / provenance** : l'hôte du lien d'origine ET celui de la page finale doivent correspondre à la source ; le numéro / route de l'annonce doit être conservé, les routes programmes `pa:` restent hors du stock de biens individuels ; un changement de préfixe Yakeey mais pas de numéro est mis en revue. Des pages catalogue, soft-404, variantes multilingues et redirections croisées doivent être rejetées.

**2. Prix** : MAD, espaces normales/insécables, séparateurs 1 000/1.000, décimales et suffixes K/M (travail restant sur les cas non observés) ; refuser une devise inconnue, prix « sur demande », prix au m², pas-de-porte, vente versus location, nuit versus mois, prix baissé et multiples montants divergents. Ne jamais remplacer un prix manquant par un prix de recommandation, d'estimation ou de crédit.

**3. Surface** : surface totale, habitable, bâtie, terrain, balcon, parcelle ; priorité aux champs étiquetés dans la zone principale. Conflits multiples et intervalles => revue. Ne jamais inférer surface habitable depuis une surface de terrain.

**4. Géographie** : ville et quartier doivent être reliés à la même annonce ; géographie dans texte narratif, mauvaise correspondance des quartiers/communes, mauvais point GPS ou localisation FeenWay en conflit avec source => revue. Ne pas compléter automatiquement avec FeenWay.

**5. Transaction et typologie** : vente/location, bien vs programme, location courte durée, commercial, terrain, multiples logements, immeubles, annonces de services et annonces vendues/réservées ; une ambiguïté de transaction met les champs en revue.

**6. Duplication et fraîcheur** : clé source, URL canonique, alias/redirections, éventuel double portail, signature faible de prix/surface/quartier, et date de publication versus date « détectée ». HTTP 200 ou `is_active=true` historique ne prouve pas offre disponible. Une collision physique requiert preuve forte, jamais fusion automatique de signatures faibles.

**7. Droit et responsabilité** : consentement/exigence légale de réutilisation indépendants du robots.txt, aucune collecte de contacts/photos par ce parseur et aucune admission automatique. Les 5 champs complets sont **une étape technique**, pas une certification commerciale.

### État prouvé / étapes

- Commit V1 initial `967ef4b8` : 12/14 tests PASS, deux bugs de lecture des titres de localité Mubawab.
- Correctif `a7f75248` : **CI GitHub `40484365918` SUCCESS, 14/14 tests**.
- Renforcement `050ca12a` : source originale ET URL finale, transaction vente-location ambiguë, programme route ; **17 tests attendus**, CI run `40484934709` lancé, état à vérifier. Ne pas annoncer ce run vert avant les logs.
- **Gaps voulus V1** : suffixes monétaires K/M et différentes variantes non observées, contrôle d'images/localisation fine, export d'évidence sémantique par champ, benchmark réel détaillé sur 60 puis 171 origines, et certification d'activité/droit restent hors de cette preuve.

**Next exact** : valider run 40484934709, comparer V1 aux vrais blocs des 60 sources, corriger faux négatifs/positifs par portail avec fixtures réelles sanitisées, construire un benchmark fixe de rendement 5/5 et erreurs économiques, puis étendre aux 171 sans aucun passage en `eligible`.

## 27 octobre — nouvelles preuves, rendu réel et gates restant à corriger

- [CI durcie 40484934709](https://github.com/hraaaaf/Akarfinder/actions/runs/40484934709) : **SUCCESS** sur le commit `050ca12a4a0455fdc137ff3590f89c9e380f59db`, **17 tests** portant notamment sur les hôtes/identités d'URL originales et finales et les transactions ambiguës.
- [Benchmark 60 sources publiques](feenway-primary-parser-v1-live60-benchmark-2026-10-27.jsonl) : **55/60** pages consultables lors de cette passe ; **49/60** blocs primaires avec prix et surface ; **47** villes, **44** quartiers et **44** transactions ; **40/60** remplissent les cinq champs au sens **technique seulement**.
- Parmi ces **40** dossiers, **22** portent `rental_period_unconfirmed` ; **18** ne portent pas cet avertissement. **Ni 40 ni 18 ne sont commercialement éligibles** : toutes les fiches sont en revue ; ancienneté/disponibilité/droits/unicité physique restent non certifiés.
- **11** liens sources n'ont pas passé le contrôle d'identité finale, notamment des pages non accessibles ou redirigées ; conservation stricte en quarantaine. Les sources Sarouty et Yakeey ont reçu des pages bloquées ou indisponibles, sans contournement.
- Le benchmark est une comparaison entre un ancien extracteur de signaux et ce parseur, sur **des observations différentes dans le temps** (58 pages contre 55) : ne pas présenter le gain 20 → 49 comme un essai contrôlé strict de précision.
- **Correction encore nécessaire** : séparer explicitement les cinq champs techniques de la validation de la période du loyer dans les groupes de qualité ; diversifier fixtures réelles, montants K/M, unités économiques, ambiguïtés interportails et surfaces terrain/habitable.

**Next exact** : garder 22 périodes manquantes en revue explicite, mesurer erreur de classification et précision sur des snippets réels, puis poursuivre les 171 candidates initiales par lots bornés. Ne pas importer.
