# AKARFINDER — PRODUCT CONSTITUTION / CANONICAL

**Version : 0.2 — 2026-09-12**  
**Statut : ACTIVE / EN CONSTRUCTION — aucun freeze global tant que les standards concernés ne sont pas explicitement approuvés par `hraaaaf`.**

> Ce fichier est la source canonique pour l’architecture produit, les standards de pages et les règles anti-dérive d’AkarFinder. Il complète `docs/ROADMAP.md`, qui reste la source globale de vérité pour l’avancement data/produit.

---

## 1. GOAL

Empêcher toute dérive silencieuse d’un standard produit déjà validé.

### Succès observable

- une architecture de pages explicite, versionnée et lisible humainement ;
- des standards `LOCKED`, `FLEXIBLE` et `FREE` clairement séparés ;
- aucun changement d’un standard `LOCKED` sans accord explicite de `hraaaaf` ;
- tout accord porte sur le **HEAD exact** de la PR ;
- toute nouvelle modification après accord invalide automatiquement cet accord ;
- la CI bloque les écarts mesurables au contrat ;
- les changements UI respectent `BEFORE → Goal → référence/mockup → implémentation → AFTER mêmes viewports → comparaison/tests → score`.

### Preuve attendue

- manifeste machine-readable du contrat ;
- tests/gates CI ;
- PR avec exact-head vérifié ;
- approbation explicite du propriétaire pour toute rupture de standard ;
- aucun déploiement Vercel sans autorisation explicite.

---

## 2. NORTH STAR PRODUIT

AkarFinder est un **moteur de recherche immobilier marocain**, pas un portail d’annonces classique.

### Positionnement HOME — LOCKED L0

Texte de référence :

> **1er moteur de recherche immobilier au Maroc**

Règle : ce positionnement est intangible par défaut. Toute modification exige un accord explicite de `hraaaaf` sur le HEAD exact de la PR.

### Principe d’expérience

`chercher → comparer → comprendre le quartier et le marché → vérifier la source → décider`

AkarFinder doit réduire la friction et la dispersion, pas multiplier les univers produit concurrents.

---

## 3. NIVEAUX DE GOUVERNANCE

### L0 — CONSTITUTIONNEL / LOCKED

Exemples :
- positionnement HOME ;
- architecture primaire des pages ;
- rôle des routes principales ;
- navigation primaire ;
- moteur cartographique retenu ;
- standards visuels ou fonctionnels explicitement gelés ;
- TARGETs visuels explicitement certifiés.

**Règle :** aucune rupture sans accord explicite de `hraaaaf` sur le HEAD exact.

### L1 — STANDARD PRODUIT / FLEXIBLE DANS L’ENVELOPPE

Exemples :
- densité, spacing, micro-polish ;
- copy secondaire ;
- détails de cards ;
- micro-interactions ;
- responsive tant que les invariants L0 sont respectés.

**Règle :** amélioration autorisée sans nouvel accord si elle reste objectivement dans le contrat déjà approuvé.

### L2 — LIBRE / FREE

Exemples :
- contenu dynamique ;
- SEO rédactionnel non structurel ;
- données ;
- corrections techniques sans impact produit ;
- tests et instrumentation.

---

## 4. ARCHITECTURE PRODUIT — CANDIDATE V0.2

Cette section est **EN REVIEW**. Elle ne devient `LOCKED` qu’après approbation explicite.

Inventaire machine-readable vérifié :

`config/product-route-inventory.json`

### Navigation primaire candidate

1. **Acheter**
2. **Louer**
3. **Neuf**
4. **Vivre ici**
5. **Vendre**
6. **Pro**

### Rôles vérifiés des surfaces centrales

- `/` : moteur d’entrée + preuve de valeur + accès aux parcours majeurs.
- `/search` : moteur unique de résultats, multi-source, filtres et comparaison.
- `/listings/[id]` : détail interne uniquement lorsque les règles d’accès source le permettent ; sinon redirection source ou fail-closed.
- `/acheter` : hub d’intention achat ; les recherches filtrées basculent vers `/search`.
- `/louer` : hub d’intention location ; les recherches filtrées basculent vers `/search`.
- `/neuf` : hub du neuf ; actuellement `noindex` tant que ses gates de publication ne sont pas satisfaites.
- `/map` : **Vivre ici**, expérience géographique et intelligence quartier.
- `/vendre` : hub vendeur cohérent autour d’un même dossier : publier / estimation indicative / accompagnement.
- `/pro` : hub professionnels.
- `/mon-projet` : parcours projet utilisateur canonique.
- `/favorites`, `/compare`, `/credit` : utilitaires décisionnels secondaires.

### Géographie / SEO — rôle vérifié

- `/immobilier` : racine géographique canonique.
- `/immobilier/[city]` : page ville canonique.
- `/immobilier/[city]/acheter` et `/immobilier/[city]/louer` : surfaces SEO d’intention, pas de nouveaux produits.
- `/immobilier/[city]/[district]` : page quartier canonique avec règles d’indexabilité.

### Pro — rôle vérifié

- `/pro/agences` : audience agences sous Pro.
- `/promoteurs` : audience promoteurs fonctionnellement sous Pro, mais URL actuellement top-level et indexée ; consolidation d’URL à arbitrer.
- `/professionnels/[slug]` : détail public d’un professionnel ; **ce n’est pas un hub concurrent** et il n’existe pas de page index `/professionnels`.
- `/projets/[slug]` : détail d’un programme neuf ; **ce n’est pas un hub concurrent** et il n’existe pas de page index `/projets`.
- `/pro/analytics`, `/pro/alerts` : surfaces internes restreintes/noindex, exclues de l’architecture publique.
- `/pro/leads` : ancienne surface interne déjà retirée vers `/pro#contact`.

### Legacy / doublons vérifiés

- `/compagnon` → redirection permanente vers `/mon-projet`.
- `/profil-recherche` → redirection permanente vers `/mon-projet`; le code déclare explicitement Mon Projet comme destination canonique.
- `/onboarding` → routeur legacy de compatibilité vers `/mon-projet` ou `/accompagnement?intent=neuf`.
- `/quartiers` → redirection permanente vers `/immobilier`.
- **Point ouvert important :** `/quartiers/[citySlug]/[neighborhoodSlug]` rend encore une page quartier parallèle alors que `/immobilier/[city]/[district]` est la surface canonique. Consolidation à faire après audit des liens, SEO et compatibilité.

### Secondaire / institutionnel — rôle vérifié

- `/investir`, `/credit`, `/mre`, `/compare`, `/favorites` : secondaires, non concurrents de la navigation principale.
- `/alerts` : fonctionnalité publique non active ; la page dit explicitement que les notifications automatiques ne sont pas encore activées. Ne pas promouvoir comme pilier produit.
- `/accompagnement` : formulaire d’accompagnement humain distinct de Mon Projet ; rester secondaire.
- `/a-propos`, `/comment-ca-marche`, `/faq`, `/contact`, `/demande-retrait`, `/conditions-utilisation`, `/politique-confidentialite` : institutionnel / aide / trust / légal, hors navigation produit primaire.
- `/demo/*`, `/visual-qa/*` : harnesses internes, exclus de l’architecture produit.

---

## 5. HOME STANDARD — CANDIDATE V0.1

### H0 — HERO — LOCKED PARTIEL

**LOCKED maintenant :**
- H1 exact : `1er moteur de recherche immobilier au Maroc` ;
- moteur de recherche = action dominante du premier écran ;
- tabs `Acheter / Louer / Neuf` conservés comme intention primaire.

**Candidate à approuver :**
- supprimer le panneau `AkarFinder Intelligence` du hero ;
- rendre la barre de recherche plus dominante ;
- faire refléter dans le placeholder la vraie puissance du parser naturel ;
- réduire les micro-promesses à trois signaux lisibles ;
- déplacer `Construire mon projet` hors du hero.

### Ordre HOME candidat

1. **Hero / moteur**
2. **Trust strip** — multi-source / source / fraîcheur / marché & quartiers
3. **Vivre ici** — preview du standard MapLibre validé
4. **Biens** — uniquement si données/visuels suffisamment riches
5. **Villes populaires** — compactes
6. **Actions** — `Préparer mon projet / Vendre-Estimer / Professionnels`
7. **Footer**

### Règles candidates

- ne pas répliquer `Rechercher un bien` en bas de page si le moteur principal le fait déjà ;
- ne pas afficher de section de biens premium si elle n’a que des illustrations génériques ;
- `Vivre ici` doit réutiliser le standard MapLibre validé, pas créer une variante locale de la map ;
- aucun composant secondaire ne doit visuellement concurrencer le H1 + moteur dans le premier viewport.

---

## 6. MAP / VIVRE ICI — ÉTAT DE RÉFÉRENCE

Le chantier MapLibre possède déjà un handover dédié :

`docs/handovers/2026-09-11-vivre-ici-maplibre-handover.md`

État prouvé dans ce handover : standard visuel final `9,0/10`, passe plus lumineuse testée puis rejetée, architecture MapLibre retenue.

**Règle :** aucun futur “polish” ne doit rouvrir implicitement ce standard. Toute rupture du moteur, du TARGET ou d’un paramètre explicitement gelé doit passer par l’approbation L0.

---

## 7. PROTOCOLE D’APPROBATION

### Propriétaire de standard

`hraaaaf`

### Approbation valide

Pour une PR qui modifie un standard L0 :

1. la PR doit déclarer quel standard change ;
2. la CI doit détecter l’impact ;
3. la PR reste bloquée tant que `hraaaaf` n’a pas explicitement approuvé ;
4. l’approbation doit correspondre au **HEAD SHA exact** ;
5. tout commit ultérieur rend l’approbation obsolète ;
6. aucune checkbox ou texte ajouté par l’agent dans la PR ne vaut approbation propriétaire.

### Implémentation CI

- manifeste machine-readable versionné : `config/product-constitution.json` ;
- inventaire architecture : `config/product-route-inventory.json` ;
- garde : `scripts/governance/product-constitution-guard.mjs` ;
- tests : `scripts/governance/product-constitution-guard.test.mjs` ;
- self-check PR : `.github/workflows/product-constitution-self-check.yml` ;
- gate autoritaire : `.github/workflows/product-constitution-gate.yml` ;
- le gate autoritaire est conçu pour exécuter le garde depuis le code de confiance de `main` ;
- la candidate est lue comme donnée uniquement, sans `npm install` ni exécution de son code ;
- une rupture L0 exige une review GitHub `APPROVED` par `hraaaaf` au HEAD exact + mise à jour simultanée du canonique et du manifeste.

### Limite actuelle vérifiée

Le workflow autoritaire n’est pas encore présent dans `main`; son comportement `pull_request_target` ne peut donc pas être certifié dans la PR qui l’introduit. La preuve négative/override doit être exécutée dans une PR contrôlée **après** intégration du gate dans `main`.

---

## 8. ROADMAP

### P0 — Fondation de gouvernance — EN COURS

- [x] audit architecture initiale ;
- [x] benchmark international initial ;
- [x] création du canonique Product Constitution ;
- [x] créer manifeste machine-readable ;
- [x] créer guard local testable ;
- [x] créer workflow CI anti-dérive ;
- [x] créer tests négatifs H1 / moteur / exact-head / symlink ;
- [x] self-check CI prouvé vert sur PR #1030 : run `34690296683`, HEAD `44462c74018acf180de8578c1b8526c2ddd760db` ;
- [ ] obtenir self-check vert sur le HEAD final de la PR après cette synchronisation canonique ;
- [ ] prouver que la CI autoritaire bloque une rupture non approuvée après présence du gate sur `main` ;
- [ ] prouver qu’un exact-head approval propriétaire débloque seulement le HEAD approuvé ;
- [ ] protéger `main` avec le check requis — human/admin gate si nécessaire.

### P1 — HOME STANDARD V1

- [x] audit code HOME ;
- [x] benchmark structurel international ;
- [x] H1 déclaré LOCKED ;
- [ ] capture BEFORE 390 / 768 / 1280 ;
- [ ] mockup/référence HOME candidate ;
- [ ] comparaison et décision des sections ;
- [ ] implémentation HOME ;
- [ ] captures AFTER mêmes viewports ;
- [ ] tests + score visuel ;
- [ ] accord explicite propriétaire ;
- [ ] freeze HOME V1.

### P2 — INFORMATION ARCHITECTURE V1 — EN COURS

- [x] inventaire machine-readable des surfaces publiques majeures + legacy + internes ;
- [x] classification `primary / secondary / SEO / utility / legacy / internal` ;
- [x] identifier les doublons/legacy structurants connus ;
- [ ] audit complet des callers/liens vers routes legacy ;
- [ ] décision finale sur `/quartiers/[...]/[...]`, `/promoteurs`, namespace `/projets/[slug]` et `/onboarding` ;
- [ ] navigation desktop/mobile unique ;
- [ ] accord explicite ;
- [ ] freeze IA V1 + CI.

### P3 — SEARCH STANDARD V1

- [ ] audit /search ;
- [ ] figer layout, filtres, cards, map bridge, pagination/continuity ;
- [ ] tests responsive ;
- [ ] accord explicite ;
- [ ] freeze SEARCH V1.

### P4 — VIVRE ICI / MAP STANDARD V1

- [ ] intégrer l’état MapLibre final dans la branche canonique concernée ;
- [ ] figer moteur, providers approuvés, navigation et TARGET ;
- [ ] définir ce qui reste flexible ;
- [ ] CI anti-régression ;
- [ ] accord explicite si le freeze final diffère du handover déjà approuvé.

### P5 — INTENT HUBS / NEUF / VENDRE / PRO

- [ ] audit ;
- [ ] benchmark ;
- [ ] standards ;
- [ ] accord ;
- [ ] freeze + CI.

### P6 — HARDENING

- [ ] branch/ruleset protection ;
- [ ] checks requis ;
- [ ] tests de contournement ;
- [ ] documentation agent ;
- [ ] closeout canonique.

---

## 9. RÈGLES D’EXÉCUTION

- aucun déploiement Vercel sans autorisation explicite ;
- aucune écriture DB liée à ce chantier sans gate séparé ;
- aucune modification UI sans BEFORE/AFTER aux mêmes viewports ;
- aucune rupture de standard `LOCKED` par un simple “polish” ;
- si un standard est ambigu, on l’affine avant de le figer ;
- si deux canoniques se contredisent, le plus spécialisé gouverne son périmètre, et cette Constitution gouverne l’architecture/anti-dérive ;
- aucune déclaration `DONE`, `CERTIFIED`, `10/10` sans preuve observable.

---

## 10. ÉTAT DE CHANTIER

- branche : `chore/product-constitution-v1` ;
- PR : `#1030` — draft ;
- base vérifiée au démarrage : `main@df8b8d9a493553d5fa39ea8b0fa0ee789cf71ee2` ;
- dernier HEAD avec self-check prouvé vert avant cette synchronisation : `44462c74018acf180de8578c1b8526c2ddd760db` ;
- preuve self-check : run `34690296683` — SUCCESS ;
- preuve workflow efficiency sur le même HEAD : run `34690296724` — SUCCESS ;
- autres checks observés sur ce HEAD : plusieurs encore `in_progress/queued` au dernier contrôle ;
- Vercel : 0 action ;
- DB : 0 write.

## 11. NEXT EXACT

1. Vérifier le nouveau HEAD produit par cette synchronisation.
2. Vérifier une fois le self-check du HEAD final ; corriger seulement s’il échoue.
3. Pendant les autres CI éventuelles, auditer les callers/liens des routes legacy pour préparer la décision IA V1.
4. Préparer le protocole de preuve post-merge du gate autoritaire sans merger automatiquement cette PR.
5. P1 HOME : obtenir BEFORE 390 / 768 / 1280 avant toute modification visuelle.
