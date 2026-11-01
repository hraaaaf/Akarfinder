# Akarfinder — Demandes de flux autorisés : prêt pour validation humaine

Date : 2026-11-01. Projet : 200k fiches uniques fraîches et réutilisables, cible 48 h. **Aucun message envoyé et aucun partenariat présumé.**

## Priorité et statut des canaux

| Cible | Preuve publique | Ce que nous demandons | Ce qui n'est PAS établi | Canal |
|---|---|---|---|---|
| FeenWay | Site revendiquant 196 276 annonces agrégées, incluant Mubawab, Sarouty, Masaken, Agenz, Yakeey et d'autres | possibilité d'export/licence de métadonnées + droits des sources amont | propriété et droits de revente, fraîcheur, accès à un export, unicité | https://www.feenway.com/a-propos ; https://www.feenway.com/immobilier |
| Mubawab | site pro et intégration XML ENTRANTE pour annonces d'agences | licence de flux SORTANT/partenariat d'index, droit d'affichage et SLA | existence d'une API sortante vers Akarfinder | https://www.mubawab.ma/fr/contact |
| Réseaux d'agences / promoteurs | Akarfinder ODM-10C a déjà une liste de cinq candidats nommés | feed direct du détenteur avec consentement/mandats et preuve de disponibilité | droit d'utiliser les annonces d'une tierce plateforme par simple présence sur celle-ci | docs/data/ODM-10C-PARTNER-FEED-KIT.md |
| Property Finder / Sarouty | réseau PFDN exige candidature, sécurité, contrat avant accès API | dossier d'intégration sous accord | partage du catalogue complet marocain | https://pfdn.propertyfinder.com/integration-guide |

## Demande minimale à exiger AVANT import

Identifiant source stable ; URL canonique ; propriétaire du flux ; preuve de droits de réutilisation texte/photos/attributs ; ville/quartier/type/vente-location/surface/prix ou `on_request` ; `last_updated_at` UTC ; `active_status`/retrait ; fréquence de mise à jour ; attribution obligatoire ; droit et délai de retrait ; licence et couverture géographique ; nombre estimé d'IDs distincts ; échantillon de 100 à 1000 lignes, puis export de volume découpé en lots <=20 MiB.

## Message prêt pour FeenWay — à faire approuver, non envoyé

Objet : Akarfinder × FeenWay — demande de partenariat de données immobilières

Bonjour,

Nous développons Akarfinder, un moteur de recherche immobilier marocain. Nous étudions la possibilité d'un partenariat de données, avec attribution des plateformes sources et respect de leurs droits.

Votre plateforme annonce agréger un catalogue important. Disposez-vous d'une licence permettant de partager un export de fiches avec un partenaire, ou d'un mode de syndication officiel de vos données ? Nous souhaitons identifier précisément les champs et sources que vous avez le droit d'autoriser à la réutilisation, le nombre de fiches réellement actives et les mécanismes de mise à jour/retrait.

Nous pourrions commencer par un échantillon technique de 100 à 1000 références (identifiant source, lien canonique, statut, date de mise à jour, ville, catégorie et prix), strictement en environnement de test et sans publication, avant toute discussion commerciale sur un volume plus large.

Seriez-vous ouverts à un échange technique et commercial sur cette possibilité ?

Cordialement,
L'équipe Akarfinder

## Message prêt pour Mubawab — à faire approuver, non envoyé

Objet : Proposition de partenariat d'index immobilier — Akarfinder

Bonjour,

Akarfinder développe une recherche immobilière nationale avec attribution et redirection vers les annonces d'origine. Nous savons que Mubawab dispose d'une intégration XML entrante pour les professionnels. Notre demande est différente : existe-t-il un canal officiel ou une licence permettant à Akarfinder de recevoir un inventaire de références et d'informations factuelles, avec des conditions explicites de réutilisation et de rafraîchissement ?

Nous souhaitons connaître le périmètre de données disponible, les règles de publication et d'attribution, les restrictions médias/texte, la fréquence d'actualisation et la procédure de retrait. Tout premier test resterait en quarantaine, sans publication.

Pouvez-vous nous orienter vers votre équipe partenariats ou data ?

Cordialement,
L'équipe Akarfinder

## Décision/gates

- Rédaction d'un message **n'est pas envoi** ; pas d'accès aux données sans accord.
- L'objectif 200k en 48 h n'est pas réaliste à promettre tant que l'accès à au moins 200k fiches uniques, leurs droits et leur actualité ne sont pas établis.
- Éviter de compter FeenWay + Mubawab + Avito : FeenWay agrège notamment ces sources. Même 196 276 brutes ne prouvent pas 200k biens uniques.
- Aucune écriture dans Supabase/Neon/prod ; staging SQLite/artefacts seulement.

## Statut canaries techniques

- Avito P0 : 97 URLs sur 5 shards (3 HTTP 200, 2 403) ; Mubawab P0 : 313 URLs sur 25 shards, canaries précédents.
- Sarouty public sitemaps du 01/11/2026 : [run #41324393006](https://github.com/hraaaaf/Akarfinder/actions/runs/41324393006), **FAIL** pour format historique attendu : racine HTTP 200, 440 locs, 0 sitemap `property_details*.xml`, 0 lien. **Ne pas réutiliser** les 5064 IDs du run septembre, artefact expiré.
- [Feed readiness shadow #41324099677](https://github.com/hraaaaf/Akarfinder/actions/runs/41324099677) **SUCCESS** : 31 tests existants + 5 tests spécifiques ; toutes données démo non publiables. Aucun fournisseur réellement connecté.

Next exact : obtenir autorisation d'envoyer les deux messages et un export test avec licence explicite ; au reçu, appliquer le gate de quarantaine sans prod writes.