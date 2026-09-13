# AKARFINDER — PRODUCT CONSTITUTION / CANONICAL

**Version : 0.6 — 2026-09-13**  
**Statut : ACTIVE / EN CONSTRUCTION — seuls les périmètres explicitement validés sont `L0 / LOCKED`.**

> Source canonique pour l’architecture produit, les standards de pages et les règles anti-dérive d’AkarFinder. `docs/ROADMAP.md` reste la source globale de vérité pour l’avancement data/produit.

---

## 1. GOAL

Empêcher toute dérive silencieuse d’un standard produit déjà validé.

### Succès observable

- architecture de pages explicite et versionnée ;
- séparation claire `L0 / LOCKED`, `L1 / FLEXIBLE`, `L2 / FREE` ;
- aucune rupture L0 sans accord explicite de `hraaaaf` sur le HEAD exact concerné ;
- toute validation explicite de `hraaaaf` est automatiquement promue en L0 sur le périmètre exact validé, sauf mention contraire ;
- CI capable de détecter présence, absence, ordre et cardinalité d’invariants structurels ;
- UI : `BEFORE → Goal → mockup/référence → implémentation → AFTER mêmes viewports → comparaison/tests → score` ;
- aucun déploiement Vercel sans autorisation explicite.

---

## 2. NORTH STAR PRODUIT

AkarFinder est un **moteur de recherche immobilier marocain**, pas un portail d’annonces classique.

### Positionnement HOME — L0 / LOCKED

> **1er moteur de recherche immobilier au Maroc**

Principe d’expérience :

`chercher → comparer → comprendre le quartier et le marché → vérifier la source → décider`

---

## 3. NIVEAUX DE GOUVERNANCE

### L0 — CONSTITUTIONNEL / LOCKED

Exemples : positionnement HOME, architecture primaire, rôle des routes principales, navigation primaire, moteur cartographique, TARGET visuel certifié, ou toute décision explicitement validée par le propriétaire.

**Règle :** aucun futur polish/refactor/agent ne peut rouvrir silencieusement un L0.

### Promotion automatique vers L0

Une décision devient `L0 / LOCKED` dès validation explicite de `hraaaaf`, sauf mention explicite `expérimental`, `flexible` ou `temporaire`.

Le verrou porte seulement sur le périmètre réellement validé.

### L1 — STANDARD PRODUIT / FLEXIBLE

Densité, spacing, microcopy secondaire, détails de cards, micro-interactions, responsive et polish sont autorisés tant qu’ils restent dans l’enveloppe L0.

### L2 — FREE

Contenu dynamique, SEO rédactionnel non structurel, données, instrumentation et corrections techniques sans impact produit.

---

## 4. INFORMATION ARCHITECTURE V1 — OWNER APPROVED / L0

**Validation explicite propriétaire : 2026-09-13.**  
Le message `Je valide p2 tel que proposé !` vaut validation du périmètre exact ci-dessous.

### Goal

Faire converger l’architecture visible vers une seule taxonomie primaire stable, attribuer clairement chaque route à son univers produit, supprimer le doublon quartier public sans casser les parcours legacy et empêcher tout futur polish de recréer des navigations concurrentes.

### Navigation primaire L0

Ordre exact :

1. Acheter
2. Louer
3. Neuf
4. Vivre ici
5. Vendre
6. Pro

Source unique : `lib/product-navigation.ts`.

### Rôles L0 exacts

- `/` : moteur d’entrée + preuve de valeur + accès aux parcours majeurs ;
- `/search` : moteur universel de résultats, filtres et comparaison ; **ce n’est pas un pilier primaire** ;
- `/acheter`, `/louer`, `/neuf` : hubs d’intention ;
- `/map` : univers `Vivre ici` / intelligence géographique ;
- `/vendre` : parcours vendeur ;
- `/pro` : hub professionnels ;
- `/mon-projet` et `/favorites` : utilitaires, pas piliers primaires ;
- `/immobilier/[city]/[district]` : route quartier canonique ;
- `/listings/[id]` : détail interne seulement si la politique source l’autorise.

### Bottom-nav mobile — couche utilitaire L0

La bottom-nav n’est pas une seconde taxonomie primaire. Elle expose exactement :

1. `/search` — Explorer
2. `/favorites` — Favoris
3. `/map` — Vivre ici
4. `/vendre` — Vendre
5. `/mon-projet` — Mon Projet

`/alerts` n’est pas promu tant que les notifications automatiques ne sont pas actives.

### Route quartier canonique

- `/quartiers` reste redirigé vers `/immobilier` ;
- `/quartiers/[citySlug]/[neighborhoodSlug]` effectue désormais une redirection permanente vers `/immobilier/[city]/[district]` ;
- `/immobilier/[city]/[district]` est l’unique route quartier publique canonique.

### Pro / Neuf — ownership L0, namespace conservé

- `/promoteurs` appartient conceptuellement à **Pro** ; aucune migration d’URL immédiate sans plan SEO/backlinks ;
- `/professionnels/[slug]` = détail public professionnel, pas hub ;
- `/projets/[slug]` appartient conceptuellement à **Neuf** ; son namespace actuel reste conservé tant qu’aucune migration SEO/backlinks n’est validée ;
- `/pro/analytics`, `/pro/alerts` = internes/noindex.

### Legacy conservé intentionnellement

- `/compagnon` → `/mon-projet` ;
- `/profil-recherche` → `/mon-projet` ;
- `/onboarding` = compatibilité legacy.

Ils ne doivent être supprimés qu’après audit exhaustif fiable de leurs callers. La recherche de code distante n’ayant pas fourni cette exhaustivité, P2 **ne les supprime pas**.

### Machine contract

`config/product-constitution.json` v0.6.0 verrouille `product.information-architecture.v1` :

- ordre des 6 piliers ;
- `/search`, Favoris et Mon Projet en utilitaires ;
- `SiteHeader` alimenté par `PRODUCT_PRIMARY_NAV` ;
- absence des anciennes taxonomies `searchPrimaryNav`, `secondaryNav`, `mobileNav` ;
- bottom-nav alimentée par `PRODUCT_MOBILE_BOTTOM_NAV` ;
- absence d’Alertes dans la bottom-nav ;
- redirection permanente `/quartiers/[city]/[quartier]` vers `/immobilier/[city]/[district]`.

### Preuve BEFORE / AFTER

BEFORE IA :
- run `34709783962` — SUCCESS ;
- product HEAD `6bc7946bde7f4ff4e82cc77b86e705a36ff031a8` ;
- artifact `10302971503` ;
- digest `sha256:1b00114246c2c54736e0e96a0d4895559b446fce4cd6b95a1389bf58d62f359b` ;
- 15 routes × 3 viewports ; 50 captures ; 0 finding.

AFTER IA product tree :
- product HEAD `13150e1ccb3068270b55b5dfb830ba777e50ca70` ;
- run `34756822484` — SUCCESS ;
- artifact `10317087695` ;
- digest `sha256:3da155e3db4d28f33145e030a2771dd0ea3666d76bfb35c6aa5ef7d0412f40eb` ;
- 15 routes × 3 viewports ; 50 captures attendues / 50 produites ; `findingCount = 0`.

Comparaison observée :
- HOME reste visuellement stable, conformément à son freeze P1 ;
- SEARCH mobile passe d’une taxonomie partielle/concurrente à la taxonomie primaire L0 complète ;
- la bottom-nav cesse de promouvoir `Alertes` et devient une couche utilitaire cohérente ;
- aucun élargissement du périmètre graphique hors IA.

**Score visuel/structurel P2 : 9,3 / 10.**

Réserve mineure non bloquante : la bottom-nav demeure dense à 390 px, mais reste lisible, sans overflow et cohérente avec le rôle utilitaire validé.

### Convergence des contrats historiques

Les anciens tests/audits défendaient encore la bottom-nav `Carte + Alertes` et une ancienne forme inline de navigation. Ils sont migrés vers la source canonique P2 sans supprimer les contrôles de géométrie, responsive, blur, overflow, active-state ou accessibilité.

**Conclusion P2 : propriétaire approuvé et implémenté ; clôture technique conditionnée uniquement aux derniers gates CI du HEAD de closeout.**

---

## 5. HOME STANDARD V1 — CLOSED / OWNER APPROVED / L0

**Validation explicite propriétaire : 2026-09-12.**  
Le message `Ok go` suivant la liste exacte des 10 décisions P1 vaut validation de ce périmètre.

### Goal

Faire de la HOME une entrée search-first premium, plus courte et plus claire, sans modifier le positionnement `1er moteur de recherche immobilier au Maroc`, puis verrouiller le standard approuvé contre les futurs polishes silencieux.

### Succès observable

- H1 exact conservé ;
- recherche seule dominante dans le hero ;
- structure approuvée respectée ;
- aucune réintroduction d’Intelligence, listings génériques ou `/compagnon` ;
- exactement 3 actions finales ;
- 390 / 768 / 1280 sans overflow ni finding ;
- anciens HVR alignés sur le standard courant ;
- invariants L0 détectables par CI.

### Preuve BEFORE / candidat

Même HEAD avant implémentation : `6a98a89ed6546d277fe2b4f778b0e6873e5b3cd8`.

- BEFORE run `34700265162` — SUCCESS ;
- candidate run `34700265148` — SUCCESS ;
- Product Constitution self-check `34700265182` — SUCCESS ;
- CI Efficiency Policy `34700265219` — SUCCESS ;
- Vercel : 0 ;
- DB : 0 write.

Hauteurs mesurées avant implémentation :

| Viewport | BEFORE | Candidate | Écart |
|---|---:|---:|---:|
| 390 | 4489 px | 3412 px | -24,0 % |
| 768 | 4983 px | 3041 px | -39,0 % |
| 1280 | 3171 px | 2478 px | -21,9 % |

### Décisions L0 exactes

1. Le H1 exact `1er moteur de recherche immobilier au Maroc` est intangible.
2. Le moteur domine seul le hero ; aucun `HomeIntelligencePanel` concurrent dans le hero.
3. La photo/identité hero actuelle est conservée :
   - `/images/hero/akar-residence-sunset-desktop.webp`
   - `/images/hero/akar-residence-sunset-mobile.webp`
4. Un trust-strip est placé immédiatement sous le hero.
5. `Vivre ici` est le bloc suivant ; sa position est L0 mais **son implémentation visuelle interne reste flexible** jusqu’au freeze MapLibre dédié.
6. La HOME V1 ne rend pas `HomeListingsSection`. Une future réintroduction exige des visuels réels/conformes et une nouvelle validation L0.
7. Les villes populaires sont compactes et secondaires.
8. La fin de page contient exactement 3 actions produit :
   - `/mon-projet` — Préparer mon projet ;
   - `/vendre` — Vendre / Estimer ;
   - `/pro` — Agences & promoteurs.
9. Aucun CTA HOME ne doit revenir vers le legacy `/compagnon`.
10. Header et footer sont hors freeze P1. Leur architecture reste gouvernée par P2.

### Ordre L0

`Hero → Trust strip → Vivre ici → Villes populaires → 3 actions`

Header/footer existent autour de cette séquence mais ne sont pas figés par P1.

### Machine contract

`config/product-constitution.json` verrouille :

- H1 et photos hero ;
- mode `search-only-v1` ;
- absence du panneau Intelligence ;
- ordre des blocs HOME ;
- absence de `HomeListingsSection` ;
- villes `compact-v1` ;
- absence `/compagnon` ;
- 3 actions et routes exactes.

Le guard supporte `contains_exact`, `not_contains_exact`, `ordered_contains_exact` et `count_exact`.

### Preuve AFTER — product tree exact

Le runtime HOME certifié correspond au product tree :

`19d8da53b1d4b40ce8a19676d009af62f60f012d`

Run visuel exact : `34702315678` — SUCCESS.  
Artifact : `10300675974` — `p1-home-after-34702315678`.  
Digest : `sha256:79dc9193a96ca7321251f737bf182de505be36da0f85bb967a71e59ecd72e673`.

Rapport AFTER :

| Viewport | AFTER | BEFORE → AFTER |
|---|---:|---:|
| 390 × 844 | 3432 px | -23,5 % |
| 768 × 1024 | 3013 px | -39,5 % |
| 1280 × 900 | 2471 px | -22,1 % |

Pour les 3 viewports :

- `findingCount = 0` ;
- `failedResponses = []` ;
- `consoleErrors = []` ;
- `scrollWidth = clientWidth` ;
- `h1Count = 1` ;
- `mainCount = 1` ;
- `homeListingsCount = 0` ;
- `homeActionCount = 3` ;
- `legacyCompagnonLinks = 0` ;
- `intelligencePanelCount = 0` ;
- H1 exact conservé.

### Convergence des contrats historiques

Les anciens HVR avaient eux-mêmes dérivé en défendant des décisions désormais rejetées : panneau Intelligence, `/compagnon`, quatre actions, listings HOME et anciennes copies de villes.

Ils ont été migrés vers HOME V1 sans affaiblir les contrôles de vérité/data.

Preuves finales sur le HEAD test/audit `c66bd487d81b4705f7bb781b8d4c5a8ab9a4b64b` :

- HVR-4 Neighborhood Action Proof run `34707890534` — SUCCESS ;
- HVR-6 Final Homepage Benchmark Proof run `34707890542` — SUCCESS ;
- Product Constitution Self Check run `34707890481` — SUCCESS ;
- Home P1 Approved Hero V1 run `34707890513` — SUCCESS ;
- Phase 1 P1 Home Proof Gate run `34707890556` — SUCCESS ;
- Phase 1 P1 User Journey Gate run `34707890532` — SUCCESS ;
- UI All Pages Inventory run `34707890522` — SUCCESS ;
- CI Workflow Efficiency Policy run `34707890521` — SUCCESS.

Les commits postérieurs au product tree ne modifient que tests/audits/contrats historiques ; ils ne changent pas le runtime HOME certifié.

### Comparaison + score visuel

**Score HOME V1 : 9,1 / 10.**

Justification :

- hiérarchie search-first nettement renforcée ;
- hauteur totale réduite de 22 à 40 % selon viewport ;
- aucune perte des invariants L0 ;
- aucun overflow ou finding automatisé ;
- cohérence desktop/tablette/mobile acquise.

**Réserve mineure non bloquante :** à 390 px, la bottom-nav mobile peut visuellement empiéter sur le bas du premier viewport et réduire la respiration autour du troisième signal du trust-strip. Ce point appartient au standard navigation/mobile P2 et ne justifie pas de rouvrir HOME V1.

**Conclusion P1 : CLOSED.** Aucun futur polish HOME ne peut modifier les décisions L0 ci-dessus sans procédure d’override explicite.

---

## 6. MAP / VIVRE ICI — ÉTAT DE RÉFÉRENCE

Handover dédié : `docs/handovers/2026-09-11-vivre-ici-maplibre-handover.md`.

État déjà prouvé dans ce chantier : architecture MapLibre retenue, standard visuel final 9,0/10, passe plus lumineuse rejetée.

**Règle :** aucune rupture silencieuse du moteur, du TARGET ou d’un paramètre explicitement gelé. La preview HOME reste volontairement flexible jusqu’à son intégration au standard MapLibre canonique.

---

## 7. PROTOCOLE D’APPROBATION L0

Propriétaire : `hraaaaf`.

Pour une PR qui modifie un L0 :

1. la PR déclare le standard concerné ;
2. la CI détecte l’écart ;
3. canonique + manifeste sont mis à jour ;
4. approbation explicite propriétaire sur le HEAD exact ;
5. tout nouveau HEAD invalide l’approbation précédente.

Implémentation cible :

- manifeste : `config/product-constitution.json` ;
- guard : `scripts/governance/product-constitution-guard.mjs` ;
- tests : `scripts/governance/product-constitution-guard.test.mjs` ;
- self-check : `.github/workflows/product-constitution-self-check.yml` ;
- gate autoritaire : `.github/workflows/product-constitution-gate.yml` ;
- Environment GitHub cible : `product-standard-approval`, reviewer requis `hraaaaf`.

### Limite actuelle

Le gate autoritaire n’est pas encore dans `main`; sa preuve réelle `BLOCK → APPROVE → nouveau HEAD re-BLOCK` doit être faite après intégration du gate et configuration de l’Environment.

---

## 8. ROADMAP

### P0 — Fondation de gouvernance — EN COURS

- [x] audit architecture initiale ;
- [x] benchmark international initial ;
- [x] canonique + manifeste ;
- [x] guard local + tests ;
- [x] workflow CI anti-dérive ;
- [x] règle validation propriétaire → L0 ;
- [x] self-check Constitution vert sur HEAD de closeout P1 ;
- [ ] configurer Environment `product-standard-approval` — human/admin gate ;
- [ ] prouver BLOCK / APPROVE / nouveau HEAD ;
- [ ] protéger `main` avec le check requis — human/admin gate.

### P1 — HOME STANDARD V1 — CLOSED

- [x] audit code HOME ;
- [x] benchmark structurel international ;
- [x] benchmark premium ciblé ;
- [x] BEFORE 390 / 768 / 1280 ;
- [x] mockup candidate ;
- [x] comparaison ;
- [x] accord explicite propriétaire ;
- [x] promotion des décisions en L0 ;
- [x] implémentation HOME V1 ;
- [x] AFTER 390 / 768 / 1280 ;
- [x] tests + score visuel ;
- [x] migration des HVR historiques ;
- [x] closeout P1.

### P2 — INFORMATION ARCHITECTURE V1 — CLOSEOUT CI

- [x] inventaire machine-readable majeur ;
- [x] classification primary / secondary / SEO / utility / legacy / internal ;
- [x] doublons/legacy structurants identifiés ;
- [x] divergence des taxonomies header desktop/search/mobile identifiée ;
- [x] décision route quartier canonique ;
- [x] ownership conceptuel `/promoteurs` → Pro et `/projets/[slug]` → Neuf ;
- [x] décision de conservation des routes legacy jusqu’à audit exhaustif ;
- [x] navigation desktop/search/mobile unique ;
- [x] accord explicite propriétaire ;
- [x] promotion L0 ;
- [x] BEFORE / AFTER 15 routes × 3 viewports ;
- [x] score visuel/structurel 9,3/10 ;
- [x] manifeste IA v0.6.0 ;
- [ ] derniers gates runtime bottom-nav verts sur HEAD final ;
- [ ] closeout PR / merge si gouvernance P0 le permet.

### P3 — SEARCH STANDARD V1

- [ ] audit /search ;
- [ ] freeze layout/filtres/cards/map bridge/continuity ;
- [ ] tests responsive ;
- [ ] accord + L0.

### P4 — VIVRE ICI / MAP STANDARD V1

- [ ] intégrer l’état MapLibre final ;
- [ ] figer moteur/providers/navigation/TARGET ;
- [ ] CI anti-régression ;
- [ ] promotion L0.

### P5 — INTENT HUBS / NEUF / VENDRE / PRO

- [ ] audit ;
- [ ] benchmark ;
- [ ] standards ;
- [ ] accord ;
- [ ] freeze + CI.

### P6 — HARDENING

- [ ] ruleset/branch protection ;
- [ ] checks requis ;
- [ ] tests de contournement ;
- [ ] documentation agent ;
- [ ] closeout canonique.

---

## 9. RÈGLES D’EXÉCUTION

- aucun déploiement Vercel sans autorisation explicite ;
- aucune écriture DB liée à ce chantier sans gate séparé ;
- aucune modification UI sans BEFORE/AFTER aux mêmes viewports ;
- aucune rupture L0 par simple polish ;
- si deux canoniques se contredisent, le plus spécialisé gouverne son périmètre ;
- aucune déclaration `DONE`, `CERTIFIED`, `10/10` sans preuve observable.

---

## 10. ÉTAT DE CHANTIER

- repo : `hraaaaf/Akarfinder` ;
- branche : `audit/p2-ia-screens-20260912` ;
- PR : `#1031` ;
- P1 HOME product tree certifié : `19d8da53b1d4b40ce8a19676d009af62f60f012d` ;
- P2 IA product tree certifié visuellement : `13150e1ccb3068270b55b5dfb830ba777e50ca70` ;
- P2 BEFORE : `34709783962` ✅ ;
- P2 AFTER : `34756822484` ✅ ;
- P2 AFTER artifact : `10317087695` ;
- Product Constitution Self Check sur le closeout précédent : `34757721781` ✅ ;
- Phase 1 P1 Search Truth : `34757721919` ✅ ;
- Phase 1 P2 Residual Closure : `34757721892` ✅ ;
- Vercel : 0 ;
- DB : 0 write.

## 11. NEXT EXACT

1. Vérifier une fois les deux certifications runtime bottom-nav après migration de leurs audits.
2. Si vertes, marquer P2 CLOSED et mettre à jour la PR #1031 avec les preuves finales.
3. Ne plus modifier l’IA V1 hors override L0 explicite.
4. P0 reste bloqué sur les actions admin humaines GitHub : Environment `product-standard-approval`, preuve post-merge du gate et protection `main`.
5. Ne pas merger si ces conditions rendent l’intégration du gate non sûre.
6. Aucun déploiement Vercel sans autorisation explicite.
