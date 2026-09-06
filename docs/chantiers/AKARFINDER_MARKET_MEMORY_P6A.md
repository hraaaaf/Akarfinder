# AKARFINDER — P6-A MARKET MEMORY INDEX

Date: 2026-09-06
Branch: `feat/mubawab-full-enumeration`

## Goal
Transformer le corpus Mubawab historique en mémoire immobilière interne exploitable sans confondre provenance historique, activité actuelle et donnée économique observée.

## Doctrine
- historique ≠ actif
- provenance structurée ≠ historique de prix
- aucune valeur économique n'est inventée
- aucune donnée de mémoire historique ne devient publiable par ce lot
- `source_policy_registry` reste souverain

## Entrée certifiée
- corpus Mubawab total : **37 420** IDs
- `current_verified` : **18 445**
- `historical_unverified` : **18 975**
- historiques classiques structurées V2.3 : **18 207**
- historiques office/category : **768**
- provenance manquante après V2.3 : **0**

## P6-A exécuté
`metadata.market_memory_v1` est renseigné sur **18 975 / 18 975** historiques.

Champs internes stockés :
- `version=market_memory_v1`
- `memory_status`
- `city` quand prouvée
- `property_family`
- `transaction_type`
- `provenance_kind`
- `last_evidence_at`
- `internal_quality_score`
- `structural_comparable_ready`
- `economic_comparable_ready`
- `price_history_ready`
- `publication_eligible=false`
- `public_status=internal_only`

## Distribution certifiée
- `structural_comparable_ready` : **18 207**
  - ville + famille de bien + transaction connues via preuve first-party structurée
- `category_memory_only` : **768**
  - famille `office_commercial` + transaction connues
  - ville non prouvée dans la preuve source, donc laissée inconnue
- `economic_comparable_ready=true` : **0**
- `price_history_ready=true` : **0**

## Pourquoi les prix restent à 0
Audit du lien historique vers les observations économiques :
- historiques avec chaîne propre `listing_source` exploitable par `source_offer_key` : **0**
- historiques avec observation prix+surface MAD liée de façon déterministe : **0**

Conclusion : le corpus historique est désormais exploitable comme **mémoire structurelle de présence marché**, mais pas encore comme série historique de prix. Une route catalogue ne prouve ni prix ni surface.

## Contrôles de non-régression
- historiques indexées mémoire : **18 975 / 18 975**
- `current_verified` polluées par `market_memory_v1` : **0**
- `publication_eligible=true` sur historique : **0**
- dérive `updated_at` pendant la matérialisation : **0**
- aucun changement `freshness_status`
- aucun changement `evidence_status`
- aucun merge
- aucun déploiement Vercel

## Premiers segments structurels volumineux
Exemples issus de l'index interne :
- Rabat / appartement / location : **1 192**
- Marrakech / appartement / location : **1 061**
- Marrakech / villa / vente : **1 055**
- Marrakech / appartement / vente : **994**
- Tanger / appartement / location : **954**
- Casablanca / appartement / location : **948**
- Tanger / appartement / vente : **887**
- Marrakech / terrain / vente : **883**
- Casablanca / appartement / vente : **759**
- Casablanca / commercial / location : **686**

Ces volumes mesurent la mémoire de présence observée dans les surfaces historiques certifiées. Ils ne sont pas présentés comme stock actif ni comme parts de marché actuelles.

## Succès P6-A
**ATTEINT**

Le corpus historique est maintenant entièrement indexé comme mémoire interne avec séparation explicite entre :
1. mémoire structurelle exploitable ;
2. mémoire catégorie sans géographie prouvée ;
3. mémoire économique non encore qualifiée.

## Prochain lot P6-B
Recover uniquement des preuves économiques déterministes pour faire monter progressivement `economic_comparable_ready` et `price_history_ready` :
- prix observé natif ;
- devise ;
- surface observée ;
- date d'observation ;
- provenance exacte ;
- aucun parsing spéculatif de snippets ambigus.

P6-B doit rester shadow/internal tant qu'un gate de qualité et de policy n'est pas explicitement franchi.
