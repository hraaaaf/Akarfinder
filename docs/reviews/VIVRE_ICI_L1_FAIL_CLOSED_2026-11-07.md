# Vivre Ici L1 — Truthful empty states, candidate only (07/11/2026)

## Goal
Stop publishing synthetic district prices, POI counts and availability statuses in the national `/map` drilldown. Explain unavailable recent Maârif anchors without fabricating data. Keep national navigation and Search handoff.

## BEFORE evidence
L0 screenshots/summary on exact `main@c0f172bc6755d769a3103051d90c2953f3215de2`: GitHub [run #42320980541](https://github.com/hraaaaf/Akarfinder/actions/runs/42320980541), artifact #13553704238, 12 PNG, 4 viewport sizes. The national city-selection screen itself is **NOT** yet captured; **no UI certification of this patch** is claimed.
Source BEFORE: `PremiumInteractiveMap.useMapData()` contains **45** hard-coded `stats` objects including Maârif 17 600 DH/m² and 15 « repères vérifiés »; `P4MapDecisionRail` describes 0 anchors as « 0 repère sourcé ». Certified POI seed observed **2026-08-16**, freshness policy **30 days**; Nov 7 makes them stale, so a count of zero is expected by current data policy, not itself evidence of a broken map.

## Target/micro-mockup and implementation
- **City panel BEFORE**: quartier / mock « disponible », prix, repères « vérifiés », CTA.
- **City panel TARGET candidate**: quartier / « Prix et repères locaux indisponibles dans cette vue » / CTA unchanged. Row text « Informations locales à documenter ».
- **Map TARGET**: retain national/topology and existing selection UI, with an explicit « Schéma illustratif · formes et positions sans valeur géographique » label until L2 removes synthetic polygons or replaces them with sourced geography. **This is NOT a final approval of synthetic geometry.**
- **Maârif rail TARGET**: when `anchor_count===0`, say « Aucun repère suffisamment récent n’est actuellement disponible »; if a validated context with anchors becomes available later, keep the existing sourced-count claim.
- **Security**: no DB fetch change, no provider freshness reset, no permission/license change, no Vercel changes, `git.deploymentEnabled:false`.

Files edited: `components/map/PremiumInteractiveMap.tsx`, `components/map/P4MapDecisionRail.tsx`, source-only regression test `scripts/audits/vivre-ici-l1-truth-contract.mjs`. Old mock values are removed rather than merely hidden in JSX. `data-db-mode="mock-only"` remains as an internal marker used by previous browser tests, not user-visible text.

## Success / Proof and gates
1. **Source tests** (node --test) reject any `priceRepere`/`landmarksVerified` reintroduction, require zero-count fallback and preserve the 30-day freshness rule. Tests should run on the branch and pass on exact HEAD.
2. **Required PR `gate`** must pass type checks/policy. This certifies source/TS, not browser UI.
3. **AFTER** screenshots of the same 4 viewports **including national city drilldown and Maârif**; tests verifying no fictional numbers and CTA, no mobile overlap/overflow, no extra invalid map attribution.
4. **L0 remaining**: direct keyboard/touch interactions, real administrative 3-view mode baseline (currently missing), source attribution verification. The existing synthetic polygons and faux 2D/3D mode UI remain **open risks** outside this L1 micro-patch.
5. **Human merge gate** : no merge or Vercel deploy without owner approval. Keep PR candidate open after tests; do not label L1 complete before AFTER.

**Status**: implementation candidate / source checks, awaiting exact-head CI and browser AFTER; no production claims.

## Contrat de non-régression intégré au `gate` (07/11/2026)

`scripts/ci/required-pr-gate.test.mjs` importe désormais `../audits/vivre-ici-l1-truth-contract.mjs`. Ce n'est **pas** une modification du workflow GitHub ni un allègement de son contrôle : le job requis `gate` exécute ses tests Node existants **plus** ce test source à chaque PR vers main. Le test empêche la réintroduction des champs `priceRepere`, `landmarksVerified`, vérifie la sortie « données indisponibles » et l'expiration de la seed POI avec TTL 30 jours. Le test est retenu uniquement si le run `gate` exact-head passe. Pas de fusion/Vercel.

## P1A.6 false red corrigé sans affaiblir la couverture (07/11/2026)

La CI HEAD `7034ccf` [P1A.6 #42357184686](https://github.com/hraaaaf/Akarfinder/actions/runs/42357184686) avait **12 findings**, exactement trois marqueurs obsolètes de `/map` × 4 viewports : canvas MapLibre absent, `__AKARFINDER_NATIONAL_MAP__` absent et HTTP `/api/geo/national-territories` non émis. Ces marqueurs appartiennent au moteur *ville* ; depuis `app/map/page.tsx`, `/map` initial utilise `PremiumInteractiveMapBridge` (SVG/TopoJSON), dont le run BEFORE #98 prouve 12 régions et `topologyState=ready`.

**Correctif du harness**, pas du code produit : la route nationale exige désormais `[data-premium-map]` visible + `data-topology-state=ready` + **12** chemins SVG `[data-region-slug]` + **12** boutons région `[data-region-list-slug]`. La vérification MapLibre demeure obligatoire sur les routes ville/quartier ; les checks HTTP, débordement, page errors, screenshots et city/Agdal demeurent. Le viewport tablette devient **768×900** (même fixture que la baseline #98, au lieu de 768×1024). Tests structurels P1A.6 mis à jour pour rejeter le retour aux fausses attentes. Le résultat ne sera validé qu'après rerun exact HEAD et artifact réel.

**Autre rouge non traité** : P1B.2 #42357184673 échoue sur l'API prix HTTP 503 / résolution DNS Supabase ENOTFOUND (voir ancien run #42356891977), indépendant du composant corrigé. Ne pas déclarer la CI intégrale verte.
