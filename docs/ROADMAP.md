# AKARFINDER — ROADMAP CANONIQUE UNIQUE

**Version : 2026-08-10 20:52 +01:00**  
**Autorité : ce fichier est l’unique roadmap d’exécution de toutes les fenêtres/lane AkarFinder.**

`README.md` = identité/doctrine. `docs/SESSION.md` = handover court. Les roadmaps spécialisées (ex. `docs/CARTE_ROADMAP.md`) sont des journaux détaillés et ne peuvent jamais définir une priorité concurrente à ce fichier.

---

# 0. Gouvernance globale — obligatoire dans toutes les fenêtres

Toute fenêtre/agent travaillant sur AkarFinder doit commencer par lire, dans cet ordre :

1. `README.md` ;
2. `docs/ROADMAP.md` ;
3. `docs/SESSION.md` ;
4. le fichier spécialisé de sa lane si nécessaire.

Toute nouvelle idée, dette, lot, finding, audit ou prochaine étape provenant d’une fenêtre parallèle doit être enregistrée ici avant d’être considérée comme faisant partie du plan produit.

## Gate universel DOUBLE CHECK + NOTE ≥9/10

`IMPLEMENTATION → DOUBLE CHECK INDÉPENDANT → NOTE /10 → CORRECTIONS → RE-TEST → RE-NOTE → CERTIFICATION`

Règles :

- aucun lot n’est `CLOSED` avec une note finale < **9,0/10** ;
- si la première note est <9,0, le lot reste ouvert et les findings deviennent des sous-étapes de cette roadmap ;
- DATA/Search/Backend : correctness, sécurité/fail-closed, tests, observabilité, rollback, performance et cohérence architecture font partie du score ;
- UX/UI : note séparée mobile/desktop lorsque pertinent ; **mobile ≥9/10** obligatoire ;
- Carte/Geo : exactitude géographique, provenance et absence d’inférence non prouvée font partie du score ;
- mutation production : preuve before/after + rollback lorsque applicable ;
- CI exact-head verte est nécessaire mais ne suffit pas seule à obtenir 9/10 ;
- Reviewer indépendant et Release Certifier restent distincts du Builder pour les lots critiques ;
- après merge : relire `main`, rejouer les gates critiques et mettre à jour README/ROADMAP/SESSION.

---

# 1. North Star produit

AkarFinder = **moteur de recherche immobilier + index national + couche d’intelligence du marché marocain**.

Doctrine :

- **MASS FIRST → QUALITY LATER → PARTNER REPLACEMENT OVER TIME** ;
- la qualité ordonne/enrichit ; elle ne doit pas, seule, effacer une annonce structurellement et juridiquement admissible ;
- volume brut ≠ inventaire publiable ;
- sitemap/robots/capability ≠ permission ;
- Source Registry autoritaire et fail-closed ;
- aucune donnée, image, géométrie, coordonnée, prix ou partenariat inventé ;
- Search reste le cœur produit ; Map est une projection spatiale de la même vérité ;
- `DISCOVERED ≠ AUDITED ≠ POLICY_ASSIGNED ≠ ELIGIBLE ≠ INGESTIBLE ≠ DISPLAYABLE` ;
- une responsabilité = une branche = une PR = une certification ;
- Shadow → Canary → certification → activation bornée pour les changements sensibles.

---

# 2. REGISTRE MAÎTRE DES PR / FENÊTRES

Le statut GitHub `OPEN` n’implique plus qu’une PR est active. Toute PR ouverte est classée ici avant reprise.

## ACTIVE — critical path

### PR #474 — MASS-FIRST + canonical unified roadmap 🟠 P0 NOW

Branche : `feat/mass-first-search-quality-policy`.

Responsabilité : rendre Search mass-first sans affaiblir Source Policy.

5 lots :

1. Source Policy public gate ;
2. Quality ≠ Eligibility ;
3. Listing Power Score 0–100 ;
4. ranking public par Listing Power ;
5. mass reclassification + certification fail-closed.

Score provisoire : **8,8/10 — NON CERTIFIÉ**.

Pour passer ≥9 : CI exact-head complète, PostgreSQL/Supabase réel ou rehearsal fidèle, rapports MASS-FIRST, audit ACL/`SECURITY DEFINER`, plan/perf Search, before/after inventory, tests Q0/Q1, 0 fuite prohibited/unverified/CATEGORY/AMBIGUOUS, Reviewer indépendant, Release Certifier.

**Merge interdit avant ≥9/10.**

### PR #473 — SEARCH-UX-1 Inventory-first cards & responsive grid 🟠 P0 PARALLÈLE

Branche : `feat/search-ux-1-cards-grid`.

Responsabilité : densité et scan Search.

Cible :

- wide desktop : **4 cartes/ligne** ;
- desktop : **3** ;
- tablette/mobile : **2** ;
- cards image-first compactes ;
- whole-card click ;
- CTA secondaires réduits ;
- provenance/truth/favoris conservés.

Certification obligatoire : desktop 1440×900 ≥9/10 + mobile 390×844 ≥9/10 + Chromium multi-viewports + Search Truth + build/typecheck.

**Dépendance de merge :** #473 peut être certifiée visuellement en parallèle, mais doit être réalignée sur le `main` obtenu après toute PR Search/Ranking mergée avant elle, notamment #474 si #474 merge en premier. Rejouer ensuite l’intégralité des gates Search/UX.

### SEARCH-VISUAL-REFERENCE-AUDIT-1 — Rabat Search vs référence approuvée 🟠 ACTIVE / REVIEW

Lane : **UX / Search**.  
Responsabilité : auditer la page `/search?city=Rabat` desktop + mobile contre la référence visuelle approuvée dans cette fenêtre avant toute nouvelle implémentation visuelle.  
Dépendances : `RABAT-REAL-PHOTO-LIBRARY-1` #468 CLOSED ; #473 actif pour la densité/cards ; #474 actif pour les sémantiques Search/ranking.  
Branche : `audit/live-rabat-search-20260810` (docs-only après réalignement sur #474).  
PR : **aucune PR produit** ; une PR docs-only empilée sur #474 porte uniquement l’alignement roadmap/handover de cette fenêtre.  
État : **REVIEW — NON CERTIFIÉ**.  
Preuves : capture live Product Design run `31417065973` SUCCESS ; artefact `product-design-rabat-audit`, id `9073861382`, digest `sha256:355a13772550fe1fdc735a088311213207ab02989757206d88da9ca9d0f65363` ; captures 1440×900 et 390×844 ; baseline live confirmant que les annonces Rabat sans `listing.neighborhood` structuré restent sur le fallback illustratif.  
Double check / score : **score comparatif final non encore émis** ; le lot reste ouvert tant que desktop + mobile n’ont pas été notés séparément et que les deltas P0/P1/P2 ne sont pas explicités.  
Blocker : aucun blocker technique ; **blocker de certification = audit comparatif non terminé**.  
Prochaine étape : produire le rapport comparatif référence ↔ live, score desktop/mobile, puis convertir uniquement les gaps prouvés en LOTS d’implémentation.

## RECONCILIATION REQUIRED

### PR #454 — DATA-4.9C Source Policy Decision & Registry Assignment 🟠

Cette PR n’est pas une simple vieille branche : **une mutation restrictive production a déjà été appliquée**.

État certifié :

- `agadirimmobilier.ma` → `permission_required + hidden + internal_signal_only` ;
- Val Foncier / Christie’s / Immo Maroc / ProImmobilier / Capital Properties → `unverified` ;
- **0 source autorisée** ;
- DATA-4.9D ingestion de ce cohort = **BLOCKED_BY_POLICY**.

Avant merge/close : comparer #454 au `main` actuel + Registry live, conserver la mutation Agadir, identifier le résidu encore nécessaire, reconstruire/rebaser seulement ce résidu, rejouer CI + audit Registry, double-check ≥9/10. Si tout le code est supersédé mais la DB est déjà correcte, fermer explicitement comme superseded après closeout documentaire.

## BACKLOG À REVALIDER AVANT REPRISE

### PR #310 — Professional auth/session/RLS hardening 🔵 SECURITY BACKLOG

Vieille architecture. Ne pas merger telle quelle. Re-auditer le `main` actuel : clients Supabase, `/api/pro/*`, request-scoped user client, service-role boundary, RLS/RPC et isolation inter-tenant. Si le finding existe encore, reconstruire un lot frais sur current main avec PostgreSQL réel + Security Reviewer + score ≥9/10. Sinon fermer #310 comme superseded.

## SUPERSEDED CANDIDATES / HISTORIQUE

### PR #383 — Permanent AkarFinder agent governance

Une grande partie de sa doctrine est déjà absorbée par la gouvernance actuelle : roadmap unique, Builder/Reviewer/Certifier, score ≥9, preuves exact-head. Ne pas merger un snapshot ancien en bloc. Comparer au current main ; ne conserver qu’une capacité réellement absente. Sinon fermer comme superseded.

### Anciennes PR ouvertes

Les anciennes PR UX Preview, anciens ODM/DATA P0, recrawl/intelligence, vieux docs et expérimentations ne sont **pas** réactivées par défaut simplement parce qu’elles restent `OPEN` sur GitHub. Leur code est historique jusqu’à preuve contraire.

Règle de reprise :

`CURRENT MAIN AUDIT → UNIQUE VALUE CHECK → REBUILD ON CURRENT MAIN → DOUBLE CHECK ≥9 → NEW/REALIGNED PR`

Pas de merge direct d’une branche historique sur `main`.

---

# 3. Lane DATA — MASS COVERAGE + PARTNER CONVERSION

## Baseline utile

- Thin Index observé : ~56,8k documents ;
- réservoir historique `blocked_quality` : ~11,8k à réauditer selon doctrine MASS-FIRST ;
- DATA-4.9B : **2 326 représentations URL structurellement compatibles détail**, pas 2 326 biens uniques ; PR #452 est **MERGED/CLOSED**, elle n’est pas une PR active.

## DATA-MASS-FIRST

Porté actuellement par #474 : qualité ≠ droit d’exister ; une annonce admissible pauvre reste visible plus bas grâce au Listing Power.

## DATA-4.9C

Voir registre #454 : décision déjà exécutée partiellement en production, réconciliation requise.

## DATA-4.9D

**LOCKED pour le cohort 4.9C** : aucune source autorisée.

## DATA-4.10A — Authorization Conversion & Partner Feed Readiness 🔵 NEXT DATA

Read-only en priorité : dossiers de permission/partenariat, contact officiel, upside inventaire, proposition canonical-link/public-facts ou feed/API, provenance, suppression, dédup, fraîcheur. Aucun scraping additionnel, aucun Registry write implicite, aucune activation.

En parallèle, MASS COVERAGE continue uniquement sur les sources déjà admissibles par policy.

## Handoff Carte exact-scope

DATA doit aussi produire la preuve indépendante Registry + profondeur/fraîcheur exacte nécessaire à Marrakech / Guéliz / rent / `surface_m2` avant tout replay P1C.4A/P1C.4.

---

# 4. Lane UX / Search

## PR #473 — ACTIVE

Lane : **UX / Search**.  
Responsabilité : densité et scan Search inventory-first.  
Dépend de : current Search Truth + #474 si #474 merge avant elle.  
Branche : `feat/search-ux-1-cards-grid`.  
PR : **#473**.  
État : **ACTIVE / non certifié**.  
Preuves : cible 4 wide desktop / 3 desktop / 2 tablette / 2 mobile ; cards image-first compactes ; provenance/truth/favoris préservés.  
Double check / score : certification desktop 1440×900 ≥9/10 + mobile 390×844 ≥9/10 obligatoire ; score final encore à confirmer sur current head réaligné.  
Blocker : merge interdit sur base stale ; le second entre #473/#474 doit se réaligner et rejouer les gates.  
Prochaine étape : certification visuelle + Search Truth + typecheck/build sur current main réaligné.

## RABAT-REAL-PHOTO-LIBRARY-1 ✅ CLOSED — PR #468

Lane : **UX / Search — Visual truth**.  
Responsabilité : bibliothèque de fallback photo réel pour Rabat.  
Dépend de : quartier structuré certifié, `fallback_visual`, policy photo du bien prioritaire.  
Branche : `agent/rabat-real-photo-library-1` ; closeout docs #471.  
PR : **#468 MERGED**, closeout **#471 MERGED**.  
État : **CLOSED**.  
Preuves : **40 vraies photos Wikimedia Commons = 8 × Agdal/Hay Riad/Souissi/Océan/Hassan** ; 40/40 sources/licences ; exact-head #468 **29/29 workflows SUCCESS** ; Chromium 5 viewports ; mobile 2 colonnes ; 0 clipping/overflow.  
Double check / score : audit visuel final **9,2/10**, Reviewer PASS, Release Certifier GO.  
Blocker : **aucun** pour le lot fermé ; limitation produit connue : le fallback quartier ne s’active que si `listing.neighborhood` est structuré, donc beaucoup d’annonces live Rabat restent sur illustration.  
Prochaine étape : traiter cette limitation via le programme Akar Visual Stack, jamais par inférence libre du titre/snippet.

## SEARCH-VISUAL-REFERENCE-AUDIT-1 🟠 ACTIVE / REVIEW

Lane : **UX / Search**.  
Responsabilité : comparer le Search Rabat réel à la référence approuvée, desktop + mobile, et mesurer l’écart avant implémentation.  
Dépend de : #468 fermé ; #473 et #474 actifs ; mobile 2 colonnes non négociable.  
Branche : `audit/live-rabat-search-20260810`.  
PR : aucune PR produit ; docs-only empilé sur #474 pour le handover.  
État : **REVIEW**.  
Preuves : run `31417065973` SUCCESS ; artefact `9073861382`, digest `sha256:355a13772550fe1fdc735a088311213207ab02989757206d88da9ca9d0f65363` ; captures live 1440×900 / 390×844.  
Double check / score : **à produire** ; aucun score final ne doit être inventé avant analyse des captures.  
Blocker : audit comparatif non terminé.  
Prochaine étape : scorer architecture, header/search, filtres, densité, cards, hiérarchie, visual stack, mobile 2-colonnes, actions, navigation et accessibilité visible ; convertir les findings en P0/P1/P2.

## AKAR VISUAL STACK — doctrine verrouillée

Hiérarchie de vérité visuelle cible :

`PROPERTY_PHOTO → BUILDING/STREET_PHOTO → DISTRICT_PHOTO → CITY_PHOTO → TYPE_ILLUSTRATION → NEUTRAL`

Règles :

- photo réelle du bien autorisée = priorité absolue ;
- building/street uniquement avec preuve géographique suffisamment fiable ;
- district photo uniquement avec quartier structuré/certifié ;
- city photo uniquement avec ville structurée/certifiée ;
- les visuels existants Appartement/Villa/Terrain/Bureau/Commerce ne sont **pas supprimés** : ils deviennent langage visuel/type et fallback explicite, jamais pseudo-photo du bien ;
- aucune image générée/fictive ne doit représenter un quartier ou un bien réel ;
- toute photo de contexte doit être libellée sans ambiguïté (`Photo d’ambiance du quartier`, `Photo d’ambiance de Rabat`) ;
- illustration type = `Illustration · photo du bien indisponible` ou équivalent ;
- aucune activation quartier depuis titre/snippet/description libre comme vérité finale ;
- sélection déterministe, stable au reload ;
- mobile **2 cartes/ligne** reste un invariant de certification à 360/390 px.

## VISUAL-REPRESENTATION-ENGINE-1 🔵 PLANNED

Lane : **UX / Search — Visual truth engine**.  
Responsabilité : centraliser le resolver du Akar Visual Stack et retourner un `visual_type`, asset/source, disclosure, type de bien et niveau de vérité explicite.  
Dépend de : verdict final de `SEARCH-VISUAL-REFERENCE-AUDIT-1` ; #468 ; Search Truth ; realign/merge #473/#474 avant intégration finale aux cards.  
Branche : **à créer depuis current main au démarrage du lot**.  
PR : **aucune**.  
État : **PLANNED / BLOCKED_BY_DEPENDENCIES**.  
Preuves attendues : tests de priorité property photo ; quartier structuré → district photo ; ville seule → city photo ; type seul → type illustration ; contexte absent → neutral ; titre `Agdal` + `neighborhood=null` ne doit jamais activer Agdal.  
Double check / score : non commencé ; certification ≥9/10 obligatoire.  
Blocker : audit visuel non terminé + surfaces cards #473 encore actives + sémantiques Search #474 encore non mergées.  
Prochaine étape : après audit et stabilisation du current main Search, implémenter le resolver central sans redesign simultané.

## VISUAL-CARD-COMPOSITION-1 🔵 PLANNED AFTER ENGINE

Lane : **UX / Search**.  
Responsabilité : composer photo réelle de contexte + identité AkarFinder + signature discrète du type de bien, sans mettre deux images concurrentes dans la card.  
Dépend de : `VISUAL-REPRESENTATION-ENGINE-1` certifié + #473 certifiée.  
Branche/PR : à créer séparément.  
État : **PLANNED**.  
Preuves attendues : desktop 1440×900 + mobile 360/390, 4/3/2/2 selon breakpoint final, lisibilité des disclosures, 0 confusion photo du bien vs photo de contexte.  
Double check / score : non commencé.  
Blocker : engine non implémenté.  
Prochaine étape : appliquer la composition aux cards une fois le resolver central stable.

## RABAT-NEIGHBORHOOD-ACTIVATION-1 🔵 PLANNED AFTER ENGINE

Lane : **UX/Search + Geo-data contract**.  
Responsabilité : augmenter l’activation réelle des 40 photos Rabat uniquement à partir de signaux quartier structurés/certifiés.  
Dépend de : Visual Engine ; Geo Registry/normalisation fiable ; sources structurées/adresses/coordonnées prouvées.  
Branche/PR : à créer séparément.  
État : **PLANNED**.  
Preuves attendues : source structurée, adresse normalisée ou point-in-polygon sourcé ; confidence explicite ; fail-closed sous seuil ; aucune extraction titre libre utilisée seule comme vérité finale.  
Double check / score : non commencé.  
Blocker : couverture `listing.neighborhood` actuelle insuffisante sur les résultats live.  
Prochaine étape : mesurer le gap exact après #473/#474 puis choisir la première source de preuve structurée.

## CONTEXTUAL-ILLUSTRATIONS-COVERAGE-AUDIT-1 🟡 DEPENDENT / ABSORBED AS EVIDENCE

Ce lot n’est plus la **prochaine action autonome immédiate**. Ses métriques restent obligatoires mais sont absorbées comme preuve de `SEARCH-VISUAL-REFERENCE-AUDIT-1` puis du programme Akar Visual Stack : couverture réelle, répétition, fallback rate, échec distant, authorized thumbnail vs district real-photo vs city_type vs city vs type vs neutral. **Aucun nouvel asset avant cette mesure.**

## Règle d’intégration #473 ↔ #474 ↔ Visual Stack

#474 modifie Search policy/ranking SQL ; #473 modifie UX/cards/grid ; le Visual Stack modifiera ensuite la résolution/composition visuelle. Ils peuvent être préparés en parallèle uniquement tant que leurs responsabilités restent séparées. **Le second à merger parmi #473/#474 doit se réaligner sur le premier merge. Les lots Visual Stack partent ensuite du current main stabilisé et rejouent Search Truth + UX gates. Aucun merge sur base stale accepté.**

---

# 5. Lane Carte / Geo

Détail historique : `docs/CARTE_ROADMAP.md`.

Acquis : P1A.1→P1A.6, P1B.1→P1B.15, P1C.1, P1C.2, P1C.3, P1C.4, P1C.4A.

État :

- Offre quartier publique **OFF** ;
- P1C.4 = `NOT_CERTIFIABLE` ;
- P1C.4A = `DESIGNED_NOT_PROVEN` ;
- P1C.5 **LOCKED**.

Ordre : DATA exact-scope evidence → replay P1C.4A → replay P1C.4 → seulement si certified, P1C.5 canary → P1C.6 observation → P1C.7 scoped ON. Choroplèthe seulement avec géométrie neighborhood-grade sourcée et certifiée.

Chaque étape : double check + note ≥9/10.

---

# 6. Lane Security / Professional

## AUTH-RLS-REVALIDATION 🔵 BACKLOG IMPORTANT

Source : PR historique #310.

Après stabilisation de #474/#473, exécuter un audit current-main court pour déterminer si la séparation user-scoped/service-role et l’isolation inter-tenant restent une dette réelle. Si oui : nouveau lot dédié frais. Si non : fermer #310.

---

# 7. Ordre d’exécution global

```text
PARALLÈLE P0
├─ #474 MASS-FIRST Search policy/ranking          🟠 certification
├─ #473 SEARCH-UX-1 4/3/2/2 cards/grid           🟠 certification visuelle
└─ SEARCH-VISUAL-REFERENCE-AUDIT-1                🟠 audit/read-only

APRÈS PREMIER MERGE SEARCH
→ réaligner l’autre PR sur current main
→ rerun gates complets
→ merge seulement si score ≥9/10

APRÈS AUDIT VISUEL + SEARCH MAIN STABLE
→ VISUAL-REPRESENTATION-ENGINE-1
→ VISUAL-CARD-COMPOSITION-1
→ RABAT-NEIGHBORHOOD-ACTIVATION-1
→ coverage metrics intégrées à chaque certification

DATA
→ reconcile/close #454 DATA-4.9C
→ DATA-4.10A Authorization / Partner Feed Readiness
→ MASS COVERAGE uniquement sur sources admissibles

CARTE
→ DATA exact-scope evidence
→ P1C.4A/P1C.4 replay
→ éventuel P1C.5

SECURITY
→ re-audit #310 sur current main

CLEANUP
→ audit des anciennes PR OPEN
→ fermer explicitement les superseded ; ne jamais les merger par inertie
```

---

# 8. Template obligatoire pour tout nouveau lot

```text
LOT-ID — Nom
Responsabilité unique :
Lane :
Dépend de :
Branche :
PR :
État : PLANNED / CODED / REVIEW / CERTIFIED / MERGED / CLOSED / SUPERSEDED
Preuves :
Double check findings :
Score initial /10 :
Corrections :
Score final /10 :
CI exact-head :
Production/rehearsal :
Rollback :
Conflits/dépendances avec autres PR :
Prochaine étape :
```

**Interdiction de marquer CLOSED si `Score final < 9,0`.**
