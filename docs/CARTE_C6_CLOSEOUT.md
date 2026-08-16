# Carte intelligence marché — C6 closeout

Date : 2026-08-16
Statut : CLOSED

## Résultat

C6 livre la fondation « nos annonces » comme inventaire read-only, borné et séparé des métriques marché C2/C3.

Le runtime :
- lit uniquement les ownerships `professional_listing_ownership` explicitement `verified` ;
- récupère les vraies lignes `property_listings`, sans dériver d'inventaire depuis des compteurs ;
- projette vers les `market_zone` uniquement via l'autorité géographique existante ;
- garde Souissi fail-closed tant que la résolution listing n'atteint pas la précision quartier requise ;
- distingue explicitement `market`, `AkarFinder-owned` et `partner` ;
- ne classe `partner` que si l'organisation est `validated`, `activation_status = active` et `source_authorization_status = confirmed` ;
- n'utilise jamais le tier commercial comme autorité de provenance ;
- ne modifie ni ranking Search, ni métriques C2/C3, ni publication, ni base de données.

## Preuves runtime

PR runtime : #715 `feat(map): add C6 verified own-listings inventory reader`.

Head exact certifié : `f810c0be6d111262da5a37bdc9816925823f58cf`.

Merge runtime : `ee8adf999e2f82590f834c1f80d125d441de34cc`.

Gate exact-head principal :
- `Carte C6 Verified Listing Inventory` run `31925367009` : SUCCESS.

Sur le même head, les gates Canonical Baseline Compile Validation, Canonical Baseline Validation, UX Gate 0 Contracts, Final Design Accessibility et les gates Phase 1 observés sont également terminés SUCCESS.

Le gate C6 exécute :
- les tests ciblés inventory + provenance ;
- `npx tsc --noEmit` ;
- `npm run build`.

## Contrat DB vérifié

Le runtime partenaire dépend de deux colonnes de `public.professional_organizations` :
- `activation_status` ;
- `source_authorization_status`.

Elles sont bien matérialisées sur le head/runtime par la migration existante :
`supabase/migrations/20260722003000_partner_commercial_activation_v1.sql`.

Cette migration établit notamment :
- `activation_status` avec valeurs `pending | onboarding | review | active | paused | rejected` ;
- `source_authorization_status` avec valeurs `none | pending | confirmed | revoked`.

Aucune migration corrective C6 n'était donc nécessaire.

## Invariants certifiés

- ownership absent, `claimed`, `revoked` ou non vérifié : pas d'inventaire propre ;
- autorité partenaire incomplète : provenance `AkarFinder-owned`, jamais `partner` par inférence ;
- géographie non résolue : `market_zone_id = null` ;
- Souissi reste volontairement non projeté dans ce lot ;
- les compteurs `market_listing_count` restent des entrées C2/C3 immuables ;
- changer la provenance d'un inventaire ne change que les colonnes own/partner ;
- 0 write DB, 0 mutation Registry, 0 mutation ranking, 0 activation publique implicite.

## Handoff C7

C7 est la certification finale 10/10 de la Carte intelligence marché. Elle doit vérifier l'ensemble C0→C6 sur le `main` courant, les invariants fail-closed, les interactions et la cohérence documentaire avant de déclarer le chantier CLOSED.