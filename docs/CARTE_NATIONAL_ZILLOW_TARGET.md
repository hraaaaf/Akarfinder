# Carte nationale — Cible Zillow-like

Date : 2026-08-23
Statut : TARGET APPROVED PAR ACHRAF

## Goal

Construire une navigation géographique nationale simple avant d'ajouter les métriques marché : **Maroc → Ville → Quartier**.

Le produit ne colore pas artificiellement chaque quartier en permanence. Il utilise une carte neutre et révèle la géographie au survol/clic desktop ou au tap mobile.

## Interaction cible

### Vue Maroc

- carte neutre du Maroc ;
- noms des villes visibles selon le zoom et la place disponible ;
- desktop : hover d'une ville = contour + léger fill accent + nom renforcé ; click = sélection et zoom ;
- mobile : premier tap = sélection/contour/nom ; second tap ou CTA = entrée dans la ville ;
- ville sélectionnée clairement distincte sans transformer la carte en arc-en-ciel.

### Vue ville

- ville sélectionnée cadrée ;
- quartiers connus listés/étiquetés ;
- si une géométrie de quartier est certifiée : hover/tap = contour + léger fill + nom ;
- sans géométrie certifiée : repère ponctuel/label, jamais une frontière synthétique ;
- sélection quartier = panneau compact + handoff Search.

### Intelligence marché ultérieure

Les couches **Prix / Densité / Annonces** sont des surcouches futures. Elles ne sont pas nécessaires à la navigation territoriale de base et ne doivent pas bloquer l'extension nationale.

## Hiérarchie des sources

1. **HCP RGPH 2024** pour le référentiel récent régions / provinces-préfectures / communes lorsque disponible.
2. **Barid Al-Maghrib / data.gov.ma** pour l'inventaire national des quartiers par ville. Dataset : `Codes postaux des quartiers`, ODbL, mise à jour annoncée septembre 2018. Cette source est un inventaire de noms, pas une autorité de frontière.
3. **geoBoundaries gbOpen** pour les limites administratives ouvertes quand le niveau correspond à l'unité cherchée, avec attribution/licence conservées.
4. **OpenStreetMap** uniquement pour compléter ou confirmer une géométrie locale avec provenance explicite, sans prétendre qu'une zone commerciale AkarFinder est une frontière administrative officielle.

## Modèle de vérité

Chaque entité territoriale doit conserver :

- nom canonique ;
- aliases ;
- type (`city`, `commune`, `district`, `neighborhood`, etc.) ;
- source(s) de nom ;
- géométrie éventuelle ;
- source et licence de géométrie ;
- statut de confiance ;
- statut de publication géométrique ;
- parent canonique.

## Règles de sécurité produit

- aucun quartier inventé ;
- aucune frontière synthétique publiée comme officielle ;
- aucune donnée de prix/densité requise pour rendre la ville navigable ;
- absence de géométrie = fallback label/point ;
- collisions de noms conservées avec parent ville ;
- accents/translittérations traités comme aliases, pas comme nouvelles entités ;
- provenance et licence obligatoires pour toute géométrie publiée.

## Critères visuels N1

- la vue Maroc est lisible à 390 / 430 / 768 / 1280 ;
- au moins les villes disposant d'une géométrie qualifiée réagissent au hover/click/tap ;
- le nom de la ville sélectionnée est visible ;
- le contour/fill de sélection ne masque pas le fond cartographique ;
- retour Maroc disponible ;
- aucune superposition bloquante avec navigation mobile ;
- score d'audit visuel cible >= 9/10.

## Référence UX

Référence comportementale : **Zillow-like**, pas copie graphique. La carte reste AkarFinder : fond neutre, accent bleu, sélection progressive, labels lisibles et drill-down territorial.

## Human Gate

Achraf a proposé cette direction puis l'a explicitement validée le 2026-08-23 (`Ok go`). L'implémentation peut suivre ce contrat sans nouveau choix stratégique, à condition de respecter les règles de provenance ci-dessus.
