# V7 J5 — Portails complémentaires : inventaire sourcé

**GOAL :** réutiliser Mubawab (#988 merged) et MarocAnnonces (#992 merged), sans déclarer intégrés Masaken, Immoneuf Avito, Mitula et Portail-Immobilier.

**CODE de préparation :** `scripts/acquisition/v7_parallel/j5_remaining_portals.mjs` importe le vrai `legacy_candidate_bridge.mjs` pour les deux portails existants ; distingue candidates URL et fiches ; inventaire priorisé et explicitement désactivé pour quatre autres sites.

**Risque produit :** Immoneuf (filiale/sous-domaine Avito) et Mitula sont traités comme sources potentiellement miroirs nécessitant l'ID original, pas comme propriétés uniques supplémentaires.

**Tests préparés :** six tests offline ; zéro HTTP/DB, aucune annonce publiée, aucun cron. Les 4 autres portails ne sont pas connectés.

**NEXT :** qualifier une vraie fiche detail pour chacun des 2 portails déjà présents, puis traiter les 4 autres selon preuve de source et rendement, avant staging J6.
