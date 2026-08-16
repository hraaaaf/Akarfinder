# SEARCH Price Coverage — v7 reservoir expansion

Date : 2026-08-16
Statut : **READ-ONLY AUDIT CLOSED**

## Scope

v7 étend la qualification du réservoir de prix fiables après v6 sans mutation production.

- PR fonctionnelle : **#709**.
- Merge : `7e91516c1b2dfe4c72a516344f0186eaa9a6a201`.
- Run exact-head : **`31923028695` — SUCCESS**.
- `certify` SUCCESS.
- **16/16 shards read-only SUCCESS**.
- Sources : `mubawab.ma` + `masaken.ma`.
- Profondeur demandée : 8 pages × 120 par source.
- `PRICE_PAGINATION_WRITE=false` forcé et vérifié avant chaque shard.
- Aucun write DB.

## Résultats exacts

### Mubawab

| Page | Candidats | Fetchés | Identité | Fiables | Échecs |
|---:|---:|---:|---:|---:|---:|
| 0 | 120 | 120 | 11 | 0 | 0 |
| 1 | 120 | 120 | 12 | 0 | 0 |
| 2 | 120 | 119 | 42 | 33 | 1 |
| 3 | 120 | 120 | 47 | 41 | 0 |
| 4 | 120 | 120 | 42 | 37 | 0 |
| 5 | 120 | 120 | 42 | 35 | 0 |
| 6 | 120 | 120 | 32 | 29 | 0 |
| 7 | 120 | 120 | 37 | 32 | 0 |
| **Total** | **960** | **959** | **265** | **207** | **1** |

Rendement fiable / candidat : **207 / 960 = 21,56 %**.

Les pages 0–1 du cohort NULL courant ne contiennent plus de prix fiables selon les règles v5 ; les pages 2–7 conservent un réservoir substantiel. Cette distribution est observée après les 100 writes Mubawab du lot v6 et ne doit pas être comparée naïvement au cohort historique pré-write.

### Masaken

| Page | Candidats | Fetchés | Identité | Fiables | Échecs |
|---:|---:|---:|---:|---:|---:|
| 0 | 120 | 106 | 106 | 64 | 14 |
| 1 | 120 | 105 | 105 | 75 | 15 |
| 2 | 120 | 109 | 109 | 68 | 11 |
| 3 | 120 | 102 | 102 | 68 | 18 |
| 4 | 64 | 50 | 50 | 34 | 14 |
| 5 | 0 | 0 | 0 | 0 | 0 |
| 6 | 0 | 0 | 0 | 0 | 0 |
| 7 | 0 | 0 | 0 | 0 | 0 |
| **Total** | **544** | **472** | **472** | **309** | **72** |

Rendement fiable / candidat : **309 / 544 = 56,80 %**.

Masaken est épuisé dans ce cohort NULL après la page 4. Les échecs observés sont principalement des HTTP 410 stale/deleted ; aucun contournement n'est tenté.

### Global

- candidats : **1 504** ;
- fetchés : **1 431** ;
- identités prouvées : **737** ;
- prix fiables : **516** ;
- échecs : **73** ;
- rendement fiable / candidat : **516 / 1 504 = 34,31 %**.

## Conclusion

Le prochain réservoir le plus efficace est **Masaken** : 309 preuves fiables sur 544 candidats, soit 56,80 %, avec épuisement observable après la page 4. Mubawab conserve 207 preuves fiables plus profondes, mais avec un rendement inférieur de 21,56 %.

Aucune mutation production n'est autorisée par ce closeout. Tout futur bounded write nécessite un lot séparé, un canary read-only, un plafond dur et un gate humain explicite.