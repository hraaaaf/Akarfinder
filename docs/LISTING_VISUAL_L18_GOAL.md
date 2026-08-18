# LISTING-VISUAL L18 — Above-the-fold convergence

## Goal
Rapprocher le premier écran réel de `/listings/[id]` du mockup canonique validé par l'utilisateur, sans altérer la vérité métier, les permissions média, les données source ni les calculs AkarFinder.

## Baseline avant implémentation
- `main@9b753afd9260891b82fd1ccbdb2d6d1b49b48816`.
- Listing visual predecessor L17: `0f24bd260a97753f3aa9f16f9dfbd4f528c40521`.
- Compare `0f24bd2..9b753af`: uniquement fichiers Carte/Map, aucun fichier Listing; la capture L17 exacte reste donc une baseline valide pour la fiche annonce courante.
- Baseline visuelle observée: hero illustratif possible, PropertyCore compact, CTA/facts, puis Intelligence + Mon Projet très hauts dans le flux mobile.
- Score de convergence honnête au mockup après comparaison réelle: ~6,8/10. Le précédent 9,6/10 ne mesurait que la qualité intrinsèque de L17 et ne doit pas être utilisé comme score de fidélité au mockup.

## Mockup canonique
Référence utilisateur confirmée le 18/08/2026:
- desktop: galerie éditoriale large + miniatures, prix/titre/localisation, agence visible immédiatement à droite, CTA visite/WhatsApp larges, actions secondaires, bandeau facts;
- mobile: grande photo + miniatures, badges, prix/titre/localisation, carte agence, CTA principaux, actions secondaires, facts;
- Intelligence et Mon Projet ne doivent pas prendre la place du bloc immobilier principal au-dessus de la ligne de flottaison.

## Cible L18
1. **Média immobilier d'abord**: conserver la politique média autoritative existante. Les vraies photos/provider preview restent prioritaires; le fallback illustratif reste explicitement un fallback et n'est jamais présenté comme photo réelle.
2. **Bloc immobilier principal prioritaire**: galerie → badges/prix/titre/localisation → agence/source → CTA → facts avant les modules d'analyse.
3. **Mobile**: Professional/source card remonte avant Intelligence/Mon Projet lorsque ses données existent; CTA/facts restent immédiatement accessibles; aucune donnée fictive.
4. **Desktop**: préserver la galerie premium 70/30 déjà certifiée et renforcer la continuité galerie + rail professionnel/CTA proche du mockup.
5. **Akar Intelligence / Mon Projet**: conservés fonctionnellement, déplacés sous le bloc immobilier principal pour ne plus concurrencer la décision immobilière initiale.
6. **Truth-safety**: aucune photo, agence, badge, disponibilité, délai, valeur, score ou caractéristique inventée pour imiter le mockup.

## Succès observable
- 390 / 430 / 768 / 1280 sans collision ni overflow;
- le premier viewport mobile privilégie média + identité du bien + CTA/facts et, quand disponible, la source/professionnel avant Intelligence;
- desktop conserve galerie éditoriale + rail décisionnel sans régression;
- L13 + a11y + TypeScript + production build verts;
- aucun changement ranking/DATA/Registry/publication/permissions média;
- captures exact-head après implémentation sur 390/430/768/1280;
- comparaison réelle mockup / baseline / after;
- score humain de convergence cible **>= 9,2/10** pour L18. Le chantier global ne revient à 100 % qu'après preuve visuelle suffisante.

## Preuve requise
- capture baseline L17 déjà archivée;
- mockup canonique utilisateur;
- captures exact-head L18;
- contrat/tests ciblés + régression listing existante;
- revue visuelle humaine documentée après CI;
- aucun déploiement Vercel.
