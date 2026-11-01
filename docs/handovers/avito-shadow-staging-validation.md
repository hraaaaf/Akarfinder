# Avito shadow staging — rapport de validation

Source : JSON de qualification existant uniquement. Aucun accès réseau, téléchargement photo, write DB ou publication.

SHA-256 du JSON source canonique (après parsing, indépendant des fins de ligne) : `5d9981c7e85e8d5ea7978e6f2f821948a748d688a1eeab9e1aec6ca11b35334f`.

## Résultats

- Enregistrements traités ou rejetés explicitement : 20/20; staging offline acceptés : 14; rejets : 6.
- Complétude stricte (titre + prix + localisation + surface) : **11/20**.
- Descriptions observées : 20/20; photos présentes : 17/20.
- Fraîcheur vérifiée : 0/20; inconnue : 20/20; date rapportée : 0/20.
- Doublons d’ID source : 0; doublons d’URL : 0.
- Publication : 0 publiable; droits image confirmés : 0; réutilisation commerciale confirmée : 0.

## Doublons physiques potentiels

- IDs `58685536, 58707942` : même ville/surface/prix/description normalisés; photos différentes : **oui**; comptages observés : `{'58685536': 2, '58707942': 2}`. Signal de revue seulement; aucune fusion automatique, doublon physique non prouvé.
  Description observée : KB GROUP REAL ESTATE vous propose en exclusivité une villa à démolir à la vente, idéalement située au cœur du quartier prisé d'Agdal à Rabat.

Édifiée sur un terrain de 940 m², cette propriété représ...

## Rejets explicites du schéma feed

- `58599879` : surface_m2 obligatoire pour apartment
- `58600152` : surface_m2 obligatoire pour apartment
- `58652177` : surface_m2 obligatoire pour apartment
- `58685976` : surface_m2 obligatoire pour apartment
- `58781357` : surface_m2 obligatoire pour apartment
- `58785491` : surface_m2 obligatoire pour apartment

## Champs stricts manquants

- `58590635` : area
- `58599879` : area
- `58600152` : price, area
- `58602326` : area
- `58652177` : area
- `58685976` : area
- `58781357` : area
- `58785491` : area
- `58791823` : price, area

## Garde-fous

Toutes les fiches restent `commercial_reuse=not_verified`, `availability_status=unconfirmed`, `publishable=false`, `images_rights_confirmed=false`. Les URL photo ne sont pas copiées dans le staging. Le partner-v2 bridge n’est pas appelé.
