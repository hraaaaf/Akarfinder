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
- **Louer P1** : certifié et mergé via PR #313, score **9,0/10**.

### Fondation DATA acquise ✅

- Observation Ledger ;
- Freshness/Lifecycle ;
- normalisation et quality tiers ;
- display eligibility ;
- Source Registry ;
- Market Index / fondation Property Graph ;
- dédoublonnage conservant les observations ;
- activation progressive ODM certifiée.

## 4. Lot actif — MON-PROJET-P1A 🟢

Objectif : transformer Mon Projet en parcours guidé clair, mobile-first et honnête, sans créer de modèle parallèle.

Livré dans le code :

- `/mon-projet` devient la route canonique du parcours ;
- `/compagnon` redirige vers `/mon-projet` ;
- l’espace de continuité existant est préservé sous `/mon-projet/espace` ;
- huit écrans visibles avec barre, numéro et intitulé ;
- objectif et usage regroupés ;
- zone et budget regroupés ;
- budget facultatif avec `Je ne sais pas encore` ;
- taxonomie visuelle adaptée à l’objectif ;
- contraintes indispensables extensibles ;
- six préférences principales puis `Voir plus` ;
- choix explicite de trois priorités ;
- compromis concrets ;
- synthèse humaine et grille technique ;
- sauvegarde invitée expliquée honnêtement ;
- persistance serveur conservée pour les utilisateurs authentifiés ;
- Search reste la destination finale.

Hors périmètre P1A : reprise automatique, projet actif dans Search, favoris et comparaison. Ces points appartiennent à **MON-PROJET-P1B**.

## 5. Séquence UX publique validée

1. **MON-PROJET-P1A** — certification finale et merge PR #314 ;
2. **MON-PROJET-P1B** — reprise réelle et projet actif dans Search ;
3. **Carte / Quartier** — usage réel, densité DATA et lisibilité mobile ;
4. **Pro / Agences / Promoteurs** — pages publiques et activation professionnelle ;
5. **Immobilier / SEO** — villes, quartiers et intentions avec contenu utile ;
6. **recette SERP + fiche bien** — cohérence finale sans refonte gratuite.

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

1. terminer la CI de MON-PROJET-P1A ;
2. supprimer le workflow visuel temporaire ;
3. recertifier le commit final ;
4. merger la PR #314 dans `main` ;
5. ouvrir MON-PROJET-P1B uniquement après clôture complète.