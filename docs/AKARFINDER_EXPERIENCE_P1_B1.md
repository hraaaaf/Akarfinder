# AkarFinder Experience — P1-B1 Canonical Page Targets

Date : 2026-08-20
Base initiale : `main@9ec284f8888e2187288af4b5a6c9adc9b51c8439`
Statut : **CLOSED — PR #830**

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

## Succès validé

1. chaque surface possède une cible haute fidélité distincte mais cohérente ;
2. les cibles respectent `Territoire → Marché → Vie locale → Biens → Décision` ;
3. Search et Carte reprennent la mécanique map/list et map-first sans clone visuel Zillow ;
4. Listing suit `Bien → Confiance → Marché → Vie locale → Décision → Source` ;
5. Publier commence par le **type de bien** et produit un dossier guidé, conformément au Listing Standard ;
6. Mon Projet garde un wizard progressif mais réduit la concurrence visuelle ;
7. Professionnels distingue clairement identité pro, publication structurée et intelligence marché ;
8. le Golden Master AkarFinder reste bleu/navy/blanc, profondeur légère ;
9. aucun écran produit existant n'est modifié dans B1 ;
10. aucune mutation DB/source et aucun déploiement Vercel ;
11. les mockups utilisent les assets logo production exacts, sans variante générée.

## Contrat mobile verrouillé

- Search et Carte : strips horizontaux scrollables à 390 px, non scrollables sur desktop quand tout tient ;
- Carte : la surface cartographique occupe la hauteur utile du viewport mobile, sans grand vide artificiel ;
- Mon Projet et Publier : stepper compact sur mobile, stepper complet sur desktop ;
- Publier conserve l'entrée directe par le type de bien.

## Contrat logo verrouillé

Les mockups B1 utilisent les mêmes assets que le `SiteHeader` production :

- `/brand/logo-v2/logo-header-light.png` ;
- `/brand/logo-v2/logo-header-dark.png`.

L'audit B1 refuse une représentation générée ou divergente. Le logo source/branding production n'a pas été modifié par B1.

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

## Certification finale

- PR : `#830` ;
- HEAD approuvé : `5f94a477bfca401eab4c250750bfdfd3a9355ef6` ;
- workflow : `Experience P1 B1 Canonical Targets` ;
- run final : `32406060774` — **SUCCESS** ;
- artifact : `9420359227` ;
- digest : `sha256:a023717e5e0d798725fbe1a0eb39f05e4f3027ff0c274cc02349e36aa426b381` ;
- captures : **16/16** = 8 cibles × 390×844 + 1280×900 ;
- findings : **0** ;
- overflow page : **0** ;
- contrats mobile Search/Carte : validés ;
- steppers Mon Projet/Publier mobile/desktop : validés ;
- assets logo production : validés ;
- score UX/UI humain : **8,8/10** ;
- human gate : **approuvé le 20/08/2026** ;
- merge : `260922d2e051b67b8bdd80be519b111fbbc64d3f`.

## État après fermeture

P1-B1 est fermé et ses huit cibles deviennent la référence canonique des futurs lots page-level.

P1-A1 reste séparément ouvert/différé avec trois objections déjà consignées : contenu/hiérarchie Home, taille/crop hero desktop, formulation de Vendre. A1 n'est ni absorbé ni crédité par B1.
