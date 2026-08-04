# ODM Full Cutover 100 % — Certification Production V1

**Statut : CERTIFIÉ — PASS COMPLET le 5 août 2026**  
**Palier Production actif : 100 %**  
**Déploiement runtime certifié : `dpl_2TD7QvPZSiWagox68bRHVZ1xqb3c`**  
**Commit runtime : `e6a6db737ee08061ec224ff77cba89ac6efb6634`**  
**Commit de campagne : `9375bc8d4975aa46033492a79fc0481756a4bc61`**  
**Run de preuve : `30958909536`**

## Verdict

Le read model public ODM sert désormais **100 % des recherches publiques éligibles en Production**.

La campagne a passé **15/15 gates bloquants**. Aucune réponse Legacy n'a été observée. Aucun ranking, schéma, mapping commercial, donnée métier ou règle de publication n'a été modifié pendant l'activation et la certification.

## Activation confirmée

La variable Production active est :

```text
ODM_PUBLIC_CANARY_PERCENT=100
```

Les contrôles de sécurité restent requis :

```text
ODM_PUBLIC_CANARY_ENABLED=true
ODM_PUBLIC_CANARY_APPROVED=true
ODM_PUBLIC_CANARY_STOP=false
```

Le contrôleur conserve un plafond logiciel fail-closed à 100 %. Toute valeur supérieure est interprétée comme 0 % ODM.

Le bucket déterministe 69,64 %, encore Legacy au palier 50 %, a été confirmé ODM après activation.

## Campagne Production certifiée

- **240 requêtes** publiques contrôlées ;
- **120 buckets bas** et **120 buckets hauts** ;
- **240 réponses ODM attendues et observées** ;
- **0 réponse Legacy attendue et observée** ;
- **240/240 réponses HTTP 200** ;
- **10 villes**, **4 types de bien** et **3 intentions** couverts ;
- filtres prix et surface structurés ;
- probes SSR `/search` ;
- aucune écriture de donnée métier ;
- aucun accès d'écriture Vercel utilisé pendant la campagne.

## Résultats

| Indicateur | Résultat |
|---|---:|
| Requêtes | 240 |
| HTTP 200 | 240 |
| ODM attendu / observé | 240 / 240 |
| Legacy attendu / observé | 0 / 0 |
| Buckets bas / hauts | 120 / 120 |
| Requêtes ODM non vides | 112 |
| Villes avec preuve ODM non vide | 10 / 10 |
| Échecs de contrat | 0 |
| Échecs des probes SSR | 0 |
| Taux de routage ODM mesuré | 100 % |
| ODM p50 | 226,59 ms |
| ODM p95 | 503,43 ms |
| ODM p99 | 814,80 ms |
| Moitié basse p95 | 577,02 ms |
| Moitié haute p95 | 473,13 ms |
| SSR visible p50 | 310,94 ms |
| SSR visible p95 | 566,19 ms |

## Gates — 15/15 PASS

- ✅ campagne exacte de 240 requêtes ;
- ✅ plan exact 120 buckets bas / 120 buckets hauts ;
- ✅ 240/240 HTTP 200 ;
- ✅ couverture des dix villes ;
- ✅ couverture des quatre types ;
- ✅ couverture des trois intentions ;
- ✅ 240/240 routes sur ODM ;
- ✅ moitié basse entièrement ODM ;
- ✅ moitié haute entièrement ODM ;
- ✅ aucune fuite de filtre, de contrat ou de politique d'affichage ;
- ✅ taux de bucket compatible avec le cutover total ;
- ✅ au moins 100 preuves ODM non vides et les dix villes représentées ;
- ✅ parité visible `/search` et `/api/search` ;
- ✅ p95 ODM inférieur à 5 secondes ;
- ✅ p99 ODM inférieur à 10 secondes.

## Frontières de sécurité confirmées

Les résultats ODM :

- restent dans la quatrième catégorie commerciale ;
- conservent leur provenance réelle ;
- utilisent le mode `thin_indexed_seed` ;
- exigent la source originale et le CTA `view_original` ;
- n'exposent ni contact, ni galerie, ni miniature non autorisée ;
- ne reçoivent aucun badge premium, partenaire, agence ou promoteur sans signal explicite ;
- respectent les filtres ville, type, intention, prix et surface.

## Santé Production

Vercel n'a signalé **aucune erreur runtime** sur `/search` ou `/api/search` pendant la fenêtre contrôlée incluant la campagne.

## Preuves d'audit

- workflow run : `30958909536` ;
- commit source de la campagne : `9375bc8d4975aa46033492a79fc0481756a4bc61` ;
- artifact : `odm-full-cutover-100-production-certification-v1`, conservé 30 jours ;
- preuve persistée : branche `certification-results` ;
- fichier : `reports/odm-full-cutover-100-production-latest.json` ;
- horodatage de la preuve : `2026-08-04T23:07:56.159Z`.

## Rollback immédiat

Au premier incident bloquant :

```text
ODM_PUBLIC_CANARY_STOP=true
```

Puis revenir au dernier palier certifié précédent :

```text
ODM_PUBLIC_CANARY_PERCENT=50
ODM_PUBLIC_CANARY_STOP=false
```

Créer ensuite un nouveau déploiement Production depuis `main` et vérifier qu'une clé située entre 50 % et 100 % revient au moteur Legacy.

Le rollback ne nécessite ni migration, ni changement de ranking, ni modification de données.

## Limite du LOT

Legacy reste disponible comme chemin de rollback. Il n'est pas supprimé dans ce LOT.

Le prochain LOT doit traiter séparément :

- l'observabilité durable du read model ODM ;
- la simplification du routage public devenu 100 % ODM ;
- la stratégie de retrait progressif de Legacy sans perdre la capacité de rollback ;
- la reprise prioritaire du chantier DATA : acquisition, fraîcheur, profondeur, déduplication et couverture nationale.

## Décision

- **ODM 100 % actif et certifié** ;
- palier maintenu en Production ;
- workflow temporaire supprimé ;
- workflow manuel de recertification conservé ;
- Legacy conservé uniquement comme fallback de sécurité jusqu'au LOT de consolidation.
