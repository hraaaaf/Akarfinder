# Lot 3 Status

**Status: ✅ CLOSED**

## Goal

Mubawab detail page → AkarFinder `CollectionListing`, sans invention et sans écriture AkarFinder.

## Implémentation validée

- réutilisation défensive de `extractDetail()` : DONE
- support `/fr/a/{id}/...` : DONE
- support `/fr/pa/{id}/...` : DONE
- `source_id`, URL, titre, description, prix, surface, pièces, chambres, salles de bain, étage : DONE
- transaction conservatrice : DONE
- type de bien issu du détail, jamais forcé depuis la catégorie de discovery : DONE
- `house` distinct de `villa` : DONE
- ville + quartier : DONE
- features / seller / provenance / quality / `content_hash` : DONE
- prix sur demande : `amount=null`, `on_request=true` : DONE
- location : `period=month` : DONE
- vente : `period=total` : DONE
- transaction inconnue : `transaction=null`, `period=null` : DONE
- images limitées au média principal / galerie principale : DONE
- recommandations, logos, avatars et autres cartes exclus des images : DONE

## Garde-fous synthétiques

Le test dédié couvre notamment :

- contamination transaction/type par une recommandation secondaire ;
- image recommandée hors galerie principale ;
- fallback `og:image` sans scan global ;
- prix visible `Prix à consulter` prioritaire sur un JSON-LD numérique contradictoire ;
- langage d’usage (`exploité en location`) non interprété comme transaction ;
- quartiers numérotés ;
- `/a/` et `/pa/` ;
- rejet des routes non détail.

## Preuve LIVE finale

GitHub Actions : `Data Ingestion Lot 3 Extractor Gate`

- run : `33791449074` (#17)
- head validé : `58a8c496ecb6640a8a0b738da793bbcb732df614`
- `test-extractor` : success
- `live-proof` : success
- `sample-20` : success
- artefact sample : `mubawab-lot3-sample-20`
- artifact id : `9907491116`

### LIVE `/a/`

`8258601`

- transaction : `sale`
- property_type : `apartment`
- price : `2 500 000 MAD`
- surface : `184 m²`
- district : `Les princesses`
- image principale propre

### LIVE `/pa/`

`8387298`

- transaction : `sale`
- property_type : `apartment`
- price : `2 362 000 MAD`
- surface : `146 m²`
- district : `Californie`
- image principale propre

## Échantillon contrôlé ~20

Résultat final :

- 20 annonces sélectionnées
- 20 quartiers récupérés sur 20
- 0 couverture obligatoire manquante
- `/a/` + `/pa/` couverts
- apartment sale/rent : couverts
- villa sale/rent : couverts
- house : couvert
- land : couvert
- commercial : couvert
- riad : couvert
- prix sur demande : couvert
- annonce pauvre / champs inconnus : couverte

Cas explicitement audités :

- `8311288` : UI principale `Prix à consulter` malgré prix JSON-LD numérique → `amount=null`, `on_request=true`
- `8408402` : `Prix à consulter` → `amount=null`, `on_request=true`
- `8370483` : texte `exploité en location privative` décrit l’usage, pas la transaction → `transaction=null`, aucune invention
- `8379262` : quartier `Maârif` récupéré après stat `1 Ch.`
- `8294692` : quartier numéroté `Hay Almassira 2` conservé
- `8096500` : page classée Maison et description villa ancienne → `property_type=house`
- `8394364` : bloc principal `250 m²` conservé comme surface totale ; mention descriptive `400 m² construits` laissée comme enrichissement avancé non bloquant
- `8409229` : `total_m2=300`, `land_m2=100`, sans écraser l’un par l’autre

Cohérence finale automatisée :

- `sale` → `period=total`
- `rent` → `period=month`
- transaction inconnue → `period=null`
- `on_request=true` → `amount=null`
- 0 incohérence détectée sur les 20 objets

## Sécurité

- `database_writes = 0`
- `image_downloads = 0`
- `mass_ingestion = false`
- robots check actif
- arrêt prévu sur blocage explicite / 403 / 429
- aucun contournement anti-bot
- aucun merge
- aucun déploiement Vercel
- aucune modification de DB production

## Décision

Lot 3 est **CLOSED** avec preuve.

Cela autorise uniquement le passage au **Lot 4 — crawl pilote contrôlé**.

Cela n’autorise pas :

- une collecte massive ;
- une ingestion AkarFinder production ;
- un merge automatique ;
- un déploiement Vercel.

## Next exact

Préparer Lot 4 avec un périmètre volontairement limité, métriques, manifest, reprise et zéro écriture production.
