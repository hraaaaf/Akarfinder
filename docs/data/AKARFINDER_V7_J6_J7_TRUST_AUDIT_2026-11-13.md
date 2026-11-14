# Akarfinder V7 — J6/J7 : audit de chaîne de confiance et plan de mise en service
Date : 2026-11-13. Périmètre : roadmap canonique V7 J6/J7 seulement.
STATUT : conception et tests hors ligne ; NO-GO DB réelle, ingestion, cron, merge, Vercel.

## Goal / succès / preuve

GOAL : empêcher la falsification, le rejeu, la révocation ignorée et la réservation arbitraire de créneaux, sans transformer une attestation technique en vérité immobilière.
SUCCÈS TECHNIQUE : contrôles de signature sans secret vérificateur, registre de clés publiques épinglé, refus des altérations/algorithmes faibles, limites de créneaux server-side, contrats SQL avec permissions minimales.
PREUVE REQUISE : vrais tests adversariaux de protocole en GitHub CI aux SHA de code, PostgreSQL17 éphémère, traces de refus, aucune action réseau ni DB extérieure.
SUCCÈS MÉTIER NON ATTEINT : signature d'émetteur vraiment enregistré, stockage durable partagé, source immobilière actuelle indépendante, contrôle geo et humaine, activation contrôlée.

## Audit des failles et contre-mesures (toutes dans J6/J7)

| Risque | État avant audit | Remédiation autonome sûre | Bloque toute activation réelle ? |
|---|---|---|---|
| T1 Usurpation HMAC symétrique | Vérificateur et émetteur détiennent le même secret ; le vérificateur peut lui-même fabriquer une MAC | Nouveau validateur indépendant J6 Ed25519 RFC 8032 avec clé publique opérateur, aucun secret en module de vérification, domaine binaire distinct ; l'ancien HMAC reste en quarantaine | Oui, identité émetteur externe non validée |
| T2 Faux registre de clés | SHA fourni par annonce serait auto-proclamé | SHA256 des octets EXACTS du registre v2 reçu par canal indépendant ; refus de doubles clés JSON, clés publiques réutilisées, scopes non autorisés, algorithme différent et révocation | Oui, canal d'enregistrement et révocation réels manquants |
| T3 Attaques sur sérialisation des signatures | Enveloppe JSON à sérialisation implicite | Message Ed25519 v1 DOMAIN suivi de 12 champs UTF-8 à ordre FIXE et préfixe longueur uint32 big-endian ; pas de revendication de conformité JCS | Oui, SDK émetteur indépendant à auditer et signer hors ChatGPT |
| T4 Rejeu inter-runners et restauration ancienne DB | Registre SQL versionné, mais seulement CI éphémère | SQL J6 CAS monotone et reçus uniques sous transaction en PG isolé ; Ed25519 n'utilise PAS la colonne ancienne attestation_mac_sha256 | Oui, registre de preuve v2 durable/partagé à définir, restauration/rollback externe non maîtrisés |
| T5 Escalade SECURITY DEFINER | Tables RLS mais chemin de résolution devait être examiné | pg_catalog, schéma de confiance, puis pg_temp explicitement en dernier, fonction owner non-superuser et droits EXECUTE restreints ; vérification proconfig en CI | Oui, audit sur rôle réel, pooler et migrations avant activation |
| T6 Réservation J7 arbitraire | claim_slot acceptait tout entier >=0, réservant potentiellement des créneaux futurs de manière permanente | Horloge du serveur PostgreSQL : créneau UTC 600 secondes courant ou deux créneaux passés au maximum ; aucune réservation du futur ; claims expirés ne peuvent terminer/émettre des marqueurs | Oui, calendrier production, SLA retards et observabilité non validés |
| T7 False-positive métier | Source Sarouty #894012 coords incohérentes ; Mubawab #8205911 est historique et une location sans canonical | Toute signature valide reste status=quarantined, stage=false, publication=false ; pas de conversion WARC historique en live | Oui, source actuelle fiable et geo indépendantes manquantes |
| T8 Contournement du garde-fou via données sources | Un résultat signé pouvait se faire passer pour un droit d'admission | Les registres J6/J7 exposent seulement état de revue/lot ; J6 Ed25519 NE génère PAS un review_receipt_intent pour la table HMAC et n'émet aucun SQL | Oui, protocole v2 SQL et politique d'admission à tester end-to-end |

### Frontière de protocole

L'enveloppe Ed25519 v1 possède EXACTEMENT :
- schema_version, algorithm, key_id, issuer, source_domain, source_offer_id, source_url, html_sha256, manifest_sha256, captured_at_utc, issued_at_utc, expires_at_utc ;
- signature_hex (signature 64 octets), champ non signé et non confondu avec HMAC.

Message à signer : octets de domaine AKARFINDER NUL V7 NUL J6 NUL ED25519 NUL CAPTURE NUL V1 NUL, suivis des 12 champs dans l'ordre déclaré, chacun length uint32 big-endian + UTF-8 strict. C'est un format de protocole interne, différent de JSON Canonicalization Scheme RFC 8785. Aucun code de génération de clé privée ni de signature opérationnelle dans le module ; signatures de fixtures UNIQUEMENT dans les tests.

Registre opérateur v2 : schema_version, generation, issuers[] avec key_id, issuer, public_key_hex (32 octets), source_domains, status, valid_from_utc, valid_until_utc, algorithm=Ed25519. Empreinte SHA256 du document brut fournie hors bande. Maximum 16 KiB, 32 identités, 90 jours. Aucun domaine autre que agenz.ma, mubawab.ma ou sarouty.ma dans ce sous-lot.

### Chaîne de confiance qui devra être validée avant activation

1. Inscrire l'identité du véritable émetteur via décision explicite, et épingler le registre PUBLIC hors du canal candidat. Protection contre retour à ancienne génération via journal externe immuable et procédures de restauration testées. Rotation et révocation opérationnelles documentées.
2. Émettre des signatures via service indépendant, possédant SEUL la clé privée, avec séparation entre capture et revue. Aucune clé privée dans GitHub Actions, Git, Notion, ChatGPT ou logs.
3. Vérifier l'enveloppe signée et les octets originaux, la même URL/ID, la MAC/Ed25519 correcte, les sept champs parser et un horodatage non périmé. Vérifier le vrai bien et la géographie avec une source indépendante : une signature ne rend jamais les données vraies.
4. Introduire un registre v2 distinct : type de preuve (Ed25519), preuve SHA256 (signature Ed25519 64 octets), identifiant de clé, version opérateur, digest source, décision de revue. Ne JAMAIS mettre un SHA de signature dans le champ HMAC v1 pour contourner l'incompatibilité.
5. Coupler une décision humaine auditable à une promotion explicite en staging privé. Rôles minimaux, transaction/fencing de DB, logs d'audit, rollback testé, et contrôle d'accès indépendant.
6. Raccorder J7 seulement ensuite ; un token de claim DB ne fence PAS les effets HTTP externes. Tester collisions, crash, retard GitHub Actions, absence de doublon et limites de cadence. Activation et Vercel exigent GO séparés.

## Références techniques primaires

- RFC 8032, EdDSA/Ed25519 : https://www.rfc-editor.org/rfc/rfc8032.html
- RFC 8785, canonicalisation JSON (protocole différent de notre TLV fixe) : https://www.rfc-editor.org/rfc/rfc8785.html
- PostgreSQL 17, SECURITY DEFINER et chemin pg_temp en dernier : https://www.postgresql.org/docs/17/sql-createfunction.html
- Python Cryptography, Ed25519.verify : https://cryptography.io/en/latest/hazmat/primitives/asymmetric/ed25519/
- PyPI, cryptography 50.0.2 du 30/09/2026 : https://pypi.org/project/cryptography/50.0.2/

## Décision et statut

Architecture recommandée : Ed25519 + registre public épinglé indépendamment + état monotone DB partagé avec témoin anti-rollback externe + revue métier humaine ; préférée à l'HMAC partagé pour les émetteurs indépendants.
Le code Ed25519 et le durcissement J7 sont des validations de laboratoire ; le déploiement et la gestion des clés ne sont PAS autorisés. Les jalons J6/J7 restent OUVERTS, V7 = 2/8 jalons métier clos. Ne pas déclarer production-ready.
