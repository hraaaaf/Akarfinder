# AKARFINDER — PRODUCT CONSTITUTION / CANONICAL

**Version : 0.4 — 2026-09-12**  
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

## 4. ARCHITECTURE PRODUIT — CANDIDATE V0.2

**Statut : REVIEW.** Aucun freeze global IA n’est encore accordé.

Inventaire machine-readable : `config/product-route-inventory.json`.

### Navigation primaire candidate

1. Acheter
2. Louer
3. Neuf
4. Vivre ici
5. Vendre
6. Pro

### Rôles vérifiés

- `/` : moteur d’entrée + preuve de valeur + accès aux parcours majeurs ;
- `/search` : moteur unique de résultats, filtres et comparaison ;
- `/listings/[id]` : détail interne seulement si la politique source l’autorise ;
- `/acheter`, `/louer`, `/neuf` : hubs d’intention ;
- `/map` : Vivre ici / intelligence géographique ;
- `/vendre` : parcours vendeur ;
- `/pro` : hub professionnels ;
- `/mon-projet` : parcours projet canonique ;
- `/immobilier` + ville/quartier/intention : couche géographique/SEO canonique.

### Legacy vérifié

- `/compagnon` → `/mon-projet` ;
- `/profil-recherche` → `/mon-projet` ;
- `/onboarding` = compatibilité legacy ;
- `/quartiers` → `/immobilier` ;
- doublon restant à arbitrer : `/quartiers/[city]/[quartier]` vs `/immobilier/[city]/[district]`.

### Pro / secondaire

- `/pro/agences` sous Pro ;
- `/promoteurs` appartient fonctionnellement à Pro mais URL à arbitrer ;
- `/professionnels/[slug]` = détail public, pas hub ;
- `/projets/[slug]` = détail programme neuf, pas hub ;
- `/pro/analytics`, `/pro/alerts` = internes/noindex ;
- `/investir`, `/credit`, `/mre`, `/compare`, `/favorites` = secondaires.

---

## 5. HOME STANDARD V1 — OWNER APPROVED / L0

**Validation explicite propriétaire : 2026-09-12.**  
Le message `Ok go` suivant la liste exacte des 10 décisions P1 vaut validation de ce périmètre.

### Preuve BEFORE / candidat

Même HEAD de branche avant implémentation : `6a98a89ed6546d277fe2b4f778b0e6873e5b3cd8`.

- BEFORE run `34700265162` — SUCCESS — artifact `10299508661` ;
- candidate run `34700265148` — SUCCESS — artifact `10300191918` ;
- Product Constitution self-check `34700265182` — SUCCESS ;
- CI Efficiency Policy `34700265219` — SUCCESS ;
- Vercel : 0 ;
- DB : 0 write.

Hauteurs mesurées :

| Viewport | BEFORE | Candidate | Écart |
|---|---:|---:|---:|
| 390 | 4489 px | 3412 px | -24,0 % |
| 768 | 4983 px | 3041 px | -39,0 % |
| 1280 | 3171 px | 2478 px | -21,9 % |

Les deux jeux de captures : H1 exact, 1 seul H1, 1 seul main, 0 overflow horizontal, 0 finding.

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

`config/product-constitution.json` v0.4.0 verrouille :

- H1 et photos hero ;
- mode `search-only-v1` ;
- absence du panneau Intelligence ;
- ordre des blocs HOME ;
- absence de `HomeListingsSection` ;
- villes `compact-v1` ;
- absence `/compagnon` ;
- 3 actions et routes exactes.

Le guard supporte désormais `contains_exact`, `not_contains_exact`, `ordered_contains_exact` et `count_exact`.

### État implémentation

**EN COURS DE CERTIFICATION.** Le code HOME V1 est préparé ; le lot ne sera déclaré fermé qu’après AFTER 390/768/1280, tests, comparaison et score.

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
- [x] self-check Constitution vert sur HEAD de preuve P1 ;
- [ ] configurer Environment `product-standard-approval` — human/admin gate ;
- [ ] prouver BLOCK / APPROVE / nouveau HEAD ;
- [ ] protéger `main` avec le check requis — human/admin gate.

### P1 — HOME STANDARD V1 — CERTIFICATION EN COURS

- [x] audit code HOME ;
- [x] benchmark structurel international ;
- [x] benchmark premium ciblé ;
- [x] BEFORE 390 / 768 / 1280 ;
- [x] mockup candidate ;
- [x] comparaison ;
- [x] accord explicite propriétaire ;
- [x] promotion des décisions en L0 ;
- [x] implémentation HOME V1 préparée ;
- [ ] AFTER 390 / 768 / 1280 ;
- [ ] tests + score visuel ;
- [ ] closeout P1.

### P2 — INFORMATION ARCHITECTURE V1 — EN COURS

- [x] inventaire machine-readable majeur ;
- [x] classification primary / secondary / SEO / utility / legacy / internal ;
- [x] doublons/legacy structurants identifiés ;
- [ ] audit complet des callers/liens legacy ;
- [ ] décision finale `/quartiers/[...]/[...]`, `/promoteurs`, namespace `/projets/[slug]`, `/onboarding` ;
- [ ] navigation desktop/mobile unique ;
- [ ] accord explicite ;
- [ ] promotion L0 ;
- [ ] freeze IA V1 + CI.

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
- branche : `chore/product-constitution-v1` ;
- PR : `#1030` — draft ;
- base : `main@df8b8d9a493553d5fa39ea8b0fa0ee789cf71ee2` ;
- HEAD preuve BEFORE/candidate : `6a98a89ed6546d277fe2b4f778b0e6873e5b3cd8` ;
- BEFORE : `34700265162` ✅ ;
- candidate : `34700265148` ✅ ;
- Constitution : `34700265182` ✅ ;
- Efficiency : `34700265219` ✅ ;
- Vercel : 0 ;
- DB : 0 write.

## 11. NEXT EXACT

1. Commit atomique HOME V1 + manifest v0.4 + guard renforcé + workflow AFTER.
2. Vérifier une fois CI ; si échec, diagnostiquer/corriger.
3. Récupérer AFTER 390 / 768 / 1280 et comparer au BEFORE.
4. Scorer HOME V1 et fermer P1 si toutes les preuves sont acquises.
5. Continuer P2 pendant toute CI indépendante.
