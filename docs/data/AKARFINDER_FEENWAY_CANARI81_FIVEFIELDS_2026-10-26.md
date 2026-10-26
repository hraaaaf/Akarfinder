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
