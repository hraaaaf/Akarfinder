# AKARFINDER SEO CANONICAL

> Boussole de reprise du chantier SEO AkarFinder.
> À toute reprise : lire ce fichier puis vérifier `main`, branche/PR, CI, LIVE, Vercel, domaine final et Search Console avant d'agir.

**Statut : ACTIVE**  
**Dernière mise à jour : 2026-09-05**  
**Repo : `hraaaaf/Akarfinder`**  
**Main de départ SEO-5 : `ef5c36aba2b185ee6bf1109bb673b080ee6714ad`**  
**Branche active : `feat/seo5-market-metric-publication-gate`**  
**SEO-4 UI : MERGED / PROD PENDING**  
**Preuve baseline : `AKARFINDER_SEO_AUDIT_2026-09-04.md`**

---

## 1. GOAL

Faire du SEO l'avantage compétitif principal d'AkarFinder : stock normalisé + fraîcheur + diversité de sources + pages utiles + architecture propre + mesure Search Console.

Règle centrale : **une combinaison de filtres ou une métrique calculée n'est jamais automatiquement une surface SEO publique.**

---

## 2. GATE INVENTAIRE SEO V1

```text
>= 20 offres strictes
ET >= 3 domaines source distincts
```

Fail-closed si preuve absente/invalide/indisponible.

Ville/intention : `public.public_search_representations_v1`, `display_eligibility=eligible_primary`, `freshness_status=fresh_confirmed`.

Snapshot revalidé : les 10 couples `5 villes SEO V1 × acheter/louer` passent le gate 20/3.

---

## 3. LOTS MERGÉS

- SEO-3A — gate central — #1000 ✅
- SEO-3B1 — sitemap ville — #1001 ✅
- SEO-3B2 — metadata ville fail-closed — #1002 ✅
- SEO-3B3 — gate quartier — #1003 ✅
- SEO-3C — `/neuf` fail-closed — #1004 ✅ code / **PROD PENDING**
- SEO-4 PREP — contrat ville×intention — #1006 ✅
- SEO-4 UI — landings ville×transaction — #1009 ✅, merge `93c54a04c243e4047c810cdbabe65f8bda37ea2d`
- SEO-4 closeout — #1012 ✅, merge `ef5c36aba2b185ee6bf1109bb673b080ee6714ad`

Aucun déploiement Vercel autorisé/effectué dans ces lots.

---

## 4. SEO-4 UI — PREUVES

BEFORE LIVE : run **33945702517**, artifact **9963263361**, viewports 390/430/768/1280.  
AFTER vrai composant : run **33946136029**, artifact **9963390475**, mêmes viewports.  
Score visuel de revue : **9,5/10**.

Post-merge : 0 déploiement Vercel observé. Les routes SEO-4 ne sont donc pas déclarées LIVE.

---

## 5. SEO-5 — DATA MOAT BASELINE

### Sources DB vérifiées

- `latest_price_m2_references`
- `latest_reliable_condition_price_m2`
- `odm_neighborhood_offer_reliability_metric_v1`
- `odm_neighborhood_offer_reliability_segment_health_v1`
- `published_neighborhood_intelligence`

### État prix/m² actuel

`latest_price_m2_references` :

- **2 lignes seulement** ;
- sample_size **5** sur chaque ligne ;
- confidence **0,3333** ;
- quality_status `provisional` ;
- méthodologie `listing_price_m2_v1` ;
- exemples : Guéliz et Souissi, période jusqu'au 2026-07-25.

`latest_reliable_condition_price_m2` : **0 ligne**.

ODM `price_per_m2_mad` :

- 32 métriques observées ;
- niveau **insufficient** partout ;
- max sample **2** ;
- max sources **2** ;
- **0 market_representativeness_certified** ;
- **0 public_activation**.

Conclusion vérifiée : **aucune médiane prix/m² n'est actuellement publiable comme donnée marché SEO.**

### Politique ODM existante

Source de vérité : `odm_p1c2_metric_reliability_level_v1`.

`strong` :

- sample >=20
- couverture >=75%
- fraîcheur >=70%
- sources >=3
- outliers <=15%
- IQR/médiane <=0,75

`moderate` :

- sample >=10
- couverture >=60%
- fraîcheur >=60%
- sources >=2
- outliers <=20%
- IQR/médiane <=1,00

Le SEO ne réimplémente pas ces seuils : il consomme le niveau calculé par la DB.

---

## 6. SEO-5A — PUBLICATION GATE

Branche : `feat/seo5-market-metric-publication-gate`.

Nouveau contrat `lib/seo/market-metric-publication.ts` : une métrique ne franchit la frontière SEO publique que si :

1. `reliabilityLevel` = `moderate` ou `strong` ;
2. `marketRepresentativenessCertified = true` ;
3. `publicActivation = true` ;
4. `metricState != shadow` ;
5. médiane finie et >0.

Sinon fail-closed avec raison explicite.

Tests ajoutés à la suite SEO existante : shadow, limited, activation/certification, état publié et médianes invalides.

**Aucune page data créée. Aucune DB write.**

---

## 7. HUMAN GATES

Autorisation explicite obligatoire pour :

- tout déploiement Vercel ;
- activation/migration `akarfinder.ma` ;
- accès Search Console si intervention utilisateur nécessaire.

---

## 8. NEXT EXACT

1. certifier SEO-5A par CI ;
2. si vert : merge et post-merge ;
3. SEO-5B : read-model public read-only pour métriques certifiées uniquement ;
4. snapshot des métriques réellement publiables ;
5. tant que snapshot = 0, **aucune page baromètre/prix-m² n'est créée** ;
6. production SEO-3C/SEO-4 reste derrière human gate Vercel.
