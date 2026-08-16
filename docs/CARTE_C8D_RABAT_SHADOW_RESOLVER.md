# C8D — Rabat Resolver Shadow

## Pourquoi ce lot existe

L'audit production read-only a confirmé que `geo_resolution_events` n'est pas alimentée par un resolver continu. Les écritures historiques proviennent de lots contrôlés P1B.4/P1B.5 basés sur des cohortes `property_listings` bridgées et des `geo_entities`/aliases déjà validés.

Pour les quartiers C8 candidats, deux dettes se cumulent :

- une partie importante des seeds Thin Index n'a aucun `coverage_bridge.property_listing_id` ;
- les noms candidats comme Aviation et Yacoub El Mansour ne disposent pas encore d'une autorité DB validée permettant aux lots P1B historiques de les résoudre.

Aucune mutation DB n'est justifiée tant que la précision d'un resolver candidat n'a pas été mesurée.

## Audit production read-only de départ

Signaux textuels observés sur les localités prioritaires, sans les promouvoir en vérité geo :

- Océan : 33 seeds signalés, 25 sans événement geo, 8 résolus Océan ;
- Hay Nahda : 16/16 sans événement ;
- Aviation : 11/11 sans événement ;
- Kbibat/Kébibat : signal présent mais aucune résolution geo candidate ;
- Diour Jamaa : 6/6 sans événement ;
- Yacoub El Mansour : 6/6 sans événement ;
- Médina : 7 signalés, 6 sans événement, 1 résolu Hassan.

Le sous-ensemble bridgé confirme également le blocage d'autorité : les `property_listings.district` `Aviation` et `Yacoub El Mansour` existent, mais aucune alias/entity validée ne permet aujourd'hui aux vues P1B.4/P1B.5 de les projeter. Hay Nahda possède quelques bridges mais leurs districts historiques sont vides.

Ces nombres sont un diagnostic ponctuel read-only, pas des métriques publiques.

## Resolver d'ombre

`lib/geo/rabat-locality-shadow-resolver.ts` est volontairement pur et non public.

Règles :

1. normalisation déterministe des accents, casse, apostrophes, tirets, ponctuation et espaces ;
2. priorité à `district` quand sa valeur correspond exactement à un nom canonique ou alias explicite C8B ;
3. sinon, hiérarchie de signaux `title` → `snippet` → `searchText` ;
4. le premier champ qui porte au moins un signal fait autorité ; plusieurs localités dans ce même champ => `ambiguous` ;
5. aliases très courts comme `Riad` interdits en free text, mais acceptés comme valeur structurée exacte ;
6. aucune correspondance => `unresolved` ;
7. aucun fuzzy matching, aucune inférence par parent administratif, aucun centroïde, aucun write DB ;
8. une localité candidate reste `blocked` et non publiable même si le shadow resolver la reconnaît.

Cette hiérarchie évite notamment de promouvoir une localité citée seulement comme proximité lorsque le titre fournit déjà une localisation explicite.

## Audit corpus borné — snapshot read-only 2026-08-16

Population : **984 annonces Rabat éligibles dédupliquées**, issues de **6 sources**, sans aucune écriture production.

Avec les règles exactes du resolver et l'alias annonce `Kébibat` :

- **638** matchs uniques ;
- **6** ambiguës, conservées fail-closed ;
- **340** sans signal exact ;
- parmi les matchs uniques, **570** concernent les localités historiques/certifiées et **68** des localités candidates C8.

Principales cohortes uniques candidates observées :

- Diour Jamaa : 16 ;
- Kbibat/Kébibat : 9 ;
- Hay Nahda : 8 ;
- Yacoub El Mansour : 7 ;
- Aviation : 6 ;
- Les Orangers : 6 ;
- Médina : 6 ;
- Youssoufia : 4 ;
- Oudayas : 3 ;
- Mabella : 2 ;
- Akkari : 1.

Aucun chiffre de cette section n'est une métrique marché publiée ni une résolution geo production.

## Validation croisée sur vérités geo existantes

Gold set disponible dans le corpus : **40 annonces** dont le dernier `geo_resolution_event` est `resolved` vers Agdal, Hay Riad, Hassan, Souissi ou Océan.

Résultat du shadow avec la hiérarchie finale et l'alias Kébibat :

- **39/40 matched_correct** ;
- **1/40 ambiguous** ;
- **0 matched_wrong** ;
- **0 unmatched**.

Soit, sur ce petit gold set seulement :

- précision observée des décisions uniques : **100 % (39/39)** ;
- couverture décisive : **97,5 % (39/40)** ;
- l'unique cas non décidé reste fail-closed parce qu'une page source agrégée mélange Agdal et Hassan dans le même snippet.

Ce résultat est une preuve de shadow ciblée, **pas une certification statistique générale** pour les 23 localités.

## Alias annonces détecté

L'audit corpus révèle une variante réelle `Kébibat` : **10 annonces dédupliquées** sur Agenz, avec titres/URLs/snippets explicitement localisés à Kébibat. La forme first-party du registre reste `Kbibat` ; `Kébibat` est ajoutée comme alias d'annonce, sans changer le statut taxonomique candidat ni l'éligibilité publique. Après déduplication et gestion des ambiguïtés, **9** annonces deviennent des matchs shadow Kbibat uniques.

`Quartier Administratif` apparaît ponctuellement dans une source, mais aucune confirmation first-party n'a été trouvée : il n'est donc pas ajouté au registre.

L'inventaire structuré `property_listings` Rabat ne révèle aucun district hors registre : Hay Riad, Souissi, Agdal, Hassan, Océan/Ocean, Aviation, Yacoub El Mansour, Les Orangers, Medina et Akkari sont tous déjà représentés.

## Ce que ce lot ne fait pas

- ne crée aucun `geo_entity` ou `geo_alias` production ;
- n'insère aucun `geo_resolution_event` ;
- ne modifie aucun `property_listing` ;
- ne branche pas le shadow resolver dans `resolve-listing-geo.ts` ;
- ne modifie ni C3, Search, ranking, API publique ni UI.

## Gate suivant

Après CI exact-head, le prochain lot sûr est un **audit shadow reproductible**/manifesté par source et localité, puis une proposition d'autorité DB bornée. Toute création de `geo_entity`/`geo_alias` ou écriture de `geo_resolution_event` production reste un human gate séparé.
