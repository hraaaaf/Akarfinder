# AKARFINDER SEO CANONICAL

> Boussole de reprise du chantier SEO AkarFinder.
> À toute reprise : lire ce fichier puis vérifier `main`, branche/PR, CI, LIVE, Vercel, domaine final et Search Console avant d'agir.

**Statut : ACTIVE**  
**Dernière mise à jour : 2026-09-05**  
**Repo : `hraaaaf/Akarfinder`**  
**Main vérifié : `e62fef258020bef6249c0222feb9e5ee80bab730`**  
**Branche active : `feat/seo5-certified-market-metric-read-model`**  
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
- SEO-5A — market metric publication gate — #1013 ✅, merge `e62fef258020bef6249c0222feb9e5ee80bab730`

Post-merge SEO-5A : **0 déploiement Vercel observé**.

---

## 4. SEO-4 UI — PREUVES

BEFORE LIVE : run **33945702517**, artifact **9963263361**, viewports 390/430/768/1280.  
AFTER vrai composant : run **33946136029**, artifact **9963390475**, mêmes viewports.  
Score visuel : **9,5/10**.

Production non activée sans autorisation Vercel.

---

## 5. SEO-5 — DATA MOAT BASELINE

Sources DB vérifiées :

- `latest_price_m2_references`
- `latest_reliable_condition_price_m2`
- `odm_neighborhood_offer_reliability_metric_v1`
- `odm_neighborhood_offer_reliability_segment_health_v1`
- `published_neighborhood_intelligence`

État actuel :

- `latest_price_m2_references` : **2 lignes**, sample_size=5, confidence=0,3333, statut `provisional` ;
- `latest_reliable_condition_price_m2` : **0 ligne** ;
- ODM `price_per_m2_mad` : 32 métriques, toutes `insufficient`, max sample=2, max sources=2 ;
- `market_representativeness_certified=true` : **0** ;
- `public_activation=true` : **0** ;
- requête avec les filtres exacts SEO-5B : **publishable_rows = 0**.

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

Preuves avant merge #1013 : Scraper regression ✅, tests SEO-5A ✅, TypeScript ✅, Production build ✅.

---

## 7. SEO-5B — CERTIFIED READ MODEL

Branche : `feat/seo5-certified-market-metric-read-model`.

Implémenté avant certification :

- `lib/seo/market-metric-read-model.ts` ;
- lecture serveur service-role uniquement ;
- source `odm_neighborhood_offer_reliability_metric_v1` ;
- préfiltrage DB : `moderate|strong`, certification, activation publique, état non-shadow ;
- second passage par `evaluateMarketMetricPublication()` ;
- normalisation numérique fail-closed ;
- retour `[]` sur erreur ;
- filtres optionnels ville / transaction / métrique ;
- tests de mapping d'une ligne certifiée et rejet des lignes shadow/malformed.

**Aucune page data. Aucune DB write. Snapshot réel attendu et vérifié : 0 métrique publique.**

---

## 8. HUMAN GATES

Autorisation explicite obligatoire pour :

- tout déploiement Vercel ;
- activation/migration `akarfinder.ma` ;
- accès Search Console si intervention utilisateur nécessaire.

---

## 9. NEXT EXACT

1. ouvrir PR SEO-5B ;
2. certifier tests/TypeScript/build ;
3. si vert : merge + post-merge ;
4. tant que `publishable_rows = 0`, **ne créer aucune page baromètre/prix-m²** ;
5. prochaine voie utile : améliorer la qualité/couverture des données qui alimentent l'ODM, puis réévaluer le gate statistique ;
6. production SEO-3C/SEO-4 reste derrière human gate Vercel.
