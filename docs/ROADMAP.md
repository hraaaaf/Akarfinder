# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-06**  
**Statut : consolidation UX publique en cours, moteur ODM actif, priorité parallèle qualité DATA**

Ce fichier est l’unique roadmap du projet. Les anciens plans, ledgers, fichiers `NEXT`, roadmaps SEO et programmes UX sont des preuves historiques ou des spécifications non canoniques.

## 1. Cap produit

AkarFinder est un **moteur de recherche immobilier, un index national et une couche d’intelligence pour le marché marocain**.

- cœur produit : `/search` ;
- objectif long terme : **Property Graph du marché immobilier marocain** ;
- une propriété potentielle peut regrouper plusieurs observations ;
- provenance, fraîcheur, qualité et divergences doivent rester explicables.

Pipeline canonique :

`DISCOVERY → INGESTION / OBSERVATION → NORMALIZATION → CANONICALIZATION → FRESHNESS → DEDUPLICATION / CLUSTERING → ENRICHMENT → INTELLIGENCE → DISPLAY ELIGIBILITY → RANKING → PUBLICATION / SERP`

## 2. Doctrine non négociable

- no-bypass absolu ;
- Source Registry avant activation ;
- aucune publication depuis Discovery ou Thin Index sans eligibility ;
- aucune donnée, image, coordonnée ou relation partenaire inventée ;
- vraies photos autorisées prioritaires sur les fallbacks ;
- migrations additives, réversibles et séparées du code applicatif ;
- `Shadow → Canary → certification → activation bornée` ;
- une responsabilité principale, une branche, une PR et un merge par lot ;
- toute décision UX/UI structurante est discutée avant développement.

## 3. État acquis

### Produit public et cœur Search ✅

- application publique active ;
- `/search` reste le moteur central ;
- routage public ODM certifié jusqu’à 100 % ;
- fallback et rollback conservés ;
- display eligibility, provenance et quarantaine du bruit intégrés ;
- SERP et fiche bien constituent déjà les surfaces publiques les plus solides.

Les chiffres DATA, déploiements et activations datés restent dans leurs preuves techniques. Ils ne doivent pas être recopiés ici comme vérités permanentes.

### UX publique consolidée ✅

- **Vendre** : terminé ;
- **Accueil P1** : conçu, codé, certifié et mergé dans `main` via PR #299 ;
- **Neuf P1** : carte Programme fail-closed, responsive et certification visuelle réalisés ; score final **9,1/10** ;
- **Acheter P1** : parcours spécialisé codé sur PR #312, CI applicative verte et certification visuelle 390 / 768 / 1280 réussie ;
- **Louer** : prochain lot après merge de BUY-P1.

### Fondation DATA acquise ✅

- Observation Ledger ;
- Freshness/Lifecycle ;
- normalisation et quality tiers ;
- display eligibility ;
- Source Registry ;
- Market Index / fondation Property Graph ;
- dédoublonnage conservant les observations ;
- kit de feeds partenaires et politiques d’admission ;
- activation progressive ODM certifiée.

## 4. Lot actif — BUY-P1 🟢

Objectif : transformer `/acheter` en parcours d’achat spécialisé tout en conservant Search comme moteur canonique et sans modifier `/louer`.

Livré :

- Hero spécialisé ;
- recherche par zone, type, budget et projet ;
- raccourcis Résidence principale, Investissement, Neuf et Terrain ;
- typologies illustrées ;
- résultats réels avec carrousel mobile et grille desktop ;
- sections Habiter / Investir et Définir mon budget ;
- exploration villes / quartiers ;
- niveau d’information explicite ;
- CTA final ;
- aucune mensualité, aucun rendement et aucun frais inventés.

Certification : CI applicative verte, build production, route `/acheter`, captures 390 / 768 / 1280, aucun overflow, un seul H1 et un seul `main`, aucun ID dupliqué ni contrôle interactif sans nom.

## 5. Séquence UX publique validée

1. **Acheter P1** — finaliser documentation, supprimer le gate temporaire et merger PR #312 ;
2. **Louer P1** — parcours spécialisé, puis certification séparée ;
3. **Mon Projet / Compagnon** — continuité de décision et vérité des états ;
4. **Carte / Quartier** — usage réel, densité DATA et lisibilité mobile ;
5. **Pro / Agences / Promoteurs** — pages publiques et activation professionnelle ;
6. **Immobilier / SEO** — villes, quartiers et intentions uniquement avec contenu utile ;
7. **recette de cohérence SERP + fiche bien** — sans refonte gratuite du cœur déjà solide.

Aucune page n’est modifiée sans audit de l’existant et discussion section par section.

## 6. Séquence DATA prioritaire

Les lots DATA continuent sans créer de modèle parallèle :

1. **B3.4.4 — déduplication et change detection** ;
2. **B3.4.5 — file de quarantaine et revue** ;
3. **B3.4.6 — publication Canary bornée** ;
4. **B3.5 — Professional Workspace**, en consolidant les tables et flux existants ;
5. profondeur de vraies pages `LISTING` ;
6. vérité prix / surface / géographie ;
7. fraîcheur et lifecycle par source ;
8. Property Graph et déduplication V3 ;
9. certification nationale de profondeur et diversité.

### B3.5 — principe directeur

Avant toute modification : cartographier les structures existantes, notamment organisations, memberships, demandes d’activation, soumissions, projets, médias, ownership, leads, feeds partenaires, routes `/pro/*`, authentification et RLS.

Aucun nouveau modèle parallèle n’est créé lorsqu’une structure actuelle peut être consolidée.

## 7. Cibles

### Qualité publique

- parcours compréhensibles en quelques secondes ;
- mobile sans débordement ni longueur inutile ;
- aucun CTA fictif ;
- données manquantes affichées comme telles ;
- partenaires et promoteurs seulement après activation réelle.

### Qualité DATA

- augmenter les vraies pages annonce éligibles, pas le volume brut ;
- améliorer prix, surface, géographie, fraîcheur et diversité ;
- réduire la concentration par source ;
- viser **100 000+ représentations exploitables** sans sacrifier droit, provenance, fraîcheur, qualité ni dédoublonnage.

## 8. Ce qui reste interdit

- modèle parallèle inutile ;
- faux catalogue, faux programme ou faux partenaire ;
- badge marketing non prouvé ;
- contenu externe réutilisé sans droit ;
- collecte massive non gouvernée ;
- changement de ranking sans expérience contrôlée ;
- suppression d’un fallback avant certification ;
- nouvelle roadmap ou nouvelle session concurrente.

## 9. Définition de terminé

Un lot est terminé uniquement si :

- responsabilité et périmètre respectés ;
- code et documentation alignés ;
- tests ciblés, TypeScript et build verts ;
- CI complète sans régression pertinente ;
- migrations séparées et réversibles lorsqu’elles existent ;
- preuves disponibles pour les affirmations DATA ou UX ;
- PR mergée dans sa branche cible ;
- activation et Production distinguées du simple code disponible ;
- `SESSION.md` réécrit avec la prochaine action exacte.

## 10. Prochaine action exacte

1. supprimer le workflow temporaire BUY-P1 ;
2. recertifier le commit final ;
3. merger la PR #312 dans `main` ;
4. lancer RENT-P1 sur une branche et une PR séparées.
