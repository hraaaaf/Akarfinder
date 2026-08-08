# AkarFinder — Session courante

**Mise à jour : 2026-08-08**  
**Lane DATA : DATA-4.3H ✅ fermé et certifié en production au cap 500**  
**Lot UX acquis : P1B.1 — AkarFinder Map Visual Layer ✅ PR #371 — 9,1/10**  
**Prochain UX : P1B.2 — Couches d’intelligence territoriale sourcées**

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
- P1A.5 ✅ PR #365, **9,3/10** ;
- P1A.6 ✅ PR #369, **9,2/10**, audit natif final **12 captures / 0 finding** ;
- P1B.1 ✅ PR #371, **9,1/10**, audit final intégré **3 captures / 0 finding**.

Invariants : no-bypass, capability ≠ permission, Source Registry avant activation, volume technique ≠ inventaire public, Search canonique, Map complément spatial, Geo Registry unique source de vérité.

# UX — P1B.1 AkarFinder Map Visual Layer ✅

Objectif acquis : la carte ne repose plus visuellement sur une basemap générique comme élément dominant lorsque la couche Casablanca canary est disponible.

Acquis :

- basemap OpenFreeMap/CARTO conservée comme infrastructure mais fortement atténuée ;
- namespace cartographique propriétaire : `akarfinder-neighborhood-geometry`, `akarfinder-neighborhood-fill`, `akarfinder-neighborhood-outline`, `akarfinder-neighborhood-label` ;
- **16 arrondissements Casablanca** issus uniquement du dataset OSM shadow existant ;
- aucune géométrie inventée et aucune promotion automatique shadow → production ;
- activation via `/api/geo/casablanca-arrondissements` et le canary preview existant ;
- production reste bloquée par le contrat géométrique existant ;
- palette territoriale pastel différenciée ;
- couleurs explicitement **non sémantiques** : elles distinguent les territoires et ne représentent ni prix, ni qualité, ni demande, ni confiance ;
- contours AkarFinder et labels territoriaux renforcés ;
- attribution OSM maintenue ;
- cycle `style.load` MapLibre durci ;
- viewports certifiés **430×932 / 768×1024 / 1280×900** ;
- **21/21 tests P1A.5/P1A.6/P1B.1 verts** ;
- TypeScript et production build verts ;
- **3 captures / 0 finding** ;
- contrôle humain final : **9,1/10**.

# Prochain UX — P1B.2 Couches d’intelligence territoriale sourcées

Ajouter une première couche décisionnelle réellement calculée depuis des données certifiées.

Contraintes :

- aucune géométrie/proximité/POI inventée ;
- aucune couleur de P1B.1 réinterprétée comme un score ;
- métrique choisie seulement si sa provenance, son calcul, sa fraîcheur et ses limites sont explicables ;
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
- baseline DATA-4.3G : **50** ;
- batch1 : **100** ;
- batch2 : **100** ;
- batch3 : **100** ;
- batch4 : **100** ;
- batch5 : **50** ;
- cohorte contrôlée : **500/500 `fresh_confirmed` + sitemap** ;
- Public Search : **500/500** ;
- technical display : **500/500** ;
- drift public : **0 %** ;
- rollback : **non nécessaire**.

Les **2** autres lignes globales avec canal sitemap sont des preuves légitimes préexistantes hors cohorte contrôlée.

## Registry final inchangé

- acquisition : `public_sitemap_canonical_link` ;
- discovery : `public_sitemap_only` ;
- display policy : `canonical_link_only` ;
- display gate : `external_tail_link_only` ;
- machine gate : `canonical_link_only` ;
- canal Registry : `public_sitemap` ;
- TTL : **14 jours** ;
- review : `due_soon`.

# Prochaine action DATA

**Ne pas dépasser le cap 500 sous DATA-4.3H.**

Observer TTL/aging et stabilité Search/display du cohort 500, puis définir explicitement dans `docs/ROADMAP.md` le prochain lot ou la prochaine source admissible avant toute nouvelle mutation persistante. Aucun nouveau numéro de lot n’est canonique avant cette définition.

# Business parallèle

**Agenz = priorité partenariat/feed** : hidden/internal-only tant qu’aucune autorisation écrite n’autorise une évolution Registry/produit.
