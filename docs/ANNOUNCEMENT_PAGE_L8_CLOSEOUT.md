# ANN-L8 — Marché & comparables — Closeout

## Statut

**CLOSED** après merge runtime exact-head, certification déterministe, artefact visuel inspecté et réconciliation documentaire.

## Runtime

- PR runtime : **#757**
- exact head certifié : `5208f5dcf306babedecdfcf571f71421384511fa`
- merge : `32208e647fb599a72f5efd46951a4e5aa2b366ed`

## Preuves exact-head

Workflow dédié `Announcement Page L8 Market Comparables` :

- run : `31952276940`
- conclusion : **SUCCESS**
- tests ciblés : **97/97 PASS**
- TypeScript : **PASS**
- production build : **PASS**
- Chromium ciblé : **8/8 captures, 0 finding**
- artefact : `9265006536`
- digest : `sha256:c1cced5e80f1f932159518d18a3a7c98402756a0aa71b400376987bfc665f5f3`

Transversaux critiques exact-head également **SUCCESS** : Canonical Baseline Validation, Canonical Baseline Compile Validation, Phase 1 P0 Closure, P1 Final Sweep, P2 Residual Closure, UX Gate 0 Contracts, UX P1 Mobile Decision Ergonomics, UX P1 Decision Continuity, UX P1 Design System Convergence, Announcement Page L1/L2/L3/L4/L6/L7 et Final Design Accessibility.

## Contrat livré

- service canonique `MarketComparableSet`, calcul métier hors React ;
- minimum public **3 comparables vérifiés** ;
- fraîcheur ≤90 jours ;
- même ville/type/transaction ;
- contrôle de surface ±35 % lorsque la surface cible existe ;
- déduplication par `propertyClusterId`, observation la plus récente ;
- priorité quartier, fallback ville explicite lorsque l'échantillon quartier est insuffisant ;
- distribution calculée sur tout l'échantillon certifié avant le cap des cartes publiques ;
- min / P25 / médiane / P75 / max prix/m² ;
- `comparableStockCount` représente uniquement le nombre de comparables observés, jamais le stock immobilier total ;
- position du prix demandé calculée contre P25–P75 + écart à la médiane ;
- `comparables_certified` et `market_position_certified` dérivés uniquement du modèle L8 certifié ;
- repository Supabase read-only sur `property_listings`, clusters/membres et `source_offer_observations` ;
- clusters d'origine vérifiée et attribution source obligatoires ;
- runtime fail-closed derrière `MARKET_INDEX_READ_ENABLED`, false par défaut ;
- wiring réel `/listings/[id] → AnnouncementPageShell → PropertyDetailV2 → MarketComparablesSection` ;
- disclaimer public : prix affichés observés ≠ prix de transaction ≠ estimation certifiée du bien ;
- ancien benchmark Yakeey conservé comme référence indicative distincte, jamais promu en comparable réel.

## Anomalie rencontrée et corrigée

Le premier run visuel `31951757172` a échoué avec 21 findings textuels alors que la section rendait correctement les trois libellés. Cause : l'audit utilisait `innerText()`, qui reflétait le `text-transform: uppercase` CSS et faisait échouer des recherches de chaînes sensibles à la casse. L'audit a été corrigé pour vérifier le contenu source via `textContent()`. Le run exact-head suivant `31952276940` est **SUCCESS** avec 8/8 captures et 0 finding.

## Comptabilité

- poids ANN-L8 : **10 %**
- progression précédente : **60 %**
- progression après closeout : **70 %**
- prochain chemin critique : **ANN-L9 — AkarEstimate & historique**
