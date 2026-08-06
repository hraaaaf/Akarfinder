# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-06**  
**Statut : consolidation UX publique en cours, moteur ODM actif, priorité parallèle qualité DATA**

Ce fichier est l’unique roadmap du projet. `README.md` définit l’identité et la doctrine ; `docs/SESSION.md` porte uniquement le handover courant.

## 1. Cap produit

AkarFinder est un **moteur de recherche immobilier, un index national et une couche d’intelligence pour le marché marocain**.

- cœur produit : `/search` ;
- objectif long terme : **Property Graph du marché immobilier marocain** ;
- provenance, fraîcheur, qualité et divergences restent explicables ;
- aucune fonctionnalité publique ne doit prétendre exploiter une donnée absente.

Pipeline canonique :

`DISCOVERY → INGESTION / OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION / CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION / SERP`

## 2. Doctrine non négociable

- no-bypass absolu ;
- Source Registry avant activation ;
- aucune donnée, image, coordonnée ou relation partenaire inventée ;
- migrations séparées du code applicatif ;
- une responsabilité, une branche, une PR et un merge par lot ;
- aucune nouvelle roadmap ou session concurrente ;
- Search reste le moteur canonique des parcours publics.

## 3. État acquis

### UX publique consolidée ✅

- **Vendre** : terminé ;
- **Accueil P1** : certifié et mergé via PR #299 ;
- **Neuf P1** : certifié 390 / 768 / 1280, score **9,1/10** ;
- **Acheter P1** : certifié et mergé via PR #312, score **9,1/10** ;
- **Louer P1** : certifié et mergé via PR #313, score **9,0/10** ;
- **Mon Projet P1A** : parcours guidé en huit écrans, certifié et mergé via PR #314, score **9,2/10**.

### Fondation DATA acquise ✅

- Observation Ledger ;
- Freshness/Lifecycle ;
- normalisation et quality tiers ;
- display eligibility ;
- Source Registry ;
- Market Index / fondation Property Graph ;
- dédoublonnage conservant les observations ;
- activation progressive ODM certifiée.

## 4. Lot actif — MON-PROJET-P1B 🟡

Objectif : conserver le contexte du projet actif jusque dans Search et rendre visible la continuité réelle, sans modèle ni stockage parallèle.

Livré dans la PR #315 :

- lecture du `project_id` canonique transmis par Mon Projet ;
- bandeau compact **Projet actif** dans `/search` ;
- projet affiché uniquement s’il appartient à l’utilisateur authentifié, est actif et possède un profil V2 structuré ;
- résumé objectif, zone et budget ;
- compteurs réels de favoris et comparaisons filtrés par `project_id` ;
- accès direct à `/mon-projet/espace` ;
- absence de bandeau si le projet est absent, invalide ou inaccessible ;
- aucune migration, aucun `localStorage`, aucune clé service-role côté navigateur ;
- contrat intégré à `User Continuity V1`.

Hors périmètre P1B : modifier le projet directement dans Search, retirer explicitement le projet actif, écrire de nouvelles actions favoris/comparaison depuis les cartes et toute refonte générale de la SERP.

## 5. Séquence UX publique validée

1. **MON-PROJET-P1B** — CI complète, certification, documentation et merge PR #315 ;
2. **Carte / Quartier** — audit, questions, usage réel, densité DATA et lisibilité mobile ;
3. **Pro / Agences / Promoteurs** — pages publiques et activation professionnelle ;
4. **Immobilier / SEO** — villes, quartiers et intentions avec contenu utile ;
5. **recette SERP + fiche bien** — cohérence finale sans refonte gratuite.

## 6. Séquence DATA prioritaire

1. B3.4.4 — déduplication et change detection ;
2. B3.4.5 — quarantaine et revue ;
3. B3.4.6 — publication Canary bornée ;
4. B3.5 — Professional Workspace ;
5. profondeur de vraies pages `LISTING` ;
6. vérité prix / surface / géographie ;
7. fraîcheur et lifecycle par source ;
8. Property Graph et déduplication V3.

## 7. Définition de terminé

Un lot est terminé uniquement si :

- périmètre respecté ;
- code et documentation alignés ;
- tests ciblés, TypeScript et build verts ;
- CI complète sans régression pertinente ;
- preuves visuelles ou DATA disponibles ;
- workflow temporaire supprimé ;
- PR mergée ;
- `SESSION.md` réécrit avec la prochaine action exacte.

## 8. Prochaine action exacte

1. terminer la relance des gates P1B affectés par l’incident GitHub Actions `Service Unavailable` ;
2. corriger uniquement une éventuelle régression réelle ;
3. certifier le bandeau Projet actif dans Search ;
4. merger la PR #315 dans `main` ;
5. lancer l’audit Carte / Quartier avec questions avant tout code.