# B3.5.1 — Modèle canonique d’identité professionnelle

## Statut

- **Lot** : B3.5.1
- **Responsabilité** : identité professionnelle, organisation active et conversion atomique
- **Branche** : `agent/b3-5-1-professional-identity`
- **PR** : `#308`
- **Commit certifié avant mise à jour documentaire** : `655d215703e2ba7edfbf1d29bfcffd3a1ae0e580`
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

### Validation PostgreSQL réelle

Projet contrôlé : Supabase `AqarFinder`, PostgreSQL `17.6`.

Audit préalable en lecture seule :

| Indicateur | Valeur |
|---|---:|
| Organisations | 0 |
| Organisations sans owner actif | 0 |
| Organisations validées sans owner actif | 0 |
| Demandes d’activation | 0 |
| Demandes `exhibitor` | 0 |
| Conversions invalides | 0 |

Répétition de migration exécutée dans une transaction réelle :

```text
BEGIN
→ fonctions créées
→ 2 constraint triggers créés
→ signatures vérifiées
→ ROLLBACK
```

Résultat :

- fonction de conversion valide : `true` ;
- helper owner valide : `true` ;
- triggers créés : `2` ;
- rollback des fonctions confirmé : `true` ;
- rollback des triggers confirmé : `true` ;
- aucun changement persistant en production.

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

## Preuves CI

Run canonique : `31086219156`.

Sur le commit `655d215703e2ba7edfbf1d29bfcffd3a1ae0e580` :

- Professional Identity B3.5.1 : `success` ;
- Professional Auth Ownership Profiles V1 : `success` ;
- Partner Commercial Activation V1 : `success` ;
- scraper regression : `success` ;
- API regression : `success` ;
- OpenSERP, Market Index, Freshness, Dedup, Lifecycle et Direct Feeds : `success` ;
- TypeScript : `success` ;
- build production : `success` ;
- Canonical Baseline Compile Validation : `success` ;
- Canonical Baseline Validation : `success`.

Une nouvelle exécution CI est attendue après cette mise à jour documentaire ; elle doit rester verte avant merge.

## Double-check effectué

- diff complet inspecté ;
- ancien résolveur transformé en façade canonique ;
- aucun second modèle professionnel créé ;
- traitement explicite `INSERT / UPDATE / DELETE` dans le trigger ;
- préférence d’organisation inaccessible refusée ;
- type `exhibitor` refusé à la conversion ;
- migration exécutée puis rollback vérifié sur PostgreSQL réel ;
- tests ciblés et suites de régression verts ;
- TypeScript et build verts ;
- documentation et roadmap mises à jour.

## Definition of Done

- [x] types canoniques partagés ;
- [x] organisation active déterministe ;
- [x] multi-organisation conservé ;
- [x] organisation sans owner exclue ;
- [x] conversion atomique activation → organisation + owner ;
- [x] `organization_id` et `converted_at` obligatoires à la conversion ;
- [x] type `exhibitor` refusé pour le workspace ;
- [x] ancienne résolution raccordée au service canonique ;
- [x] tests ajoutés et exécutés ;
- [x] migration réellement validée et rollback confirmé ;
- [x] TypeScript et build verts ;
- [x] documentation du lot et roadmap mises à jour ;
- [ ] CI du commit documentaire final verte ;
- [ ] PR revue et mergée.

## Prochain lot

B3.5.2 — Permissions et matrice de capacités, uniquement après merge et certification de ce lot.
