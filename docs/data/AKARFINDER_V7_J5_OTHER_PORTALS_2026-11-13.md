# V7 J5 — Portails complémentaires : inventaire sourcé

**GOAL :** réutiliser Mubawab (#988 merged) et MarocAnnonces (#992 merged), sans déclarer intégrés Masaken, Immoneuf Avito, Mitula et Portail-Immobilier.

**CODE de préparation :** `scripts/acquisition/v7_parallel/j5_remaining_portals.mjs` importe le vrai `legacy_candidate_bridge.mjs` pour les deux portails existants ; distingue candidates URL et fiches ; inventaire priorisé et explicitement désactivé pour quatre autres sites.

**Risque produit :** Immoneuf (filiale/sous-domaine Avito) et Mitula sont traités comme sources potentiellement miroirs nécessitant l'ID original, pas comme propriétés uniques supplémentaires.

**Tests préparés :** six tests offline ; zéro HTTP/DB, aucune annonce publiée, aucun cron. Les 4 autres portails ne sont pas connectés.

**NEXT :** qualifier une vraie fiche detail pour chacun des 2 portails déjà présents, puis traiter les 4 autres selon preuve de source et rendement, avant staging J6.

## J5 — Contrôle global du volume, déterminisme et provenance (13 novembre 2026)

**Défaut de contrat identifié :** le bridge L8 borne chaque source à **1 000 URLs**, tandis que le pipeline V7 impose **1 000 inputs au total**. Deux rapports valides de 601+400 URLs pouvaient franchir J5 avec **1 001 entrées**. Le nouveau contrat `J5_MAX_RAW_URLS_PER_BATCH=1000` rejette le lot au-delà du maximum **global brut**, doublons compris, sans réduire artificiellement le nombre d'entrées traitées.

**Audit de sortie :** `raw_source_url_count`, `duplicate_raw_url_count`, `candidate_counts_by_source` distinguent URL brutes et candidates uniques par source. Ordre de sortie stable selon les priorités J5 puis ID, quel que soit l'ordre des clés de rapports. Deux garanties affichées par URL : `source_report_authenticated=false` et `original_html_sha256_verified=false`. Ne pas confondre une validation de forme/identité L8 avec capture originale authentifiée. Aucun indice de propriété physique nouvelle, de disponibilité ou de publication déduit.

**Nouveaux tests :** 1001 URLs brutes rejetées / 1000 acceptées, répétitions dédupliquées, ordre invariant et 1001 entrées rejetées même avec de nombreux doublons. Tests synthétiques, 0 réseau/DB. **La CI du nouveau commit est à vérifier** ; ancienne CI [J5 #43335602494](https://github.com/hraaaaf/Akarfinder/actions/runs/43335602494) prouvait seulement les six tests initiaux.

**NEXT :** valider la CI, maintenir les quatre autres portails non intégrés et ne collecter de vrais HTML qu'avec source autorisée ; aucun merge, Vercel, staging ni cron.
