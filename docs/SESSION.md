# AkarFinder — Session courante

**Mise à jour : 2026-08-07**  
**Lot DATA acquis : DATA-4.3B — Dar Agadir Sitemap Revalidation ✅ PR #348**  
**Prochaine décision DATA : post-4.3B — freshness shadow borné si la preuve le justifie, sinon réservoir admissible suivant**  
**Lot UX acquis : CARTE-QUARTIER-P1A.3 — Map State & Navigation ✅ PR #349**  
**Prochain lot UX : CARTE-QUARTIER-P1A.4 — Map Design System**

Ce fichier est le handover opérationnel court. `docs/ROADMAP.md` reste l’unique roadmap canonique.

# Main canonique

`main` inclut déjà avant merge P1A.3 :

- CARTE-QUARTIER-P1A.0 ✅ PR #327 ;
- CARTE-QUARTIER-P1A.1 ✅ PR #328, score **9,5/10** ;
- CARTE-QUARTIER-P1A.2 ✅ PR #334 ;
- DATA-1.1 → DATA-1.6B ✅ ;
- DATA-4.0 ✅ PR #341 ;
- DATA-4.1A ✅ PR #343 ;
- DATA-4.2 ✅ PR #344 ;
- DATA-4.3A ✅ PR #347 ;
- DATA-4.3B ✅ PR #348.

P1A.3 est porté par PR #349 et devient acquis à son merge.

Invariants : no-bypass, capability ≠ permission, Source Registry avant activation, volume technique ≠ inventaire public, Search reste canonique et Map son complément spatial.

# UX — P1A.3 acquis

Contrat canonique :

`/map?city=rabat&district=agdal&layer=explore&q=terrasse&project_id=...`

Acquis :

- l’URL Map est la source de vérité ;
- ville/quartier passent par le Geo Registry canonique ;
- district incohérent ou inconnu échoue fermé ;
- `q` reste indépendant de `district` ;
- les filtres Search compatibles et `project_id` sont conservés ;
- navigation ville/quartier pousse un nouvel état URL ;
- Back/Forward restaure l’état via le routeur ;
- Search → Map conserve le contexte ;
- Map → Search restitue `city + district` canoniques ;
- Quartier → Map ouvre directement le quartier ;
- Map → page quartier seulement si la paire est SEO-éligible ;
- l’écran cinématique ville a été supprimé ;
- aucune nouvelle structure Geo ni migration.

Validation du head code avant documentation : gate P1 Geo Productization verte avec P1A.3 + P10B + TypeScript + build, Search Truth verte, Design Accessibility verte, Mobile Ergonomics verte et aucune régression observée. Score contractuel : **9,3/10**.

# Prochain lot UX — P1A.4

## Map Design System

Objectif : améliorer la qualité perceptive sans modifier le contrat fonctionnel ou la vérité géographique.

- hiérarchie carte / contrôles / cockpit quartier ;
- couleurs ville/quartier/layer avec une seule signification par couleur ;
- marqueurs, clusters et sélection cohérents ;
- états hover/focus/loading/empty ;
- responsive desktop/tablette/mobile ;
- contraste et accessibilité ;
- audit visuel réel après chaque étape ;
- score UX/UI ≥ **9,0/10**, reprise obligatoire sous 9.

# DATA — acquis récents

## DATA-4.3A ✅ PR #347

Audit read-only de 6 533 lignes Dar Agadir :

- `ELIGIBLE_SHADOW` : **5** ;
- `SEED_ONLY_REVALIDATION_REQUIRED` : **6 425** ;
- `NON_NORMALIZED` : **46** ;
- `INSUFFICIENT_STRUCTURE` : **57** ;
- duplicates : **0** ;
- policy blocked : **0** ;
- source/detail fetch : **0** ;
- content reuse : **0** ;
- DB/policy/production writes : **0**.

## DATA-4.3B ✅ PR #348

Revalidation via le seul canal Registry autorisé `public_sitemap` :

- robots/sitemaps same-origin uniquement ;
- budget maximum 40 requêtes ;
- aucune page détail ;
- aucune image/contact/description réutilisée ;
- aucun write DB/freshness ;
- aucune policy modifiée ;
- aucune activation ;
- workflow live, TypeScript et build verts.

La présence dans un sitemap n’est **ni une preuve de fraîcheur, ni une permission de réutilisation**.

# Prochaine décision DATA

1. lire la preuve live DATA-4.3B ;
2. mesurer la présence sitemap du réservoir `seed_only` ;
3. ne jamais transformer automatiquement ce signal en `fresh_confirmed` ;
4. si justifié, ouvrir un lot séparé de freshness shadow/write avec rollback ;
5. sinon passer au réservoir admissible suivant ;
6. poursuivre en parallèle la piste partenariat/feed Agenz sans modifier le Registry avant autorisation écrite.