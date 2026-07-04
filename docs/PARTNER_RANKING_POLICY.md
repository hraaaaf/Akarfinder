# Partner Ranking Policy (MVP)

Mission: PARTNER-RANKING-POLICY-MVP-1 (2026-07-05)

## Regle absolue

Pertinence d'abord. Partenaire ensuite. Qualite de fiche ensuite.
Source externe en dernier.

Un partenaire non pertinent ne passe jamais devant un resultat pertinent.
Le partenariat n'achete jamais le classement contre la pertinence.

## Statut d'integration

Moteur isole, volontairement NON branche a la SERP live :
- Le Search Gateway est gele (tests motor-purity) et sa modification est
  interdite hors phase explicitement autorisee.
- Le moteur est de la logique pure (`lib/partners/partner-ranking-policy.ts`),
  testee, et demontree sur les pages demo uniquement
  (`components/demo/DemoPartnerResultStack.tsx`, visible sur /demo et
  /demo/acheter : l'ordre affiche est calcule par le moteur sur des
  candidats fictifs, plus aucun ordre hardcode).

## Algorithme

Chaque candidat (`PartnerRankingCandidate`) porte une source d'autorisation
(web_external / partner_authorized / agency_partner / agency_premium /
promoter_partner / first_party) et un descripteur structurel
(`Partial<PartnerListingStandard>`).

Eligibilite pertinence (`isRelevantForIntent`) — filtres durs quand
l'intention les specifie :
- transaction (une intention achat accepte le neuf ; l'inverse est faux ;
  la location ne matche jamais vente/neuf),
- type de bien,
- ville.

Tri stable (`rankPartnerResults`) :
1. resultats pertinents avant non pertinents — toujours ;
2. dans un bloc de pertinence : partenaires avant web externe ;
3. puis score de pertinence (desc) ;
4. puis score d'autorisation (desc) ;
5. puis score de qualite de fiche (desc) ;
6. puis id (determinisme).

## Droits d'affichage (`getPartnerResultDisplayPolicy`)

- web_external : sans image, sans contact, sans galerie, sans details
  enrichis ; lien source originale obligatoire. Toujours, meme si le
  descripteur pretend etre autorise.
- partenaire : image/galerie uniquement si `photos_authorized` et
  `photo_count > 0` ; contact uniquement si `contact_authorized` et
  `contact_mode != hidden` ; details enrichis possibles.

## Cas tests obligatoires (tous couverts)

Fichier : `scripts/scrapers/__tests__/partner-ranking-policy.test.ts`
(9 tests, inclus dans npm test).

- A. "location studio Casablanca" : agence location avant promoteur neuf ;
  externe location pertinent avant promoteur non pertinent.
- B. "programme neuf Bouskoura" : promoteur partenaire neuf avant agence
  generaliste.
- C. "terrain Marrakech" : terrain pertinent avant appartement premium non
  pertinent.
- D. resultat web externe : pas d'image, pas de contact, source originale.
- E. partenaire autorise : image/CTA/details uniquement sous autorisation
  explicite.
- Invariant : aucun partenaire non pertinent au-dessus d'un resultat
  pertinent ; determinisme a scores egaux.

## Hors scope

Pas de branchement SERP live, pas de Search Gateway, pas de DB, pas d'API.
L'integration live sera une mission dediee avec son propre audit.
