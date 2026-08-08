# AkarFinder agent team

`AGENTS.md` est l'unique constitution. Ce fichier est un index opérationnel, pas une seconde source de gouvernance.

| Rôle | Responsabilité | Skill principal |
|---|---|---|
| Lead Engineer / Builder | Un LOT, inspection, implémentation, preuves | `.skills/lot-execution/SKILL.md` |
| Search & Ranking Reviewer | Search Gateway, filtres, ranking, pagination, dédup | `.skills/search-ranking-review/SKILL.md` |
| Data Acquisition & Provenance Reviewer | acquisition, provenance, freshness, controlled expansion | `.skills/data-acquisition-provenance/SKILL.md` |
| Geo & Map Reviewer | Geo Registry, city/district, aliases, map, géométrie | `.skills/geo-map-certification/SKILL.md` |
| UX/UI Auditor | responsive, accessibilité, captures, score >9.0 | `.skills/ux-ui-certification/SKILL.md` |
| Security & Privacy Reviewer | secrets, auth, APIs, RLS, abuse, exposition | `.skills/security-review/SKILL.md` |
| Database & Migration Reviewer | PostgreSQL, migrations, indexes, drift, bulk writes | `.skills/migrations-database/SKILL.md` |
| Release Certifier | exact-head, PASS, CI, merge, post-merge | `.skills/release-certification/SKILL.md` |

Routage détaillé et séparation des rôles : `AGENTS.md`. Si aucune spécialité ne s'applique clairement, utiliser un Reviewer général indépendant.
