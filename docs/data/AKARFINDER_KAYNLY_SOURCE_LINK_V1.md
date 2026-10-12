# Kaynly → liens source : canari national, 12 octobre 2026

**Opportunité** : Kaynly annonce sur ses pages publiques un inventaire agrégé d'environ **104 157 annonces relevées le 11 octobre 2026**, issues de cinq portails. Ce total provient d'un index tiers, et non d'un contrôle indépendant de biens disponibles. Il ne faut pas additionner cet inventaire au registre AkarFinder, en raison de recouvrements inter-portails.

**Test observé** : deux pages de ville `/vente/casablanca` et `/location/casablanca`, robots fail-closed, cadence de 2 secondes, UA identifié. Le module `scripts/data/kaynly-source-link-canary-v1.mjs` ne suit aucun lien vers des fiches tierces. Il extrait uniquement les ancres explicitement libellées « Voir l'annonce sur ... » et leurs URL source en HTTPS sur une allowlist de domaines. Un SHA256 de l'URL est un **identifiant technique de lien**, pas un ID prouvé d'annonce. Maximum deux pages, zéro DB, aucun Vercel ou merge.

**Critère de succès** : CI exact HEAD verte + artifact `kaynly-source-links-v1`, nombre de liens source par portail, distinction entre URLs source, identités immobilières, activité et unicité physique; zéro publicité de résultats non démontrés. Ensuite comparer à l'identité des portails déjà dans le ledger et tester de nouvelles catégories que le site référence réellement, toujours avec charge limitée.

Ce canari ne donne aucun droit de republication des photos, ne certifie pas les dates de publication, et ne collecte aucune donnée de contact.
