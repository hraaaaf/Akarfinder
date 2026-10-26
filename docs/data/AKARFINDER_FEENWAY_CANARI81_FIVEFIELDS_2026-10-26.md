# AkarFinder — FeenWay 81 : concordance des cinq champs au portail d'origine

Date : 26 octobre 2026. **Lecture seule, sans déploiement, écriture DB ni publication.**

## Goal / succès / preuve

**Goal** : vérifier les 81 références FeenWay issues du canari 100 et absentes du ledger AkarFinder 9 artifacts, par les pages primaires source, sans convertir une URL accessible en offre commerciale certifiée.

**Succès technique** : identifier pour chaque référence l'identité source conservée, ville + quartier + prix MAD + superficie m² + transaction, puis confronter prix/surface/ville à la fiche FeenWay, enregistrer les conflits et tenir les gates séparés.

**Preuves** :
- 81 liens originaux récupérés à nouveau depuis les fiches FeenWay dans [feenway-canary81-origin-input-2026-10-26.jsonl](feenway-canary81-origin-input-2026-10-26.jsonl).
- 81 lignes de résultats individuels et gates conservateurs dans [feenway-canary81-source-fivefields-2026-10-26.jsonl](feenway-canary81-source-fivefields-2026-10-26.jsonl). Le parser initial était erroné (découpage prématuré des titres Mubawab + expressions régulières d'unité m²) ; le **résultat correctif** remplace intégralement la première mesure et a été contrôlé par 7 tests numériques + 11 assertions sur le registre.
- Test durable dans [scripts/data/__tests__/feenway-canary81-evidence.test.mjs](../../scripts/data/__tests__/feenway-canary81-evidence.test.mjs) ; workflow read-only `.github/workflows/feenway-canary81-evidence-ci.yml` limité à la branche de travail. **Ne pas annoncer CI verte sans l'avoir vérifiée.**

## Résultat audité sur 81 références — état review uniquement

| Gate | Nombre | Signification |
|---|---:|---|
| **Concordance technique stricte des cinq champs avec FeenWay** | **49** | URL originelle avec ID final conservé, transaction, ville/quartier structurés, prix et surface principaux identiques à FeenWay |
| Champs incomplets / données contradictoires / géographie incertaine | **27** | Non admissibles automatiquement |
| Origine inaccessible / bloquée (Yakeey) | **4** | Quarantaine, aucun contournement |
| Prix à qualification économique distincte | **1** | Avito `236104` : pas-de-porte 800K DH, et non loyer mensuel 800K |
| **Total** | **81** | Chaque ligne dans un seul gate |

Sur les 81 : **77 identités conservées** en URL finale, **74** prix principaux relevés, **75** surfaces principales, **68** villes, **67** quartiers (dont localisation narrative non promue). **53** satisfont les cinq champs à la source, dont **49** également concordants avec les chiffres de FeenWay. Les 81 identités source sont distinctes dans l'échantillon. Aucun doublon sur la **signature faible** ville/quartier/transaction/prix/surface dans les 53 candidats techniques ; cela **ne prouve pas l'unicité physique**.

Source des 49 concordances : Avito **29**, Mubawab **13**, Agenz **4**, Yakeey **2**, Sarouty **1**, Masaken **0** (quartier constaté essentiellement en texte descriptif).

**Dates** : 35 pages sources renvoient une métadonnée `published_date`, dont 34 datées de moins de 30 jours avant le contrôle, 17 de moins de sept jours, une datée du 28/10/2025 (Sarouty `170553`). Cela **ne certifie ni parité avec la date effective de publication ni disponibilité**. L'absence de date de source ne vaut pas publication récente.

## Contradictions et gardes-fous exacts

- FeenWay `175135`, Mubawab `a:8406235` : **source 1 900 000 DH / 110 m²**, FeenWay **2 000 000 DH / 100 m²**.
- FeenWay `175793`, Mubawab `a:8411870` : **source 25 000 DH / 190 m²**, FeenWay **19 000 DH / 130 m²**.
- FeenWay `235644`, Avito `58944180` : **source 130 m²**, FeenWay **100 m²**, prix identique.
- FeenWay `210589` (Sidi Bouknadel) : la ville source n'apparaît pas de façon concordante dans le titre FeenWay ; revue géographique.
- `236104` Avito : le montant **800 000 DH** est décrit comme **pas-de-porte**, avec loyer mensuel annoncé séparément ; bannir son affectation au champ `monthly_rent_mad` sans classification explicite.
- `236186` et `195977` Mubawab : distinguer surface bâtie et surface terrain. Les valeurs relevées dans l'en-tête ne doivent pas être extrapolées à la surface habitable.
- Les quatre Yakeey en échec restent `quarantine_source_unavailable` : `181747`, `182080`, `183465`, `184464`. Ne pas contourner les blocages.
- Le gel historique AkarFinder **226 286 URL**, artifact `10910779576`, retourne **404** et n'a **pas** été inclus dans la déduplication. Les « 81 nouvelles » restent nouvelles seulement **par rapport au ledger 9 lots** de 9 745 IDs. L'absence de collision parmi 53 signatures n'est pas une déduplication physique inter-portails.

## État et prochaine action

- **0** annonce certifiée fraîche et disponible, physiquement unique ou réutilisable pour publication.
- **0** écriture DB, **0** import live, **0** merge et **0** Vercel.
- Geler les **49** concordantes dans `review`, pas `eligible`.
- Next exact : certification d'ancienneté/activité à partir de preuves propres à chaque annonce (quand disponibles), puis rapprochement des 49 avec le stock réellement servable / archive historique authentifiée, dédup conservatrice, vérification du droit de réutilisation et test de cohérence avant décision d'import.
- CI : statut à vérifier sur le commit de tests ; pas de conclusion « vert » non démontrée.

## Contrôle économique correctif et signatures du ledger — 26 octobre 2026

**Deux anomalies économiques supplémentaires ont été confirmées sur les pages sources**, alors que leurs nombres étaient identiques à FeenWay :

1. FeenWay `233683`, [Avito `58935222`](https://www.avito.ma/fr/marjane/appartements/%C3%80_VENDRE___Appartement_neuf_%C3%A0_Marjane_Tanger_58935222.htm) : **16 500 DH/m²**, pas un prix d'acquisition total de 16 500 DH ; la fiche source décrit 125m². `price_is_per_square_meter`.
2. FeenWay `234551`, [Mubawab `a:8441029`](https://www.mubawab.ma/fr/a/8441029/bel-appartement-%C3%A0-louer-%C3%A0-al-mahamid-superficie-totale-56-m%C2%B2-machine-%C3%A0-laver) : **250 DH de location quotidienne**, pas un loyer mensuel de 250 DH. `price_is_daily_short_stay`.

Le cas `236104` pas-de-porte (800K DH) était déjà exclu des 49 concordances techniques.

**Chiffres après ces preuves** : **49 concordances numériques / 81**, mais seulement **47 sans anomalie économique explicite déjà identifiée**. « Sans anomalie explicite » ne veut pas dire type économique vérifié ; **zéro** candidat commercialement éligible. Les deux restent dans le compteur historique des **49 concordances numériques** pour auditabilité, avec champ `explicit_economic_semantic_flag` non nul et `economic_interpretation_certified=false`.

**Croisement signatures faible avec 9 lots AkarFinder** : 49 quadruplets normalisés ville/quartier/prix/surface comparés aux **7 610 lignes possédant quatre champs complets** du registre immuable **11675834864** (9 745 IDs totaux). **0 égalité exacte** (protocole local read-only, Unicode/accents/casse/ponctuation normalisés), ce qui ne prouve ni absence de duplication physique, ni identité commerciale active. La proximité des prix, images et descriptions n'a pas été comparée. **Archive large de 226K URL inaccessible, 404**.

**Tests** : test Node de cohérence enrichi d'un contrôle explicite des trois drapeaux économiques ; aucune CI présentée comme verte avant preuve du run. **Next exact** : tenir les 47 dans `review` ; auditer période réelle du montant, statut de l'annonce et fraîcheur commerciale, dédup physique sans fusion automatique puis droits de réutilisation.
