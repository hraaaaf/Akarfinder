# B3.5.1 — Modèle canonique d’identité professionnelle

## Statut

- **Lot** : B3.5.1
- **Responsabilité** : identité professionnelle, organisation active et conversion atomique
- **Branche** : `agent/b3-5-1-professional-identity`
- **Prérequis** : B3.5.0 mergé au commit `a232cb06391e458dfd00273cc150a75c0748a3b0`
- **Interface workspace** : hors scope
- **Permissions détaillées** : B3.5.2
- **Session serveur et RLS partenaire** : B3.5.3

## Modèles canoniques

Aucun modèle parallèle n’est créé. Les sources d’autorité restent :

- `professional_organizations` ;
- `professional_memberships` ;
- `professional_activation_requests`.

Les seuls types d’organisation admis pour le Professional Workspace sont :

- `agency` ;
- `promoter`.

Le type historique `exhibitor` reste lisible dans les demandes existantes, mais sa conversion en organisation workspace est refusée explicitement.

## Invariants

### Organisation accessible

Une organisation n’est exposée au workspace que si :

1. l’utilisateur possède une membership `active` ;
2. l’organisation possède au moins un membre `owner` actif ;
3. son statut est `pending` ou `validated`.

Correspondance des états :

| Validation organisation | État workspace | Accessible |
|---|---|---|
| `pending` | `onboarding` | oui |
| `validated` | `active` | oui |
| `suspended` | `suspended` | non |
| `rejected` | `rejected` | non |

### Organisation active

La résolution multi-organisation suit cet ordre :

1. organisation préférée, uniquement si elle est accessible ;
2. organisation validée avant une organisation en onboarding ;
3. tri déterministe par nom puis identifiant.

Aucun identifiant fourni par le navigateur ne peut sélectionner une organisation inaccessible.

### Owner actif

Une organisation `validated` ne peut pas être validée ou rester validée sans au moins un owner actif.

La migration :

- répare les organisations historiques sans owner actif en utilisant `created_by` ;
- ajoute des constraint triggers différés ;
- protège les suppressions, suspensions et changements de rôle du dernier owner ;
- permet la création organisation + owner dans une même transaction.

## Conversion canonique

RPC :

```text
convert_professional_activation_request(
  activation_request_id,
  owner_user_id,
  slug,
  legal_name?,
  display_name?
)
```

Transaction atomique :

```text
activation request qualifiée/onboarding
→ verrouillage FOR UPDATE
→ validation agency/promoter
→ validation de l’utilisateur owner
→ création organisation pending/draft/tier none
→ création membership owner active
→ demande marquée converted
→ organization_id + converted_at persistés
```

La fonction est exécutable uniquement par `service_role`. L’endpoint public partenaire ne peut pas l’appeler directement.

Endpoint staff :

```text
POST /api/admin/pro/activation-requests/:activationRequestId/convert
```

Corps :

```json
{
  "owner_user_id": "uuid",
  "slug": "agence-exemple",
  "legal_name": "Agence Exemple SARL",
  "display_name": "Agence Exemple"
}
```

## Services applicatifs

- `lib/professional/identity.ts` : règles pures de statut et sélection ;
- `lib/professional/identity-repository.ts` : chargement des memberships, preuve owner et appel RPC ;
- `lib/professional/identity-validation.ts` : validation des entrées de conversion ;
- `lib/professional/repository.ts` : façade historique raccordée au résolveur canonique ;
- `/api/pro/me` : retourne l’organisation active et les organisations accessibles.

## Compatibilité

Les API existantes qui utilisent `requireProfessionalPermission()` passent désormais par la résolution canonique. Elles ne peuvent donc plus autoriser une organisation sans owner actif.

La création directe d’une organisation avec owner reste disponible pour son parcours existant. Elle produit toujours une organisation `pending` avec une membership owner active.

## Migration

Fichier :

`supabase/migrations/20260806090000_b3_5_1_professional_identity.sql`

La migration est séparée du code applicatif dans un fichier dédié et ne modifie aucune table métier hors identité professionnelle.

## Tests du lot

Fichier :

`scripts/scrapers/__tests__/professional-identity-b3-5-1.test.ts`

Couverture :

- mapping validation → workspace ;
- accès actif/onboarding ;
- refus suspendu/rejeté ;
- refus membership suspendue ;
- refus sans owner ;
- sélection préférée sûre ;
- sélection par défaut déterministe ;
- atomicité du contrat SQL ;
- restriction service-role ;
- protection du dernier owner.

## Double-check obligatoire

Avant merge :

- vérifier le diff complet ;
- vérifier qu’aucun second résolveur professionnel ne subsiste ;
- exécuter le test ciblé ;
- exécuter typecheck/build et tests concernés ;
- contrôler la migration sur une base de test ;
- vérifier les checks GitHub Actions ;
- mettre à jour les documents de référence.

## Definition of Done

- [x] types canoniques partagés ;
- [x] organisation active déterministe ;
- [x] multi-organisation conservé ;
- [x] organisation sans owner exclue ;
- [x] conversion atomique activation → organisation + owner ;
- [x] `organization_id` et `converted_at` obligatoires à la conversion ;
- [x] type `exhibitor` refusé pour le workspace ;
- [x] ancienne résolution raccordée au service canonique ;
- [x] tests ajoutés ;
- [x] documentation du lot ajoutée ;
- [ ] tests runtime et migration réellement exécutés ;
- [ ] CI verte ;
- [ ] PR revue et mergée.

## Prochain lot

B3.5.2 — Permissions et matrice de capacités, uniquement après merge et certification de ce lot.
