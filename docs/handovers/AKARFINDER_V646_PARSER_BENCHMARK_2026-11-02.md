# Akarfinder — Mubawab V6.4.6 : parser + mesure réelle de complétude (2026-11-02)

**Goal :** prouver par données l'extraction, la qualité et l'unicité des annonces, sans confondre CI, IDs et biens publiables.

## État initial vérifié
- Handover Notion : https://app.notion.com/p/40c77c66336281e8b50fddde1076eea5
- Branche source `sandbox/akar-chrome-probe-20261101`, HEAD `cf688f61e558935489a8fc5f1a54880f7776e4d9`.
- CI V646 https://github.com/hraaaaf/Akarfinder/actions/runs/41479752149 : **19/19 PASS**, sécurité/manifest uniquement.
- Run V645 https://github.com/hraaaaf/Akarfinder/actions/runs/41327076337 : **97 enregistrements SQLite historiques sur 3 pages**, distinct du scraper V646 live.
- 200 000 fiches uniques fraîches complètes : **NON PROUVÉ**. Aucun déploiement ni écriture DB produit.

## Instrumentation et tests de reprise
- Branche de travail `sandbox/akar-v646-parser-benchmark-20261102`.
- `scripts/pilots/mubawab-v646/tests/test_parser_evidence.py` : 14 nouveaux tests de reconnaissance HTML, prix MAD/MDH, surface, localité, rejets, doublons, persistance et idempotence. Les HTML sont expressément **synthétiques**, pas une capture Mubawab.
- `scripts/pilots/mubawab-v646/benchmark_evidence.py` : mode replay HTML synthétique et mode audit de SQLite préexistante en lecture seule. Aucun accès réseau ni write dans l'outil.
- `.github/workflows/mubawab-v646-offline-tests.yml` : tests et relecture de l'artefact `mubawab-v645-multishard-sqlite-state` du run #41327076337 (97 lignes attendues) ; sortie JSON `mubawab-v646-historical-evidence`.

## Contrat de mesure
- `observed_rows` : lignes source parcourues (doublons éventuels inclus).
- `unique_source_ids` : identifiants du **même portail** distincts, pas biens physiques uniques.
- `complete_core_without_district` : titre + prix MAD numérique ou on-request explicite + surface + ville + URL de détail.
- `complete_core_with_district` : mêmes champs + quartier observé ; `_numeric_price` sépare la présence d'un prix numérique.
- `duplicate_source_id_occurrences` : répétitions d'identifiants ; la déduplication **physique** inter-IDs reste inconnue.
- `verified_active`, `physical_unique_properties` et `live_extraction_rate_per_hour` : `null` faute de preuve.
- `publication_eligible_proven = 0` tant que fraîcheur, activité et droits ne sont pas contrôlés.
- Les secondes de traitement du benchmark sont **CPU/offline** et non un débit de crawl.

## Validation obtenue le 03/11/2026 — HISTORIQUE V645 seulement
- [Run #41549175495](https://github.com/hraaaaf/Akarfinder/actions/runs/41549175495) **completed/SUCCESS**, HEAD code `6ac202be403564610bde8b0b53dd43b59a14460e`. **33/33** tests hors ligne PASS ; 19 tests initiaux et 14 tests parser/qualité.
- Artifact [mubawab-v646-historical-evidence #13190297948](https://github.com/hraaaaf/Akarfinder/actions/runs/41549175495/artifacts/13190297948), SHA256 archive `d1ba2bd3852d0032de9b9a75ce2b5748e1f55f4d93e7005153d8c5851d151271`. Audit du **SQLite V645 historique** intégré, PRAGMA integrity_check=ok.
- **97** lignes SQLite ; **97** IDs-source distincts ; **0** répétition d'ID dans ce snapshot.
- Champs présents parmi les IDs : titre **97**, prix numérique **91**, prix explicitement sur demande **6**, surface **97**, ville **97**, quartier **97**, URL de détail **97**.
- **97/97** complets suivant le core (titre, prix numérique ou sur demande, surface, ville, quartier, lien). **91/97** avec prix numérique. Ces champs proviennent du stockage historique, pas d'un nouveau parse V646 live.
- Activité, fraîcheur, unicité physique, et droit de publication **non vérifiés** ; `publication_eligible_proven=0`, `live_extraction_rate_per_hour=null`.
- Aucun appel au site lors de cet audit. `offline_processing_seconds=0.002842` = temps de lecture SQLite et de calcul, PAS débit du crawler.

## Correctif d'accès HTTP et canary V646 en cours
- Correctif `browser_fetcher.py` : **HTTP 403/429 toujours BLOCKED**, jamais transformé en succès 200 après parsing du HTML. Test offline `tests/test_browser_access_denied.py`.
- `live_canary.py` : une navigation de shard Rabat sans pagination, robots préflight, Chromium ordinaire, pas de retry, pas de proxy ou bypass, aucune écriture SQLite ou prod ; n'enregistre que hash HTML et métriques agrégées. Trois tests offline supplémentaires.
- [Canary live #41611908342](https://github.com/hraaaaf/Akarfinder/actions/runs/41611908342) sur `4cbabc47fd0f3d33a5fcf0b647cfbbde82beb873` créé, **queued au contrôle initial**, ne pas annoncer de résultat live avant logs/artefact.
- La CI hors ligne du nouveau correctif doit être contrôlée séparément ; 33/33 PASS correspondent au commit précédent, pas à ces nouveaux changements.

## Gate réel restant
1. Nouvelle CI sur tests navigateur/canary : vérifier, diagnostiquer toute régression et corriger.
2. Lire le diagnostic du canary live #41611908342 : preuve de refus de blocage, ou comparaison de vrais sélecteurs si HTML accepté.
3. Si succès sur HTML fidèle, calculer rendement strict/qualité ; si challenge/403/429, clôturer comme blocage sans contournement. Ne pas extrapoler le débit d'une seule page.
4. Test de reprise sur interruption, intégrité SQLite, qualité, validation CI puis closeout Notion.
5. **NO-GO** pour extrapoler à 200k tant que rendement et catalogue disponible ne sont pas démontrés.

Aucun Vercel, aucun Supabase/Neon ni merge dans ce chantier.

## Observation complémentaire : 1 page de résultats consultée (non parsée)
- `robots.txt` obtenu le 02/11 avec politique générique excluant `/*:`, mais ne bloquant pas le shard non paginé de Rabat.
- Une lecture publique ponctuelle du shard Rabat a montré des prix, surfaces et localisations visibles. Le service d'extraction consulté **nettoie les attributs CSS et les liens** : zéro `.listingBox` dans le HTML nettoyé ne prouve PAS leur absence dans le HTML source. Impossible de valider les sélecteurs V646 sur cette sortie.
- Le rendu de résultats mélange parfois un contenu de catégorie différente (exemple historique visible : villa en tête de résultats appartements) ; type de bien à qualifier, pas à supposer depuis le shard.
- Ce contrôle n'est pas un benchmark du parseur V646 : zéro HTML brut fidèle conservé, zéro fiche V646 nouvellement certifiée, zéro débit live mesuré.
- Correctif compteur ajouté : fusion non destructive des champs d'un même ID source lors du replay, test de régression `partial_duplicate` ; CI final toujours non confirmé.

## 03/11/2026 — Canary live validé et pack de revue indépendante Claude

- Canary [run #41611908342](https://github.com/hraaaaf/Akarfinder/actions/runs/41611908342) **completed/SUCCESS** sur commit `4cbabc47fd0f3d33a5fcf0b647cfbbde82beb873`. Une navigation Rabat non paginée, HTTP 200, robots contrôlé, 34 cartes dont 2 ignorées, 32 cartes éligibles, 32 annonces parsées et 32 IDs-source distincts, 32 complets selon le core, 29 prix numériques, 3 `on_request`, zéro doublon d'ID ; 3,908 s pour la sonde (PAS débit soutenu). `verified_active=null`, `physical_unique_properties=null`, `publication_eligible_proven=0`, zéro écriture DB de production. [Artefact JSON #13218919780](https://github.com/hraaaaf/Akarfinder/actions/runs/41611908342/artifacts/13218919780).
- Workflow [pack Claude #41615495684](https://github.com/hraaaaf/Akarfinder/actions/runs/41615495684) **SUCCESS** sur HEAD exact `57c96ab73ee5c832212a10c501459a8dd4728939`, avec **37/37 tests offline PASS** et téléchargement des deux rapports d'artefacts déjà certifiés. [ZIP pack artifact #13220104568](https://github.com/hraaaaf/Akarfinder/actions/runs/41615495684/artifacts/13220104568). Archive interne `Akarfinder_Claude_Review_V646_20261103.zip` : 22 fichiers, 68 215 octets, CRC PASS, hash SHA256 `4b21d3298161beacbb97f1cc93e0b505fc0137b54b5ac56eefc866c1722bd0db`, manifest SHA interne vérifiés pour les 21 fichiers hors MANIFEST.
- [Ordre de mission Claude](https://github.com/hraaaaf/Akarfinder/blob/sandbox/akar-v646-parser-benchmark-20261102/docs/reviews/CLAUDE_MUBAWAB_V646_CRITICAL_REVIEW_2026-11-03.md) : demander 5–8 perfectionnements techniques classés P0/P1/P2, preuves code, tests adversariaux et patchs suggérés, **sans implémentation ni déploiement**.
- Aucun accès massif, aucun merge, aucun Vercel, aucun write DB produit. **NO-GO** pour certificat 200k, fraîcheur, droits ou unicité physique : ces propriétés restent non prouvées.

**Next exact :** transmettre le ZIP à Claude ; recevoir sa critique sourcée, filtrer les suggestions, prioriser les correctifs P0 prouvés et seulement ensuite engager un nouveau lot testable. Pas de modification automatique du code en réponse à la revue.
