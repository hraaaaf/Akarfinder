# AkarFinder — Session courante

**Mise à jour : 2026-08-08**  
**Lane UX/Carte : P1B.3 🔴 Territorial Metric Join Contract — PR #382**  
**Lane DATA : DATA-4.4B ✅ PR #380 ; prochain DATA = DATA-4.4C Persistent Canary 50**  
**Lot UX acquis : P1B.2 — Sourced Territorial Intelligence ✅ PR #376 — 9,2/10**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

Main au démarrage P1B.3 : `13b6c3c268c30fd103767903bcd69782642b11ee`.

Acquis récents :

- DATA-4.3H ✅ PR #377 — Dar Agadir 500/500, Search/display 500/500, drift 0 % ;
- DATA-4.4A ✅ PR #379, merge `43d8086c` — second réservoir qualifié, 0 write ;
- DATA-4.4B ✅ PR #380, merge `13b6c3c` — Promo Immo revalidé, 3 130 URLs sitemap, 2 935 intersection réservoir, 2 456 lignes conservatrices éligibles, canary/rollback 50/50, 0 write ;
- P1B.1 ✅ PR #371, **9,1/10** ;
- P1B.2 ✅ PR #376, **9,2/10**.

Invariants : no-bypass, provenance réelle, Search canonique, Geo Registry source géographique unique, aucune précision ou métrique territoriale fabriquée.

# UX / Carte — P1B.3 🔴

Objectif : mesurer le vrai pont :

`LISTING public/displayable → résolution geo explicite → quartier canonique validated`

avant d’autoriser une couche **Offre** par quartier.

## Audit métriques préalable

- **Offre** : calculable ville, pas encore honnêtement quartier sans join certifié.
- **Fraîcheur** : score V1 encore shadow-only ; pas de couche quartier publique.
- **Confiance** : `quality_score` mélange plusieurs dimensions ; ne pas le présenter comme confiance territoriale.
- Blocage : couverture réelle du lien listing → quartier canonique inconnue.

## Contrat P1B.3 actuel

- prend le dernier événement geo avant de vérifier qu’il reste `resolved` ;
- refuse toute ancienne résolution devenue stale/unresolved ;
- quartier et ville doivent être des entités canoniques `validated` ;
- dénominateur = `real_estate_likely + LISTING + eligible_primary|eligible_secondary` ;
- coverage et collisions utilisent ce même dénominateur ;
- collisions latest mesurées avant collapse ; conflits historiques reportés séparément ;
- comparaison sûre `source_record_id = seed_id::text`, aucun cast externe en UUID ;
- aucune inférence titre/URL/ville/coordonnée ; aucune interpolation ;
- aucun changement Search/ranking/display/publication/geometry ;
- `metric_layers_activated=false`.

## Reviewer indépendant

Plusieurs findings bloquants ont été détectés puis corrigés :

1. stale resolved event ressuscitable → corrigé ;
2. collision metric tautologique après `DISTINCT ON` → corrigé ;
3. collisions hors dénominateur public → corrigé ;
4. cast `source_record_id::uuid` potentiellement dangereux → supprimé ;
5. absence de gate exécutant réellement ce nouveau contrat → ajout d’un test PostgreSQL/PGlite + workflow permanent.

Reviewer code PASS avant closeout documentaire. Les 3 MD viennent d’être alignés ; une revue fraîche et une nouvelle CI exact-head sont obligatoires.

## Preuve spécialisée acquise sur le head pré-docs

`P1B.3 Territorial Metric Join Gate` run **31252849825** :

- static truth contract ✅ ;
- PostgreSQL semantic contract ✅ ;
- TypeScript ✅ ;
- workflow final ✅ success.

Le fixture DB prouve notamment : ancienne résolution + nouveau `unresolved` exclu ; collision latest détectée ; collision non-éligible hors dénominateur ; identifiant externe malformé sans crash ; `metric_layers_activated=false`.

Cette preuve devient historique après modification des MD : la CI doit repasser sur le head final.

# Décision produit après P1B.3

Après merge et rapport production read-only :

- couverture suffisante + **0 latest collision** → LOT suivant = vraie couche **Offre — annonces affichables indexées**, couleurs par quartier ;
- sinon → LOT suivant = **Geo Coverage Recovery**.

Aucun faux choroplèthe. Aucun seuil inventé avant observation de la distribution réelle.

# DATA — prochain lot

**DATA-4.4C — Persistent Canary 50** : write transactionnel des 50 lignes préparées en 4.4B, preflight exact, Search/display 50/50, drift ≤1 %, rollback immédiat sur anomalie. Cette lane reste séparée de P1B.3.
