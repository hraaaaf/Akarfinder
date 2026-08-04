# ODM Canary 25 % — Certification Production V1

**Statut : CERTIFIÉ — PASS COMPLET le 4 août 2026**  
**Palier Production actif : 25 %**  
**Déploiement runtime certifié : `dpl_7FbDieLdUYzi6JUpNfPMNB4c5Gzd`**  
**Commit runtime : `2e1d09ddeda5134d4f1d6c1b8291fee71d3db416`**  
**Commit de campagne : `488af9f9f22c6b0f673c40745bf35256cb3c7fa8`**  
**Run de preuve : `30932921431`**

## Verdict

Le read model public ODM est certifié en Production au palier **25 %**.

Le palier applique toujours l'ordre commercial canonique :

1. promoteurs premium ;
2. agences partenaires ;
3. annonces déposées directement sur AkarFinder ;
4. annonces publiques indexées.

La campagne a passé **13/13 gates bloquants**. Aucun ranking, schéma, mapping commercial, donnée métier ou règle de publication n'a été modifié pendant l'activation et la certification.

## Activation confirmée

La variable Production active est :

```text
ODM_PUBLIC_CANARY_PERCENT=25
```

Les contrôles de sécurité restent requis :

```text
ODM_PUBLIC_CANARY_ENABLED=true
ODM_PUBLIC_CANARY_APPROVED=true
ODM_PUBLIC_CANARY_STOP=false
```

Deux probes déterministes ont confirmé le palier avant la campagne :

- bucket 6,17 % → ODM ;
- bucket 13,09 % → ODM.

Le contrôleur conserve un plafond logiciel fail-closed à 25 %. Toute valeur supérieure est interprétée comme 0 % ODM.

## Campagne Production certifiée

- **240 requêtes** publiques contrôlées ;
- **120 clés ODM Canary** attendues et observées ;
- **120 clés Legacy** attendues et observées ;
- **240/240 réponses HTTP 200** ;
- **10 villes** couvertes ;
- **4 types de bien** couverts ;
- **3 intentions** couvertes ;
- filtres prix et surface structurés ;
- offsets fixés à zéro ;
- requêtes sans texte artificiel ;
- probes SSR `/search` ;
- aucune écriture de donnée métier ;
- aucun accès d'écriture Vercel utilisé pendant la campagne.

### Couverture

Villes : Casablanca, Rabat, Marrakech, Tanger, Agadir, Fès, Oujda, Kénitra, Témara et Salé.

Types : appartement, villa, terrain et bureau.

Intentions : vente, location et neuf.

## Résultats

| Indicateur | Résultat |
|---|---:|
| Requêtes | 240 |
| HTTP 200 | 240 |
| Canary attendu / observé | 120 / 120 |
| Legacy attendu / observé | 120 / 120 |
| Requêtes ODM non vides | 56 |
| Villes avec preuve ODM non vide | 10 / 10 |
| Échecs de contrat | 0 |
| Échecs des probes SSR | 0 |
| Taux de bucket mesuré | 24,932 % |
| Canary p50 | 247,28 ms |
| Canary p95 | 467,87 ms |
| Canary p99 | 502,71 ms |
| Legacy p50 | 482,98 ms |
| Legacy p95 | 961,58 ms |
| Legacy p99 | 1 081,85 ms |
| SSR visible p50 | 363,51 ms |
| SSR visible p95 | 547,34 ms |

La première probe SSR froide à Casablanca a atteint 1 316,45 ms. Les percentiles visibles et ODM restent nettement sous les seuils bloquants.

## Gates — 13/13 PASS

- ✅ campagne exacte de 240 requêtes ;
- ✅ plan exact 120 Canary / 120 Legacy ;
- ✅ 240/240 HTTP 200 ;
- ✅ couverture des dix villes ;
- ✅ couverture des quatre types ;
- ✅ couverture des trois intentions ;
- ✅ correspondance déterministe parfaite entre bucket attendu et lane observée ;
- ✅ aucune fuite de filtre, de contrat ou de politique d'affichage ;
- ✅ taux de bucket compris entre 23,5 % et 26,5 % ;
- ✅ au moins 50 preuves ODM non vides et les dix villes représentées — résultat réel : 56 requêtes et 10 villes ;
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

Vercel n'a signalé **aucune erreur runtime** sur `/search` ou `/api/search` pendant la fenêtre contrôlée d'une heure suivant la campagne.

## Preuves d'audit

- workflow run : `30932921431` ;
- commit source de la campagne : `488af9f9f22c6b0f673c40745bf35256cb3c7fa8` ;
- artifact : `odm-canary-25-production-certification-v1`, conservé 30 jours ;
- preuve persistée : branche `certification-results` ;
- fichier : `reports/odm-canary-25-production-latest.json` ;
- horodatage de la preuve : `2026-08-04T17:15:07.899Z`.

## Rollback immédiat

Au premier incident bloquant :

```text
ODM_PUBLIC_CANARY_STOP=true
```

Puis revenir à :

```text
ODM_PUBLIC_CANARY_PERCENT=10
ODM_PUBLIC_CANARY_STOP=false
```

Créer ensuite un nouveau déploiement Production depuis le `main` courant et vérifier que les clés situées entre les buckets 10 % et 25 % reviennent au moteur Legacy.

Le rollback ne nécessite aucune migration ni modification du ranking.

## Décision suivante

Le palier 25 % est certifié et peut rester actif.

Toute montée ultérieure doit être un LOT séparé comprenant :

1. observation du palier 25 % sur une fenêtre Production bornée ;
2. relèvement explicite et testé du plafond technique ;
3. activation réversible ;
4. nouvelle campagne équilibrée ;
5. rollback immédiat au moindre gate rouge.

Aucune montée automatique au-delà de 25 % n'est autorisée.
