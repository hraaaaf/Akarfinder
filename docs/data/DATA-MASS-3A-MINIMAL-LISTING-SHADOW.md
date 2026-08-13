# DATA MASS-3A — Minimal Listing Index Shadow

## Objectif

Prouver en lecture seule le contrat de représentation minimale avant toute mutation production.

Une minimal listing exige uniquement :
- canonical URL ;
- source/provenance ;
- titre ou signal structurel fiable.

La géographie est préservée si disponible. Prix, surface, photo et description sont optionnels et ne doivent jamais être inventés.

## Gate policy

Une source n'est admissible que si le Source Registry porte simultanément :
- une autorisation positive explicite ;
- une policy non expirée ;
- un machine gate positif ;
- un ingestion gate positif ;
- un display gate positif.

Toute absence, ambiguïté, permission_required, unverified, prohibited, HOLD implicite, expiration ou gate hidden/internal-only échoue fermé.

## État production observé au démarrage

Lecture seule Supabase : 35 Registry rows, 19 policies non expirées, 0 autorisation positive et donc 0 source pleinement policy-admissible.

Conséquence : MASS-3A doit produire 0 candidat activable aujourd'hui. Ce résultat n'est pas un échec ; il prouve que le contrat minimal ne contourne pas la policy.

## Non-scope

- aucune écriture DB/Registry ;
- aucune ingestion ;
- aucune activation Search ;
- aucun fetch source/detail ;
- aucune permission inférée ;
- aucun changement de décision juridique existante.

Le premier canary éventuel appartient à un lot ultérieur après existence d'une source explicitement policy-admissible.
