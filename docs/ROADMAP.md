# AKARFINDER — ROADMAP CANONIQUE

**Version : 2026-08-06**  
**Statut : consolidation UX publique en cours, moteur ODM actif, priorité parallèle qualité DATA**

Ce fichier est l’unique roadmap du projet. `README.md` définit l’identité et la doctrine ; `docs/SESSION.md` porte uniquement le handover courant.

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

### UX publique consolidée ✅

- **Vendre** : terminé ;
- **Accueil P1** : conçu, codé, certifié et mergé dans `main` via PR #299 ;
- **Neuf P1** : carte Programme fail-closed et certification 390 / 768 / 1280 ; score **9,1/10** ;
- **Acheter P1** : parcours spécialisé et certification 390 / 768 / 1280 ; score **9,1/10** ; PR #312 mergée dans `main` ;
- **Louer P1** : parcours spécialisé codé sur PR #313, certification visuelle en cours de clôture.

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

## 4. Lot actif — RENT-P1 🟢

Objectif : transformer `/louer` en parcours de location spécialisé tout en conservant Search comme moteur canonique.

Livré dans le code :

- Hero orienté quotidien et budget mensuel ;
- recherche par zone, type et budget mensuel ;
- état meublé / non meublé préparé mais non actif sans donnée fiable ;
- besoins Proche du travail, Famille, Meublé et Budget maîtrisé sans classification fictive ;
- typologies illustrées adaptées à la location ;
- résultats réels avec carrousel mobile et grille desktop ;
- sections Choisir une location adaptée et Loyer, charges et disponibilité ;
- exploration villes / quartiers ;
- niveau d’information explicite ;
- CTA final ;
- aucune charge, disponibilité ou courte durée inventée.

Définition de clôture : certification finale 390 / 768 / 1280, documentation alignée, workflow temporaire supprimé, CI complète verte et PR #313 mergée.

## 5. Séquence UX publique validée

1. **Louer P1** — terminer la certification et merger PR #313 ;
2. **Mon Projet / Compagnon** — continuité de décision et vérité des états ;
3. **Carte / Quartier** — usage réel, densité DATA et lisibilité mobile ;
4. **Pro / Agences / Promoteurs** — pages publiques et activation professionnelle ;
5. **Immobilier / SEO** — villes, quartiers et intentions uniquement avec contenu utile ;
6. **recette de cohérence SERP + fiche bien** — sans refonte gratuite du cœur déjà solide.

Aucune page n’est modifiée sans audit de l’existant et discussion section par section.

## 6. Séquence DATA prioritaire

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

Avant toute modification : cartographier organisations, memberships, demandes d’activation, soumissions, projets, médias, ownership, leads, feeds partenaires, routes `/pro/*`, authentification et RLS.

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
- preuves disponibles pour les affirmations DATA ou UX ;
- PR mergée dans sa branche cible ;
- activation et Production distinguées du simple code disponible ;
- `SESSION.md` réécrit avec la prochaine action exacte.

## 10. Prochaine action exacte

1. terminer la certification visuelle finale RENT-P1 ;
2. supprimer le workflow temporaire ;
3. recertifier le commit final ;
4. merger la PR #313 dans `main` ;
5. auditer **Mon Projet / Compagnon** avant toute modification.
