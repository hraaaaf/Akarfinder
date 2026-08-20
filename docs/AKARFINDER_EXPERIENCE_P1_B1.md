# AkarFinder Experience — P1-B1 Canonical Page Targets

Date : 2026-08-20
Base : `main@9ec284f8888e2187288af4b5a6c9adc9b51c8439`
Statut : **TARGETS PREPARED — FINAL CI/HUMAN GATE À CERTIFIER**

## Origine du lot

Aucun contrat historique retrouvé ne définissait explicitement un sous-lot nommé `P1-B1`. Le P1 actuel a toutefois un résultat accepté : **Architecture produit + mockups canoniques** avant implémentation page-level.

B1 formalise donc le reste observable de ce contrat, sans réécrire l'historique : transformer les wireframes contractuels N0 et le Golden Master visuel en cibles haute fidélité approuvables.

## Goal

Verrouiller les cibles visuelles et structurelles des huit surfaces canoniques AkarFinder avant toute nouvelle réconciliation runtime :

1. Accueil ;
2. Search ;
3. Carte ;
4. Quartier ;
5. Listing ;
6. Mon Projet ;
7. Publier ;
8. Professionnels.

## Succès

1. chaque surface possède une cible haute fidélité distincte mais cohérente ;
2. les cibles respectent `Territoire → Marché → Vie locale → Biens → Décision` ;
3. Search et Carte reprennent la mécanique map/list et map-first sans clone visuel Zillow ;
4. Listing suit `Bien → Confiance → Marché → Vie locale → Décision → Source` ;
5. Publier commence par le **type de bien** et produit un dossier guidé, conformément au Listing Standard ;
6. Mon Projet garde un wizard progressif mais réduit la concurrence visuelle ;
7. Professionnels distingue clairement identité pro, publication structurée et intelligence marché ;
8. le Golden Master AkarFinder reste bleu/navy/blanc, profondeur légère, sans accent bronze ;
9. aucun écran produit existant n'est modifié dans B1 ;
10. aucune mutation DB/source et aucun déploiement Vercel.

## Contrat mobile verrouillé

- Search et Carte : strips horizontaux scrollables à 390 px, non scrollables sur desktop quand tout tient ;
- Carte : la surface cartographique occupe la hauteur utile du viewport mobile, sans grand vide artificiel ;
- Mon Projet et Publier : stepper compact sur mobile, stepper complet sur desktop ;
- Publier conserve l'entrée directe par le type de bien.

## Preuve BEFORE

Références produit existantes réutilisées :

- baseline UI exhaustive run `32360158450`, artifact `9403363324`, 260/260 captures ;
- A2 final run `32393990605`, artifact `9415995389`, 24/24 captures, 0 finding ;
- objections P1-A1 conservées séparément sur PR #828, donc A1 n'est pas utilisé comme cible approuvée.

## Références cible

- `docs/AKARFINDER_EXPERIENCE_STANDARD_V1.md` : wireframes, hiérarchie, navigation et doctrine mobile ;
- `/demo/visual-system` : Golden Master Proposition 3 ;
- `/demo/ui-primitives` : primitives P1-A2 fermées ;
- Home conserve la photographie éditoriale déjà qualifiée `KEEP` dans `lib/brand/visual-assets.ts`.

## Mockups

Route QA uniquement : `/demo/canonical-targets?target=<target>`.

Les mockups sont statiques et n'appellent aucune donnée métier. Ils servent de contrat de design, pas de nouvelle implémentation produit.

## Certification requise

Workflow : `Experience P1 B1 Canonical Targets`.

- TypeScript vert ;
- build production vert ;
- 8 cibles × 2 viewports (390×844 et 1280×900) = 16/16 captures ;
- H1 présent ;
- `data-canonical-target` exact ;
- aucun overflow horizontal ;
- strips Search/Carte scrollables sur mobile ;
- Carte mobile occupe la hauteur utile ;
- steppers Mon Projet/Publier compacts sur mobile et complets sur desktop ;
- inspection humaine de chaque cible ;
- score UX/UI de la galerie ;
- validation explicite du propriétaire produit avant merge.

## Contrat d'arrêt

B1 ne peut être mergé ni déclaré fermé avant human gate sur les mockups. Après validation, les cibles deviennent la référence des lots page-level ultérieurs. P1-A1 reste séparément ouvert/différé et n'est ni absorbé ni crédité par B1.
