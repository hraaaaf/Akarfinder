# Lot 9 Status — Mubawab Full Coverage

**Status: 🟡 OPEN — discovery Full Coverage en extinction profonde ; catalog reconciliation obligatoire avant fermeture**

## Goal

Parcourir exhaustivement le périmètre Mubawab accessible et autorisé, mesurer le stock réel d'annonces uniques disponible et expliquer quantitativement l'écart avec le catalogue public Mubawab avant d'ouvrir une deuxième source.

Le Lot 9 mesure des `source_id` uniques de discovery. Le passage complet en objets canoniques et la certification du dataset massif relèvent du Lot 10.

## Safety boundary

- aucun write production ;
- aucun déploiement Vercel ;
- aucun merge automatique ;
- aucun contournement CAPTCHA / authentification / contrôle d'accès ;
- contrôle robots avant toute requête live ;
- arrêt global sur 403 / 429 explicite ;
- aucune page détail dans les campagnes de discovery ;
- aucun téléchargement d'image ;
- ne jamais toucher à `scripts/scrapers/output/akarfinder.db` pendant les preuves.

## Périmètre actuellement implémenté

- 12 villes ;
- 11 catégories activées ;
- 132 scopes initiaux `ville × catégorie` ;
- familles : appartement, terrain, villa, maison, commercial, riad ;
- vente + location classique ;
- bureaux désactivés tant que leurs routes distinctes ne sont pas vérifiées ;
- location vacances non couverte dans la matrice actuelle.

## Preuves structurantes

- planner : run `33881976620` ✅ ;
- bounded runner : run `33882260391` ✅ ;
- micro-vague live : run `33882641901` ✅ ;
- state/campaign persistants : run `33887383769` ✅ ;
- première campagne persistante : run `33889776735` ✅, 573 IDs uniques ;
- reprise inter-run : run `33890843084` ✅, cumul 889 IDs uniques ;
- policy de montée en charge : run `33890791066` ✅ ;
- scale-120 : run `33891104950` ✅, cumul 3 853 IDs uniques ;
- scale-180 : run `33891846308` ✅, cumul 6 599 IDs uniques ;
- scale-216 : run `33892580900` ✅, cumul 10 925 IDs uniques ;
- scale-288 : run `33893444230` ✅, cumul 18 294 IDs uniques ;
- deep extinction : run `33894675980` en cours au moment de cette mise à jour.

## Dernier checkpoint certifié — scale-288

Run `33893444230` ✅ SUCCESS.

Configuration :

- reprise depuis le checkpoint scale-216 ;
- 16 vagues ;
- 6 partitions par vague ;
- fenêtre 3 pages ;
- plafond théorique 288 pages ;
- délai 2 500 ms ;
- 0 détail / 0 image / 0 DB / 0 prod.

Cumul :

- **730 / 730 pages réussies** ;
- **21 352 refs découvertes** ;
- **18 294 IDs uniques** ;
- **3 058 doublons** ;
- **107 scopes terminaux** ;
- **25 partitions profondes pending** ;
- 0 blocage source ;
- 0 kill-switch.

Artifact `9945178093`, digest `sha256:e1ca03755ef8ccb31911da453d8f2c53787f91b3088636fefa1ce3b9399ffa15`.

Les 25 partitions restantes étaient concentrées dans les fenêtres profondes : 19 en `p13-15` et 6 en `p16-18`.

## Catalog reconciliation — NOUVEAU VERROU DE FERMETURE

Le compteur public Mubawab observé le 2026-09-04 affiche environ **102K biens immobiliers** sur le site Maroc.

Ce nombre public n'est pas assimilé automatiquement à 102K annonces uniques, actives et accessibles dans notre périmètre, mais il devient une référence de couverture obligatoire.

Écart actuel avant extinction finale :

- catalogue public Mubawab : ~102K biens affichés ;
- discovery unique certifiée AkarFinder : 18 294 IDs ;
- couverture brute apparente : ~18 % ;
- delta apparent : ~84K.

Cet écart interdit de fermer le Lot 9 sur la seule condition `pending=0` de la matrice actuelle.

### Hypothèses de couverture à auditer

1. villes / zones hors des 12 villes configurées ;
2. bureaux vente + location actuellement désactivés ;
3. location vacances ;
4. immobilier neuf / projets / programmes ne passant pas par les mêmes routes ;
5. autres familles ou routes agrégées Mubawab non incluses ;
6. différences entre compteur global et annonces réellement actives / uniques ;
7. éventuels plafonds de pagination, alias de routes ou partitions qui masquent une partie du catalogue.

Aucune hypothèse ne sera acceptée comme explication sans mesure.

## Nouvelle closure rule

Lot 9 ne sera CLOSED que si les deux conditions suivantes sont satisfaites :

### A — Full Coverage technique

- toutes les partitions autorisées connues sont `completed`, ou arrêtées avec raison de sécurité documentée ;
- aucun checkpoint perdu ;
- manifest final avec pages, uniques, doublons, erreurs, stops et distribution par scope.

### B — Catalog reconciliation

- inventaire des familles / transactions / villes / zones réellement présentes sur Mubawab ;
- mesure des catégories manquantes dans la matrice actuelle ;
- extension de la matrice pour chaque route autorisée et pertinente ;
- comparaison finale `catalogue public affiché ↔ IDs accessibles ↔ IDs uniques discovery` ;
- tout delta résiduel important doit être expliqué et quantifié.

`pending=0` sur les 132 scopes initiaux ne suffit donc plus à fermer le Lot 9.

## Next exact

1. laisser terminer la deep extinction depuis l'artifact `9945178093` ;
2. récupérer le nouveau checkpoint et le stock unique final de la matrice actuelle ;
3. auditer systématiquement la surface publique Mubawab : villes, bureaux, location vacances, neuf/projets et autres routes ;
4. produire une matrice de réconciliation avec compteurs visibles par famille / transaction ;
5. étendre le planner uniquement aux routes vérifiées, autorisées et pertinentes ;
6. relancer les campagnes bornées sur la couverture manquante ;
7. fermer Lot 9 uniquement lorsque la couverture technique et la réconciliation catalogue sont toutes deux prouvées ;
8. seulement ensuite ouvrir Lot 10.
