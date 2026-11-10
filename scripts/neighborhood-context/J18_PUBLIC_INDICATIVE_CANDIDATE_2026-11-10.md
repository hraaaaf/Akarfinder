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

## J18-C — Route HTTP locale stricte, futur CDN non activé (10/11/2026)

**Goal** : qualifier une route serveur utilisant le candidat de 27 567 repères sans rendre public le pack privé ni écrire en DB.

**Implémentation** : app/api/geo/j18-indicative-review/route.ts, scripts/neighborhood-context/j18-review-route-gate.mjs et déclarations TypeScript. Route active exclusivement sous NODE_ENV=development, flag AKAR_VIVRE_ICI_J18_REVIEW_ONLY=true, dossier candidat hors dépôt, SHA256 source épinglée, URL et headers Host / X-Forwarded-Host loopback. Désactivée en production même avec opt-in. Cache private no-store, X-Robots-Tag noindex, CSP restrictive. Bbox ≤64 cellules, limite ≤180. Aucune déclaration d'ouverture réelle ni de frontière officielle.

**Défaut et correctif** : le premier bundle HTTP retournait 500 car le lecteur importait le générateur offline qui utilise un URL relatif à import.meta.url incompatible avec webpack/Next. Le lecteur est maintenant indépendant de tout générateur ou fonction d'écriture. TypeScript et contrats ont passé après correction.

**Preuves HTTP réelles** : 7/7 PASS (Casablanca, Rabat, Marrakech = 180 repères chacune, 200 ; bbox trop large 400 ; limit 181 = 400 ; Host falsifié 404 ; forwarded Host falsifié 404). Attributions, claims non certifiés, no-store/noindex observés. Rapport privé j18-review-http-report.json. Temps local inclut compilation à froid Casablanca ~3956ms, Rabat 124.2ms et Marrakech 104.9ms en route de dev, pas des latences CDN. 18/18 contrats Node de la route+J18 PASS, tsc --noEmit PASS avant le test HTTP.

**Piste CDN NON ACTIVÉE** : objet immuable par SHA source et cellule, avec pointeur de version signé/activé puis TTL de réplication ≤30 jours. Vercel Blob est une option intégrée au site, CDN avec cache et paths immuables ; vérifier limites et prix du plan avant adoption. Alternative Supabase Storage CDN. Éviter une lecture D1/DB par chaque tuile. Sources officielles : https://vercel.com/docs/vercel-blob ; https://vercel.com/docs/vercel-blob/usage-and-pricing ; https://supabase.com/docs/guides/storage/cdn/fundamentals. Aucun compte/storage/upload créé, aucune dépense ni déploiement.

**Next exact** : restaurer le serveur de dev sans J18 opt-in, obtenir HTTP404 sur route J18 par défaut et la carte 200, exécuter CI du nouveau commit et consigner HEAD. L'API publique et les tuiles CDN restent soumises à approbation source/stockage, accessibilité/latence mobile, revue visuelle cible ≥9,5/10 et human gate distinct. Ne pas considérer la release terminée.

## J18-C — Rétablissement de la preview après audit (10/11/2026)

**Restauration effective des flags** : le processus Next local de revue HTTP temporaire a été arrêté, puis le serveur development 127.0.0.1:3100 redémarré avec les flags préexistants de QA J11 (pack local et source SHA256 épinglée), mais **sans aucune des trois variables J18**. Preuves HTTP après redémarrage : nouvelle route J18 = HTTP404 (fail-closed), ancienne route QA J11 = HTTP200. Aucun process public/Vercel ni variable de publication ajouté. Une preuve d'affichage map supplémentaire reste à lire après compilation du routeur.

**Vérification HTTP avant restauration** : 3 villes 200/180, bbox trop large 400, limit 181 = 400, Host et forwarded Host usurpés 404, cache private no-store/noindex ; test 7/7 PASS. La première tentative de compilation a montré un HTTP500 résolu en supprimant l'import du générateur offline dans le lecteur. Tests unitaires J18 18/18 PASS et tsc --noEmit PASS.

**Artefact :** j18-review-http-report.json (hors Git), logs Next de revue/restauration privés sur PC. CI du nouveau HEAD à valider après commit. J18-C termine une **capacité de revue locale** ; aucune distribution publique réellement opérationnelle et aucune publication de données.

## J18-D — Plan d'objets CDN immuables, SANS upload (10/11/2026)

**Goal :** préparer l'acheminement des repères OSM sans D1 ni base transactionnelle, tout en conservant le gate humain de publication.

**Implémentation :** scripts/neighborhood-context/j18-cdn-upload-plan.mjs construit uniquement un plan privé, aucun réseau/SDK/identifiant de stockage. Il vérifie à nouveau le manifeste candidat, la provenance SHA du PBF, le TTL, les 1339 tuiles et les SHA-256 de leurs octets. Chaque clé d'objet candidate est immuable : osm-indicative/v1/[sourceSHA]/tiles/[x]/[y]-[tileSHA].json. Le résultat est marqué NOT_APPROVED_NOT_UPLOADED, publicationAuthorized=false, activationPointerCreated=false, storageProvider=UNSELECTED.

**Preuve réelle :** plan créé sur le PC hors dépôt dans j18-private-cdn-upload-plan-not-approved.json. **1339 objets**, **9 225 988 octets**, **27 567 repères**, expiration 2026-12-08T21:21Z, uploadPerformed=false. 3 nouveaux tests synthétiques PASS : noms immuables / intégrité et absence d'upload, refus SHA ou TTL incorrect, refus d'une tuile altérée. Le plan ne constitue ni une mise en ligne ni une autorisation de transfert.

**Architecture conseillée :** pour cette volumétrie, CDN d'objets immuables + petite API de contrôle d'expiration/version active. Préférence provisoire pour Vercel Blob (proximité de l'hébergement existant) ; alternative Supabase Storage CDN. Le choix final dépend des quotas du plan et de l'accès de l'équipe, car les requêtes/blobs sont facturables selon usage. Aucune ressource créée, aucune dépense autorisée, aucun token récupéré. Références : https://vercel.com/docs/vercel-blob ; https://vercel.com/docs/vercel-blob/usage-and-pricing ; https://supabase.com/docs/guides/storage/cdn/fundamentals.

**Gate suivant :** coder une API publique validant le pointeur de version et l'expiration à chaque lecture, avec hébergement approuvé et vraies latences réseau, sans jamais promouvoir directement le dossier REVIEW_CANDIDATE_ONLY_NOT_PUBLIC. Validation humaine nécessaire avant création d'un bucket public, upload, merge et tout déploiement Vercel. Un score visuel de 9,5/10 n'est pas démontré par ce lot backend.
