# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — MAPLIBRE NATIONAL VALIDÉ / PREMIUM INTERACTIVE MAP EN CERTIFICATION FINALE / PR #1025 DIVERGÉE**  
**Dernière mise à jour : 2026-09-15**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche active : `spike/vivre-ici-maplibre-morocco`**  
**HEAD produit candidat Premium Interactive Map : `4dfdd13044702382c1b3102c31dd5a75362d620c`**  
**Main vérifié : `cc748ec5eb24f422216cb1261e4c01977e7f25d0`**  
**PR #1025 : OPEN / HEAD `449729b77bd076b1c3916fbcaaa0e9bc5d0b765f` / `mergeable=false` au dernier contrôle**  
**Fondation produit : `/map`**  
**Avancement chantier : `92 %`**  
**Vercel : aucun déploiement sans autorisation explicite d’Achraf.**

---

## 1. GOAL / SUCCÈS / PREUVE

### Goal
Transformer `/map` en expérience territoriale premium AkarFinder, scalable du quartier au Maroc, sans fausse précision et sans régression du shell AkarFinder.

### Succès observable
- navigation territoriale cohérente ;
- moteur MapLibre réutilisable sur plusieurs villes/quartiers ;
- captures réelles mobile/tablette/desktop ;
- TypeScript + build + visual gate verts ;
- thème light/dark lisible ;
- shell AkarFinder, logo et metadata SEO conservés ;
- truth gate géographique fail-closed ;
- aucun faux pin immobilier ;
- aucune écriture DB ;
- aucun Vercel sans human gate.

### État du Goal
Le lot historique MapLibre 3D est prouvé. Le nouveau candidat **Premium Interactive Map** est fonctionnellement prouvé sur le run19 ; sa passe finale avec shell AkarFinder restauré reste bloquée en queue GitHub sur le run20. Le chantier global reste ACTIVE.

---

## 2. TARGET LOCK — AUTORITÉ VISUELLE DURABLE

- fichier : `AKARFINDER_VIVRE_ICI_TARGET_FREEZE_2026-09-06.png`
- stockage durable : Google Drive
- Drive ID : `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL`
- dimensions : `1536 × 1024`
- SHA-256 : `c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`
- seuil historique souhaité : `≥9,8/10`

Le TARGET est une autorité de composition et de qualité visuelle. Il n’autorise pas à inventer photo, prix, météo, score, proximité, temps, distance, position ou données immobilières.

Le lot MapLibre satellite historique a plafonné honnêtement à `9,0/10`. Toute ambition `≥9,8` exige un lot provider/imagerie distinct, pas des micro-tweaks de grade.

---

## 3. TRUTH GATE GÉOGRAPHIQUE

Audit production read-only historique :
- `property_listings` : `7 926`, aucune coordonnée exploitable ;
- `geo_entities` : `45`, géométrie exploitable `0` ;
- `geo_resolution_events` : `102`, coordonnée exploitable `0` ;
- `mubawab_listing_corpus_v1` : `37 420`, coordonnée exploitable `0`.

`isExactMapListing` exige `geo_precision="exact"`, provenance `scraped_coordinates|manual_import`, et coordonnées valides au Maroc.

**Conclusion de référence : `0` bien éligible à un pin/callout EXACT.** Aucun faux pin immobilier n’est autorisé.

---

## 4. ARCHITECTURE MAPLIBRE HISTORIQUE VALIDÉE

- `MapLibreNeighborhood3D.tsx` paramétré ville/quartier/centre ;
- MapLibre GL ;
- bâtiments vectoriels globaux OpenFreeMap ;
- Esri imagery = prototype tant que conformité/licence production non explicitement prouvée ;
- données quartier via registre canonique ;
- aucun DB write ;
- aucun déploiement Vercel.

### Scalabilité prouvée
Commit `628947bb24bf247a73c5161b64a25fc47aafe33c` — run `34513592437` ✅

- Casablanca / Maârif : `66` volumes desktop ;
- Rabat / Agdal : `96` ;
- Marrakech / Guéliz : `53` ;
- HTTP `200`, render `ready`, source `available` ;
- required failed requests `0` ;
- DB writes `0`, deployment actions `0`.

### Grade satellite final historique
Commit final `5060ed138237d0e1f08533f2d7ebdcb32fa42b9a` — run `34572349452` ✅ — artifact `10188312451` — digest `sha256:feeea303395bcbba1b4f8b67f154113634130084541c642138c205c4edb65212`.

Grade retenu :
```ts
"raster-brightness-min": 0.20,
"raster-brightness-max": 1,
"raster-contrast": -0.08,
"raster-saturation": 0.12,
```

Score expert historique TARGET ↔ AFTER : cadrage `8,8`, 3D/façades `8,7`, lumière `8,8`, mer/environnement `8,5`, rail/hiérarchie `9,3`, global **`9,0/10`**.

---

## 5. PREMIUM INTERACTIVE MAP — LOT 2026-09-15

### But du lot
Explorer une carte nationale plus simple et premium : **Maroc → région → ville → quartier**, avec données de démonstration explicitement mock-only et sans lecture/écriture Supabase.

### Architecture du candidat
- `components/map/PremiumInteractiveMap.tsx` ;
- TopoJSON ADM1 geoBoundaries ;
- navigation D3 zoom/pan ;
- 12 régions ;
- villes/quartiers mock isolés dans `useMapData()` ;
- CTA quartier vers `/immobilier/{ville}/{quartier}` ;
- CSS correctif dédié `app/map/premium-interactive-map-fixes.css` ;
- aucune requête Supabase attendue ou nécessaire.

### Défauts trouvés puis corrigés
Premier AFTER rejeté :
- polygones quartiers noirs à cause de `color-mix()` utilisé directement dans des attributs SVG ;
- contraste dark incohérent ;
- harness dark écrivait une mauvaise clé de thème ;
- workflow installait et pouvait committer des dépendances pendant la CI ;
- la première intégration supprimait le vrai `SiteHeader`, le logo, les metadata SEO et le footer.

Correctifs :
- tokens SVG calculables via CSS variables / couleurs résolues ;
- dark theme aligné sur `akarfinder-theme` ;
- `npm ci` pur dans le workflow ;
- gate renforcé sur paint SVG, thème, 0 Supabase et viewports communs ;
- shell AkarFinder et metadata SEO restaurés dans le candidat final.

### Preuve run19 — cœur du correctif
HEAD `f6330d1918a18adca61c264d3cc1e589fa52afa5`  
Run `34969344839` — **SUCCESS**  
Artifact `10395808839`  
Digest `sha256:ebab8edda8e3382e8cf0e1f1069f84e5ab224b072dfa82890168c6e27abbcf2f`

Vérifié :
- `npm ci` ✅ ;
- TypeScript ✅ ;
- build ✅ ;
- capture gate ✅ ;
- 12 régions rendues ;
- navigation Casablanca-Settat → Casablanca → quartiers ;
- CTA Maârif `/immobilier/casablanca/maarif` ;
- polygones SVG non noirs ;
- dark mode lisible ;
- overflow horizontal `0` ;
- requêtes Supabase observées `0` ;
- DB write `0` ;
- deployment action `0`.

Captures inspectées : `390×844`, `768×900`, `1280×900`, `1440×900`, plus dark `1280×900`.

### Candidat final avec shell restauré
HEAD produit candidat : `4dfdd13044702382c1b3102c31dd5a75362d620c`.

Ajouts par rapport au run19 :
- `SiteHeader` AkarFinder restauré ;
- logo existant restauré ;
- metadata SEO `/map` restaurées ;
- capture scroll déterministe ;
- gate runtime vérifie la présence du header/logo.

Run final `34969848444` : **QUEUED**, `runner_id=0` au dernier contrôle. Aucun job n’a encore démarré. Le workflow n’a pas de `concurrency` caché et aucun autre run AkarFinder n’était `in_progress` au contrôle.

Fallback local tenté : bloqué par DNS de l’environnement d’exécution (`github.com` non résolu). Aucune certification locale inventée.

Handover dédié : `docs/handovers/2026-09-15-premium-interactive-map-handover.md`, commit `21d8796dfb02d1204e8901da540cbd5404ed9111`.

---

## 6. INTÉGRATION / PR #1025 — ÉTAT RÉEL

PR `#1025` : OPEN, branche `docs/3-vivre-ici-akarfinder`, HEAD `449729b77bd076b1c3916fbcaaa0e9bc5d0b765f`, `mergeable=false` au dernier contrôle.

Latest `main` vérifié : `cc748ec5eb24f422216cb1261e4c01977e7f25d0`.

Compare `main → PR #1025` : **diverged**, PR `231` commits devant et `72` derrière ; merge-base `b8c89681358e93ec254016bcca9b78f4717ea8de`.

Compare `PR HEAD → candidat Premium` : branches fortement divergées. Une intégration automatique par remplacement d’arbre ou merge aveugle risquerait de perdre les évolutions N2/N3/C7, les harness récents et l’architecture déjà accumulée dans la PR.

**Décision actuelle : aucune intégration automatique de Premium Interactive Map dans #1025 avant certification run20 et choix explicite de stratégie d’intégration.**

---

## 7. ROADMAP FORWARD

- [x] TARGET LOCK durable + Drive ID + SHA-256
- [x] truth gate géographique fail-closed
- [x] MapLibre national 3 villes
- [x] intégration MapLibre historique dans `/map`
- [x] grade satellite historique final `9,0/10`
- [x] Premium Interactive Map mock-only construit
- [x] correctif SVG/dark/workflow prouvé par run19
- [x] `0` requête Supabase prouvée sur run19
- [x] shell AkarFinder + SEO restaurés dans candidat `4dfdd130...`
- [ ] run20 final démarré et vert
- [ ] télécharger + inspecter artifact run20
- [ ] montrer captures AFTER finales
- [ ] comparer visuellement run19 ↔ run20 et scorer le candidat
- [ ] décider stratégie d’intégration avec la PR #1025 divergée
- [ ] intégrer sans perte si stratégie retenue
- [ ] mettre à jour body PR #1025
- [ ] re-fetch latest `main` + compare
- [ ] CI PR finale verte
- [ ] **human merge gate PR #1025**
- [ ] post-merge checks
- [ ] audit dépendances npm / vulnérabilités avant claim production-ready
- [ ] valider provider imagerie/licence production
- [ ] Vercel uniquement après autorisation explicite d’Achraf

---

## 8. RISQUES / NON CLOS

1. **Run20 final** : bloqué en queue GitHub, aucun runner attribué ; le shell restauré n’est donc pas encore certifié par CI.
2. **PR #1025 divergée** : intégration non triviale, risque réel de régression/perte d’évolutions si merge naïf.
3. **Premium Interactive Map = mock-only** : les prix/repères visibles sont des fixtures de démonstration, pas des données production.
4. **Provider imagerie production** : Esri reste prototype tant que support/licence/attribution ne sont pas verrouillés.
5. **Dépendances npm** : état historique = `8 vulnerabilities` (`1 moderate / 5 high / 2 critical`) ; audit séparé requis.
6. **Vercel** : aucun déploiement sans autorisation explicite.

---

## 9. PROCÉDURE DE REPRISE

1. Lire ce fichier puis `docs/handovers/2026-09-15-premium-interactive-map-handover.md`.
2. Re-fetch branche, run20, `main`, PR #1025 avant toute mutation Git.
3. Si run20 est vert : télécharger artifact, inspecter les captures, comparer, scorer, puis mettre à jour ce fichier.
4. Ne pas intégrer automatiquement le candidat Premium à #1025 tant que la divergence et la stratégie de migration ne sont pas résolues.
5. Pas de Vercel sans autorisation ; pas de faux pin/chiffre/score.

---

## 10. NEXT EXACT

**Run `34969848444` → dès attribution runner, exécuter `npm ci → TypeScript → build → capture gate` → télécharger artifact → inspecter captures `390/768/1280/1440 + dark` → comparer au run19 → si vert, certifier le candidat `4dfdd130...` et préparer l’arbitrage d’intégration PR #1025.**

### Séquence restante
`run20` → `artifact/captures` → `score` → `stratégie PR #1025` → `intégration sans perte` → `PR body` → `latest main compare` → `CI PR` → `human merge gate` → `post-merge` → `sécurité npm/provider` → `Vercel seulement sur autorisation`.

---

## 11. REPÈRES DE REPRISE

- chantier/lot : `Vivre Ici / Premium Interactive Map`
- Goal : `/map` territorial premium National → Région → Ville → Quartier, truth-safe
- repo : `hraaaaf/Akarfinder`
- branche : `spike/vivre-ici-maplibre-morocco`
- HEAD produit candidat : `4dfdd13044702382c1b3102c31dd5a75362d620c`
- HEAD branche avant présent closeout : `21d8796dfb02d1204e8901da540cbd5404ed9111`
- main : `cc748ec5eb24f422216cb1261e4c01977e7f25d0`
- PR : `#1025` OPEN / HEAD `449729b77bd076b1c3916fbcaaa0e9bc5d0b765f` / `mergeable=false`
- dernière CI prouvée : run19 `34969344839` ✅ SUCCESS
- artifact prouvé : `10395808839`
- CI finale : run20 `34969848444` — QUEUED / runner `0`
- deployment : aucun
- DB : `0 write`
- dernière preuve : run19 vert + captures inspectées + `0` Supabase
- blocage réel : GitHub hosted runner non attribué au run20
- Next exact : exécuter/inspecter run20 dès attribution runner
- avancement global : `92 %`
- effort suivant : `🟡`

**Ce fichier est le single forward tracker de reprise du chantier Vivre Ici.**