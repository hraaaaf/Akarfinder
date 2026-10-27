# AkarFinder — Architecture RAW → PULPER → MOULES JSON → SCORING (V1)

**Goal** : collecter des snapshots des annonces publiques autorisées, conserver leurs réponses brutes dans un stockage privé, puis produire des données JSON normalisées, retraitables et traçables. Les 200 000 annonces *exploitables* sont un objectif, pas un total d'URL.

## Pipeline

1. RAW : événements JSONL \`source, source_identity, source_url, final_url, http_status, observed_at, title, markdown\`. Source originale, heure d'observation et preuve conservées sans modification ; dans V1 locale, fichiers adressés par hash avec permissions 0700/0600. Les RAW doivent être stockés en privé (blob chiffré + contrôle d'accès et rétention avant la montée à l'échelle). Ne pas pousser de texte intégral, photos ni contacts dans GitHub ou Notion.
2. PULPER : vérification origine/HTTPS/status, identifiant et empreinte, extraction avec les six adaptateurs du parseur \`feenway-primary-parser-v1.mjs\`, normalisation et classement des anomalies. Les doublons de snapshot identique sont supprimés de la sortie ; les versions modifiées restent traçables.
3. MOULES : \`data/molds/property-listing-v1.json\` spécifie valeurs, unités et poids. Sortie \`molds.jsonl\` : ville/quartier, prix MAD/période, surface m²/type de surface, chambres (null en l'absence d'une extraction sûre), type de bien, transaction, provenance et date explicite si prouvée.
4. SCORING : note technique sur 100 par richesse des champs et identité, fraîcheur sur 100 **uniquement** si la date de publication est explicitement prouvée sur la fiche source, note de tri = 70 % technique + 30 % fraîcheur (inconnue = contribution 0), moins pénalités d'anomalies. Le score ne crée aucun droit ni disponibilité.
5. QUALIFICATION : \`quarantine\`, \`review_incomplete\`, \`review_anomaly\`, \`review_complete\`. Tous les enregistrements gardent \`eligible=false\`. Admission commerciale distincte exige preuve d'activité, fraîcheur réelle, unicité physique, données cohérentes, droits de republication.

## Exécution et preuve

- Tests : \`node --test scripts/data/__tests__/listing-pulper-core-v1.test.mjs scripts/data/__tests__/listing-pulper-cli-v1.test.mjs\`
- Offline : \`node scripts/acquisition/listing-pulper-v1.mjs --input=/private/raw-events.jsonl --raw-private-dir=/private/raw-store --out=/private/run1\`
- Livrables privés : RAW immuable par SHA256, \`molds.jsonl\`, \`summary.json\` avec les compteurs et statuts. **Aucun appel réseau, aucune écriture DB, aucun Vercel.**
- Déjà prouvé localement : 15 tests sur 15, avec un double de test local pour le parseur. CI GitHub doit vérifier l'intégration avec le **véritable parseur** avant certification de V1.

## Limites et Next

Le pipeline V1 ne capture pas lui-même les pages, n'implémente pas encore un stockage d'objets chiffré productif, et n'effectue pas la déduplication physique entre portails. C'est le fondement testable de l'architecture, **pas encore un moteur 200K prêt pour la production**.

Next exact : prouver la CI, construire des fixtures ancrées pour les champs chambres/prix atypiques/période, traiter en offline un lot borné de pages brutes originales, identifier les anomalies les plus fréquentes, adapter les moules par version, puis ajouter la collecte régulée et la réévaluation automatique sans perte des RAW.
