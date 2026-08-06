# B3.5.0 — Audit canonique du Professional Workspace

## Statut

- **Lot** : B3.5.0 — Audit et cartographie canonique
- **Commit audité** : `85d9a3514a29c34e01362b4aa6af87cf71876fa0`
- **Date de référence** : 2026-08-06
- **Nature du lot** : documentation et décision d’architecture uniquement
- **Modification fonctionnelle** : aucune
- **Migration** : aucune

## Verdict exécutif

**CANONICAL_FOUNDATION_EXISTS_BUT_IS_NOT_YET_A_PARTNER_WORKSPACE**

Le repository contient déjà la majorité des primitives backend nécessaires : identité professionnelle, memberships, activation, catalogue de soumissions, médias, ownership, affectation de leads et moteur `partner_feed_*` avec quarantaine, revue, canary et rollback.

Le manque principal n’est pas un nouveau modèle de données. Il est constitué de quatre raccords non finalisés :

1. l’absence d’une conversion transactionnelle et vérifiée `activation_request → organization + owner` ;
2. une authentification fragmentée entre Supabase Bearer, cookie applicatif HMAC et tokens administratifs ;
3. des contrôles applicatifs exécutés avec la service-role Supabase, donc sans preuve d’isolation RLS effective ;
4. l’absence d’une interface partenaire commune branchée sur les services existants.

Le principe directeur est confirmé : **consolider l’existant et ne créer aucun modèle parallèle**.

---

## 1. Flux canonique cible

```text
Acquisition publique
  /pro, /pro/agences, formulaires professionnels
        ↓
buyer_leads + professional_activation_requests
        ↓
Qualification interne
        ↓
Conversion transactionnelle à formaliser
  organization créée ou résolue
  + organization_id / converted_at
  + au moins une membership owner active
        ↓
Session Supabase Auth résolue côté serveur
        ↓
Memberships actives + organisation courante
        ↓
/pro/workspace
        ↓
Catalogue / Projets / Imports / Revue / Publication / Leads / Médias / Équipe / Organisation
```

### Rupture actuellement prouvée

La demande d’activation peut référencer une organisation lors du passage à `converted`, mais aucun service transactionnel unique ne prouve encore simultanément :

- l’existence de l’organisation ;
- l’existence d’un membre `owner` actif ;
- la cohérence de `organization_id` et `converted_at` ;
- l’absence de conversion partielle.

---

## 2. Inventaire canonique des tables professionnelles

| Table | Responsabilité actuelle | Service / API existant | Interface existante | RLS observée | Décision |
|---|---|---|---|---|---|
| `professional_organizations` | Identité, validation, activation, tier et visibilité d’une agence ou d’un promoteur | Repository professionnel ; `/api/pro/organizations`, `/api/pro/organizations/[organizationId]`, API admin d’activation | Profil public partiel ; aucun écran workspace | Lecture publique validée + lecture membre ; mutations serveur | **Conserver et adapter** |
| `professional_memberships` | Relation utilisateur–organisation, rôle et statut | Auth professionnelle ; `/api/pro/.../members` | Aucune | Lecture du membre sur sa propre membership ; pas de workflow d’invitation complet | **Conserver et renforcer** |
| `professional_activation_requests` | Demande issue de l’acquisition publique et suivi de qualification | Service de demande d’activation | Formulaire public seulement | Accès service-role ; aucun accès partenaire direct | **Conserver et raccorder** |
| `professional_property_submissions` | Brouillon professionnel, revue et publication contrôlée | `/api/pro/.../submissions`, détail et soumission en revue ; API admin de review | Aucune | Lecture membre ; mutations serveur | **Conserver** |
| `professional_projects` | Projet promoteur distinct des annonces | Repository / types partiels ; aucune route `/api/pro/.../projects` trouvée | Profil public partiel possible ; aucune gestion workspace | Lecture membre et lecture publique conditionnelle | **Conserver ; compléter la couche applicative** |
| `professional_media_assets` | Médias liés à une soumission ou un projet, provenance et droits | `/api/pro/.../media` | Aucune | Lecture membre ; mutations serveur | **Conserver et renforcer les gates de droits** |
| `professional_listing_ownership` | Revendication et vérification du rattachement d’une annonce | `/api/pro/.../ownership/listings` | Aucune | Lecture membre ; mutations serveur | **Conserver ; ajouter preuve et audit métier** |
| `professional_lead_assignments` | Affectation d’un lead à une organisation | `/api/pro/.../leads`, détail lead, dashboard et stats | Aucune interface partenaire | Lecture membre ; mutations serveur | **Conserver** |

### Invariants manquants à traiter dans B3.5.1/B3.5.13

- Une organisation active n’est pas contrainte en base à posséder au moins un `owner` actif.
- Une organisation peut perdre son dernier owner sans invariant SQL ou service transactionnel démontré.
- Les invitations n’ont pas de date d’expiration canonique prouvée.
- La sélection d’organisation active pour un utilisateur multi-organisation n’est pas formalisée.
- `professional_activation_requests.requested_type` accepte `exhibitor`, alors que la cible B3.5 ne retient que `agency` et `promoter`.

---

## 3. Inventaire canonique du moteur `partner_feed_*`

| Table | Responsabilité | État réellement prouvé | Interface / API | Décision |
|---|---|---|---|---|
| `partner_feed_sources` | Source partenaire, type, état, attestations, mapping | Persistant et opérationnel au niveau SQL | Aucune API partenaire trouvée ; aucune UI | **Conserver** |
| `partner_feed_imports` | Fichier, parser, validation, dédup, certification et cycle d’import | Persistant ; métadonnées parser/mapping/validation disponibles | Aucune API/UI | **Conserver** |
| `partner_feed_import_rows` | Ligne source, payload canonique, validation et éligibilité | Persistant | Aucune API/UI | **Conserver** |
| `partner_feed_audit_events` | Journal append-only du flux | Persistant | Aucune UI | **Conserver** |
| `partner_feed_review_items` | File de revue, décision, cible listing et application | Persistant avec contraintes et transitions | Aucune API/UI | **Conserver** |
| `partner_feed_review_item_versions` | Historique immuable avant/après | Persistant, update/delete interdits | Aucune UI | **Conserver** |
| `partner_feed_publication_batches` | Dry-run, gates, canary, publication et rollback | Persistant avec fonctions de contrôle | Aucune API/UI | **Conserver** |
| `partner_feed_publication_batch_items` | Résultat par élément et snapshot de rollback | Persistant | Aucune UI | **Conserver** |

### Limite importante de B3.4.4

La migration de déduplication et change detection ajoute les contrats et rapports, mais initialise des rapports fail-closed statiques à zéro. Elle ne suffit pas, seule, à prouver un moteur de rapprochement exécuté sur les imports réels. B3.5.7 ne doit pas présenter une file de doublons comme opérationnelle avant vérification du service qui alimente réellement ces champs.

### Alignement RLS à corriger

Les politiques actuelles ne correspondent pas encore à la matrice B3.5 proposée :

- l’insertion d’un import est ouverte à tout membre actif, y compris un `viewer` ;
- la création/modification d’une source est limitée à `owner/admin`, alors que la cible prévoit `feed.import` pour `editor` ;
- la revue autorise `owner/admin/editor`, ce qui est cohérent avec la cible ;
- canary, publication et rollback doivent rester limités aux capacités explicites et ne pas dépendre d’un simple rôle vérifié dans l’interface.

---

## 4. Matrice routes → classification → décision

### Routes `/pro/*`

| Route | Classification | État | Décision |
|---|---|---|---|
| `/pro` | Publique | Landing d’acquisition AkarFinder Pro | **Conserver** |
| `/pro/agences` | Publique | Landing ciblée agences | **Conserver** |
| `/pro/analytics` | Interne legacy | Protégée par `LEADS_ADMIN_TOKEN` dans `?token=` ; métriques globales, best-effort | **Isoler puis supprimer après remplacement** |
| `/pro/alerts` | Interne legacy | Protégée par token URL ; export et liens propagent le secret | **Isoler puis supprimer après remplacement** |
| `/pro/leads` | Obsolète | Route retirée, redirection vers `/pro#contact` | **Supprimer le reliquat lors d’un lot dédié** |
| `/pro/workspace` | Partenaire cible | Absente | **Créer en B3.5.4** |

### Autres surfaces liées

| Surface | Classification | Décision |
|---|---|---|
| `/professionnels/[slug]` | Profil professionnel public | **Conserver et alimenter depuis les modèles canoniques** |
| `components/pro/ProPageV2` | Acquisition publique | **Conserver** |
| `ProfessionalAudiencePage` | Acquisition segmentée | **Conserver** |
| Formulaire de demande d’activation | Acquisition publique | **Conserver et raccorder à la conversion canonique** |

Aucun composant partenaire authentifié n’exploite encore les API professionnelles.

---

## 5. API et Server Actions

### API professionnelle existante

| API | Fonction | Permission actuelle | Décision |
|---|---|---|---|
| `/api/pro/me` | Utilisateur et organisations accessibles | Session Bearer Supabase | **Adapter à la session serveur** |
| `/api/pro/organizations` | Organisations accessibles / création | Contrôle applicatif | **Conserver** |
| `/api/pro/organizations/[organizationId]` | Lecture / mise à jour organisation | `organization.read/update` | **Conserver** |
| `/api/pro/.../dashboard` | Agrégats organisationnels | Lecture organisation | **Conserver et étendre** |
| `/api/pro/.../members` | Membres et mutations d’équipe | `members.read/manage` | **Conserver et compléter invitations/owner** |
| `/api/pro/.../submissions` | Liste et création catalogue | `listings.read/manage` | **Conserver ; renommer les capacités** |
| `/api/pro/.../submissions/[submissionId]` | Lecture et modification | `listings.read/manage` | **Conserver** |
| `/api/pro/.../submissions/[submissionId]/submit` | Passage en revue | Contrôle serveur | **Conserver** |
| `/api/pro/.../media` | Médias professionnels | Permissions catalogue/projets | **Conserver et durcir les droits** |
| `/api/pro/.../ownership/listings` | Claim catalogue | `ownership.read/manage` | **Conserver** |
| `/api/pro/.../leads` | Leads affectés | `leads.read/manage` | **Conserver** |
| `/api/pro/.../stats` | Statistiques organisationnelles | `stats.read` | **Conserver et rendre explicable** |
| `/api/admin/pro/organizations/.../activation` | Activation commerciale interne | Auth staff | **Conserver, hors workspace partenaire** |
| `/api/admin/pro/submissions/.../review` | Revue interne | Auth staff | **Conserver** |

### Fonctions absentes ou incomplètes

- aucune API `/api/pro/.../projects` trouvée ;
- aucune API `partner_feed_*` trouvée ;
- aucun service transactionnel unique de conversion activation → organisation + owner ;
- aucune Server Action workspace canonique trouvée ;
- aucun sélecteur d’organisation courante persistant et vérifié côté serveur.

---

## 6. Authentification réellement utilisée

Le repository contient actuellement trois mécanismes distincts :

1. **API professionnelle** : Bearer token Supabase lu depuis `Authorization`, puis `supabase.auth.getUser(accessToken)` ;
2. **session applicative générique** : cookie `ak_session` signé HMAC ou Bearer token validé par `AUTH_SESSION_SECRET` ;
3. **outils internes legacy** : `LEADS_ADMIN_TOKEN` accepté en header et, pour certaines pages, dans `?token=`.

### Décision canonique

Le workspace partenaire doit utiliser **Supabase Auth avec résolution de session côté serveur**, puis memberships actives et organisation courante. Aucun nouvel écran partenaire ne doit accepter :

- `?token=` ;
- `LEADS_ADMIN_TOKEN` ;
- une clé ou un secret exposé au client ;
- un simple rôle fourni par le navigateur.

Les pages internes legacy peuvent rester temporairement isolées, mais elles ne constituent pas une fondation réutilisable.

---

## 7. RLS et isolation organisationnelle

### Constat

Les repositories professionnels utilisent le client Supabase serveur configuré avec `SUPABASE_SERVICE_ROLE_KEY`. Cette clé contourne RLS. L’isolation actuelle est donc principalement assurée par `requireProfessionalPermission()` et les filtres applicatifs.

Les politiques RLS existantes sont utiles comme intention de sécurité, mais elles ne prouvent pas l’isolation du futur workspace tant que les requêtes normales restent exécutées en service-role.

### Exigences B3.5.3

- résoudre l’utilisateur Supabase côté serveur ;
- utiliser un client scoped à la session pour les opérations partenaires lorsque possible ;
- réserver la service-role aux opérations internes explicitement justifiées ;
- conserver un contrôle applicatif central comme seconde barrière ;
- écrire des tests cross-organization contre les politiques réellement exécutées ;
- interdire toute mutation lorsque l’organisation, la membership, le statut utilisateur ou le statut organisation ne sont pas valides.

---

## 8. Doublons potentiels et systèmes concurrents

| Élément | Risque | Décision |
|---|---|---|
| `lib/professional/permissions.ts` | Matrice technique actuelle | **Base à conserver et étendre** |
| Capacités de `commercial-activation.ts` | Second système de capacités lié au tier et à l’activation | **Fusionner dans le service central, ne pas maintenir deux `can()`** |
| `listings.*` vs capacités cibles `catalogue.*` | Vocabulaire concurrent | **Migrer vers les capacités B3.5 avec compatibilité transitoire contrôlée** |
| Profils promoteurs/public registries | Peut ressembler à une identité parallèle | **Limiter à la présentation publique ; source d’autorité = `professional_organizations`** |
| Parcours vendeur individuel | Domaine distinct du workspace d’organisation | **Ne pas fusionner artificiellement** |
| Tables `partner_feed_*` | Risque de recréer parser/review/canary dans l’UI | **Réutiliser strictement les tables et fonctions B3.4** |
| Hypothétique `partner_listings` | Dupliquerait les soumissions et listings publics | **Interdit** |

---

## 9. Fonctionnalités backend sans interface

Les fonctionnalités suivantes sont déjà présentes en totalité ou en partie côté backend, sans écran partenaire :

- résolution des organisations accessibles ;
- lecture/mise à jour de l’organisation ;
- dashboard organisationnel ;
- membres et rôles ;
- catalogue de soumissions ;
- soumission en revue ;
- revue interne ;
- médias ;
- ownership de listings ;
- leads affectés ;
- statistiques organisationnelles ;
- sources de feed ;
- imports CSV/XLSX et métadonnées de parsing ;
- mapping et validation ;
- review queue et historique immuable ;
- batches canary ;
- journal d’exécution et rollback.

Le workspace doit prioritairement exposer ces capacités, pas reconstruire leur stockage.

---

## 10. Écrans utilisant encore un token URL

| Écran | Token | Propagation observée | Décision |
|---|---|---|---|
| `/pro/analytics` | `LEADS_ADMIN_TOKEN` via `?token=` | liens vers `/pro/leads` et `/pro/alerts` | Interne legacy ; ne pas réutiliser |
| `/pro/alerts` | `LEADS_ADMIN_TOKEN` via `?token=` | export CSV et lien Leads | Interne legacy ; ne pas réutiliser |
| `/pro/leads` | ancien lien tokenisé | route désormais redirigée | Obsolète |

---

## 11. Décisions conserver / adapter / supprimer

### Conserver

- toutes les tables `professional_*` inventoriées ;
- toutes les tables `partner_feed_*` inventoriées ;
- les API professionnelles déjà présentes ;
- le pipeline B3.4 de parsing, mapping, quarantaine, revue, canary et rollback ;
- les pages d’acquisition publiques `/pro` et `/pro/agences` ;
- le profil professionnel public.

### Adapter

- authentification professionnelle vers session Supabase résolue côté serveur ;
- client DB et stratégie RLS ;
- service de permissions unique ;
- activation commerciale et conversion d’une demande ;
- choix de l’organisation active ;
- vocabulaire `listings.*` vers `catalogue.*` ;
- matrice RLS des feeds ;
- droits média : le schéma actuel utilise `publication_permission = allowed`, pas `confirmed` ;
- APIs existantes pour les brancher au shell workspace.

### Supprimer ou retirer après remplacement

- route obsolète `/pro/leads` ;
- propagation de `LEADS_ADMIN_TOKEN` dans les URLs ;
- contrôles de rôles dispersés ou doublés ;
- toute tentative de créer `partner_listings` ou une seconde identité professionnelle.

---

## 12. Roadmap B3.5 corrigée selon les preuves

### B3.5.1 — Identité professionnelle

Conserver les trois modèles canoniques. Ajouter un service transactionnel de conversion, l’invariant owner, la sélection d’organisation et une décision explicite sur `exhibitor` : migration vers `agency/promoter`, maintien hors workspace, ou retrait après analyse des données réelles.

### B3.5.2 — Permissions

Ne pas créer un troisième système. Fusionner `permissions.ts` et les capacités commerciales dans une matrice unique : rôle + statut organisation + activation + capability. Aligner les politiques RLS sur cette matrice.

### B3.5.3 — Auth et RLS

Ce lot devient le gate de sécurité obligatoire avant toute interface partenaire. Remplacer le Bearer géré par le client navigateur par une session serveur Supabase. Prouver que les tests RLS utilisent un contexte qui ne contourne pas les politiques.

### B3.5.4 — Shell

Créer uniquement le layout, le sélecteur d’organisation et les agrégats réels en consommant les services existants. Aucune nouvelle table.

### B3.5.5 — Catalogue

Brancher `professional_property_submissions`. Conserver le pipeline brouillon → revue → publication. Renommer progressivement les capacités `listings.*` en `catalogue.*`.

### B3.5.6 — Direct Feed UI

Créer une couche API/service mince au-dessus des tables et parseurs B3.4 existants. Ne pas recréer de parser, de mapping ou de stockage d’import.

### B3.5.7 — Review Center

Brancher `partner_feed_review_items` et `partner_feed_review_item_versions`. Avant d’afficher des doublons réels, certifier le service qui produit les signaux de déduplication et non le seul contrat SQL fail-closed.

### B3.5.8 — Canary et rollback

Exposer `partner_feed_publication_batches`, leurs items et fonctions de gate. Les capacités `feed.approve`, `feed.publish` et `feed.rollback` doivent être distinctes et vérifiées côté serveur.

### B3.5.9 — Projets

La table existe, mais la couche API de gestion manque. Créer l’API et l’UI sans modèle parallèle.

### B3.5.10 — Leads

Réutiliser `professional_lead_assignments` et les API existantes. Une migration ne sera justifiée que pour des champs CRM réellement absents après audit détaillé.

### B3.5.11 — Analytics

Réutiliser dashboard/stats organisationnels. Remplacer les métriques globales legacy et distinguer explicitement zéro, indisponibilité et dénominateur insuffisant.

### B3.5.12 — Médias

Réutiliser `professional_media_assets`. Décider si le vocabulaire canonique reste `allowed` ou migre vers `confirmed`; la roadmap ne doit pas supposer une valeur inexistante.

### B3.5.13 — Équipe

Réutiliser `professional_memberships` et l’API membres. Ajouter invitation expirante, acceptation, protections du dernier owner et transfert de propriété.

### B3.5.14 — Organisation

Réutiliser `professional_organizations` et l’API d’activation staff. Garder les tiers administrés par AkarFinder.

### B3.5.15 — Claim Your Catalogue

Réutiliser `professional_listing_ownership`. Ajouter la preuve, la revue, les trois axes distincts `ownership_verified`, `source_rights_confirmed` et `media_rights_confirmed` sans transformer automatiquement un contenu tiers en contenu autorisé.

### B3.5.16 — Certification

Ajouter les tests end-to-end et RLS après construction. Les tests doivent inclure les appels directs aux API et à la base, pas seulement l’état visuel des boutons.

---

## 13. Séquence corrigée

La séquence générale reste valide, avec deux gates renforcés :

1. **B3.5.1 → B3.5.3 doivent être terminés avant toute route partenaire exploitable** ;
2. **B3.5.7 ne peut être déclaré fonctionnel avant preuve d’alimentation réelle des décisions de déduplication**.

Ordre retenu :

```text
B3.5.0 audit canonique
→ B3.5.1 identité et conversion
→ B3.5.2 permissions uniques
→ B3.5.3 session + RLS réellement exécutée
→ B3.5.4 shell
→ B3.5.5 catalogue
→ B3.5.6 feed UI
→ B3.5.7 review + dédup prouvée
→ B3.5.8 canary + rollback
→ lots métier et administration
→ B3.5.16 certification
```

---

## 14. Definition of Done B3.5.0

- [x] aucune modification fonctionnelle ;
- [x] aucune migration ;
- [x] tables professionnelles canoniques inventoriées ;
- [x] tables `partner_feed_*` inventoriées ;
- [x] routes `/pro/*` classées ;
- [x] API et services associés cartographiés ;
- [x] règles RLS et limites d’exécution documentées ;
- [x] authentifications réellement utilisées documentées ;
- [x] doublons potentiels identifiés ;
- [x] backend sans interface identifié ;
- [x] écrans à token URL identifiés ;
- [x] décisions conserver / adapter / supprimer explicites ;
- [x] roadmap B3.5 corrigée selon les preuves.

## Prochain lot autorisé

**B3.5.1 — Modèle canonique d’identité professionnelle**, avec un périmètre limité à l’identité, à l’organisation active et à la conversion transactionnelle d’une demande d’activation. Aucun travail UI workspace ne doit commencer avant la certification de B3.5.1 à B3.5.3.
