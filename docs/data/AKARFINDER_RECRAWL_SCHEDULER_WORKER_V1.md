# AkarFinder Recrawl Scheduler & Lifecycle Worker V1

## Objet

Transformer les signaux internes de fraîcheur en un plan de revisite exécutable, plafonné et conforme à la doctrine no-bypass.

## Invariants

- aucune URL n'est sélectionnée si sa politique n'est pas `allowed` ;
- `robots_blocked`, `legal_review` et `paused` sont exclus du scheduler ;
- un HTTP 401/403 bloque l'offre pour revue, sans contournement ;
- un HTTP 404 ne prouve pas immédiatement un retrait : il programme une vérification différée ;
- les erreurs réseau, timeouts, 429 et 5xx utilisent un backoff borné ;
- le worker est dry-run par défaut ;
- aucun fetcher spécifique à une source n'est embarqué dans le scheduler ;
- les tentatives sont append-only et idempotentes via `attempt_key` ;
- aucune donnée de cette couche n'est publiable dans le SERP.

## Scheduler déterministe

Le scheduler sélectionne uniquement les offres dues puis applique :

1. priorité de fraîcheur existante ;
2. retard accumulé ;
3. volatilité ;
4. échecs transitoires ;
5. pénalité pour une offre déjà retirée ;
6. plafond global ;
7. plafond par source ;
8. plafond par ville.

Les égalités sont départagées par échéance, source et identifiant afin de garantir la reproductibilité.

## Worker

Le worker dépend de deux interfaces :

- repository : claim, persistance de tentative, libération du lease ;
- fetcher : exécution factuelle de la revisite.

Cette séparation empêche les règles propres à une source de contaminer l'orchestration générale.

## Concurrence

La RPC `claim_due_recrawl_jobs(...)` utilise `FOR UPDATE SKIP LOCKED`. Chaque claim reçoit :

- un `lease_token` ;
- un `leased_by` ;
- un `lease_until`.

Une tentative ne peut être enregistrée que si le token correspond toujours au claim actif.

## Persistance interne

Tables :

- `source_offer_recrawl_schedule` : état courant de planification ;
- `source_offer_recrawl_attempts` : historique append-only des exécutions.

Sécurité :

- RLS active ;
- aucun droit `anon` ou `authenticated` ;
- RPC en `SECURITY INVOKER` ;
- `service_role` uniquement ;
- `publication_eligible=false` imposé par contrainte.

## Limite volontaire de V1

Le LOT ne branche pas encore un adaptateur réseau réel. Chaque source devra fournir un fetcher conforme à son registre de politique, à robots.txt et à ses conditions d'utilisation. Le moteur de sélection et le worker sont prêts, mais aucune revisite réelle ne doit être affirmée avant ce branchement et une preuve d'exécution contrôlée.
