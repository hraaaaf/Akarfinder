# ODM Canary 50 % — Certification Production V1

**Statut : CERTIFIÉ — PASS COMPLET le 4 août 2026**  
**Palier Production actif : 50 %**  
**Déploiement runtime certifié : `dpl_31Z71V8Ghjav7C8ti3PfENgYNMmc`**  
**Commit runtime : `641a93ad77cb3a53b64fa48a507428e38f432d78`**  
**Commit de campagne : `18d8cc32df3e0937cd3fe8dfa54349e691971ca6`**  
**Run de preuve : `30939464619`**

## Verdict

Le read model public ODM est certifié en Production au palier **50 %**.

La campagne a passé **13/13 gates bloquants**. Aucun ranking, schéma, mapping commercial, donnée métier ou règle de publication n'a été modifié pendant l'activation et la certification.

## Activation confirmée

La variable Production active est :

```text
ODM_PUBLIC_CANARY_PERCENT=50
```

Les contrôles de sécurité restent requis :

```text
ODM_PUBLIC_CANARY_ENABLED=true
ODM_PUBLIC_CANARY_APPROVED=true
ODM_PUBLIC_CANARY_STOP=false
```

Le contrôleur conserve un plafond logiciel fail-closed à 50 %. Toute valeur supérieure est interprétée comme 0 % ODM.

Deux probes déterministes ont confirmé le palier avant la campagne :

- bucket 6,17 % → ODM ;
- bucket 42,59 % → ODM, alors qu'il était Legacy au palier 25 %.

## Campagne Production certifiée

- **240 requêtes** publiques contrôlées ;
- **120 clés ODM** attendues et observées ;
- **120 clés Legacy** attendues et observées ;
- **240/240 réponses HTTP 200** ;
- **10 villes** couvertes ;
- **4 types de bien** couverts ;
- **3 intentions** couvertes ;
- filtres prix et surface structurés ;
- offsets fixés à zéro ;
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
| ODM attendu / observé | 120 / 120 |
| Legacy attendu / observé | 120 / 120 |
| Requêtes ODM non vides | 56 |
| Villes avec preuve ODM non vide | 10 / 10 |
| Échecs de contrat | 0 |
| Échecs des probes SSR | 0 |
| Taux de bucket mesuré | 50,182 % |
| ODM p50 | 211,71 ms |
| ODM p95 | 575,36 ms |
| ODM p99 | 1 108,88 ms |
| Legacy p50 | 441,30 ms |
| Legacy p95 | 950,19 ms |
| Legacy p99 | 1 138,91 ms |
| SSR visible p50 | 249,72 ms |
| SSR visible p95 | 1 093,14 ms |

## Gates — 13/13 PASS

- ✅ campagne exacte de 240 requêtes ;
- ✅ plan exact 120 ODM / 120 Legacy ;
- ✅ 240/240 HTTP 200 ;
- ✅ couverture des dix villes ;
- ✅ couverture des quatre types ;
- ✅ couverture des trois intentions ;
- ✅ correspondance déterministe parfaite entre bucket attendu et lane observée ;
- ✅ aucune fuite de filtre, de contrat ou de politique d'affichage ;
- ✅ taux de bucket compris entre 48,5 % et 51,5 % ;
- ✅ au moins 50 preuves ODM non vides et les dix villes représentées ;
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

- workflow run : `30939464619` ;
- commit source de la campagne : `18d8cc32df3e0937cd3fe8dfa54349e691971ca6` ;
- artifact : `odm-canary-50-production-certification-v1`, conservé 30 jours ;
- preuve persistée : branche `certification-results` ;
- fichier : `reports/odm-canary-50-production-latest.json` ;
- horodatage de la preuve : `2026-08-04T18:37:52.529Z`.

## Rollback immédiat

Au premier incident bloquant :

```text
ODM_PUBLIC_CANARY_STOP=true
```

Puis revenir au dernier palier certifié précédent :

```text
ODM_PUBLIC_CANARY_PERCENT=25
ODM_PUBLIC_CANARY_STOP=false
```

Créer ensuite un nouveau déploiement Production depuis le `main` courant et vérifier qu'une clé située entre les buckets 25 % et 50 % revient au moteur Legacy.

Le rollback ne nécessite aucune migration ni modification du ranking.

## Décision suivante

Le palier 50 % est certifié et peut rester actif.

Toute montée ultérieure doit être un LOT séparé comprenant :

1. relèvement explicite et testé du plafond technique ;
2. activation réversible ;
3. nouvelle campagne équilibrée ;
4. contrôle des erreurs runtime ;
5. rollback immédiat au moindre gate rouge.

Aucune montée automatique au-delà de 50 % n'est autorisée.
