# AkarFinder — Contrat de qualité parseur multi-portails / acquisition 200K

Date : 27 octobre 2026. **Document de travail : aucun des six parseurs ne garantit toutes les variantes de présentation.**

## Goal / succès / preuve

**Goal** : convertir des URLs publiques en observations immobilières traçables, en minimisant les faux positifs et en isolant les changements de format, avant déduplication physique et publication.

**Succès technique observable** : sur corpus de références sources étiquetées indépendamment, chaque extraction prix, surface, ville, quartier et transaction doit être appuyée par son bloc primaire ; tout champ incertain doit devenir `null` ou `review`, jamais emprunté aux annonces recommandées. Exécuter CI avec extraits synthétiques adversariaux et extraits réels. **Ne pas attribuer de taux d'exactitude sans vérité terrain et taille d'échantillon.**

**Preuves disponibles** : [parseur six portails](../../scripts/acquisition/feenway-primary-parser-v1.mjs), [tests synthétiques](../../scripts/data/__tests__/feenway-primary-parser-v1.test.mjs), [12 extraits observés](../../scripts/data/fixtures/feenway-primary-real-minimal-v2.json) et [QA réelle](../../scripts/data/__tests__/feenway-real-corpus-qa-v1.test.mjs), [batch runner](../../scripts/acquisition/feenway-primary-batch-v1.mjs), [tests batch](../../scripts/data/__tests__/feenway-primary-batch-v1.test.mjs).

## Dimensions critiques — état au 27 octobre

| Risque de parsing | Garde / comportement requis | État constaté |
|---|---|---|
| ID original ≠ ID après redirection | Comparer hôte + identifiant **des deux URLs** ; sinon `quarantine_identity` | Implémenté en V1 ; tests |
| Sarouty ancienne route query → nouvelle `/acheter/-ID` / `/louer/-ID` | Accepter uniquement même ID et même source ; `route_alias_review` | Corrigé après échec corpus réel ; CI requise |
| Yakeey `ma123456` → `ta123456` | ID numérique préservé, alias en revue ; bloquage 403 sans contournement | Test synthétique ; accès réel parfois bloqué |
| Mubawab prix répété en en-tête | Rejeter valeurs primaires contradictoires, ne jamais lire recommandation ou annonce liée | Tests synthétiques ; 3 extraits réels |
| Avito prix et superficie dans blocs distincts | Champ depuis la fiche elle-même, pas les résultats « similaires » | Tests synthétiques ; 3 extraits réels |
| Agenz titre non transactionnel | Transaction à partir de route canonique explicite `/vente-` / `/location-` ; pas du quartier inféré | Correctif appliqué après échec corpus réel |
| Masaken `/jour` et description quartier | Classer journalier hors loyer mensuel ; quartier narratif non certifié | Correctif appliqué après échec corpus réel |
| Sarouty sans prix primaire | `price_mad=null`, même si pages similaires affichent des prix | Test sur 2 extraits réels |
| Prix total, DH/m², K/M DH, pas-de-porte, jour/nuit/mois | **Ne jamais convertir l’un en l’autre** ; unit-review si ambigu | Total/jour/m²/pas-de-porte : drapeaux ; K/M encore à couvrir complètement |
| Surface totale, bâtie, habitable, balcon, terrain | Conserver la base `surface_basis`, refuser substituts non prouvés | Partiel ; suite prioritaire |
| Prix actuel vs ancien prix / baisse | Ancien prix ne remplace pas prix primaire courant | À renforcer par fixtures contradictoires |
| Quartier dans description vs entête | Ne pas certifier localité uniquement narrative ; garder `null` | Implémenté sur Masaken, autres portails à éprouver |
| FR / AR / EN, lieux et séparateurs Unicode | Normalisation Unicode + taxonomie villes/quartiers contrôlée | Partiel (FR, espaces et apostrophes) ; arabe et code-switch ouverts |
| URL active HTTP200 vs bien disponible | HTTP200 ou métadonnée publiée ≠ disponibilité | `availability_verified=false` systématiquement |
| Même annonce sur deux portails / même immeuble | Dédup identité source, puis signature faible revue et indice matériel fort | Archive Neon 151 900 comparée en SELECT ; unicité physique non prouvée |
| Programmes immobiliers `/pa/` | Catégorie projet distincte ; jamais un bien individuel par défaut | `review_program` |
| Droits de réutilisation, contacts et photos | Aucune donnée personnelle copiée dans les rapports et aucune publication automatique | `reuse_rights_verified=false`, descriptions brutes non exportées |
| 403/429/robots/quota | Arrêt sans contournement ; respect des règles et limitation du débit | Garde acquisition, pas seulement parseur |
| Nouveau design HTML/JSON-LD ou page tronquée | `primary_block_not_found` / `review_missing_fields`, échantillon d'échec suivi par portail | Parsing markdown uniquement à ce stade ; support JSON-LD strict à développer |
| Erreur isolée dans un lot / identités répétées | Quarantaine locale des anomalies, arrêt sans faux positif ni DB write | Batch runner limité à 1 000 lignes, tests dédiés ; CI à vérifier |

## Architecture d'admission recommandée

`DISCOVERED URL → ORIGINAL SOURCE ID → PRIMARY BLOCK → PRICE + ECONOMIC UNIT → AREA BASIS → CITY/DISTRICT → TRANSACTION → FRESHNESS/AVAILABILITY → PHYSICAL DEDUP → RIGHTS → ELIGIBLE`.

Le passage à `ELIGIBLE` est **interdit** si une seule des validations indépendantes manque. Aujourd'hui **aucune nouvelle annonce FeenWay certifiée eligible**. Les **54 161 URLs** restent du stock *découvert* ; les **231 IDs** du deuxième canari restent des *candidates review*. Aucun nombre ne doit être additionné à un stock « 200K exploitable » sans dédup et preuve.

## Next exact

1. Vérifier la dernière CI parseur + batch au SHA testé, corriger tout échec des 12 fixtures réelles et des adversariaux.
2. Ajouter pour chaque source le détecteur d'unité économique et de surface bâtie/terrain avec exemples réels ; mesurer couverture et **taux de faux positifs sur corpus étiqueté manuellement** (pas sur de simples champs présents).
3. Requalifier les 60 observations déjà vérifiées, puis les 171 restantes en petits lots conformes à chaque source.
4. Déduplication conservatrice contre l'archive Neon en SELECT, puis preuve de présence récente, droits d'utilisation et gate d'import distinct.
5. Ne pas déclencher de merge ou de déploiement Vercel sans gate ; jamais substituer la branche Neon 151 900 au freeze disparu des 226 286 URL.

## Écarts réellement détectés par CI — renforcement ciblé

- [Run 40485486213](https://github.com/hraaaaf/Akarfinder/actions/runs/40485486213) : 3 échecs réels sur anciennes versions (Sarouty route redirigée, Agenz vente par route, Masaken `/jour`).
- [Run 40486222334](https://github.com/hraaaaf/Akarfinder/actions/runs/40486222334) : le test de sécurité a trouvé qu'une URL Sarouty arbitraire `/search?listing_id=ID` pouvait être acceptée. **Correction** : le paramètre `listing_id` n'est admissible que sur `/property-details/` ; l'autre route admissible est exactement `/acheter/<slug>-ID/` ou `/louer/<slug>-ID/`, toujours sur le même hôte et ID. Tests positifs/negatifs ajoutés.
- CI batch [40485962651](https://github.com/hraaaaf/Akarfinder/actions/runs/40485962651) **SUCCESS 5/5 tests** ; [artifact 12725471116](https://github.com/hraaaaf/Akarfinder/actions/runs/40485962651/artifacts/12725471116) ancien calcul sur 12 fixtures, 10 identités confirmées avant correction de Sarouty. Le batch workflow est désormais déclenché aussi à chaque changement du parseur, donc ses prochains artefacts invalident les anciens.
- Seule la validation **du SHA exact** des nouveaux runs permet de déclarer la chaîne actuelle verte. Tous les candidats restent `review/quarantine`.

**Garde de précision** : les cas inconnus sont volontairement rejetés ; ne pas appeler un taux de `fields_5_present` un taux d'annonces vivantes, et ne pas extrapoler la réussite des 12 fixtures à 54 161 pages.
