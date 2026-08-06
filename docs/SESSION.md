# AkarFinder — Session courante

**Mise à jour : 2026-08-06**  
**Lot actif : BUY-P1 — parcours Acheter spécialisé**

Ce fichier est le handover opérationnel court du projet. L’historique détaillé reste dans Git, les PR, les rapports et les preuves techniques.

## Branche et PR actives

- branche : `ux/buy-p1-specialized-journey` ;
- PR vers `main` : **#312** ;
- dernier commit applicatif certifié : `169c84020772f971befd6793f4ee9ea1755b2915` ;
- workflow visuel temporaire ajouté puis à supprimer avant merge.

## État produit acquis

### Accueil P1 ✅

Hero, Market Pulse, Pourquoi AkarFinder, Preuves DATA, villes, intentions, carte quartier, Comment ça marche, MRE, CTA final, footer et responsive consolidés et mergés dans `main`.

### Neuf P1 ✅

Hero spécialisé, moteur Neuf, villes, typologies, carte Programme fail-closed, promoteurs partenaires, styles de vie préparés, timeline, pédagogie et CTA final. Certification 390 / 768 / 1280 px réalisée. Score UX/UI : **9,1/10**.

### Acheter P1 🟢

Implémentation terminée sur PR #312 :

- Hero spécialisé ;
- recherche par zone, type, budget et projet ;
- raccourcis Résidence principale, Investissement, Neuf et Terrain ;
- typologies illustrées ;
- aperçu de résultats réels ;
- carrousel mobile et grille desktop ;
- sections Habiter / Investir ;
- budget sans mensualité ou frais inventés ;
- exploration villes / quartiers ;
- niveau d’information explicite ;
- CTA final.

## Validations BUY-P1

- CI applicative : **18/18 verte** sur `169c8402` ;
- build production : vert ;
- certification visuelle temporaire : verte sur `8ebcba65` ;
- captures : 390 / 768 / 1280 px ;
- hauteurs mesurées : 6550 / 5755 / 4136 px ;
- overflow horizontal : 0 ;
- H1 : 1 ;
- `main` : 1 ;
- IDs dupliqués : 0 ;
- liens et boutons sans nom : 0 ;
- `/louer` non modifiée.

## Audit UX/UI BUY-P1

Score final estimé après inspection réelle : **9,1/10**.

Points forts : clarté du projet d’achat, recherche structurée, différence Habiter / Investir, transparence budgétaire et bonne cohérence mobile / desktop.

Limite non bloquante : Hero mobile dense, mais lisible et sans débordement. Aucun micro-changement supplémentaire n’est justifié avant retour utilisateur réel.

## Gouvernance documentaire

Les trois documents canoniques restent :

1. `README.md` ;
2. `docs/ROADMAP.md` ;
3. `docs/SESSION.md`.

Aucun autre Markdown ne pilote l’état courant.

## Blocages

Aucun blocage applicatif identifié. BUY-P1 doit encore :

- retirer son workflow visuel temporaire ;
- repasser la CI sur le commit final documentaire ;
- être mergé dans `main`.

## Prochaine action exacte

1. supprimer `.github/workflows/buy-p1-visual-certification.yml` ;
2. vérifier les gates du commit final ;
3. merger la PR #312 dans `main` ;
4. ouvrir RENT-P1 depuis le nouveau `main`.
