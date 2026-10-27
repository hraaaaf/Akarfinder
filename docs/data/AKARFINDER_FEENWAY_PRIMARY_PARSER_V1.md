# AkarFinder — parseur primaire multi-portails V1

**Goal exact** : extraire les prix, surfaces, villes, quartiers et transactions depuis le bloc principal de la fiche SOURCE (pas FeenWay ni des suggestions), avec identifiant de la source prouvé.

**Contrat technique** : adaptateurs Mubawab, Avito, Agenz, Yakeey, Masaken et Sarouty ; identification stricte, contrôle des redirections, programmes mis à part, valeur monétaire MAD, surface avec origine, transaction vente/location, prix par nuit, mois, m² et pas-de-porte en review. Les écarts et valeurs absentes sont explicites. Le parseur ne tente aucune collecte, ne touche pas la DB et ne certifie aucun droit ni disponibilité.

**Sûreté** : une annonce n'est JAMAIS eligible sur la seule base des cinq champs; résultat possible review_five_fields, review_missing_fields, review_economic_or_field_conflict, review_source_route_alias, review_program, quarantine_identity. Dates = métadonnées, pas preuve d'activité. Pour Masaken, le quartier dans la narration ne devient pas automatiquement quartier certifié.

**Preuve** : tests Node sur blocs source tirés de structures publiques observées, contrôle absence de fausses valeurs issues des recommandations. CI dédiée read-only doit finir success avant toute conclusion « validé ».

**Next exact** : exécuter tests, corriger les échecs, puis comparer ce parseur sur les 60 fiches originales du canari 231, classifier les erreurs, adapter et seulement ensuite examiner les 171 restantes. Cette V1 n'est pas le parseur final du cap 200K.
