# ODM-09E — Certification Production

**Mise à jour : 2026-08-03**

## Verdict actuel

`CURSOR_CONTRACT_LIVE_VOLUME_RECERTIFICATION_REQUIRED`

Le contrat public de curseur est aujourd’hui servi : `/api/search/gateway` expose `total_count`, `has_more` et `next_cursor` selon le résultat.

En revanche, l’ancienne certification de volume ne doit plus être présentée comme actuelle.

## Pourquoi l’ancien 40K est superseded

Après le LOT ODM-09E initial :

1. la quarantaine verticale a identifié 22 586 documents non immobiliers ;
2. le gate documentaire a séparé `LISTING`, `CATEGORY` et `AMBIGUOUS` ;
3. le read model public a été durci pour ne servir que de vraies pages annonce `LISTING` éligibles.

L’ancien minimum de 40 000 « documents traversables » ne correspond donc plus à la définition actuelle d’une annonce exploitable.

## Vérité connectée au 3 août 2026

| Indicateur | Valeur |
|---|---:|
| Thin Index total | 56 777 |
| Immobilier probable | 34 172 |
| Non immobiliers | 22 586 |
| Non classés | 19 |
| Immobilier display eligible | 22 481 |
| **LISTING + display eligible** | **7 483** |

Le corpus actuel à certifier est le corpus `LISTING + immobilier probable + display eligible`, pas le volume brut.

## Contrat à conserver

- `/search` répond ;
- `/api/search/gateway` répond ;
- curseurs opaques et bornés ;
- terminaison sans boucle ;
- aucune clé canonique dupliquée entre pages ;
- URL source HTTP(S) exploitable ;
- aucune galerie/contact/image non autorisée ;
- latence et nombre de pages conservés comme preuves ;
- fallback legacy et rollback disponibles.

## Nouvelle sortie attendue

Une recertification est réussie lorsque :

1. l’ensemble des lignes `LISTING` éligibles est traversable ;
2. les compteurs Supabase et API concordent ;
3. aucune `CATEGORY`, `AMBIGUOUS` ou verticale non immobilière ne fuit ;
4. le corpus atteint la cible de profondeur explicitement approuvée ;
5. la diversité de sources et villes est mesurée ;
6. prix, surface et fraîcheur sont rapportés séparément ;
7. le taux Canary réellement servi est observé ;
8. le rollback est testé.

Jusqu’à cette recertification, il est correct de dire que le **contrat de curseur est live**, mais pas que le jalon « 40K honnêtes » est acquis.
