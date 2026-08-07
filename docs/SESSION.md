# AkarFinder — Session courante

**Mise à jour : 2026-08-07**  
**Lot DATA acquis : DATA-4.3J — Display Trigger Ordering ✅ PR #368**  
**Prochaine action DATA : certification post-merge 4.3J avant reprise de l’expansion persistante**  
**Lot UX acquis : CARTE-QUARTIER-P1A.6 ✅ PR #369 — 9,2/10**  
**Prochain UX : P1B — Intelligence cartographique**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

Acquis récents :

- DATA-4.3G ✅ PR #362, merge `0286178` ;
- DATA-4.3H ✅ PR #364, merge `88a3592` ;
- DATA-4.3I ✅ PR #367, merge `ad4875e` ;
- DATA-4.3J ✅ PR #368, merge `bb3a5db` ;
- P1A.5 ✅ PR #365, merge `c489f000`, **9,3/10** ;
- P1A.6 ✅ PR #369, merge `dc75016d`, **9,2/10**, audit natif final **12 captures / 0 finding**.

Invariants : no-bypass, capability ≠ permission, Source Registry avant activation, volume technique ≠ inventaire public, Search canonique, Map complément spatial, Geo Registry unique source de vérité.

# UX — P1A.6 Responsive Hardening ✅

Acquis :

- viewports certifiés **390×844 / 430×932 / 768×1024 / 1280×900** ;
- scénarios réels `/map`, `/map?city=Rabat`, `/map?city=Rabat&district=Agdal` ;
- audit en viewport réel (`fullPage: false`) ;
- pas de focus artificiel avant capture ;
- contrôles territoriaux tactiles/clavier renforcés ;
- scroll horizontal contenu ;
- détection automatique cockpit↔explorer, explorer↔panel, overflow et touch targets ;
- vrai défaut cockpit↔explorer trouvé sur 390/430/768 puis corrigé par offsets responsive dédiés ;
- protection anti-collision du panneau quartier conservée ;
- **21/21 tests P1A.4/P1A.5/P1A.6 verts** ;
- TypeScript, production build, Geo Productization, Final Design/A11y, UX gates et Canonical Baseline verts ;
- artefact final : run `31223839460`, `p1a6-map-responsive-audit`, **12 captures / 0 finding** ;
- contrôle humain final : **9,2/10**.

# Prochain UX — P1B Intelligence cartographique

Construire le premier lot d’intelligence spatiale réellement utile au-dessus de P1A.

Contraintes :

- aucune géométrie/proximité/POI inventée ;
- sources visibles et explicables ;
- Geo Registry reste source de vérité ;
- Search reste canonique ;
- Map ne devient jamais une couche décorative trompeuse ;
- **430×932 obligatoire** dans la certification visuelle ;
- score ≥9/10 avant merge.

# DATA — état acquis

## DATA-4.3H ✅ PR #364

Contrat d’expansion contrôlée : départ 50 persistent rows, plan **100 + 100 + 100 + 100 + 50**, max **100/run**, cap 500 avant re-certification, TTL **14 jours**, drift cap **1 %**, Registry+sitemap revalidés avant chaque run, rollback obligatoire.

## DATA-4.3I ✅ PR #367

Protection de l’ownership fraîcheur multi-canal : OpenSERP/Yandex ne peut plus dégrader/supprimer une preuve tierce comme `public_sitemap_presence` ; merge additif des preuves fraîches ; pas de DB write ou policy change en CI.

## DATA-4.3J ✅ PR #368

Correction de l’ordre du trigger display : `zzz_thin_index_display_policy_write` s’exécute après quality/purity afin que l’éligibilité soit calculée depuis le tier final. Migration-only, aucune policy-function mutation ni backfill dans la PR.

# Prochaine action DATA

Avant toute nouvelle expansion persistante : certifier 4.3J en production, vérifier l’ordre réel des triggers, retester le cohort exact des 50 lignes, exiger conservation Search/display et du canal `public_sitemap_presence`, puis seulement reprendre les batchs ≤100 sous le contrat 4.3H.

Ne pas inventer un numéro de lot suivant avant définition explicite dans `docs/ROADMAP.md`.

# Business parallèle

**Agenz = priorité partenariat/feed** : hidden/internal-only tant qu’aucune autorisation écrite n’autorise une évolution Registry/produit.
