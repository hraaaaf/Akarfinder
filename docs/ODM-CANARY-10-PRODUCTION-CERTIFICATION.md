# ODM Canary 10 % — Certification Production V1

**Statut : CERTIFIÉ — PASS COMPLET le 4 août 2026**  
**Commit applicatif certifié : `8945956946bb3eaaaee26c6e24f68222947c126a`**  
**Production certifiée : `https://akarfinder.vercel.app`**  
**Run de preuve : `30904824809`**

## Verdict

Le palier public ODM à **10 %** est certifié sur la version qui applique l'ordre commercial canonique :

1. promoteurs premium ;
2. agences partenaires ;
3. annonces déposées directement sur AkarFinder ;
4. annonces publiques indexées.

La campagne Production V2 a passé **tous les gates bloquants**. Aucun changement de taux, de ranking, de mapping, de base de données ou de politique d'affichage n'a été effectué par le LOT de certification.

Le Canary reste à **10 %**. La certification autorise seulement l'ouverture d'un LOT séparé pour étudier une montée contrôlée à 25 % ; elle ne l'active pas automatiquement.

## Campagne Production certifiée

- **240 requêtes** contrôlées ;
- **80 requêtes ODM Canary** attendues et observées ;
- **160 requêtes Legacy** attendues et observées ;
- **240/240 réponses HTTP 200** ;
- **10 villes** couvertes ;
- **4 types de bien** couverts ;
- **3 intentions** couvertes ;
- filtres de prix et de surface sur chaque requête ;
- requêtes structurées, sans texte artificiel ;
- offset fixé à zéro ;
- concurrence limitée à 6 ;
- timeout de 30 secondes par requête ;
- lecture publique uniquement.

### Couverture

Villes : Casablanca, Rabat, Marrakech, Tanger, Agadir, Fès, Oujda, Kénitra, Témara et Salé.

Types : appartement, villa, terrain et bureau.

Intentions : vente, location et neuf.

## Résultats

| Indicateur | Résultat |
|---|---:|
| Requêtes | 240 |
| HTTP 200 | 240 |
| Canary attendu / observé | 80 / 80 |
| Legacy attendu / observé | 160 / 160 |
| Requêtes ODM non vides | 47 |
| Villes avec preuve ODM non vide | 10 / 10 |
| Échecs de contrat | 0 |
| Échecs des probes SSR | 0 |
| Taux de bucket mesuré | 9,958 % |
| Canary p50 | 169,52 ms |
| Canary p95 | 1 516,79 ms |
| Canary p99 | 1 591,67 ms |
| Legacy p50 | 426,61 ms |
| Legacy p95 | 930,14 ms |
| Legacy p99 | 1 311,35 ms |
| SSR visible p50 | 199,74 ms |
| SSR visible p95 | 232,12 ms |

Une première requête SSR froide à Casablanca a atteint 1 212 ms ; les percentiles visibles restent néanmoins dans les seuils certifiés.

## Gates — 12/12 PASS

- ✅ campagne exacte de 240 requêtes ;
- ✅ 240/240 HTTP 200 ;
- ✅ couverture des dix villes ;
- ✅ couverture des quatre types ;
- ✅ couverture des trois intentions ;
- ✅ correspondance déterministe parfaite entre bucket attendu et lane observée ;
- ✅ aucune fuite de filtre, de contrat ou de politique d'affichage ;
- ✅ taux de bucket compris entre 8,5 % et 11,5 % ;
- ✅ au moins 20 preuves ODM non vides et au moins 7 villes — résultat réel : 47 requêtes et 10 villes ;
- ✅ parité visible `/search` et `/api/search` ;
- ✅ p95 ODM inférieur à 5 secondes ;
- ✅ p99 ODM inférieur à 10 secondes.

## Frontières de sécurité confirmées

Les résultats ODM de la campagne :

- restent dans la quatrième catégorie commerciale ;
- conservent leur provenance réelle, notamment `search_api` ou `commoncrawl_cdx` ;
- utilisent le mode `thin_indexed_seed` ;
- exigent la source originale et le CTA `view_original` ;
- n'exposent ni contact, ni galerie, ni miniature non autorisée ;
- ne reçoivent aucun statut premium, partenaire, agence ou promoteur sans signal explicite ;
- respectent les filtres ville, type, intention, prix et surface.

## Santé Production

Après la campagne, Vercel ne signalait **aucune erreur runtime** sur `/search` ou `/api/search` pendant la fenêtre contrôlée d'une heure.

## Preuves d'audit

- workflow run : `30904824809` ;
- commit source : `8945956946bb3eaaaee26c6e24f68222947c126a` ;
- artifact : `odm-canary-10-production-certification-v1`, conservé 30 jours ;
- preuve persistée : branche `certification-results` ;
- fichier : `reports/odm-canary-10-production-latest.json` ;
- campagne : révision 2 ;
- horodatage de la preuve : `2026-08-04T11:28:47.441Z`.

La branche de résultats ne déclenche pas le workflow et ne modifie jamais `main`, la Production ou les données applicatives.

## Rollback

Le kill switch reste prioritaire :

```text
ODM_PUBLIC_CANARY_STOP=true
```

Une valeur invalide de `ODM_PUBLIC_CANARY_PERCENT`, l'absence d'approbation ou toute valeur supérieure au plafond codé échoue vers le moteur Legacy.

## Décision suivante

Le palier 10 % est certifié. La montée à 25 % doit rester un LOT distinct comprenant :

1. relèvement explicite et testé du plafond technique de 10 % à 25 % ;
2. activation Vercel séparée et réversible ;
3. campagne Production au nouveau palier ;
4. observation des latences, erreurs, fallbacks, couverture et frontières de publication ;
5. retour immédiat à 10 % ou activation du kill switch si un gate échoue.

Aucune montée automatique n'est autorisée.
