# C8 — Rabat Postal Locality Evidence

## Goal

Ajouter une couche d'autorité postale séparée pour corroborer les noms de localités Rabat, sans transformer un code postal en taxonomie produit, géométrie ou activation publique.

## Autorité

`codepostal.ma` s'identifie comme le service de code postal de Poste Maroc (`poste.ma`), fournit le contact `codepostal@poste.ma` et décrit le code postal comme identifiant des localités et de la majorité des quartiers des grandes villes.

La source est donc enregistrée comme autorité **postale** `poste_maroc_postal_names`, conformément à la séparation prévue par C8B.

## Bindings défendables

Sept candidats disposent d'un libellé Poste Maroc explicitement préfixé `RABAT QUARTIER` :

- Diour Jamaa — 10060 ;
- Ennahda I / Hay Nahda — 10210 ;
- Kébibat — 10050 ;
- Les Orangers — 10060 ;
- Mabilla / Mabella — 10180, conservé comme variante orthographique à corroborer ;
- Mellah — 10030 ;
- Ancienne Médina / Médina — 10030.

## Signaux conservés mais non bindés

Touarga, Aviation, Youssoufia, Oudayas et El Kora présentent des signaux postaux sous des formes plus faibles ou plus spécifiques (`FOUAKA TOUARGA`, `CITE`, `KASBAT`, `PROJET`). Ils restent explicitement non bindés afin d'éviter une équivalence sémantique non prouvée.

## Guardrails

- `postal_locality_name` n'implique pas `taxonomy_status=certified` ;
- aucune géométrie n'est créée ;
- aucune éligibilité carte ou SEO n'est modifiée ;
- aucune mutation DB ;
- `productionWriteCount=0`.

## Next

Utiliser ces preuves comme corroboration lors des prochains lots taxonomiques, avec une deuxième autorité quand le libellé postal seul ne suffit pas.