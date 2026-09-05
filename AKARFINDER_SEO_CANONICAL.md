# AKARFINDER SEO CANONICAL

> Boussole de reprise du chantier SEO AkarFinder.
> À toute reprise : lire ce fichier puis vérifier `main`, branche/PR, CI, LIVE, Vercel, domaine final et Search Console avant d'agir.

**Statut : ACTIVE**  
**Dernière mise à jour : 2026-09-05**  
**Repo : `hraaaaf/Akarfinder`**  
**Main vérifié : `e09faeaafc3d7bf973b51e805a0bb4b466c72818`**  
**Branche active : `docs/seo5c-closeout`**  
**SEO-4 UI : MERGED / PROD PENDING**  
**Preuve baseline : `AKARFINDER_SEO_AUDIT_2026-09-04.md`**

---

## 1. GOAL

Faire du SEO l'avantage compétitif principal d'AkarFinder : stock normalisé + fraîcheur + diversité de sources + pages utiles + données publiées seulement au niveau de preuve réellement atteint.

Règle centrale : **une combinaison de filtres ou une métrique calculée n'est jamais automatiquement une surface SEO publique.**

---

## 2. GATE INVENTAIRE SEO V1

```text
>= 20 offres strictes
ET >= 3 domaines source distincts
```

Fail-closed si preuve absente/invalide/indisponible.

Snapshot revalidé : les 10 couples `5 villes SEO V1 × acheter/louer` passent le gate 20/3.

---

## 3. LOTS MERGÉS

- SEO-3A — gate central — #1000 ✅
- SEO-3B1 — sitemap ville — #1001 ✅
- SEO-3B2 — metadata ville fail-closed — #1002 ✅
- SEO-3B3 — gate quartier — #1003 ✅
- SEO-3C — `/neuf` fail-closed — #1004 ✅ code / **PROD PENDING**
- SEO-4 PREP — contrat ville×intention — #1006 ✅
- SEO-4 UI — landings ville×transaction — #1009 ✅
- SEO-4 closeout — #1012 ✅
- SEO-5A — market metric publication gate — #1013 ✅
- SEO-5B — certified market metric read model — #1014 ✅
- SEO-5C audit Agenz Casablanca read-only — #1018 ✅, merge `7ced567076eae3a6359fb50c0943509e939b1c84`
- SEO-5C auto-run read-only — #1019 ✅, merge `59f079ab6b3f4d0643c3c15d50bbd3c5099d1d98`
- SEO-5C strict sale URL guard — #1020 ✅, merge `e09faeaafc3d7bf973b51e805a0bb4b466c72818`

Aucune action de déploiement Vercel effectuée dans SEO-5C. Aucune écriture Supabase effectuée dans SEO-5C.

---

## 4. SEO-4 UI — PREUVES

BEFORE LIVE : run **33945702517**, artifact **9963263361**, viewports 390/430/768/1280.  
AFTER vrai composant : run **33946136029**, artifact **9963390475**, mêmes viewports.  
Score visuel : **9,5/10**.

Production non activée sans autorisation Vercel.

---

## 5. SEO-5 — DATA MOAT SNAPSHOT RÉEL

Sources DB vérifiées :

- `latest_price_m2_references`
- `latest_reliable_condition_price_m2`
- `odm_neighborhood_offer_reliability_metric_v1`
- `odm_neighborhood_offer_reliability_segment_health_v1`
- `published_neighborhood_intelligence`

Snapshot DB revalidé après SEO-5C, sans ingestion des prix Agenz :

- `latest_price_m2_references` : **2 lignes** ;
- `latest_reliable_condition_price_m2` : **0 ligne** ;
- ODM `price_per_m2_mad` : **32 métriques** ;
- max `sample_count` : **2** ;
- max `source_domain_count` : **2** ;
- `moderate|strong` : **0** ;
- `market_representativeness_certified=true` : **0** ;
- `public_activation=true` : **0** ;
- `publishable_rows` avec les filtres SEO-5B : **0**.

Conclusion : **aucune médiane prix/m² n'est actuellement publiable comme donnée marché SEO.**

Politique ODM source de vérité : `odm_p1c2_metric_reliability_level_v1`.

`strong` : sample>=20, couverture>=75%, fraîcheur>=70%, sources>=3, outliers<=15%, IQR/médiane<=0,75.  
`moderate` : sample>=10, couverture>=60%, fraîcheur>=60%, sources>=2, outliers<=20%, IQR/médiane<=1,00.

Le SEO ne réimplémente pas ces seuils.

---

## 6. SEO-5A — PUBLICATION GATE ✅

`lib/seo/market-metric-publication.ts` bloque toute métrique sauf si :

1. `reliabilityLevel` = `moderate` ou `strong` ;
2. `marketRepresentativenessCertified = true` ;
3. `publicActivation = true` ;
4. `metricState != shadow` ;
5. médiane finie et >0.

---

## 7. SEO-5B — CERTIFIED READ MODEL ✅

`lib/seo/market-metric-read-model.ts` :

- lecture serveur service-role uniquement ;
- source `odm_neighborhood_offer_reliability_metric_v1` ;
- préfiltrage DB : `moderate|strong`, certification, activation publique, état non-shadow ;
- second passage par `evaluateMarketMetricPublication()` ;
- normalisation numérique fail-closed ;
- retour `[]` sur erreur.

**Snapshot réel : 0 métrique publique. Aucune page baromètre/prix-m² ne doit être créée tant que ce nombre reste à 0.**

---

## 8. SEO-5C — AGENZ CASABLANCA PRICE RECOVERY ✅ READ-ONLY

Goal : identifier au moins **32 prix fiables supplémentaires** sur des annonces Agenz Casablanca vente, sans écriture production.

Preuve principale :

- workflow run push : **33964831278** ✅ ;
- artifact : **9969109201** ;
- digest : `sha256:9c7c4bc58edfffe99158f579ab7a5b4cd6c3e9ecd081109a177f0ef96dce2914` ;
- `productionWriteCount = 0` ;
- `queriedRows = 48` ;
- `detailCandidates = 46` ;
- `fetched = 39` ;
- `failed = 7` ;
- `robotsSkipped = 0` ;
- `recoverablePrice = 35` brut.

Validation stricte post-audit : **34 URLs uniques et cohérentes vente Casablanca**. Un faux positif `/location-bureaux/...` a été exclu.

Le garde #1020 impose désormais `/vente-` dans l'URL et couvre le cas observé par test de régression.

**Verdict SEO-5C récupération : Goal >=32 atteint avec 34 cas stricts prouvés.**

Important : ces 34 prix ne sont **pas encore persistés** dans `thin_index_search_documents`. Ils n'ont donc pas encore augmenté les samples ODM ni créé de métrique publiable.

---

## 9. ÉCRITURE DB — ÉTAT

Le writer existant `scripts/scrapers/price-coverage-bounded-write-v6.ts` ne couvre que `mubawab.ma` et `masaken.ma`. Il ne doit pas être réutilisé tel quel pour Agenz.

Toute ingestion Agenz doit être un lot séparé, borné et fail-closed avec au minimum :

- uniquement les candidats Agenz Casablanca vente validés ;
- écriture uniquement si `normalized_price_mad IS NULL` ;
- confirmation explicite d'écriture ;
- plafond de writes ;
- preuve avant/après ;
- recalcul ODM après écriture ;
- aucun changement `public_activation` ou certification implicite.

---

## 10. HUMAN GATES

Autorisation explicite obligatoire pour :

- tout déploiement Vercel ;
- activation/migration `akarfinder.ma` ;
- accès Search Console si intervention utilisateur nécessaire ;
- écriture production des prix Agenz récupérés.

---

## 11. NEXT EXACT

1. préparer un writer Agenz borné, testé et fail-closed, sans l'exécuter en production ;
2. prouver en dry-run la liste exacte et le nombre maximal de lignes écrites ;
3. human gate : autorisation explicite avant écriture production ;
4. si autorisé : écrire uniquement les lignes encore `normalized_price_mad IS NULL` ;
5. revalider DB + ODM + publishable_rows ;
6. tant que `publishable_rows = 0`, ne créer aucune page baromètre/prix-m² ;
7. production SEO-3C/SEO-4 reste derrière human gate Vercel.
