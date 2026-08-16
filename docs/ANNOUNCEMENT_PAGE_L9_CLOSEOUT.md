# ANN-L9 — AkarEstimate & historique — Closeout

## Statut

**CLOSED** avec historique de prix affichés certifié et AkarEstimate explicitement fail-closed faute de vérité transactionnelle suffisante. Le lot respecte donc son gate : si les seuils de publication ne peuvent pas être démontrés, l'estimation reste masquée.

## Runtime

- PR runtime : **#761**
- exact head certifié : `eddf2c3de5f6eca538ec940d39c141c9d769bed0`
- merge : `60cbf7d30430c2f7e951c3288073272b00fff980`

## Preuves exact-head

Workflow dédié `Announcement Page L9 AkarEstimate History` :

- run : `31953346300`
- conclusion : **SUCCESS**
- TypeScript : **PASS**
- production build : **PASS**
- Chromium ciblé : **6/6 captures, 0 finding**
- artefact : `9265339960`
- digest : `sha256:3870e5b58284276117ccff2a1eabab2bb48c95bce64e152b0c5252aefe79aee1`

Rapport artefact inspecté : `screenshotCount=6`, `findingCount=0`, aucun `failedResponses` sur les six scénarios.

Transversaux exact-head critiques également **SUCCESS** : Canonical Baseline Validation, Canonical Baseline Compile Validation, Phase 1 P0 Closure, P1 Final Sweep, P2 Residual Closure, UX Gate 0 Contracts, UX P1 Mobile Decision Ergonomics, UX P1 Decision Continuity, Final Design Accessibility, UI All Pages Baseline/Inventory/Certification, UI Polish P5 et Announcement Page L1/L2/L3/L4/L6/L8.

Deux checks globaux ont échoué uniquement au `next build` sur fetch externe Google Fonts `Plus Jakarta Sans` : `UX P1 Design System Convergence` et `Announcement Page L7 Street Reality`. Leurs tests et TypeScript passent ; la même cause réseau est explicitement visible dans les logs et le gate L9 exact-head, qui exécute lui aussi un production build, est SUCCESS. Ils ne démontrent donc pas une régression L9.

## Contrat livré

- timeline = observations réelles de prix affichés uniquement ;
- repository Market Index read-only sur clusters/membres vérifiés et `source_offer_observations` ;
- attribution source et horodatage obligatoires ;
- déduplication stricte sans interpolation ni prix synthétique ;
- runtime fail-closed derrière `MARKET_INDEX_READ_ENABLED` ;
- wiring serveur réel `/listings/[id] → AnnouncementPageShell → AkarEstimateHistorySection` ;
- Truth Contract L0 appliqué à `price_history` et `akar_estimate` ;
- copy publique explicite : prix affiché observé ≠ prix de transaction ;
- contrat AkarEstimate séparé de l'AkarScore ;
- publication d'une estimation interdite sans range valide, version modèle, holdout et politique de publication versionnée.

## Calibration gate DB réelle

Audit Supabase AqarFinder du 2026-08-16 :

- `property_listings` : **5 683** ;
- clusters vérifiés : **5 544** ;
- observations `displayed_price > 0` : **1 162** ;
- offres avec ≥1 observation : **1 020** ;
- offres avec ≥2 observations : **108** ;
- offres avec ≥2 prix distincts : **19** ;
- fenêtre observée : **2026-07-26 → 2026-08-16** ;
- aucune colonne de vérité transactionnelle trouvée pour `sold/sale_price/transaction_price/final_price/closing_price/notary/deed`.

Conclusion : un holdout sur `displayed_price` mesurerait la reproduction du prix demandé, pas la valeur de transaction. **AkarEstimate reste donc masqué**, conformément au gate canonique. Preuve détaillée : `docs/ANNOUNCEMENT_PAGE_L9_CALIBRATION_GATE.md`.

## Comptabilité

- poids ANN-L9 : **6 %**
- progression précédente : **70 %**
- progression après closeout : **76 %**
- prochain chemin critique : **ANN-L10 — Finance Maroc**
