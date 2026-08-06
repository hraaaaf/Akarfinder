# B3.5 — Professional Workspace — Roadmap d’exécution

**Version : 2026-08-06**  
**Référence initiale : B3.5.0 mergé au commit `a232cb06391e458dfd00273cc150a75c0748a3b0`**  
**Identité canonique : B3.5.1 mergé au commit `2ff5bfa9420dce48e0fe94ba9f07d6ac4a683e7a`**  
**Lot actif : B3.5.2 — Permissions et matrice de capacités**

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

## Contrat transversal Neuf × Vendre × Professional Workspace

Les parcours particulier, professionnel et neuf utilisent un socle commun sans fusionner leurs responsabilités métier.

### Pipeline canonique de publication

```text
Brouillon
→ complétude explicable
→ revue humaine
→ corrections éventuelles
→ approbation
→ publication explicite
→ pause / reprise / retrait / archivage
```

Aucune organisation, aucun projet et aucune importation ne permet une publication directe sans gate.

### Modèle canonique

```text
Professional Project
├── informations générales
├── localisation
├── médias
├── typologies
└── offres / disponibilités
        ↓
Professional Property Submission
        ↓
revue et publication contrôlée
```

- `professional_projects` représente le programme immobilier neuf ;
- `professional_property_submissions` représente toute offre ou unité publiable ;
- aucune table `partner_listings` ne doit être créée ;
- un projet validé ne valide pas automatiquement chacune de ses unités ;
- une modification d’un contenu publié crée une nouvelle version en revue, sans remplacer silencieusement la version publique active.

### Catalogue professionnel

Le Catalogue constitue la vue commune des offres publiables :

- saisies manuelles d’agence ;
- unités rattachées à des projets neufs ;
- importations partenaires ;
- annonces revendiquées avec preuve ;
- vente et location.

Les origines restent visibles et auditables.

### Complétude

Le moteur de complétude réutilise le standard visible de `/vendre`, enrichi par des règles spécialisées :

- socle : type, localisation, prix, surface, description, médias, contact et droits ;
- Neuf : promoteur, projet, typologie, livraison, disponibilité et prix de départ ;
- aucune précision ni métrique simulée.

### États canoniques progressifs

```text
draft
in_review
needs_changes
resubmitted
approved
published
paused
rejected
withdrawn
archived
```

La migration éventuelle des anciens états doit être précédée d’un inventaire réel et rester séparée du code applicatif.

### Vendre particulier et transfert professionnel

- les brouillons personnels restent personnels lorsqu’un utilisateur rejoint une organisation ;
- aucun transfert automatique vers une organisation ;
- rattachement professionnel uniquement via mandat ou revendication explicite ;
- le déclarant initial et l’historique restent traçables ;
- `ownership_verified`, `source_rights_confirmed` et `media_rights_confirmed` restent trois preuves distinctes.

### Leads

Une fiche lead unique conserve :

- son origine : neuf, vendre, annonce, projet ou recherche ;
- l’objet concerné ;
- l’organisation affectée ;
- l’historique et les prochaines actions.

CRM et leads restent séparés conceptuellement : lead, contact, activité, tâche et visite ne doivent pas devenir une seule table fourre-tout.

### Médias

Une bibliothèque professionnelle commune rattache les médias à :

- organisation ;
- projet ;
- typologie ;
- unité ou soumission.

Aucun média n’est publiable sans droits confirmés selon le vocabulaire réellement présent dans le schéma.

## Navigation cible

```text
Vue d’ensemble
Catalogue
Projets
Imports
Revue
Publications
Leads
Médias
Analytics
Équipe
Organisation
```

La visibilité dépend des capacités. Une section non disponible doit être annoncée explicitement ; aucun bouton mort.

## Phase 1 — Fondation

| Lot | Objet | État | Gate |
|---|---|---|---|
| B3.5.0 | Audit et cartographie canonique | ✅ Mergé | Document canonique et décisions de réutilisation |
| B3.5.1 | Identité professionnelle | ✅ Mergé | Conversion atomique, owner actif, multi-organisation, migration réelle et CI verte |
| B3.5.2 | Permissions et capacités | 🔵 Inventaire terminé, implémentation en cours | Service `can()` unique, six rôles et alignement Neuf/Vendre |
| B3.5.3 | Auth, session serveur et RLS | ⏳ Bloqué | Isolation réellement exercée sans service-role partenaire |
| B3.5.4 | Shell `/pro/workspace` | ⏳ Bloqué | Navigation réelle, données vraies, aucun bouton mort |

## Phase 2 — DATA professionnelle

| Lot | Objet | Ajustement canonique | État |
|---|---|---|---|
| B3.5.5 | Catalogue professionnel | Inclure offres agence, unités de projets, imports et claims | À faire |
| B3.5.6 | Direct Feed Import UI | Produire des soumissions canoniques, jamais une publication directe | À faire |
| B3.5.7 | Review Center et déduplication prouvée | Revue commune et décisions auditables | À faire |
| B3.5.8 | Canary publication et rollback | Capacités distinctes approve/publish/rollback | À faire |

## Phase 3 — Outils métier

| Lot | Objet | Ajustement canonique | État |
|---|---|---|---|
| B3.5.9 | Projets promoteurs | Projet parent, typologies et disponibilités liées aux soumissions | À faire |
| B3.5.10 | Leads Workspace | Lead unique avec origine et objet ; CRM minimal structuré | À faire |
| B3.5.11 | Médias et droits | Bibliothèque commune avant les KPI complets | À faire |
| B3.5.12 | Analytics organisationnelles | Après médias, avec périodes, sources et dénominateurs explicites | À faire |

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

## Inventaire B3.5.2 — résultat

Document canonique : `docs/B3-5-2-PERMISSION-INVENTORY.md`.

### Systèmes trouvés

1. permissions de rôle dans `lib/professional/permissions.ts` ;
2. capacités commerciales dans `lib/professional/commercial-activation.ts` ;
3. contrôles de rôles directs dans les politiques RLS et fonctions SQL B3.4.

### Findings bloquants

- deux matrices applicatives indépendantes ;
- absence de capacités `feed.*`, `media.*`, `team.read` et `catalogue.submit` ;
- `listings.manage` trop large ;
- lecture et gestion d’équipe non séparées ;
- contrôle média indirect via catalogue/projets ;
- RLS fondée sur des rôles directs, sans parité TypeScript garantie ;
- publication commerciale et publication technique insuffisamment séparées ;
- visibilité des coordonnées de leads non isolée ;
- repositories service-role contournant RLS, à traiter dans B3.5.3.

### Décision d’architecture

```text
rôle
+ membership active
+ organisation accessible
+ gate organisationnel/commercial éventuel
+ capacité demandée
= CapabilityDecision explicable
```

Les mécanismes staff, seller individuel, service-role et secrets legacy restent hors de la matrice partenaire.

## Portée précise B3.5.2

B3.5.2 doit :

- remplacer les contrôles dispersés par une décision unique `can(context, capability)` ;
- fusionner la matrice de rôles et les gates commerciaux sans confondre les deux ;
- couvrir les six rôles ;
- introduire les capacités Catalogue, Projets, Feeds, Revue, Publication, Leads, Analytics, Médias, Équipe et Organisation ;
- protéger toutes les mutations côté serveur ;
- préparer l’alignement RLS de B3.5.3 ;
- maintenir le tier commercial hors ranking et pertinence Search ;
- appliquer le même droit de publication contrôlée aux offres issues de Neuf, Vendre transféré et feeds partenaires.

## État global du chantier

| Indicateur | Valeur |
|---|---:|
| Lots terminés | 2 / 17 |
| Phase Fondation | 40 % terminés ; B3.5.2 activement en cours |
| Progression mécanique | 12 % |
| Progression globale pondérée estimée | environ 16 % |
| Workspace partenaire exploitable | non, bloqué jusqu’à B3.5.3 |

## Séquence verrouillée

```text
B3.5.2 permissions
→ B3.5.3 authentification et RLS
→ B3.5.4 shell
→ B3.5.5 à B3.5.8 DATA professionnelle
→ projets / leads / médias / analytics
→ administration partenaire
→ B3.5.16 certification
```

Aucun écran partenaire exploitable ne doit précéder la certification de B3.5.2 et B3.5.3.
