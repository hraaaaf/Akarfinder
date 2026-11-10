# J18 — Préparation de repères OSM indicatifs (2026-11-10)

## Goal / succès / preuve
Objectif : préparer un **candidat de diffusion** nationale de repères OpenStreetMap/Geofabrik, distinct de la QA privée et du modèle de POI commerciaux « certifiés ». Le présent lot n'active aucun endpoint public.

Succès technique demandé : source PBF épinglée, MD5 et SHA256 **recalculés sur ses octets**, manifest QA et checksums de toutes les tuiles vérifiés, noms/coordonnées/catégories/identifiants et provenance OSM contrôlés, état de non-publication conservé. Ne pas prétendre que la date d'extraction certifie l'activité des établissements.

Module : scripts/neighborhood-context/j18-public-indicative-candidate.mjs.
Tests : scripts/neighborhood-context/fixtures/j18-public-indicative-candidate.test.mjs.

## Flux technique
- Entrées : le pack national J11 « PRIVATE_QA_ONLY » hors dépôt, le **vrai PBF** correspondant, une attestation JSON épinglée avec les clés schema, source, sourceMd5, sourceSha256, pbfReplicationAt (ISO UTC).
- L'attestation a pour schéma AKARFINDER_J18_PBF_SOURCE_EVIDENCE_V1. Sa date de réplication doit être contrôlée indépendamment depuis l'en-tête source ; le module vérifie la validité, l'âge maximum 30 jours et la cohérence des empreintes, **pas la réalité historique de la date déclarée**.
- Sortie dans un nouveau dossier **hors repo** et hors public/, générée de façon atomique. Le dossier parent de destination doit déjà exister ; son chemin réel (symlinks résolus) est contrôlé contre le chemin réel du repo, en comparaison insensible à la casse sur Windows : schéma AKARFINDER_J18_INDICATIVE_RELEASE_CANDIDATE_V1, état REVIEW_CANDIDATE_ONLY_NOT_PUBLIC, publicationAuthorized=false, publicEndpointEnabled=false, attribution ODbL et horodatage/expiration explicités.
- Les tuiles candidates ne contiennent que l'ID OSM, le nom, catégorie, coordonnées, lien source et type de point. L'ouverture et l'appartenance au quartier central restent null. Aucune suppression par proximité ; doublons exacts interdits.
- Aucune écriture DB, API de runtime, URL de distribution, variable NEXT_PUBLIC, Vercel, Cloudflare ni publication automatique.

Commande de préparation privée, après disponibilité du PBF et de son manifest :

    node scripts/neighborhood-context/j18-public-indicative-candidate.mjs --pack /hors-depot/pack-j11 --pbf /hors-depot/morocco.osm.pbf --evidence /hors-depot/evidence.json --out /hors-depot/j18-candidate

## Les cinq axes travaillés ensemble
1. **J18 données** : préparation candidate et tests de corruption/TTL/source. Le seed du 16 août reste expiré (il ne faut pas changer sa date). Prochaine étape : exécuter sur le vrai PBF et qualifier un backend de distribution **distinct** ; aucun pack national public aujourd'hui.
2. **Trois modes** : Quartier 2D, Rue, Limites. Le contenu « Limites » reste explicatif : relation OSM de l'arrondissement Maârif non revue, aucun contour inventé pour Maârif central.
3. **UX** : même famille de captures CI 390x844, 430x932, 768x900, 1280x900. Note cible 9,5/10 non certifiée et pas de nouveau changement UI dans ce lot de données.
4. **QA** : anciens rapports J17, axe automatisé et CI verte du HEAD 476b65de ; exigences suivantes : lecteurs d'écran réels, débits mobiles/CDN, distribution des tuiles, 3 villes et 4 viewports.
5. **Closeout** : PR #1197 Draft ; conserver un gate humain pour source, frontière, UX, merge et tout déploiement Vercel.

## Limites et prochain test
- Ce builder produit seulement un **candidat non publié**. Une transition de schéma vers une nouvelle API publique, un hébergeur/stockage et des autorisations de publication devront être conçus/testés séparément.
- Le PC Desktop Commander était inaccessible lors de la préparation ; aucune exécution sur le PBF national réel, aucun benchmark public, aucune preuve de 27 567 points recalculés sur ce HEAD.
- CI Node du HEAD commité à lire ; en cas d'échec, corriger avant J18 closeout. La comparaison visuelle réelle du produit final ne peut être considérée comme achevée à ce stade.

NEXT EXACT : CI de ce lot, rétablir l'agent de machine, exécuter l'export réel et la vérification des manifestes, concevoir un endpoint distinct de lecture publique avec quotas/cache et source pinning, puis tests 3 modes/4 viewports et validation humaine. Ne pas merger ni déployer Vercel.

## J18-A/B — Export source national réel et lecture bornée (10/11/2026)

**Goal :** préparer un candidat de données OSM indicatives à partir du vrai PBF, sans le publier ni contaminer le modèle de POI enrichis. Source vérifiée directement via pyosmium : réplication 2026-11-08T21:21:00Z, PBF Geofabrik 244 434 479 octets, MD5 c2334c9499b4565a6a16cf2f45624912 et SHA256 0ba250a5c27319a029b7c6b971e2a96a86b300d459406bb162be4c44a23a730f. Empreintes recalculées et égales au manifest J11.

**Success réel :** générateur exit 0, 27 567 points / 1 339 tuiles, état REVIEW_CANDIDATE_ONLY_NOT_PUBLIC, expiration 2026-12-08T21:21:00.000Z. Sortie privée sur PC sous C:\Users\lenovo\Desktop\AkarFinder-Vivre-Ici-QA-20261110\j18-review-candidate-morocco-20261110 ; attestation PBF sous j18-source-evidence\pbf-source-evidence-private.json. Aucune tuile, PBF ou JSON nominatif dans Git, aucun upload ni DB.

**Proof indépendant :** toutes les 1 339 tuiles et leurs SHA256 relus, 27 567 IDs OSM uniques ; 0 revendication de commerces ouverts ou de frontière officielle. Volumétrie totale tuiles : 9 225 988 octets, maximum par tuile 351 336 octets. Catégories : transport 10 417 ; santé 8 129 ; écoles 4 794 ; courses 1 988 ; espaces verts et sport 1 179 ; shopping 1 060. Bbox contextuelles (pas administratives) : Casablanca 652, Rabat 389, Marrakech 465.

**Nouveau lecteur hors API :** scripts/neighborhood-context/j18-indicative-candidate-reader.mjs. Lecture bornée (max 64 cellules / 180 résultats), SHA source épinglée, SHA de chaque tuile lue, validité de la date source/TTL 30 jours, attribution ODbL et refus des déclarations commerciales ou territoriales non certifiées. Tests synthétiques Windows : 14/14 PASS après correction test Windows de fileURLToPath. Pas de route publique, pas de runtime prod ni flag déployable ajouté.

**3 villes / 25 requêtes locales par ville :** 180 résultats par vue. Casablanca P50 18,65 ms / P95 23,60 ms ; Rabat P50 9,98 / P95 11,30 ; Marrakech P50 12,79 / P95 14,88. 540/540 features exactement identiques aux tuiles QA J11 (ID, nom, catégorie, coordonnées, claims). Mesures locales disque, pas réseau/CDN. Rapports privés j18-real-export-verification.json, j18-three-city-reader-benchmark.json et j18-3city-parity-report.json.

**Modes/UX/a11y QA** : 4/4 vues (390x844, 430x932, 768x900, 1280x900) : modes Quartier 2D, Rue, Limites ; changement réel des pixels après Rue, panneau Limites véridique, 0 erreurs JS et 0 overflow, 0 violation axe automatisée détectée dans les états audités. Vérifications axe incomplete restantes ; valeur d'attribut zoom parfois en retard. Captures privées j18-after-3modes (quartier/rue/limites) montrées. Pas de score visuel 9,5 certifié.

**Gate NO-GO** : aucun endpoint de données publiques activé ; seed historique d'août reste expiré, modèle enrichi public à 0 ancre. Prochaine étape : backend de distribution versionné distinct, tests réseau/CDN/lecteur écran réel, validation des frontières, revue visuelle ≥9,5/10 puis décision humaine de merge/Vercel. Ne pas confondre candidate indicatif et source métier certifiée.
