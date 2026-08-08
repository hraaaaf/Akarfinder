# AkarFinder — Session courante

**Mise à jour : 2026-08-08**  
**Lane DATA : DATA-4.3H ✅ fermé et certifié en production au cap 500**  
**Lot UX acquis : P1B.2 — Sourced Territorial Intelligence ✅ PR #376 — 9,2/10**  
**Prochain UX : audit des métriques territoriales avant définition du prochain lot canonique**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

Acquis récents :

- DATA-4.3G ✅ PR #362 ;
- DATA-4.3H contrat ✅ PR #364 ;
- DATA-4.3I ✅ PR #367 ;
- DATA-4.3J ✅ PR #368 ;
- DATA-4.3H.1 ✅ PR #372 — start count certifié par provenance ;
- DATA-4.3H.2 ✅ PR #373 — manifests apply/rollback du premier +100 ;
- DATA-4.3H.3 ✅ PR #375, merge `77eceaf5` — checkpoints certifiés `50→150→250→350→450→500`, provenance typée, fail-closed sur état partiel/non séquentiel ;
- DATA-4.3H certification finale ✅ main `cdaf296f` — cohorte 500/500, Public Search 500/500, technical display 500/500, drift 0 % ;
- P1A.5 ✅ PR #365, **9,3/10** ;
- P1A.6 ✅ PR #369, **9,2/10**, audit natif final **12 captures / 0 finding** ;
- P1B.1 ✅ PR #371, **9,1/10**, audit final intégré **3 captures / 0 finding** ;
- P1B.2 ✅ PR #376, merge **`0fc20da8`**, **9,2/10**, audit final **430 / 768 / 1280 = 3 captures / 0 finding**.

Invariants : no-bypass, capability ≠ permission, Source Registry avant activation, volume technique ≠ inventaire public, Search canonique, Map complément spatial, Geo Registry unique source de vérité.

# UX — P1B.2 Sourced Territorial Intelligence ✅

Objectif acquis : ajouter une première couche décisionnelle réellement sourcée sans transformer la carte en faux signal marché.

Acquis :

- état URL canonique `layer=price` ;
- activation du mode prix uniquement après sélection d’une ville ;
- benchmarks exacts quartier uniquement pour **appartement / achat** ;
- identité géographique comparée via le Geo Registry plutôt que par simple égalité de libellés ;
- Casablanca certifiée avec exactement **2 repères exacts** : Casablanca Finance City et Maârif ;
- Bouskoura exclu du mode appartement lorsqu’aucun benchmark appartement exact n’existe ;
- médiane, fourchette, taille d’échantillon, confiance et période visibles ;
- aucun fallback ville présenté comme prix de quartier ;
- aucune interpolation, heatmap ou propagation des prix aux polygones ;
- couche territoriale P1B.1 maintenue en arrière-plan et volontairement atténuée en mode prix ;
- correctif mobile final : ancrage des marqueurs vers l’intérieur du viewport selon leur longitude relative au centre de carte ;
- Maârif n’est plus rogné sur **430×932** ;
- head final certifié : `6c3157e4251ce4821c390c646683d1367362b013` ;
- run final P1B.2 : `31248741178` ; job `93081545544` ;
- artefact final : `9019352472` ; digest `sha256:d97f550dc32e1d69eefc7f80ef8008f2318dfbc01e778629680d401173c9fe9e` ;
- contrats P1A.6/P1B.1/P1B.2 : **18/18** ;
- TypeScript et production build verts ;
- **21 workflows du head verts** ;
- audit navigateur : **3 captures / 0 finding**, 2 marqueurs exacts à chaque viewport, territorial layer active, aucun overflow, aucune erreur console ;
- contrôle humain final : **9,2/10** ;
- merge code : `0fc20da846c2a56aea5264830fbee2dfe014fce4`.

# Prochain UX — audit des métriques territoriales

Avant de créer le prochain numéro de lot, vérifier quelles métriques existent réellement à une granularité compatible avec les entités affichées.

Candidats :

- offre disponible réelle ;
- fraîcheur des observations ;
- confiance/qualité DATA ;
- extension des prix exacts à d’autres quartiers/types/transactions.

Contraintes :

- granularité exacte et provenance explicable obligatoires ;
- aucun fallback ville présenté comme quartier ;
- aucune interpolation pour combler les trous ;
- dénominateur explicite pour toute proportion ;
- pas de donnée = état neutre ;
- Geo Registry reste source de vérité ;
- Search reste canonique ;
- géométries shadow restent shadow tant qu’elles ne sont pas certifiées pour publication ;
- **430×932 obligatoire** dans la certification visuelle ;
- score ≥9/10 avant merge.

# DATA — DATA-4.3H ✅ CERTIFIÉ À 500

## Contrat exécuté

Plan complet :

`50 baseline DATA-4.3G + 100 + 100 + 100 + 100 + 50 = 500`

Chaque batch :

- Registry + sitemap public revalidés juste avant sélection ;
- exact preflight DB ;
- Search/display mesurés avant ;
- snapshot + rollback complet ;
- write transactionnel avec assertions de cardinalité ;
- Search/display vérifiés après ;
- arrêt fail-closed sur tout écart.

Les réponses intermittentes de `robots.txt` sans déclaration sitemap ont déclenché l’arrêt attendu. Aucun ancien sitemap n’a été hardcodé et aucun bypass n’a été utilisé.

## Production finale

Dar Agadir :

- total : **6 533** ;
- `fresh_confirmed` : **605** ;
- `seed_only` : **5 928** ;
- `public_sitemap_presence` global : **502** ;
- cohorte contrôlée : **500/500 `fresh_confirmed` + sitemap** ;
- Public Search : **500/500** ;
- technical display : **500/500** ;
- drift public : **0 %** ;
- rollback : **non nécessaire**.

Les **2** autres lignes globales avec canal sitemap sont des preuves légitimes préexistantes hors cohorte contrôlée.

# Prochaine action DATA

**Ne pas dépasser le cap 500 sous DATA-4.3H.**

Observer TTL/aging et stabilité Search/display du cohort 500, puis définir explicitement dans `docs/ROADMAP.md` le prochain lot ou la prochaine source admissible avant toute nouvelle mutation persistante. Aucun nouveau numéro de lot n’est canonique avant cette définition.

# Business parallèle

**Agenz = priorité partenariat/feed** : hidden/internal-only tant qu’aucune autorisation écrite n’autorise une évolution Registry/produit.
