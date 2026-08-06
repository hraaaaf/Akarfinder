# B3.5 — Professional Workspace — Roadmap d’exécution

**Version : 2026-08-06**  
**Référence initiale : B3.5.0 mergé au commit `a232cb06391e458dfd00273cc150a75c0748a3b0`**  
**Lot actif : B3.5.1 — Modèle canonique d’identité professionnelle**

## Règles permanentes

Chaque lot B3.5 respecte obligatoirement :

- une responsabilité principale ;
- une branche ;
- une PR ;
- un merge ;
- migration isolée dans un fichier dédié lorsqu’elle est nécessaire ;
- inspection avant modification ;
- double-check du diff et des hypothèses ;
- tests, CI et preuves avant validation ;
- mise à jour des fichiers Markdown concernés ;
- aucun contournement temporaire déclaré comme final ;
- aucune structure parallèle lorsqu’un modèle canonique existe.

## Phase 1 — Fondation

| Lot | Objet | État | Gate |
|---|---|---|---|
| B3.5.0 | Audit et cartographie canonique | ✅ Mergé | Document canonique et décisions de réutilisation |
| B3.5.1 | Identité professionnelle | 🔵 En cours | Conversion atomique, owner actif, multi-organisation, tests et CI |
| B3.5.2 | Permissions et capacités | ⏳ Bloqué par B3.5.1 | Service `can()` unique et six rôles couverts |
| B3.5.3 | Auth, session serveur et RLS | ⏳ Bloqué | Isolation réellement exercée sans service-role partenaire |
| B3.5.4 | Shell `/pro/workspace` | ⏳ Bloqué | Navigation réelle, données vraies, aucun bouton mort |

## Phase 2 — DATA professionnelle

| Lot | Objet | État |
|---|---|---|
| B3.5.5 | Catalogue professionnel | À faire |
| B3.5.6 | Direct Feed Import UI | À faire |
| B3.5.7 | Review Center et déduplication prouvée | À faire |
| B3.5.8 | Canary publication et rollback | À faire |

## Phase 3 — Outils métier

| Lot | Objet | État |
|---|---|---|
| B3.5.9 | Projets promoteurs | À faire |
| B3.5.10 | Leads Workspace | À faire |
| B3.5.11 | Analytics organisationnelles | À faire |
| B3.5.12 | Médias et droits | À faire |

## Phase 4 — Administration partenaire

| Lot | Objet | État |
|---|---|---|
| B3.5.13 | Équipe et invitations | À faire |
| B3.5.14 | Organisation et offre commerciale | À faire |
| B3.5.15 | Claim Your Catalogue | À faire |

## Phase 5 — Certification

| Lot | Objet | État |
|---|---|---|
| B3.5.16 | Hardening, QA et certification pilote | À faire |

## État détaillé B3.5.1

### Acquis sur la branche

- types canoniques `agency` et `promoter` ;
- états workspace explicites ;
- sélection déterministe de l’organisation active ;
- conservation du multi-organisation ;
- exclusion des memberships inactives ;
- exclusion des organisations sans owner actif ;
- conversion transactionnelle d’une demande qualifiée ;
- création atomique de l’organisation et de la membership owner ;
- protection différée du dernier owner ;
- raccordement des anciens contrôles de permission au résolveur canonique ;
- endpoint staff de conversion ;
- tests ciblés et documentation du contrat.

### Gates restant avant merge

- exécution réelle du test ciblé ;
- vérification TypeScript ;
- build ;
- validation de la migration sur base de test ;
- revue du diff complet ;
- CI GitHub verte ;
- mise à jour du statut final dans ce document et dans le document du lot.

## Séquence verrouillée

```text
B3.5.1 identité
→ B3.5.2 permissions
→ B3.5.3 authentification et RLS
→ B3.5.4 shell
→ B3.5.5 à B3.5.8 DATA professionnelle
→ outils métier
→ administration partenaire
→ B3.5.16 certification
```

Aucun écran partenaire exploitable ne doit précéder la certification de B3.5.1 à B3.5.3.
