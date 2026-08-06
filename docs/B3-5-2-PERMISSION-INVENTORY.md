# B3.5.2 — Inventaire des permissions professionnelles

## Statut

- **Lot** : B3.5.2 — Permissions et matrice de capacités
- **Branche** : `agent/b3-5-2-professional-capabilities`
- **Date de référence** : 2026-08-06
- **Nature de ce commit** : inventaire documentaire uniquement
- **Modification fonctionnelle** : aucune
- **Migration** : aucune

## Verdict

**TWO_AUTHORIZATION_SYSTEMS_AND_SQL_ROLE_CHECKS_MUST_CONVERGE**

Le repository contient actuellement trois niveaux de décision distincts :

1. une matrice de permissions techniques basée sur le rôle dans `lib/professional/permissions.ts` ;
2. une matrice de capacités commerciales basée sur l’état d’activation, l’autorisation de source et le tier dans `lib/professional/commercial-activation.ts` ;
3. des politiques RLS et fonctions SQL qui testent directement certains rôles (`owner`, `admin`, `editor`) sans passer par une capacité canonique partagée.

Le futur service `can(context, capability)` doit devenir l’unique source d’autorité applicative. Les politiques RLS devront reproduire la même matrice dans B3.5.3, sans utiliser une logique métier divergente.

---

## 1. Rôles canoniques existants

Les six rôles sont déjà déclarés et doivent être conservés :

- `owner` ;
- `admin` ;
- `editor` ;
- `analyst` ;
- `lead_manager` ;
- `viewer`.

Aucun nouveau rôle n’est nécessaire pour B3.5.2.

---

## 2. Permissions techniques existantes

Source actuelle : `lib/professional/permissions.ts`.

| Permission actuelle | Domaine réel | Décision B3.5.2 |
|---|---|---|
| `organization.read` | Lecture organisation | Conserver |
| `organization.manage` | Mise à jour organisation | Renommer `organization.update` |
| `members.manage` | Gestion équipe | Remplacer par `team.read` + `team.manage` |
| `listings.read` | Catalogue professionnel | Renommer `catalogue.read` |
| `listings.manage` | Écriture et soumission catalogue | Scinder en `catalogue.write` + `catalogue.submit` |
| `projects.read` | Projets promoteurs | Conserver |
| `projects.manage` | Écriture projets | Renommer `projects.write` |
| `leads.read` | Lecture CRM | Conserver |
| `leads.manage` | Mise à jour CRM | Conserver |
| `stats.read` | Analytics | Renommer `analytics.read` |

### Limites observées

- `owner` et `admin` possèdent toutes les permissions techniques sans distinction ;
- `editor` peut gérer catalogue et projets mais n’a aucune capacité explicite de soumission ;
- `analyst` reçoit la lecture des leads, ce qui doit être confirmé avec les règles de masquage des contacts ;
- `viewer` ne dispose pas actuellement de `stats.read`, alors que la cible prévoit une lecture Analytics limitée ;
- aucune permission feed, review, publication, rollback, média ou claim n’existe dans cette matrice.

---

## 3. Capacités commerciales existantes

Source actuelle : `lib/professional/commercial-activation.ts`.

| Capacité actuelle | Signification | Destination canonique |
|---|---|---|
| `portfolio.manage` | Gestion générale du portefeuille | Supprimer comme capacité trop large |
| `submissions.manage` | Gestion des soumissions | `catalogue.write` / `catalogue.submit` |
| `media.manage` | Gestion des médias | `media.read` / `media.write` |
| `publication.request` | Demander une publication | Gate métier de `catalogue.submit` ou `feed.publish` selon le contexte |
| `leads.receive` | Recevoir des leads | Gate organisationnel distinct de `leads.read` |
| `stats.basic` | Analytics de base | `analytics.read` |
| `stats.advanced` | Analytics avancées | Feature commerciale, pas une permission de rôle |
| `branding.enhanced` | Branding Premium | Feature commerciale, pas une permission de rôle |

### Décision structurante

Les capacités commerciales ne doivent pas disparaître dans une simple matrice de rôles. Elles deviennent des **gates organisationnels ou commerciaux** consultés par le service canonique :

```text
role capability
+ membership active
+ workspace accessible
+ activation/source/rights gate éventuel
= décision finale
```

Le tier `partner/gold/premium` reste sans effet sur le ranking Search.

---

## 4. Matrice de rôle cible validée

Légende :

- `W` : écriture/mutation ;
- `R` : lecture ;
- `—` : refus.

| Domaine | Owner | Admin | Editor | Analyst | Lead manager | Viewer |
|---|---:|---:|---:|---:|---:|---:|
| Organisation | W | W | R | R | R | R |
| Équipe | W | W | — | — | — | — |
| Catalogue | W | W | W | R | R | R |
| Import feed | W | W | W | R | — | R |
| Revue feed | W | W | W | R | — | R |
| Approbation canary | W | W | — | — | — | — |
| Publication | W | W | — | — | — | — |
| Rollback | W | W | — | — | — | — |
| Projets | W | W | W | R | R | R |
| Leads | W | W | R | R | W | R |
| Analytics | R | R | R | R | R | R |
| Médias | W | W | W | R | R | R |

### Nuances obligatoires

- `viewer` peut voir Imports/Revue uniquement en lecture ;
- `analyst` peut analyser les feeds et leurs erreurs mais ne peut jamais corriger ou valider ;
- `lead_manager` peut gérer les leads mais ne peut pas importer ou revoir un feed ;
- `editor` peut préparer et soumettre du contenu, mais ne peut ni approuver un canary, ni publier, ni rollback ;
- téléphone/email peuvent être masqués indépendamment de `leads.read` ;
- `owner/admin` restent les seuls rôles de publication canary et rollback.

---

## 5. Capacités canoniques à introduire

```text
organization.read
organization.update
team.read
team.manage
catalogue.read
catalogue.write
catalogue.submit
feed.read
feed.import
feed.review
feed.approve
feed.publish
feed.rollback
projects.read
projects.write
leads.read
leads.manage
analytics.read
media.read
media.write
ownership.read
ownership.manage
```

### Capacités différées mais réservées

```text
catalogue.publish
projects.submit
projects.publish
contacts.reveal
exports.create
```

Elles ne doivent pas être ajoutées sans endpoint réel, test et usage explicite.

---

## 6. Inventaire API professionnel

| Surface | Contrôle actuel | Capacité cible | Risque |
|---|---|---|---|
| `/api/pro/me` | Auth Supabase + résolveur d’identité | aucune mutation | Faible |
| `/api/pro/organizations` | Auth + contrôle applicatif | `organization.read` / création encadrée | Création et lecture doivent rester distinctes |
| `/api/pro/organizations/[organizationId]` | `organization.read/manage` | `organization.read/update` | Renommage nécessaire |
| dashboard organisationnel | lecture organisation | `analytics.read` + lectures de domaines | Éviter une permission implicite globale |
| members | `members.manage` | `team.read/manage` | Lecture équipe actuellement mal séparée |
| submissions liste/création | `listings.read/manage` | `catalogue.read/write` | Trop large |
| submission détail/mutation | `listings.read/manage` | `catalogue.read/write` | Trop large |
| submit review | contrôle serveur lié à `listings.manage` | `catalogue.submit` | Capacité absente aujourd’hui |
| media | catalogue ou projets | `media.read/write` + droit sur parent | Contrôle indirect et potentiellement divergent |
| ownership | `ownership.read/manage` | conserver | À intégrer à la nouvelle union de types |
| leads | `leads.read/manage` | conserver | Ajouter gate de visibilité contact |
| stats | `stats.read` | `analytics.read` | Renommage nécessaire |
| activation staff | `requireAkarFinderStaff` | hors matrice partenaire | Conserver séparé |
| review staff | auth staff | hors matrice partenaire | Conserver séparé |

### Fonctions partenaires absentes

Aucune route partenaire n’expose encore :

- `partner_feed_sources` ;
- imports CSV/XLSX ;
- review queue ;
- canary ;
- publication ;
- rollback ;
- gestion complète des projets.

Les capacités correspondantes doivent néanmoins être définies maintenant pour éviter des contrôles ad hoc dans les lots suivants.

---

## 7. Inventaire UI

Aucun shell partenaire authentifié n’existe encore. Les composants `/pro` actuels sont principalement publics ou internes legacy.

### Conséquence

Il n’existe pas encore de dette importante de contrôles React `role === ...` dans un workspace partenaire. B3.5.4 devra consommer uniquement :

- les capacités calculées côté serveur ;
- ou une projection sérialisée de ces capacités pour l’état visuel.

La présence ou l’absence d’un bouton ne constitue jamais une autorisation.

### Surfaces à ne pas réutiliser

- `/pro/analytics` et `/pro/alerts` protégées par token URL ;
- `/pro/leads` obsolète ;
- contrôles internes staff basés sur secrets legacy.

---

## 8. Inventaire SQL / RLS

### Modèles professionnels

Les politiques existantes vérifient principalement :

- membership active ;
- égalité `organization_id` ;
- rôles autorisés selon la table ;
- mutations sensibles réservées au serveur ou au staff.

### Partner feeds

Les migrations B3.4 appliquent des contrôles SQL directs :

- lecture organisationnelle pour les membres actifs ;
- création ou modification de source souvent limitée à `owner/admin` ;
- revue autorisée à `owner/admin/editor` ;
- mutations de parser, audit et publication réservées à `service_role` ;
- canary et rollback protégés par fonctions/gates SQL.

### Divergences prouvées

1. `viewer` peut actuellement être couvert par certaines politiques de lecture/import plus largement que la matrice cible ;
2. `editor` doit pouvoir importer et revoir mais pas approuver/publier ;
3. RLS raisonne en rôles tandis que TypeScript raisonne en permissions ;
4. les repositories service-role contournent ces politiques, donc B3.5.3 doit tester la matrice avec un client authentifié réel.

### Décision

B3.5.2 définit la matrice canonique et les helpers SQL nécessaires. B3.5.3 applique et certifie les politiques RLS dans un contexte non-service-role.

---

## 9. Contrôles staff et secrets hors matrice partenaire

Les mécanismes suivants ne doivent pas être absorbés par `can()` :

- `requireAkarFinderStaff()` ;
- `LEADS_ADMIN_TOKEN` ;
- `SELLER_REVIEW_SECRET` ;
- tokens opaques du parcours `/vendre` ;
- service-role Supabase ;
- fonctions de certification DATA.

Ils appartiennent à des frontières différentes : administration interne, propriétaire individuel, automation serveur ou certification DATA.

Ils doivent cependant être inventoriés pour éviter qu’un endpoint partenaire les utilise comme substitut à la session Supabase.

---

## 10. Alignement Neuf × Vendre × Workspace

La matrice doit respecter les décisions validées :

- `catalogue.write` permet de modifier une soumission ou unité, pas de publier ;
- `catalogue.submit` envoie en revue selon le pipeline commun à `/vendre` ;
- `projects.write` modifie la structure programme ;
- une unité neuve publiable reste une soumission liée à un projet ;
- la validation d’une organisation ou d’un projet ne publie jamais automatiquement ses unités ;
- une modification d’un contenu public produit une version en revue ;
- un transfert depuis `/vendre` nécessite claim ou mandat explicite ;
- médias et droits sont vérifiés séparément avant publication.

---

## 11. Plan de remplacement

### Étape A — Types et matrice pure

- remplacer `ProfessionalPermission` par l’union canonique ;
- créer `ROLE_CAPABILITIES` ;
- ajouter tests exhaustifs des six rôles ;
- conserver temporairement des alias de compatibilité pour les API existantes.

### Étape B — Gate canonique

Créer une fonction pure :

```ts
can(context, capability): CapabilityDecision
```

La décision doit expliquer :

- `allowed` ;
- raison du refus ;
- rôle ;
- état workspace ;
- gate organisationnel ou commercial manquant.

### Étape C — Services et API

- remplacer `roleHasPermission()` et `hasCommercialCapability()` comme sources de décision finales ;
- protéger chaque mutation serveur ;
- ne laisser aux fonctions legacy que des façades de compatibilité documentées.

### Étape D — SQL

- créer un helper SQL de capacité ou une matrice SQL explicite ;
- ne pas dupliquer manuellement la matrice dans chaque policy ;
- certifier la parité TypeScript/SQL dans les tests.

---

## 12. Findings bloquants avant implémentation

| Finding | Sévérité | Traitement |
|---|---|---|
| Deux matrices applicatives indépendantes | Haute | Fusion B3.5.2 |
| RLS fondée directement sur rôles | Haute | Helper/matrice SQL puis certification B3.5.3 |
| `listings.manage` trop large | Haute | Scinder write/submit |
| Lecture équipe non séparée de gestion | Moyenne | `team.read/manage` |
| Média contrôlé indirectement par catalogue/projets | Haute | `media.read/write` + parent |
| Aucune capacité feed dans TypeScript | Haute | Ajouter la famille `feed.*` |
| Publication commerciale confondue avec publication technique | Haute | Séparer gate commercial et capacité de rôle |
| Viewer Analytics absent de l’actuel TypeScript | Moyenne | Ajouter `analytics.read` |
| Contact lead non masqué par capacité distincte | Moyenne | Réserver `contacts.reveal` |
| UI workspace inexistante | Non bloquant | Bonne fenêtre pour empêcher les checks dispersés |

---

## 13. Definition of Done de l’inventaire

- [x] rôles existants inventoriés ;
- [x] permissions techniques inventoriées ;
- [x] capacités commerciales inventoriées ;
- [x] API professionnelles classées ;
- [x] état UI documenté ;
- [x] stratégies RLS et divergences documentées ;
- [x] frontières staff/vendeur/service-role séparées ;
- [x] alignement Neuf/Vendre intégré ;
- [x] capacités cibles proposées ;
- [x] findings bloquants identifiés ;
- [ ] implémentation de la matrice canonique ;
- [ ] migration SQL éventuelle ;
- [ ] tests de parité TypeScript/SQL ;
- [ ] CI et merge du lot.

## Prochaine action

Implémenter les types canoniques et la fonction pure `can(context, capability)` avec tests exhaustifs des six rôles, puis raccorder progressivement les services existants sans modifier encore l’authentification de B3.5.3.
