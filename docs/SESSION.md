# AkarFinder — Session courante

**Mise à jour : 2026-08-08**  
**Lane DATA : DATA-4.4A 🔴 Second Reservoir Qualification**  
**Lot DATA acquis : DATA-4.3H ✅ fermé et certifié en production au cap 500**  
**Lot UX acquis : P1B.2 — Sourced Territorial Intelligence ✅ PR #376 — 9,2/10**  
**Prochain UX : audit des métriques territoriales avant définition du prochain lot canonique**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

Acquis récents :

- DATA-4.3G ✅ PR #362 ;
- DATA-4.3H contrat ✅ PR #364 ;
- DATA-4.3I ✅ PR #367 ;
- DATA-4.3J ✅ PR #368 ;
- DATA-4.3H.1 ✅ PR #372 ;
- DATA-4.3H.2 ✅ PR #373 ;
- DATA-4.3H.3 ✅ PR #375 ;
- DATA-4.3H certification finale ✅ PR #377, merge `cdaf296f` — cohorte 500/500, Public Search 500/500, technical display 500/500, drift 0 % ;
- P1A.5 ✅ PR #365, **9,3/10** ;
- P1A.6 ✅ PR #369, **9,2/10**, audit natif final **12 captures / 0 finding** ;
- P1B.1 ✅ PR #371, **9,1/10**, audit final intégré **3 captures / 0 finding** ;
- P1B.2 ✅ PR #376, merge `0fc20da8`, **9,2/10**, audit final **430 / 768 / 1280 = 3 captures / 0 finding**.

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
- contrats P1A.6/P1B.1/P1B.2 : **18/18** ;
- TypeScript et production build verts ;
- audit navigateur : **3 captures / 0 finding** ;
- contrôle humain final : **9,2/10**.

# Prochain UX — audit des métriques territoriales

Avant de créer le prochain numéro de lot, vérifier quelles métriques existent réellement à une granularité compatible avec les entités affichées.

Candidats :

- offre disponible réelle ;
- fraîcheur des observations ;
- confiance/qualité DATA ;
- extension des prix exacts à d’autres quartiers/types/transactions.

Contraintes : granularité exacte, provenance explicable, aucun fallback ville présenté comme quartier, aucune interpolation, dénominateur explicite, pas de donnée = état neutre, Geo Registry source de vérité, Search canonique, 430×932 obligatoire, score ≥9/10 avant merge.

# DATA — DATA-4.3H ✅ CERTIFIÉ À 500

Plan exécuté :

`50 baseline DATA-4.3G + 100 + 100 + 100 + 100 + 50 = 500`

Production Dar Agadir finale :

- total : **6 533** ;
- `fresh_confirmed` : **605** ;
- `seed_only` : **5 928** ;
- `public_sitemap_presence` global : **502** ;
- cohorte contrôlée : **500/500** ;
- Public Search : **500/500** ;
- technical display : **500/500** ;
- drift : **0 %** ;
- Registry inchangé ;
- rollback non nécessaire ;
- aucune promotion >500 autorisée par ce lot.

# DATA — DATA-4.4A 🔴 Second Reservoir Qualification

Objectif : choisir le prochain réservoir de croissance sur preuves existantes uniquement, sans write production.

Candidats sitemap/canonical-link analysés :

| Source | Total | Normalized OK | Technical display | Fresh | Seed only | City | Type | Intent | Review |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `promoimmomarrakech.com` | **3 005** | **3 000** | **2 923** | 9 | **2 996** | **3 005** | 2 556 | **2 905** | due_soon |
| `limmobiliersansfrontieres.com` | 1 414 | 563 | 573 | 94 | 1 320 | 607 | 1 107 | 1 068 | due_soon |
| `atlasimmobilier.com` | 793 | 414 | 420 | 2 | 791 | 445 | 558 | 70 | due_soon |
| `aykana.ma` | 647 | 467 | 472 | 62 | 585 | 486 | 507 | 534 | due_soon |

Décision actuelle : **`promoimmomarrakech.com` = `PREFERRED_PENDING_REVALIDATION`**.

La qualification est encodée dans un scorer déterministe et un audit Supabase read-only. Le gate dédié a déjà validé tests, TypeScript, build et audit live read-only avec zéro write ; le PR doit encore être réintégré proprement sur le `main` ayant reçu P1B.2 avant merge final.

# Prochaine action DATA — DATA-4.4B

Après merge 4.4A uniquement : **Source Revalidation + Canary 50** sur Promo Immo Marrakech.

Gates obligatoires :

1. Registry revalidé ;
2. `robots.txt` + sitemap publics actuels ;
3. same-origin + population sitemap ;
4. intersection sitemap ↔ normalized ;
5. bruit/qualité ;
6. collisions/dedup Property Graph ;
7. Search/display avant write ;
8. snapshot + rollback ;
9. canary **max 50** ;
10. drift ≤1 %, fail-closed.

Aucun detail-page fetch, aucune réutilisation d’image/contenu, aucun passage direct à 100/500.

# Business parallèle

**Agenz = priorité partenariat/feed** : hidden/internal-only tant qu’aucune autorisation écrite n’autorise une évolution Registry/produit.
