# AkarFinder — Vivre Ici / MapLibre — Handover 2026-09-11

## Goal
Finaliser `/map` comme parcours territorial scalable : Maroc → ville → quartier → MapLibre → recherche, tout en gardant l’intelligence marché C7 distincte, truth-safe et fail-closed.

## Autorité canonique
Lire d’abord `3-vivre-ici-akarfinder.md`.

TARGET durable :
- fichier `AKARFINDER_VIVRE_ICI_TARGET_FREEZE_2026-09-06.png`
- Drive ID `1nt6ouxqGp-z6cHnj5A3iQHmw8I_YnGFL`
- SHA-256 `c552bc2d4ef669394694f71027c9852a6c56d155b7853a27f2e9e672942637c8`

## État vérifié
- repo : `hraaaaf/Akarfinder`
- branche : `docs/3-vivre-ici-akarfinder`
- PR : #1025 OPEN / mergeable au dernier contrôle
- HEAD produit+harness avant ce closeout docs : `4c5161c12d80fe45ec74d0650b160f8fb1950c92`
- dernier correctif produit : `3842cf6d0d4ceea84a050a411fb56e67952dd318`
- main vérifié : `df8b8d9a493553d5fa39ea8b0fa0ee789cf71ee2`
- Vercel : aucun déploiement
- DB : aucun write du chantier
- avancement canonique conservé : `92 %`

## Preuves majeures

### Visuel MapLibre final
- référence historique : `5060ed138237d0e1f08533f2d7ebdcb32fa42b9a`
- run `34572349452` ✅
- artifact `10188312451`
- digest `sha256:feeea303395bcbba1b4f8b67f154113634130084541c642138c205c4edb65212`
- score TARGET honnête : `9,0/10`

### N2
Run `34585399296` ✅ : fallback national truth-safe sur `390/430/768/1280`, overflow `0`, aucun faux fill.

### N3 National Journey
Runs `34619850294` ✅ et `34624935625` ✅.

Contrat : `/map national → Casablanca → Maârif → MapLibre ready → rail P4 → /search?city=Casablanca&district=Maârif` sur `390×844` et `1280×900`.

### Synthetic Market
Run final `34624935672` ✅.  
Artifact `10273807531`.  
Digest `sha256:17a13f57cbb314e413dd873192c23c0a896400d4c94b186a563826ea5f5b64b4`.

`report.json` : `ok=true`, fixture `synthetic-market-v1`, truth scope `synthetic-ui-only`.

Preuves :
- Casablanca prix 390/1280 : MapLibre canvas présent, price mode actif, overflow horizontal 0 ;
- Rabat C7 390/1280 : zone Hassan sélectionnée, rich sheet visible, CTA `/search?city=Rabat&district=Hassan&transaction_type=buy` ;
- couches price/density/listings capturées.

## Bug produit découvert et corrigé
C7 marché et N3 partageaient `layer=explore`, donc un clic zone marché pouvait basculer vers MapLibre quartier avant rendu de la rich sheet.

Correctif `3842cf6d...` :
- N3 → `layer=explore`
- C7 → conserve `price|density|listings`

C5 harness réaligné par `4c5161c1...` sur `layer=price`.

## Blocage externe Supabase
Control-plane projet : `ACTIVE_HEALTHY`, organisation Free.

Logs live : `exceed_egress_quota` → HTTP 503.

Impacte au minimum :
- P1B.2 Territorial Intelligence
- Carte National Market BEFORE
- Carte C7 Final Certification
- C5 Browser live

Ne pas neutraliser ces gates. Ne pas rerun en boucle. La lane synthétique ne remplace pas la certification live.

## Risques production ouverts
- Esri World Imagery : prototype tant que licence/token/support prod + attribution visible non verrouillés.
- `attributionControl: false` doit être traité avec le provider final.
- npm : 8 vulnérabilités (`1 moderate / 5 high / 2 critical`). Next lockfile `15.5.19`; lot sécurité séparé.
- aucun Vercel sans autorisation explicite.

## Next exact
1. Attendre/restaurer l’accès Supabase via human financial gate.
2. Rerun uniquement les workflows live échoués.
3. Si verts : re-fetch `main`, PR HEAD, mergeability.
4. S’arrêter au **human merge gate PR #1025**.
5. Après autorisation : merge + post-merge checks.
6. Puis lot sécurité Next/npm + provider/licence/attribution.
7. Vercel seulement sur autorisation explicite.

## Séquence restante
`Supabase restauré` → `rerun gates live` → `latest main/PR compare` → `human merge gate` → `merge autorisé` → `post-merge` → `sécurité/provider` → `Vercel avec autorisation`.

## Règles de reprise
- lire le canonique d’abord ;
- vérifier HEAD/PR/CI avant toute écriture ;
- montrer toute capture produite ;
- ne jamais confondre synthétique et live ;
- pas de faux pin, faux score ou fausse précision ;
- pas de Vercel sans permission.
