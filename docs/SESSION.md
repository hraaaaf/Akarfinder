# AkarFinder — Session courante

**Mise à jour : 2026-08-06**  
**Lot actif : DOC-CANONICAL-1 — boussole documentaire unique**

Ce fichier est un handover court. Il décrit uniquement l’état courant. L’historique détaillé reste dans Git, les PR, les rapports et les preuves techniques.

## Branche et PR actives

- branche : `ux/home-p1-hero-title-readability` ;
- PR consolidée vers `main` : **#299** ;
- état observé avant le lot documentaire : ouverte, mergeable ;
- la branche regroupe désormais les évolutions Accueil P1 et Neuf P1 ;
- aucune évolution de cette branche ne doit être annoncée comme livrée en Production avant merge, CI finale et déploiement vérifié.

## Derniers lots UX terminés

### Accueil P1 ✅

- Hero validé en conservant exactement « 1er moteur de recherche immobilier au Maroc » ;
- Market Pulse, Pourquoi AkarFinder, Preuves DATA, villes, intentions, carte quartier, Comment ça marche, MRE, CTA final et footer consolidés ;
- optimisation mobile réalisée ;
- dépendances fragiles aux animations supprimées ;
- audit visuel et gates responsive réalisés.

### Neuf P1 ✅

- Hero spécialisé et moteur Neuf ;
- villes, typologies et raccourcis ;
- carte Programme AkarFinder fail-closed ;
- aucun programme fictif publié ;
- états vides programmes et promoteurs partenaires ;
- styles de vie préparés sans classification inventée ;
- timeline Sur plan → En construction → Livré ;
- pédagogie, parcours Acheteur/Promoteur et CTA final ;
- captures certifiées en 390, 768 et 1280 px ;
- longueur mobile réduite d’environ 15 % ;
- score UX/UI final : **9,1/10** ;
- PR #306 mergée dans la branche consolidée.

## Audit Markdown réalisé

Source auditée : branche consolidée, snapshot initial `a9ac5823ea9b828b99beb39c2f9aba3a97e57622`.

- **202 fichiers Markdown** ;
- **36 614 lignes** ;
- contenu complet lu et inventorié ;
- workflow temporaire créé uniquement pour produire l’artefact d’audit.

### Classification

| Catégorie | Nombre | Action |
|---|---:|---|
| Documents canoniques | 3 | conserver et maintenir |
| Spécifications techniques globalement alignées | 76 | conserver comme références non canoniques |
| Preuves historiques / audits / activations | 92 | conserver, archiver progressivement |
| Documents techniques nécessitant une mise à jour | 21 | corriger par familles, sans mélanger les responsabilités |
| Doublons ou références opérationnelles obsolètes | 10 | proposer au retrait après validation |

### Trois documents canoniques

- `README.md` — identité et doctrine ;
- `docs/ROADMAP.md` — ordre d’exécution ;
- `docs/SESSION.md` — présent handover.

### Candidats au retrait après validation

- `docs/START.md` ;
- `docs/PRODUCT.md` ;
- `docs/UX_UI_MASTER_PROGRAM.md` ;
- `docs/UX_REFINEMENT_STATUS.md` ;
- `docs/SEO_ROADMAP.md` ;
- `docs/SESSION-P1-INTENT-HUBS.md` ;
- `docs/SESSION_DATA_PHASE_V2.md` ;
- `docs/PHASE1_P1_INTENT_HUBS_NEXT.md` ;
- `docs/CANONICAL_BASELINE.md` ;
- `docs/DOCUMENTATION_AUDIT_2026-08-03.md`.

Aucun de ces fichiers n’a encore été supprimé.

### Familles nécessitant une mise à jour

1. **Architecture et livraison** : architecture, déploiement, scraping ;
2. **Business et commercial** : business model, monétisation, go-to-market ;
3. **Professionnels et partenaires** : activation, pages partenaires, auth/ownership ;
4. **SEO** : fondation, villes/intention, quartiers ;
5. **Intelligence produit** : marché, quartier, fiche bien, Compagnon ;
6. **Design** : visual system, theme system, brand system ;
7. **DATA V2** : statut actuel ODM/Property Graph et séparation des preuves historiques.

## Décisions validées

- seulement trois documents de pilotage ;
- les autres Markdown peuvent rester comme spécifications ou preuves ;
- aucun document n’est supprimé sans lecture ;
- aucune preuve historique n’est présentée comme état courant ;
- aucun nouveau Markdown de roadmap, session, statut ou handover sans décision explicite ;
- pour chaque page UX, discussion avant code ;
- aucune décision produit structurante prise automatiquement.

## Blocages

- les 10 candidats au retrait nécessitent une validation explicite avant suppression ;
- les 21 documents à mettre à jour doivent être traités par familles et PR séparées si le périmètre devient trop large ;
- la PR #299 n’est pas encore mergée dans `main`.

## Prochaine action exacte

1. présenter le verdict documentaire et faire valider la liste des 10 suppressions ;
2. supprimer le workflow temporaire d’audit ;
3. mettre à jour les 21 références techniques par lots cohérents ;
4. recertifier et merger la PR #299 dans `main` ;
5. commencer l’audit Acheter / Louer, sans modification avant discussion.
