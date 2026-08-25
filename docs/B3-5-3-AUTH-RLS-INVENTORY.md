# B3.5.3 — Auth, session serveur et RLS — inventaire initial

**Date : 2026-08-06**  
**Branche : `agent/b3-5-3-professional-auth-rls`**  
**Base certifiée : merge B3.5.2 `67780c880c7a9a9391756f7aa2697cc0964e72c3`**

## Statut du chantier

- B3.5.0 : mergé ;
- B3.5.1 : mergé ;
- B3.5.2 : mergé, PR #309, CI complète verte ;
- B3.5.3 : actif — inspection avant migration ou modification applicative.

## Objectif du lot

Garantir qu'une requête professionnelle authentifiée exerce réellement l'isolation tenant dans PostgreSQL, sans dépendre d'un client `service_role` pour les opérations partenaires ordinaires.

Le lot doit aligner quatre niveaux :

```text
Bearer / session serveur
→ identité Supabase vérifiée
→ organisation active et membership actif
→ RLS PostgreSQL exercée avec le JWT utilisateur
```

La matrice canonique `can(context, capability)` de B3.5.2 reste la source de vérité applicative. La RLS constitue une défense indépendante et cohérente, pas un remplacement de cette matrice.

## Findings initiaux

### F1 — client serveur global en service-role — BLOQUANT

`lib/db/supabase-client.ts` construit `getSupabaseServerClient()` avec `SUPABASE_SERVICE_ROLE_KEY` et documente explicitement que ce client contourne la RLS.

Conséquence : toute requête professionnelle qui utilise ce client n'exerce pas les policies PostgreSQL, même lorsque l'utilisateur a été authentifié auparavant.

### F2 — authentification correcte, propagation de session absente — BLOQUANT

`lib/professional/auth.ts` :

- accepte uniquement `Authorization: Bearer ...` ;
- appelle `supabase.auth.getUser(token)` ;
- ne fait confiance qu'à `app_metadata` pour le statut staff.

Cependant, le client utilisé pour `getUser()` reste le client service-role et le token utilisateur n'est pas propagé vers un client de données tenant-scoped.

### F3 — résolution d'identité avec bypass RLS — BLOQUANT

`lib/professional/identity-repository.ts` utilise `getSupabaseServerClient()` pour lire :

- `professional_memberships` ;
- `professional_organizations` ;
- les owners actifs ;
- la RPC de conversion d'activation.

Les lectures workspace ordinaires et l'opération staff de conversion utilisent donc le même niveau de privilège alors qu'elles doivent être séparées.

### F4 — séparation staff / partenaire insuffisante — HAUTE

La conversion d'une demande d'activation est légitimement réservée au service-role/staff. Les lectures et mutations réalisées au nom d'un partenaire ne doivent pas réutiliser ce client privilégié.

Il faut deux chemins explicites :

```text
Partner request client
= anon key + Authorization bearer utilisateur
= RLS exercée

Staff/system client
= service-role
= opérations internes explicitement allowlistées
```

### F5 — parité RLS / capacités non encore prouvée — HAUTE

Les migrations B3.4 contiennent encore des contrôles de rôles SQL directs. B3.5.3 doit inventorier chaque policy et fonction, puis vérifier sa parité avec les capacités B3.5.2 sans tenter de dupliquer toute la logique commerciale dans SQL.

## Invariants de sécurité

1. Aucun repository partenaire ordinaire ne reçoit implicitement le client service-role.
2. Le bearer token n'est jamais lu depuis query params, cookies non vérifiés ou payload métier.
3. Une membership suspendue ou une organisation suspendue/rejetée ne donne aucun accès workspace.
4. L'organisation ciblée doit appartenir aux contextes accessibles de l'utilisateur.
5. Les opérations staff/system restent nommées, isolées et testées séparément.
6. Le tier commercial ne modifie ni RLS ni ranking Search.
7. Les tests doivent prouver un refus inter-tenant réel en PostgreSQL, pas seulement un mock TypeScript.

## Découpage d'exécution proposé

### B3.5.3-A — clients Supabase séparés

- conserver un client admin explicitement nommé pour staff/system ;
- créer un client request-scoped avec anon key et bearer utilisateur ;
- interdire l'import accidentel du client admin dans les repositories partenaires.

### B3.5.3-B — contexte serveur canonique

- authentifier le token ;
- créer le client tenant-scoped ;
- résoudre l'organisation active ;
- produire un contexte serveur unique : identité, organisation, membership, capacités et client RLS.

### B3.5.3-C — repositories partenaires

- migrer les lectures/mutations `/api/pro/*` vers le client tenant-scoped ;
- garder les opérations staff dans des repositories séparés ;
- supprimer les bypass implicites.

### B3.5.3-D — migration RLS isolée

- inventorier toutes les policies professionnelles existantes ;
- aligner membership active, tenant et rôles minimaux ;
- ne pas encoder les gates commerciaux volatils dans les policies ;
- tester rollback et migration réelle PostgreSQL.

### B3.5.3-E — certification

Scénarios obligatoires :

- utilisateur A lit son organisation A ;
- utilisateur A ne lit ni ne modifie B ;
- membership suspendue refusée ;
- organisation suspendue/rejetée refusée ;
- editor ne publie pas ;
- owner/admin sans activation ou droits source ne publie pas ;
- staff peut convertir une activation via le chemin admin dédié ;
- service-role absent des repositories partenaires ;
- TypeScript, build, tests API et CI canonique verts.

## État initial

```text
B3.5.3 inventaire : démarré
Implémentation : 0 %
Migration : aucune
PR : non ouverte
```

Aucune modification fonctionnelle ne doit commencer avant l'inventaire complet des routes, repositories, policies et RPC concernés.
