# AkarFinder — Yakeey card pilot V1 — 2026-10-12

## Goal / succès / preuve
Identifier les annonces individuelles réellement présentes dans les pages publiques Yakeey (vente/location), vérifier leurs champs par **carte isolée**, et mesurer le rendement net de cette nouvelle source. La demande utilisateur accepte le risque contractuel, mais le pilote ne contourne aucun blocage technique, ne visite pas de contenu réservé, ne collecte pas de données personnelles, n'écrit pas en DB et ne déploie rien.

**Entrées testées** : `https://yakeey.com/fr-ma/achat/biens/maroc`, `https://yakeey.com/fr-ma/location/biens/maroc`, plus uniquement leurs `?page=2` si explicitement observés dans des liens HTML et autorisés par robots. Max 4 pages, cadence de 2,2 s, User-Agent identifié, arrêt 403/429 ou robots indisponible.

**Identité** : URL publique individuelle `/fr-ma/(acheter|louer)-...-CA187111`, clé `yakeey:CA187111`. Rejet des blocs mixtes, titres projets et superficies en fourchette, absence de localisation explicite dans la carte; rejet explicite `Vendu` / `Loué`. Les cartes qui possèdent URL+ville+quartier+prix+surface restent **observées seulement**, sans preuve de fraîcheur ni activité commerciale ni unicité physique. La fiche CA187111 a été observée comme référence publique sur une page accessible, mais cette observation n'est pas une preuve qu'elle figure encore dans le lot actuel.

**Livrable** : JSON métrique et JSONL anonymisé en artifact GitHub Actions, avec test déterministe hors ligne, zéro DB/merge/Vercel. Ne comptabiliser aucune annonce dans le registre de production sans CI exact HEAD, preuve de provenance par carte, suivi de retrait/activité et dédup inter-portails.

**Next exact** : lire la CI et artifact de Yakeey, corriger parseur si erreur ou rendement nul prouvé ; si source techniquement accessible, passer à un lot de catégories/paginations effectivement publiées et comparer le rendement net, puis continuer MarocAnnonces/Properstar uniquement sous contraintes d'accès techniques raisonnables.
