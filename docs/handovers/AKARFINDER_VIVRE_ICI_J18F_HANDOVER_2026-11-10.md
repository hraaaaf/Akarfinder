# HANDOVER — Akarfinder / Vivre Ici — J18-F2
Date : 2026-11-10
Statut : source / transfert Blob / lecteur privé vérifiés ; publication publique NO-GO.
IMPORTANT : ce fichier est un instantané de reprise. En nouvelle conversation, vérifier Git/PR/CI avant de réutiliser ses états.

## 1. Goal / Success / Proof
Goal final : proposer les 3 modes Vivre Ici (Quartier 2D, Rue, Limites) avec repères OSM indicatifs nationaux, accessibilité et UX premium, sans prétendre certifier les commerces ni la géométrie Maârif central.
Success produit : service publiable testé sur 3 villes / 4 viewports, score UX cible >=9,5/10 prouvé, accessibilité réelle, données périssables/versionnées, quotas maîtrisés et gate humain explicite avant merge, publication et Vercel.
Preuve acquise : source nationale vérifiée et stockée en PRIVATE, lecteur backend local fail-closed, contrats et CI verts. Ce n'est PAS une preuve de mise en production.

## 2. GitHub / PC / Notion (instantané vérifié)
- Repo : hraaaaf/Akarfinder ; PR : https://github.com/hraaaaf/Akarfinder/pull/1197
- PR : OPEN / DRAFT / NON MERGED.
- Branche : feat/vivre-ici-maarif-modes-clarity-20261108
- Base PR : feat/akarfinder-supabase-unified-20261108
- HEAD local et PR : 24e3681cf18999dfdb1866da28653d36cdca2a40
- Dernier commit : fix(vivre-ici J18F): allow verified reuse of unchanged private OSM tiles.
- CI du HEAD exact : 29 runs terminés, 27 SUCCESS, 2 SKIPPED, 0 FAILURE, 0 RUNNING.
- Checkout : C:\Users\lenovo\Documents\AkarFinder-pr1196-pilot ; worktree propre.
- PC : DESKTOP-3MAJEEH ; deviceId ae2c2d90-92dd-4ede-b025-19f560836d45 ; Remote Desktop Commander.
- Dossier indépendant à NE PAS toucher : C:\Users\lenovo\Documents\AkarFinder-Q1F-V3
- Notion Command Center : https://app.notion.com/p/3df77c663362816d8678c28ad6a49bcf
- Notion spec Maârif : https://app.notion.com/p/3f577c66336281d79f5dc46467df5f65

## 3. Livré, avec preuves
- J11 : index OSM national QA-only, 27 567 repères / 1 339 tuiles, ODbL, source Geofabrik.
- PBF Maroc : 244 434 479 octets ; horodatage source 2026-11-08T21:21:00Z.
  MD5 c2334c9499b4565a6a16cf2f45624912
  SHA256 0ba250a5c27319a029b7c6b971e2a96a86b300d459406bb162be4c44a23a730f
- J12/J15/J16/J17 : modes de carte, touch targets 44 px, navigation clavier, attribution OSM, densité mobile corrigée, glyphes MapLibre fixés. Captures et rapports QA sous C:\Users\lenovo\Desktop\AkarFinder-Vivre-Ici-QA-20261110.
- J18-A/B : candidat local integrity-checked, chaque SHA de tuile vérifié, 27 567 IDs uniques, source expirant le 2026-12-08T21:21Z.
- J18-C : route QA locale seulement, désactivée en production ; requêtes bbox/limit et host spoofing rejetées.
- J18-D : plan d'objets immuables sourceSHA + tileSHA, 9 225 988 octets ; aucun upload automatique par le plan.
- J18-E : Vercel Blob store akarfinder-osm-j18 (store_6gxChm3iUtEuoHOA), Paris cdg1, PRIVATE. 1 339 tuiles transférées et manifeste supplémentaire de 222 179 octets ; SHA manifest :
  e0aca1621c93328ef5dd83ed38d23593839ccf06e71b12e2103d51773b7f4950
  1 339/1 339 objets inventoriés, 16/16 relectures SHA conformes, puis 15/15 relectures privées sur Casablanca/Rabat/Marrakech. URL anonyme = HTTP 403.
- J18-F : lecture serveur des Blob privés (@vercel/blob 2.9.0), pinning source/manifest, SHA-256 avant JSON, TTL source validé même sur cache, cache LRU borné, bbox max 64 cellules, max 180 features, limiteur QA 24/min par instance. La route ne peut pas être activée en production par simple flag.
  HTTP local sur vrais Blob : 8/8 (Casablanca/Rabat/Marrakech 200 et 180 résultats ; entrées invalides 400 ; Host falsifié 404). Les 3 villes passent aussi en lecture Node.
  Contrats : 65/65 Node avant correctif F2 ; TypeScript PASS.
- J18-F2 : champ optionnel blobSourceSha256 pour réutiliser de façon vérifiée une tuile inchangée d'un snapshot PBF antérieur. Deux contrats ciblés ajoutés ; 17/17 tests ciblés PASS. Le pipeline de fabrication des manifestes différentiels N'EST PAS implémenté.
- Restauration PC : J18-F locale par défaut HTTP 404, ancienne QA J11 HTTP 200, aucun fichier OIDC temporaire .env.local. Checkout clean ; pas de DB modifiée, pas de merge et pas de Vercel deployment.

## 4. Fichiers de code / preuves
- Canonique : scripts/neighborhood-context/J18_PUBLIC_INDICATIVE_CANDIDATE_2026-11-10.md (lire aussi les sections finales F et F2)
- Reader : scripts/neighborhood-context/j18-private-blob-read-model.mjs
- Route locale : app/api/geo/j18-blob-review/route.ts
- Gate : scripts/neighborhood-context/j18-blob-review-gate.mjs
- Contrats : scripts/neighborhood-context/fixtures/j18-private-blob-read-model.test.mjs ; j18-blob-review-gate.test.mjs
- CI : .github/workflows/vivre-ici-j11-national-landmarks.yml
- Dossier QA PRIVATE PC : C:\Users\lenovo\Desktop\AkarFinder-Vivre-Ici-QA-20261110
- Preuves privées : j18-private-bulk-upload-report.json ; j18-private-3city-network-report.json ; j18-f-real-blob-read-report.json ; j18-f-private-http-report.json ; captures j18-after-3modes.
- Ne jamais committer les exports PBF, tuiles nationales, tokens, .env, captures contenant les POI individuels ou rapports bruts de données.

## 5. Reste, dans l'ordre critique
1. J18-G : générateur différentiel de manifestes/tuiles ; vérifier les clés réellement réutilisées, les changements de SHA et la limite gratuite Hobby (2 000 opérations avancées/mois). Ne pas relancer naïvement 1 339 PUT chaque mois.
2. Préparer une route de diffusion publique DISTINGUABLE de la QA, mais fail-closed jusqu'à une approbation indépendante. Version immuable/pointeur d'activation approuvé, expiration, cache et quotas multi-instance, protections anti-abus/empreintes. Aucune publication de pack avant GO explicite.
3. Tester réseau mobile réel, expérience 3 villes x 4 viewports (390x844, 430x932, 768x900, 1280x900), lecteurs d'écran VoiceOver/NVDA, latences CDN et coûts/quotas réels. BEFORE -> goal visuel -> AFTER -> comparaison -> score.
4. Revue UX cible >=9,5/10 non démontrée (~8/10 indicatif précédent). Vérifier les 3 modes, panneaux, filtres, lisibilité responsive et attribution ; garder 'Limites non disponibles' sans vraie géométrie Maârif central certifiée.
5. Gate humain sur frontière/dataset/publication + gate séparé sur merge et déploiement Vercel. Si CI rouge : diagnostiquer/corriger/tester ; si verte : clôture docs/Notion, évaluer lot suivant.

## 6. Contraintes immuables et risques
- Pas de déploiement Vercel sans autorisation explicite ; pas de merge ou de publication CDN sans gate humain.
- Vercel Blob reste PRIVATE : les données OSM indiquent des repères, PAS l'ouverture d'un commerce, l'appartenance officielle à Maârif central, ni une entrée à précision certifiée.
- Relation OSM de l'arrondissement Maârif != limite du quartier central.
- Source actuelle expires 2026-12-08T21:21Z ; revalider la fraîcheur à chaque lecture et avant toute promotion.
- Ne pas substituer aux données OSM indicatives le vieux seed commercial/enrichi expiré (0 ancres publiques vérifiées).
- L'auth OIDC a été temporaire et supprimée localement. En cas de tests privés futurs, réauthentifier proprement, ne jamais exposer de token en chat ou Git.
- Hobby : ne pas dépasser les quotas ; aucun débit futur garanti. Limiteur en mémoire actuel seulement QA, INSUFFISANT en public.
- Mesures précédentes sont PC -> Blob / localhost ; aucune validation réelle de débit mobile public ou de fonction Vercel prod.

## 7. NEXT EXACT / commande de reprise dans une nouvelle conversation
Lire ce handover ET le .md canonique J18 ; vérifier ensuite HEAD local, PR, CI et statut du stockage avant toute action.
PowerShell :
  Set-Location 'C:\Users\lenovo\Documents\AkarFinder-pr1196-pilot'
  git status --short --branch
  git rev-parse HEAD
  git log -3 --oneline
Github PR #1197 : vérifier HEAD, draft, non-merge ; requêter les actions du SHA exact.
Next technique : J18-G générateur de différentiel offline (aucun upload ni production), tests de non-régression SHA/TTL/quotas, puis GitHub CI et Notion.
Au terme du prochain lot : résultat -> preuve -> prochaine action -> repères, et mettre à jour Notion.
