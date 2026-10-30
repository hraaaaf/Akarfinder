# FeenWay N04 — Protocole commercial pré-accès (30 octobre 2026)

## Goal, succès et preuve
Goal : préparer une sélection reproductible de fiches pour vérification manuelle, sans nouveau crawl, accès aux fiches bloquées ni publication.
Succès : 10 dossiers sélectionnés, 6 témoins négatifs, cinq tests offline, artifact contenant des identifiants et des gates non validés. Aucun dossier ne devient commercialement éligible par ce protocole.
Preuve : code, test, artifact N04 après vérification CI ; canari historique N03d de 81 fiches ; 0 HTTP, 0 DB, 0 deploy.

## Échantillon déterministe
- 10 candidats purement techniques : 4 Avito, 3 Mubawab, 2 Agenz, 1 Yakeey. Dans chaque portail, choisir les premiers IDs croissants parmi les 47 dossiers à cinq champs concordants sans avertissement économique explicite. Ceci N'EST PAS un classement de fraîcheur ni de qualité commerciale.
- 6 témoins : les 3 anomalies de sens économique déjà constatées (prix/m², prix/jour, pas-de-porte), 2 sources historiquement inaccessibles et une fiche Sarouty datée historiquement. Aucun témoin ne justifie de contourner une protection.
- Masaken exclu des 10 faute de dossier dans les 47 concordances numériques sans avertissement ; ses quartiers restent review.
- Tous les dossiers portent blocked_pre_access, eligible_for_db=false, publishable=false. Aucun contact, photo, description ou URL de fiche n'est copié dans le rapport.

## Gates indépendants et fail-closed
1. Accès : vérifier pour chaque portail des conditions d'utilisation et restrictions actuelles, robots et une base d'accès propre. STOP sur refus, CAPTCHA, 403/429, interdiction de collecte ou ambiguïté. Aucun accès à une fiche lors de ce N04 offline.
2. Réutilisation : autorisation/licence/contrat ou base juridique documentée avant de reproduire textes, photographies ou informations protégées. Le droit de naviguer et le droit de republier sont distincts. Lien de renvoi source seulement après revue des conditions.
3. Vie privée : minimisation et finalité, aucune collecte de contacts, déclaration/autorisation CNDP selon cas et revue juridique des données susceptibles d'identifier une personne. Vérifier également les transferts de données et sous-traitants.
4. Commercial : preuve actuelle et positive d'annonce disponible, véritable identité et URL d'origine, ville/quartier/prix/surface et transaction, prix total vs m² vs jour vs mois vs pas-de-porte, unités de surface et preuve de date. Un 200 HTTP et une date de publication ne démontrent pas l'activité. Proposition opérationnelle : rafraîchir la preuve active au plus tard sept jours avant la décision (seuil interne, NON exigence légale).
5. Unicité/approbation : dédupliquer les alias, redirections, identités et doublons interportails avec preuves solides. Une signature prix/surface/quartier n'est jamais preuve de bien physiquement unique. Double revue + approbation humaine explicite avant toute mutation DB ou publication.

## Juridique : état de preuve
Les autorités marocaines exposent les obligations de finalité, proportionnalité, information et notification des traitements personnels (CNDP, loi 09-08) : https://www.cndp.ma/conditions/ et https://www.cndp.ma/notifier-un-traitement/ .
La loi 2-00 consolidée relative aux droits d'auteur et droits voisins est publiée par le ministère de la justice : https://adala.justice.gov.ma/api/uploads/2024/12/13/Droits%20d%27auteur%20et%20droits%20voisins-1734085207226.pdf .
Ces textes sont un cadre général, PAS une autorisation spécifique de FeenWay ou des portails d'origine. Aucune licence FeenWay, accord annonceur ou validation CNDP AkarFinder n'a été prouvée dans le chantier. Faire valider par un conseil marocain avant publication ou traitement personnel.

## Plan d'exécution
Phase 1 (N04 ici) : choisir 10 + 6, établir preuve de sélection, exiger autorisations préalables. Phase 2 (human gate) : permission d'accès et réutilisation par portail, dossier juridique et règles de traitement des données. Phase 3 (nouvelle mission autorisée) : vérifier manuellement un premier dossier, enregistrer les preuves d'activité et droits, tenter une double revue. Phase 4 : décision d'intégration distincte, sans déploiement Vercel sans approbation.

Ne jamais inférer que les 73 708 / 73 715 URL historiques sont des annonces actives ou physiquement uniques ; divergence avec le total historique 73 710 encore ouverte. PR #1105 DRAFT, aucun merge, DB, déploiement ni contourne­ment.
