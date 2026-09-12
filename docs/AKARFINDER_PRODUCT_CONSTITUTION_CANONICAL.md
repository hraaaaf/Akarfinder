# AKARFINDER — PRODUCT CONSTITUTION / CANONICAL

**Version : 0.1 — 2026-09-12**  
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

## 4. ARCHITECTURE PRODUIT — CANDIDATE V0.1

Cette section est **EN REVIEW**. Elle ne devient `LOCKED` qu’après approbation explicite.

### Navigation primaire candidate

1. **Acheter**
2. **Louer**
3. **Neuf**
4. **Vivre ici**
5. **Vendre**
6. **Pro**

### Rôles des routes principales

- `/` : moteur d’entrée + preuve de valeur + accès aux parcours majeurs.
- `/search` : moteur unique de résultats, multi-source, filtres et comparaison.
- `/acheter` : hub d’intention achat, renvoie vers le moteur pour les recherches filtrées.
- `/louer` : hub d’intention location.
- `/neuf` : programmes/neuf.
- `/map` : **Vivre ici**, expérience géographique et intelligence quartier.
- `/vendre` : parcours propriétaire/vendeur.
- `/pro` : hub unique professionnels.
- `/listings/[id]` : fiche bien.
- `/immobilier/[ville]` et `/immobilier/[ville]/[quartier]` : surfaces SEO géographiques et contexte local.
- `/mon-projet` : continuité utilisateur/projet.
- `/favorites` : favoris.

### Routes/concepts à consolider

- `/professionnels` → sous `Pro` ;
- `/promoteurs` → sous `Pro` ou `Neuf` selon le rôle final ;
- `/projets` → sous `Neuf` ;
- `/quartiers` → sous `Vivre ici` ;
- `/compagnon`, `/profil-recherche`, `/onboarding` → sous `Mon Projet` si le benchmark final confirme cette cohérence ;
- `/investir`, `/credit`, `/mre`, `/compare` → secondaires, non concurrents de la navigation principale.

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
- garde : `scripts/governance/product-constitution-guard.mjs` ;
- tests : `scripts/governance/product-constitution-guard.test.mjs` ;
- self-check PR : `.github/workflows/product-constitution-self-check.yml` ;
- gate autoritaire : `.github/workflows/product-constitution-gate.yml` ;
- le gate autoritaire est conçu pour exécuter le garde depuis le code de confiance de `main` ;
- la candidate est lue comme donnée uniquement, sans `npm install` ni exécution de son code ;
- une rupture L0 exige une review GitHub `APPROVED` par `hraaaaf` au HEAD exact + mise à jour simultanée du canonique et du manifeste.

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
- [ ] obtenir self-check CI vert sur PR #1030 ;
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

### P2 — INFORMATION ARCHITECTURE V1

- [ ] inventaire complet des routes ;
- [ ] classification `primary / secondary / SEO / utility / legacy` ;
- [ ] consolidation des doublons ;
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
- HEAD avant synchronisation canonique : `6c1c19c96d679641f1d8f6571c0619b0d12036d0` ;
- self-check initial lancé : run `34689855511`, état observé `queued` ;
- Vercel : 0 action ;
- DB : 0 write.

## 11. NEXT EXACT

1. Vérifier le nouveau HEAD après cette synchronisation.
2. Vérifier une fois la CI de ce HEAD ; si pending, continuer l’inventaire de routes P2 sans attendre.
3. Corriger immédiatement tout échec du self-check.
4. Une fois les preuves P0 acquises, mettre à jour le body PR et sortir du draft.
5. Ne pas merger tant que le comportement autoritaire du gate n’est pas prouvable ou qu’un human/admin gate reste nécessaire.
