# AkarFinder — FeenWay | canari 100, validation à la source — 26 octobre 2026

## Goal / critère / preuve

- **Goal** : confronter à leurs sources originales les 100 références FeenWay échantillonnées, puis filtrer les vrais candidats hors du registre 9 lots existant sans faux positifs.
- **Critère de succès** : une référence candidate doit conserver une identité source vérifiable, ne pas être un programme `pa:`, ne pas apparaître dans le ledger de 9 745 identités ; fraîcheur, disponibilité, unicité physique, qualité cinq champs et droit de réutilisation restent des gates indépendants.
- **Preuves** : lectures publiques en direct des 100 fiches FeenWay + des liens sources, JSONL local des 100 références, comparaison avec l'artifact GitHub 11675834864 du run 38069957917 (SHA256 du ZIP : `675d6cbe2984687853172d9134ea7bd82f1df7da12f3820dad610be98f41873b`). Pas de capture ni d'écriture en DB.

## Résultats exacts

| Mesure | Résultat | Sens |
|---|---:|---|
| Fiches FeenWay consultées | **100/100** | pages publiques disponibles lors du canari |
| Liens vers origine | **100/100** | Mubawab 42, Avito 40, Yakeey 8, Agenz 5, Sarouty 3, Masaken 2 |
| Pages originales retournées par l'outil | **96/100** | ce n'est pas 96 annonces présentes |
| **Identifiant numérique original conservé dans l'URL finale** | **85/100** | présence d'identifiant uniquement : Yakeey change parfois le préfixe de type |
| **Redirigées vers une page catalogue** | **11/100** | identité de la fiche originale perdue ; quarantaine |
| **Erreurs d'accès aux pages originales** | **4/100** | Sarouty deux timeouts, Yakeey un 404 et un bot-block ; quarantaine |
| Références connues du ledger 9 lots | **3/100** | Mubawab IDs `a:8404870`, `a:8374472`, `a:8404664` |
| Programme immobilier source `/pa/` | **1/100** | `pa:8388431` ; ne pas compter comme annonce individuelle |
| **Références individuelles absentes du ledger et avec identité numérique préservée** | **81/100** | *review uniquement* ; aucune disponibilité certifiée |
| Annonces commercialement certifiées | **0/100** | aucune enquête vendeur/date/identité physique/droits menée |

**Décomposition fermée** : 81 références à examiner + 3 déjà connues + 1 programme + 11 redirections catalogue + 4 échecs = **100**. Les 96 « nouvelles » du premier canari étaient des références absentes du seul ledger, **pas** des annonces vivantes ; ce chiffre est remplacé par le filtre plus strict de **81 références candidates** et zéro certifiée.

## Anomalies prouvées

- **11 réorientations catalogue**, et non vers la fiche source : ID FeenWay `235417, 234994, 168841, 171592, 172836, 174253, 198343, 213720, 222297, 226367, 233285`. Ces pages ne doivent pas être comptées actives via un simple HTTP200.
- **4 échecs** : FeenWay `174654` et `176211` → Sarouty timeout ; `182798` → Yakeey 404 ; `184131` → Yakeey `bot_blocked`. Aucun contournement tenté.
- **Yakeey** : alias URL avec préfixes modifiés (ex. `ba185843` → `ia185843`) ; conservation de six chiffres dans l'URL ne prouve pas identité complète ni correspondance des champs.
- **Avito `/listings/236104`** : prix **800 000 DH** affiché sous « à louer » ; source précise « Pas-de-Porte (Sarout) ». L'étiquette FeenWay **800K DH/mois** ne doit pas être utilisée comme loyer mensuel sans qualification.
- **Mubawab `/listings/236186`** : affichage `360m²`, mais terrain `2 500m²` et texte `320m²` d'habitable ; distinguer superficie bâtie, habitable et terrain.
- **Mubawab `/listings/185869`** : lien source `/pa/`, programme neuf « SEBOU » avec surfaces variables : mise en quarantaine pour unicité physique.
- **Sarouty `/listings/170553`** : page source trouvée, métadonnée `published_date=2025-10-28` ; date de collecte FeenWay n'est pas une preuve d'annonce fraîche.
- Les champs de prix, surface et quartier n'ont pas tous été rapprochés de façon strictement structurée sur les pages sources. Un scan simple des 1 200 premiers caractères trouvait 87 signaux prix, 11 signaux surface et **ne constitue pas une mesure de complétude cinq champs** (autres pages utilisant `Surface totale` sans `m²`, par exemple).

## Limites / gate

- L'ancien gel de **226 286 URL** mentionne un artifact GitHub `10910779576` et SHA `e7ac4bca2db34ad334ed7234cfb8be93fc9baca68a9694f5024989b5cc2bb953`, mais GitHub renvoie **404** lors du téléchargement ; impossible de vérifier si les 81 sont aussi absentes du freeze plus large. Recherche Project/Library sans copie exploitable. **Ne pas appeler les 81 « nouvelles pour AkarFinder »**.
- Le canari est déterministe, stratifié sur sitemaps visibles, **non représentatif statistiquement** de toutes les annonces ; aucune extrapolation 81 % × 53 293 ni vers 200K.
- Ni FeenWay `robots Allow /` ni les pages source consultables ne donnent automatiquement un droit d'extraction industrielle ou de republication ; les gates juridiques restent ouverts.
- État du dépôt au départ : `hraaaaf/Akarfinder` branche `data/200k-fresh-parser-v2`, HEAD `5d30ceecc7c9951095416337b4f098d8c497a691`, PR #1105 ouverte. Pas de CI déclenchée spécifiquement pour le présent rapport, 0 écriture DB/Neon, 0 Vercel.

## Reprise / Next exact

1. Réintégrer le gel 226K **seulement si** un artifact ou snapshot alternatif authentifié est retrouvé ; sinon marquer explicitement son indisponibilité et ne pas le déduire d'autres compteurs.
2. Sur un sous-lot prioritaire des **81**, vérifier par preuve primaire : type de transaction, ville, quartier, surface bâtie vs terrain, prix économique correct et identité finale ; dater la vraie publication quand disponible.
3. Exclure `pa:` et les 15 redirections/erreurs jusqu'à preuve de retour d'une fiche originale valide ; isoler Yakeey aliases.
4. Comparer au stock Neon **uniquement via consultation read-only d'une table identifiée et vérifiée**, sans supposer que des URLs anciennes = des annonces servables.
5. Tamis conservateur + tests et certificat de fraîcheur/disponibilité/republishing ; aucun import/publication avant gates.

**Artifact JSONL annoté** : `akarfinder_feenway_canari100_source_checked_2026-10-26.jsonl` — SHA256 `140fa1442abc276b2d3a53b8f3da327229554df7444ecb20c8aa17bcceb14c09`. L'état `source_numeric_id_in_url` ne prouve ni offre active ni annonces exploitables ; `publication_candidate_eligible=false` pour les 100 enregistrements.