# AKARFINDER SEO CANONICAL

> Boussole de reprise du chantier SEO AkarFinder.
> À toute reprise : lire ce fichier puis vérifier `main`, branche/PR, CI, LIVE, Vercel, domaine final et Search Console avant d'agir.

**Statut : ACTIVE — SEO-5D prix écrit / bridge géographique bloquant**  
**Dernière mise à jour : 2026-09-05**  
**Repo : `hraaaaf/Akarfinder`**  
**Main vérifié avant ce closeout : `d2547d855e2f79467c66356e052e72f150023b52`**  
**Branche closeout : `docs/seo5d-prod-write-closeout`**  
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

---

## 3. LOTS SEO-5 AGENZ MERGÉS

- SEO-5C audit Agenz Casablanca read-only — #1018 ✅ — `7ced567076eae3a6359fb50c0943509e939b1c84`
- SEO-5C auto-run read-only — #1019 ✅ — `59f079ab6b3f4d0643c3c15d50bbd3c5099d1d98`
- SEO-5C strict sale URL guard — #1020 ✅ — `e09faeaafc3d7bf973b51e805a0bb4b466c72818`
- SEO-5C canonical closeout — #1021 ✅ — merge `c3de3a4bd26ace2acdb6246c6aa6ace1c3f24476`
- SEO-5D bounded Agenz writer — #1022 ✅ — merge `6fc1f58aa4d1fa24f843accbef6a9e5f094c3252`
- SEO-5D Agenz 429 backoff — #1023 ✅ — merge `2c71da514e3b1736f72a9228557e772197ec1dc3`

Aucune action Vercel dans SEO-5C/5D.

---

## 4. SEO-5C — RÉCUPÉRATION PRIX ✅

Goal : identifier au moins **32 prix fiables supplémentaires** sur des annonces Agenz Casablanca vente.

Preuve initiale :
- run `33964831278` ✅ ;
- artifact `9969109201` ;
- digest `sha256:9c7c4bc58edfffe99158f579ab7a5b4cd6c3e9ecd081109a177f0ef96dce2914` ;
- 35 récupérables bruts ;
- **34 ventes Casablanca strictes** après exclusion d'un faux positif location ;
- `productionWriteCount = 0` sur l'audit.

Le garde #1020 exige `/immo-casablanca/` + `/vente-`.

---

## 5. SEO-5D — DRY-RUN FINAL ✅

Le premier dry-run writer était limité par HTTP 429 : 15 fiables / 29 échecs.

Après #1023 :
- run push `33971871115` ✅ ;
- artifact `9971203492` ;
- digest `sha256:9e3e7e0a73f7d042c3b05f6f9b060cf60359a7ca7938250c81c664416ee26265` ;
- `queriedRows = 48` ;
- `detailCandidates = 45` ;
- `fetched = 38` ;
- `failed = 0` ;
- `robotsSkipped = 0` ;
- `reliable = 34` ;
- `productionWriteCount = 0`.

Writer fail-closed : max 34, confirmation exacte, scope Agenz/Casablanca/vente/URL exacte, prix `IS NULL`.

---

## 6. SEO-5D — ÉCRITURE PROD PRIX ✅ VÉRIFIÉE

Autorisation utilisateur explicite reçue le 2026-09-05.

Préflight DB exact sur les 34 preuves :
- evidence rows : **34** ;
- matched : **34** ;
- encore `normalized_price_mad IS NULL` : **34** ;
- déjà pricées : **0** ;
- manquantes : **0** ;
- scope mismatch : **0**.

Une première tentative de requête atomique a échoué avant mutation à cause d'un garde SQL `1/0`. **Aucune ligne n'a été modifiée par cette tentative.**

La seconde requête fail-closed n'autorisait l'UPDATE que si la cohorte éligible restait exactement à 34.

Résultat :
- eligible_rows : **34** ;
- updated_rows : **34**.

Post-write exact :
- checked_rows : **34** ;
- exact_match_rows : **34** ;
- still_null_rows : **0** ;
- mismatch_rows : **0**.

**Verdict : les 34 `normalized_price_mad` Agenz Casablanca vente sont persistés exactement comme prouvés.**

Aucune certification, `public_activation`, colonne dérivée prix/m² ou autre champ n'a été modifié.

---

## 7. ODM APRÈS ÉCRITURE — INCHANGÉ

Snapshot immédiatement après ingestion :
- `latest_price_m2_references` : **2** ;
- `latest_reliable_condition_price_m2` : **0** ;
- ODM `price_per_m2_mad` : **32 métriques** ;
- max `sample_count` : **2** ;
- max `source_domain_count` : **2** ;
- `moderate|strong` : **0** ;
- `market_representativeness_certified=true` : **0** ;
- `public_activation=true` : **0** ;
- `publishable_rows` : **0**.

Conclusion : **aucune médiane prix/m² n'est encore publiable.**

Politique source de vérité : `odm_p1c2_metric_reliability_level_v1`.

`strong` : sample>=20, couverture>=75%, fraîcheur>=70%, sources>=3, outliers<=15%, IQR/médiane<=0,75.  
`moderate` : sample>=10, couverture>=60%, fraîcheur>=60%, sources>=2, outliers<=20%, IQR/médiane<=1,00.

---

## 8. CAUSE RACINE ODM — BRIDGE GÉOGRAPHIQUE

Les 34 rows ont prix + surface. Les colonnes `price_per_m2_mad` / `normalized_price_m2` sont NULL, mais **ce n'est pas le blocage** : `odm_neighborhood_offer_shadow_listing_v1` sait calculer le fallback `normalized_price_mad / normalized_surface_m2`.

Preuve du vrai blocage :
- cohorte : **34** ;
- présente dans `odm_territorial_metric_listing_join_v1` : **0/34** ;
- présente dans `odm_neighborhood_offer_shadow_listing_v1` : **0/34** ;
- `geo_resolution_events` existants : **0/34**.

La vue territoriale exige un dernier `geo_resolution_event` avec :
- `source_record_type = 'source_offer_seed'` ;
- `resolution_status = 'resolved'` ;
- `resolved_neighborhood_id IS NOT NULL`.

Resolvers canoniques audités :
- `odm_p1b4_geo_recovery_*` : alias exact, pas de fuzzy/inférence ;
- `odm_p1b5_geo_normalization_*` : normalisation canonique confidence=1, pas de fuzzy/inférence.

Dry-run exact des 34 :
- P1B.4 exact alias candidates : **0** ;
- P1B.5 canonical normalization candidates : **0** ;
- unique safe candidates : **0**.

Cause :
- `coverage_bridge` présent : **0/34** ;
- `property_listing_id` bridge : **0/34** ;
- property listing correspondante : **0/34** ;
- district persistant via ce bridge : **0/34**.

Les métadonnées de seeds n'exposent pas de district/neighborhood structuré fiable. Des mentions textuelles de “quartier” existent dans une partie du contenu de recherche, mais elles ne constituent pas une preuve géographique canonique et **ne doivent pas être promues en résolution ODM**.

---

## 9. PUBLICATION GATE

`lib/seo/market-metric-publication.ts` bloque toute métrique sauf si :
1. reliability = `moderate|strong` ;
2. representativeness certified ;
3. public activation ;
4. état non-shadow ;
5. médiane finie et >0.

**Tant que `publishable_rows = 0`, aucune page baromètre/prix-m² ne doit être créée.**

---

## 10. HUMAN GATES

Autorisation explicite obligatoire pour :
- tout déploiement Vercel ;
- activation/migration `akarfinder.ma` ;
- Search Console si intervention utilisateur requise ;
- toute nouvelle écriture sémantique de géographie Agenz (`coverage_bridge`, property listing bridge ou `geo_resolution_events`) qui n'est pas déjà prouvée par un resolver canonique fail-closed.

Le human gate précédent pour les **34 prix** a été utilisé et clôturé avec preuve 34/34.

---

## 11. NEXT EXACT

1. construire un **dry-run Agenz geo-bridge** borné aux 34 seeds, basé uniquement sur une preuve de quartier explicite et persistable ;
2. interdire fuzzy matching, inférence depuis slug URL, titre seul, coordonnées/proximité ou SERP non canonique ;
3. vérifier chaque candidat contre `geo_aliases` / `geo_entities` validés et ville parent Casablanca ;
4. produire la cohorte exacte résoluble sans write ;
5. human gate avant toute nouvelle écriture géographique production ;
6. si autorisé : écrire uniquement les événements/bridges prouvés, puis revalider territorial join + ODM + `publishable_rows` ;
7. production SEO UI reste derrière human gate Vercel.
