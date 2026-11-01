# Mission 200k /48h — Activation des flux partenaires (contrat, pas autorisation)

## Situation
Le repo possède déjà `lib/feeds/schema.ts`, `parsers.ts`, `staging.ts` et 19 tests historiques : CSV/JSON/XML, ID stable, déduplication, delete/unpublish, prix null.
Le nouveau pilote `audit.ts` réutilise ces fonctions en lecture locale uniquement : aucune connexion DB ni source partenaire réelle. Il mesure la cohérence et l'âge des dates fournies, pas l'activité. Toutes les fiches restent explicitement NON PUBLIABLES.

## Différence critique
- Flux sortant d'une agence vers Mubawab/Sarouty ≠ flux sortant de ces portails vers Akarfinder.
- Date `updated_at_source` fournie ≠ preuve d'annonce encore disponible.
- Mention `images_rights_confirmed` dans les lignes ≠ contrat donnant à Akarfinder le droit de réutiliser.
- Déduplication d'ID/source ≠ déduplication de biens physiques entre plateformes.

## Contrat de collecte bulk pour un partenaire réel
1. Déclaration du propriétaire/licencié du stock et autorisation écrite avec portée exacte : index minimal, texte, photos, refresh, redistribution, expiration et retrait.
2. Export JSON/CSV/XML (par lots <=20 MiB selon limite du contrat de quarantaine `LOT B3.4.1`) avec identifiant stable, URL source, type, transaction, ville, quartier, prix/null, surface, statut disponible/retrait, date de mise à jour UTC.
3. Échantillon de 100 à 1000 fiches, horodaté, avec source identifiable et vrais droits de réutilisation : validation en quarantaine sans publication.
4. Vérifier 24 à 72 heures après la disponibilité, le taux de doublons intra/inter-portails, le contenu manquant et les messages delete/unpublish.
5. Seulement ensuite proposer un lot de 10k/50k/200k candidats, puis passage séparé au gate de publication avec approbation humaine.

## Cibles à approcher (aucun contact établi)
- **FeenWay** : environ 196 276 annonces agrégées sur le site au 01/11/2026 ; licences/amont à clarifier, risque de recouvrement très élevé. https://www.feenway.com/immobilier
- **Mubawab** : XML disponible en tant que flux entrant pour les professionnels; aucun export catalogue vers Akarfinder établi. https://www.mubawab.ma/es/faqs
- **Réseaux d'agences et leurs logiciels de gestion** : flux directement du détenteur des annonces, droits de publication à confirmer. https://www.sarouty.ma/trouver-une-agence/
- **Sarouty / Property Finder** : accès éventuel sous conditions contractuelles ; les APIs PFDN demandent candidatures et approbation, pas une licence implicite du stock marocain. https://pfdn.propertyfinder.com/integration-guide

## Condition bloquante côté projet
Projet Supabase `kusfiyimwvxblvsrhaes` en statut `INACTIVE` le 01/11/2026 ; aucune tentative de restauration sans décision. Aucun write en production, aucun Vercel et aucun cron.

## Next exact
Après tests du pilote shadow, demander un seul export réel licencié avec droits explicites et statut d'activité daté ; appliquer le gate existant, mesurer le nombre réellement publiable, dimensionner les lots par source et reconstruire la projection 48 h.
