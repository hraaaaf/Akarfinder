# Vivre Ici — décision POI nationale : repères indicatifs OpenStreetMap (10/11/2026)

## Décision utilisateur — correction de stratégie
Vivre Ici est une carte immobilière avec **repères visuels**. Ce n'est pas un annuaire, un système de navigation ou un service promettant des établissements actuellement ouverts.

**Source de référence nationale : OSM via l'extrait Geofabrik Maroc.** Faire confiance à une source au niveau du pipeline ; aucune vérification commerce par commerce de l'ouverture, de l'identité opérateur, de l'adresse commerciale, de l'entrée exacte, ni seconde source obligatoire. Les 0/24 admissions du pilote Maârif étaient exigées par un protocole de certification de commerces **hors besoin produit**. Cet indicateur historique reste documenté mais **ne doit plus bloquer les repères visuels**. Conserver le protocole historique séparé pour des informations plus fortes, sans le brancher à la carte de repères.

**Contrôles automatiques suffisants** : empreinte Geofabrik, provenance OSM / ODbL / attribution, identifiant node/way/relation, nom, catégorie, coordonnées valides, doublons par identifiant **exact**, extrait borné par viewport, limitation du volume et équilibre catégories. Aucune suppression par proximité/nom : deux arrêts peuvent se toucher. Une géométrie de way/area se place par point représentatif **indicatif**, pas entrée GPS.

**Terminologie :** « Repères à proximité ». Ne pas afficher « ouvert », « activité vérifiée », « entrée exacte » ni « dans le quartier Maârif » sans polygone fiable. Les limites du secteur central sont un chantier SIG **distinct**, qui ne bloque plus les repères visibles dans un viewport.

## Lot technique et gates
Module de projection read-only : scripts/neighborhood-context/indicative-osm-landmarks.mjs. Tests synthétiques : scripts/scrapers/__tests__/vivre-ici-osm-landmarks-policy.test.mjs. Produit uniquement des features candidates à portée viewport, sans écriture DB, sans interface et sans Vercel.

**Goal :** repères disponibles sur l'ensemble du Maroc depuis une source nationale. **Success :** extraction/index national par tuile ou bbox, sélection performante, rendu réellement vérifié à Casablanca, Rabat et ville supplémentaire, vues 390/430/768/1280. **Proof :** checksum du PBF, tests de sélection, contrôles de performances et rendu réel. Ces preuves end-to-end **ne sont pas encore acquises** par la seule présence du module.

**Next exact :** exécuter ce contrat sur la QA Maârif existante (415 objets), puis implémenter et mesurer un index national source unique et une preview locale sans affichage d'ouverture. Ne pas déployer Vercel ou modifier la DB prod sans autorisation. OSM license : https://www.openstreetmap.org/copyright . Geofabrik Maroc : https://download.geofabrik.de/africa/morocco.html .
