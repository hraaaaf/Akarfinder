# 3 — Vivre Ici AkarFinder

**Statut : ACTIVE — N3 NATIONAL PROUVÉ / UX L9 PROUVÉ / SYNTHETIC MARKET PROUVÉ / LIVE DATA BLOQUÉ PAR SUPABASE / PR DIRTY VS MAIN**  
**Dernière mise à jour : 2026-09-17**  
**Repo : `hraaaaf/Akarfinder`**  
**Branche active : `docs/3-vivre-ici-akarfinder`**  
**PR : #1025 OPEN / `mergeable=false` / `mergeable_state=dirty` au contrôle 2026-09-17**  
**HEAD produit+harness UX L9 certifié : `f1f4d35ecdd0a5a6b83df1dc945e2d291e9b2533`**  
**Main vérifié : `8578f7a492980dcac35e7a094383c70411ca44c5` — 73 commits après la base PR historique `b8c89681358e93ec254016bcca9b78f4717ea8de`**  
**Fondation produit : `/map`**  
**Avancement chantier canonique : `92 %` — conservé, non recalculé tant que le gate Supabase live reste bloqué.**  
**Vercel : aucun déploiement sans autorisation explicite d’Achraf.**

---

## 1. GOAL / SUCCÈS / PREUVE

### Goal
Faire de `/map` une expérience territoriale premium scalable du Maroc au quartier : national → ville → quartier → MapLibre 3D → recherche, avec intelligence marché séparée, truth gate fail-closed et aucune fausse précision immobilière.

### Succès observable
- MapLibre quartier réutilisable multi-ville ;
- parcours national N3 réel jusqu’à `/search` ;
- intelligence marché C7 distincte du parcours exploration N3 ;
- fallback national truth-safe ;
- responsive `390 / 430 / 768 / 1280` ;
- aucune donnée synthétique en DB ni fallback synthétique silencieux ;
- gates live restent fail-closed si Supabase est indisponible ;
- aucun déploiement Vercel sans human gate.

### État du Goal
**Interne/UI : prouvé. Live data : non certifiable actuellement à cause du quota Supabase. Intégration PR : bloquée par conflits avec le `main` courant.**

---

## 2. TARGET LOCK — AUTORITÉ VISUELLE

- fichier : `AKARFINDER_VIVRE_ICI_TARGET_FREEZE_2026-09-06.png`
- Drive ID : `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL`
- dimensions : `1536 × 1024`
- SHA-256 : `c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`
- score historique MapLibre vs TARGET : **9,0/10** ; seuil `≥9,8` non certifié.
- score visuel interne après convergence UX L9 du 2026-09-17 : **9,2/10** ; amélioration nette du cadrage national et de la hiérarchie N3, sans prétendre au seuil `≥9,8`.

Le TARGET n’autorise jamais à inventer photo, prix, météo, score, proximité, distance, position ou donnée immobilière.

---

## 3. ARCHITECTURE RETENUE

- `MapLibreNeighborhood3D.tsx` paramétré ville/quartier/centre ;
- MapLibre GL ;
- bâtiments vectoriels OpenFreeMap ;
- imagerie Esri = prototype uniquement tant que licence/support production + attribution visible ne sont pas prouvés ;
- `/map` route les couples ville+quartier canoniques vers MapLibre en `layer=explore` ;
- ville seule / fallback non canonique restent dans l’expérience nationale ;
- C7 intelligence marché conserve `layer=price|density|listings` ;
- truth gate géographique fail-closed ; aucun faux pin immobilier ;
- aucun DB write dans ce chantier.

### Grade satellite gelé
```ts
"raster-brightness-min": 0.20,
"raster-brightness-max": 1,
"raster-contrast": -0.08,
"raster-saturation": 0.12,
```

Référence visuelle finale historique : commit `5060ed138237d0e1f08533f2d7ebdcb32fa42b9a`, run `34572349452` ✅, artifact `10188312451`, digest `sha256:feeea303395bcbba1b4f8b67f154113634130084541c642138c205c4edb65212`.

---

## 4. PREUVES NATIONAL / QUARTIER

### N2 — fallback national truth-safe
Run `34585399296` ✅ SUCCESS.

- `390 / 430 / 768 / 1280` : overflow `0` ;
- fallback sans centre visible ;
- handoff recherche vrai ;
- aucun faux fill ;
- 134/134 repères centrés valides ;
- 0 contour certifié publié quand la preuve manque.

### Rail MapLibre
Run `34583773109` ✅ SUCCESS.

Desktop `1280×900` : layout `836px` jusqu’à `900`, rail `810px` jusqu’à `874`, scroll interne, overflow horizontal `0`, handoff Search intact.

### N3 National Journey
Runs historiques :
- `34619850294` ✅ ;
- `34624935625` ✅.

Contrat browser certifié :
`/map national → Casablanca → Maârif → MapLibre ready → rail P4 → /search?city=Casablanca&district=Maârif`.

Le correctif C7 n’a donc pas régressé N3.

---

## 5. SYNTHETIC MARKET LANE — PREUVE INTERNE SANS SUPABASE

But : continuer à certifier UI/UX, MapLibre, couches marché, rich sheet et handoff Search sans transformer des données synthétiques en vérité marché.

Règles :
- fixtures injectées uniquement via Playwright ;
- vrais builders métier ;
- aucune donnée synthétique en DB ;
- aucune modification API production pour les fixtures ;
- marqueur explicite `synthetic-market-v1` / `synthetic-ui-only` ;
- les gates live restent séparés et fail-closed.

### Bug produit découvert
C7 et N3 partageaient `layer=explore`. Après clic d’une zone marché Rabat, N3 remplaçait C7 par MapLibre quartier avant rendu de `RabatMarketZoneSheet`.

Correctif produit `3842cf6d0d4ceea84a050a411fb56e67952dd318` :
- N3 quartier → `layer=explore` ;
- C7 marché → conserve `price|density|listings` ;
- diff produit : `components/map/RabatMarketIntelligenceExperience.tsx`, `+7/-2`.

Harness C5 réaligné par `4c5161c12d80fe45ec74d0650b160f8fb1950c92` : `layer=explore → layer=price`, diff `1 ligne / 1 ligne`, aucun produit.

### Certification synthétique finale
Run `34624935672` ✅ SUCCESS.  
Artifact `10273807531`.  
Digest `sha256:17a13f57cbb314e413dd873192c23c0a896400d4c94b186a563826ea5f5b64b4`.

`report.json` :
- `ok: true` ;
- fixture `synthetic-market-v1` ;
- truth scope `synthetic-ui-only` ;
- Casablanca prix : `390` et `1280`, `canvasCount=1`, `priceMode=true`, overflow horizontal `0` ;
- Rabat C7 : `390` et `1280`, zone sélectionnée `Hassan`, rich sheet visible, CTA Search `/search?city=Rabat&district=Hassan&transaction_type=buy`.

Captures finales de référence dans l’artifact :
- `rabat-390-zone-sheet.png` ;
- `rabat-1280-zone-sheet.png` ;
- couches `price / density / listings` aux deux viewports.

---

## 6. LIVE DATA — BLOCAGE EXTERNE SUPABASE

Projet Supabase `AqarFinder` : control-plane `ACTIVE_HEALTHY`. Organisation : plan Free.

Message vérifié dans les logs :
`Service for this project is restricted due to the following violations: exceed_egress_quota.`

Gates live impactés :
- `P1B.2 Territorial Intelligence` ;
- `Carte National Market BEFORE` ;
- `Carte C7 Final Certification` ;
- `Carte C5 Rich Zone Sheet Browser` atteint désormais correctement C5 marché puis échoue sur `C3 API price/sale returned 503`.

**Conclusion : aucun correctif code honnête ne peut rendre ces gates live verts tant que l’accès Supabase n’est pas restauré.** Ne pas rerun en boucle.

---

## 7. UX CONVERGENCE L9 — 2026-09-17

### Goal
Faire dominer le territoire dans la vue nationale et simplifier N3 en mode map-first, surtout mobile, sans casser le contrat N3/Search ni inventer un contrat bbox absent.

### Implémentation
Commits produit/harness :
- `edf7f95c004f71427c92bff61dc38525863d4801` — cadrage national + hiérarchie N3 + retour territorial + harness ;
- `f1f4d35ecdd0a5a6b83df1dc945e2d291e9b2533` — séparation visuelle des règles de fiabilité.

Changements prouvés :
- Maroc agrandi dans le canvas national ;
- rail national desktop resserré ;
- N3 mobile ramené à titre + CTA réel ;
- cartes `0 repères / 0 catégories / Exact` masquées quand `anchor_count=0` ;
- retour territorial réel `← Maroc` → `/map?layer=explore` ;
- CTA existant conservé → `/search?city=Casablanca&district=Ma%C3%A2rif` ;
- aucun faux `Rechercher dans cette zone` : aucun contrat bbox/bounds n’a été prouvé.

### Preuves exact-HEAD
Run `35271588119` — **Vivre Ici AFTER Certification — SUCCESS** sur `f1f4d35e…`.  
Run `35271588076` — **Carte National Journey N3 Certification — SUCCESS** sur `f1f4d35e…`.  
Run `35271023716` — **Vivre Ici Premium Interactive Integration — SUCCESS** sur le commit fonctionnel `edf7f95c…`; le commit suivant ne modifie que le CSS de proofline.

Artifact AFTER final :
- ID `10519291559` ;
- digest `sha256:4e280feee73a0881b2bcb565f98fdf031d44d637781b5722e2c90f93281fc5e8`.

Matrice AFTER : `390×844 / 430×932 / 768×900 / 1280×900`, national + N3 = 8 scénarios.

Résultats automatisés sur les 8 scénarios :
- HTTP `200` ;
- overflow horizontal `0` ;
- requêtes Supabase observées `0` ;
- erreurs page `0` ;
- national : TopoJSON `ready`, `12` régions, `12` entrées ;
- N3 : MapLibre `ready`, source `openfreemap-vector`, bâtiments `>0` ;
- `anchor_count=0` → signal grid masquée ;
- retour Maroc et CTA Search exacts ;
- script : `zeroDbWritesByScript=true`, `zeroDeploymentActionsByScript=true`.

### Audit visuel
BEFORE de référence : run `34977355451` ✅ sur `1213342725ae053b63254fb5444331d8d8be66f6`.

AFTER : territoire national nettement plus présent ; N3 mobile libère la carte ; desktop évite les faux indicateurs zéro ; règles de fiabilité distinctes et lisibles.

Score interne honnête : **9,2/10**. Le seuil `≥9,8` n’est pas déclaré atteint : l’intégration avec le shell `main` courant reste à résoudre et le live Supabase reste bloqué.

---

## 8. RISQUES PRODUCTION OUVERTS

1. **Supabase egress** : human/financial gate externe.
2. **Intégration PR #1025** : `mergeable=false`, `mergeable_state=dirty`; branche longue `245` commits, `71` fichiers modifiés ; `main` a avancé de `73` commits depuis la base historique de la PR. Résolution ciblée requise, pas de merge/rebase sauvage.
3. **Provider imagerie** : OpenFreeMap utilisable sous attribution ; Esri World Imagery actuel reste prototype tant que licence/token/support production ne sont pas verrouillés. `attributionControl: false` doit aussi être traité avec le provider final.
4. **Sécurité npm** : logs historiques = `8 vulnerabilities` (`1 moderate / 5 high / 2 critical`). Lockfile Next.js `15.5.19`; lot sécurité séparé, pas de `npm audit fix --force` aveugle.
5. **Vercel** : aucun déploiement sans autorisation explicite.

### Conflit shell déjà qualifié
`main` a refactoré la navigation mobile vers `PRODUCT_MOBILE_BOTTOM_NAV`. Le `main` courant porte déjà `/map` avec le libellé **Vivre ici** dans `lib/product-navigation.ts`. Lors de la résolution, préserver l’architecture courante de `main` plutôt que restaurer l’ancienne implémentation `MobileBottomNav` de la branche longue.

---

## 9. ROADMAP / CLOSEOUT

- [x] TARGET LOCK durable
- [x] truth gate fail-closed
- [x] MapLibre national / multi-ville
- [x] MapLibre Maârif intégré
- [x] responsive rail / overflow corrigé
- [x] N2 fallback national certifié
- [x] N3 national → ville → quartier → MapLibre → Search certifié
- [x] lane synthétique séparée créée
- [x] conflit C7/N3 découvert et corrigé
- [x] Synthetic Market final vert + captures
- [x] C5 harness réaligné sur le contrat marché
- [x] UX convergence L9 national + N3 certifiée `390/430/768/1280`
- [x] zero-state N3 truth-safe : faux indicateurs zéro supprimés lorsque `anchor_count=0`
- [x] retour territorial N3 → national ajouté et certifié
- [x] re-fetch `main`, PR HEAD et mergeability effectué le 2026-09-17
- [ ] restaurer l’accès Supabase
- [ ] rerun ciblé des gates live concernés
- [ ] résoudre l’intégration PR #1025 avec le `main` courant en préservant le nouveau shell/navigation
- [ ] rerun AFTER/N3 exact-HEAD après résolution d’intégration
- [ ] **human merge gate PR #1025**
- [ ] merge autorisé + post-merge checks
- [ ] lot sécurité Next/npm
- [ ] décision provider/licence/attribution
- [ ] Vercel seulement avec autorisation explicite

---

## 10. NEXT EXACT

1. Conserver les gates live fail-closed tant que Supabase est restreint.
2. Préparer la résolution ciblée PR #1025 ↔ `main` courant ; **ne pas rebase/force-push la branche longue sans human gate**, car l’opération réécrit une branche de 245 commits et touche le shell partagé.
3. Après autorisation de cette intégration : préserver les composants/navigation courants de `main`, réappliquer uniquement les deltas Vivre Ici nécessaires, puis rerun AFTER/N3 aux mêmes viewports.
4. Dès restauration Supabase : rerun uniquement les workflows live échoués.
5. Si intégration + live sont verts : s’arrêter au **human merge gate PR #1025**.
6. Après merge autorisé : post-merge, sécurité npm/Next, provider, puis Vercel uniquement sur autorisation explicite.

---

## 11. RÈGLES DE REPRISE

- lire ce fichier en premier ;
- vérifier HEAD/PR/CI avant toute écriture ;
- toute capture réalisée doit être montrée ;
- ne jamais confondre fixtures synthétiques et données live ;
- aucun faux pin/chiffre/score ;
- pas de Vercel sans permission ;
- ne pas rouvrir le grade satellite sans nouveau lot/provider.

`3-vivre-ici-akarfinder.md — Vivre Ici AkarFinder — 92 %`
