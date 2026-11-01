# Qualification des 53 nouvelles annonces Avito

Généré le 2026-11-01T21:29:24.630115+00:00 (UTC). Comparaison des artefacts : collecte run `41339185908` / artefact `p0-avito-canary`; archive historique run `33672899097` / artefact `morocco-web-l8-avito-full-manifest`; comparaison run `41349173966`.

## Résumé

- Identifiants nouveaux reconstruits : **53** (53 attendu). URLs distinctes testées : **20**; non testées : **33**.
- Réponses HTTP 200 : **20**; autres statuts/erreurs : **0**.
- Doublons d’URL source : **0**; doublons d’ID Avito source : **0**; doublons d’ID parmi les 53 nouveaux : **0**. Les doublons de biens physiques ne sont pas vérifiables depuis ces pages.
- Complétude suffisante selon le seuil du script (titre + prix + localisation + surface, description ou photos) : **18**.
- Annonces actives explicitement confirmées : **0**. Un HTTP 200 est classé `page_rendered_active_unconfirmed`.
- Réutilisation commerciale juridiquement vérifiée : **0**. Aucune licence/autorisation explicite vérifiable n’a été établie; les champs commerciaux restent bloqués.

## Accès et limites

Les champs avec valeur sont marqués `observed`; un champ vide est `non_verifiable_from_available_metadata`, jamais automatiquement déclaré absent. L’extraction est limitée aux métadonnées publiques HTML/JSON-LD et références d’images repérées; elle ne vérifie pas chaque attribut dans l’interface rendue.

`robots.txt` a été lu avant les fiches. Les 20 accès effectués ont répondu HTTP 200; aucune authentification, API privée, CAPTCHA, ni contournement de protection n’a été utilisé. L’artefact initial du canary signalait 2 HTTP 403 sur ses 5 requêtes; ces réponses n’ont pas été contournées. La politique commerciale Avito n’a pas pu être vérifiée dans une source officielle accessible pendant cette qualification, donc les contenus ne sont pas autorisés à l’ingestion commerciale.

La première tranche de 10 a retourné des pages HTML publiques, mais les métadonnées observées ne satisfont pas le seuil de complétude et l’autorisation commerciale est indéterminée. Une reprise avec `--resume` a ensuite effectué une seconde tranche de 10 avant la génération du rapport; cette limite de reprise a été corrigée pour traiter `--limit` comme un plafond cumulatif. Aucun nouvel accès n’est effectué pour ce rapport. L’extension aux 33 restantes n’est pas justifiée tant que complétude et droits ne sont pas établis.

## URLs testées

| ID | HTTP | Disponibilité | Complète | URL |
|---|---:|---|---|---|
| 54879803 | 200 | page_rendered_active_unconfirmed | oui | [54879803](https://www.avito.ma/fr/sidi_othmane/local/Maison_92m2_RDC_Commercial_2%C3%A9tages_Hay_Raja_Casa__54879803.htm) |
| 58509254 | 200 | page_rendered_active_unconfirmed | oui | [58509254](https://www.avito.ma/fr/derb_ghallef/appartements/Derb_Ghallef_100_m2_avec_balcon_58509254.htm) |
| 58590635 | 200 | page_rendered_active_unconfirmed | oui | [58590635](https://www.avito.ma/fr/agdal/terrains_et_fermes/Terrain_zone_immeuble_%C3%A0_Agdal_58590635.htm) |
| 58599879 | 200 | page_rendered_active_unconfirmed | oui | [58599879](https://www.avito.ma/fr/derb_ghallef/appartements/Appartement_meubl%C3%A9_moyen_standing_58599879.htm) |
| 58600152 | 200 | page_rendered_active_unconfirmed | non | [58600152](https://www.avito.ma/fr/derb_ghallef/appartements/Appartement_de_2_chambres_%C3%A0_louer_par_jour_%C3%A0_Casa_58600152.htm) |
| 58602326 | 200 | page_rendered_active_unconfirmed | oui | [58602326](https://www.avito.ma/fr/derb_ghallef/local/Local_commercial_%C3%A0_louer_58602326.htm) |
| 58626767 | 200 | page_rendered_active_unconfirmed | oui | [58626767](https://www.avito.ma/fr/sidi_othmane/autre_immobilier/Vente_Fond_de_commerce_%C3%A0_Casablanca_58626767.htm) |
| 58652177 | 200 | page_rendered_active_unconfirmed | oui | [58652177](https://www.avito.ma/fr/derb_ghallef/appartements/Appartement_%C3%A0_louer_%C3%A0_Biranzarane_58652177.htm) |
| 58683280 | 200 | page_rendered_active_unconfirmed | oui | [58683280](https://www.avito.ma/fr/agdal/terrains_et_fermes/Terrain_%C3%A0_vendre_Agdal_zone_R5_58683280.htm) |
| 58684263 | 200 | page_rendered_active_unconfirmed | oui | [58684263](https://www.avito.ma/fr/agdal/maisons/Villa_%C3%A0_vendre___Haut_Agdal_58684263.htm) |
| 58685536 | 200 | page_rendered_active_unconfirmed | oui | [58685536](https://www.avito.ma/fr/agdal/terrains_et_fermes/VILLA_%C3%80_D%C3%89MOLIR_%C3%80_LA_VENTE___AGDAL__RABAT_58685536.htm) |
| 58685976 | 200 | page_rendered_active_unconfirmed | oui | [58685976](https://www.avito.ma/fr/derb_ghallef/appartements/Appartement_F2_%C3%A0_louer_58685976.htm) |
| 58705742 | 200 | page_rendered_active_unconfirmed | oui | [58705742](https://www.avito.ma/fr/agdal/appartements/Appartement_%C3%A0_vendre_Agdal_58705742.htm) |
| 58707942 | 200 | page_rendered_active_unconfirmed | oui | [58707942](https://www.avito.ma/fr/agdal/terrains_et_fermes/VILLA_%C3%80_D%C3%89MOLIR_%C3%80_LA_VENTE___AGDAL__RABAT_58707942.htm) |
| 58714484 | 200 | page_rendered_active_unconfirmed | oui | [58714484](https://www.avito.ma/fr/agdal/terrains_et_fermes/Terrain_Agdal_%C3%A0_Vendre_58714484.htm) |
| 58716556 | 200 | page_rendered_active_unconfirmed | oui | [58716556](https://www.avito.ma/fr/sidi_othmane/appartements/Appartement_77_m%C2%B2___Garage_13_m%C2%B2___Ascenseur_58716556.htm) |
| 58780919 | 200 | page_rendered_active_unconfirmed | oui | [58780919](https://www.avito.ma/fr/sidi_othmane/appartements/Appartement_%C3%A0_vendre_Sidi_Othmane_58780919.htm) |
| 58781357 | 200 | page_rendered_active_unconfirmed | oui | [58781357](https://www.avito.ma/fr/agdal/appartements/Location_appartement_meubl%C3%A9_r%C3%A9nov%C3%A9_58781357.htm) |
| 58785491 | 200 | page_rendered_active_unconfirmed | oui | [58785491](https://www.avito.ma/fr/sidi_othmane/appartements/appartement_sidi_othmane_58785491.htm) |
| 58791823 | 200 | page_rendered_active_unconfirmed | non | [58791823](https://www.avito.ma/fr/sidi_othmane/local/Caf%C3%A9_%C3%A0_vendre_%C3%A0_Casablanca_sur_le_boulevard_Driss_Harti_58791823.htm) |

## URLs reconstruites non testées

- `58792873` — https://www.avito.ma/fr/sidi_othmane/local/Magasin_%C3%A0_vendre_58792873.htm
- `58801273` — https://www.avito.ma/fr/sidi_othmane/terrains_et_fermes/Pour_Casablanca_58801273.htm
- `58804801` — https://www.avito.ma/fr/sidi_othmane/appartements/Appartement_%C3%A0_vendre_72_m%C2%B2_%C3%A0_Casablanca_58804801.htm
- `58820496` — https://www.avito.ma/fr/derb_ghallef/appartements/CMN_MA_2900___Appartement_%C3%A0_louer_%C3%A0_Plateau_58820496.htm
- `58822882` — https://www.avito.ma/fr/sidi_othmane/appartements/Des_appartements_%C3%A0_Sidi_Othmane_58822882.htm
- `58824170` — https://www.avito.ma/fr/agdal/terrains_et_fermes/TERRAIN_A_VENDRE_POUR_HOTEL_AGDAL_RABAT_58824170.htm
- `58836572` — https://www.avito.ma/fr/sidi_othmane/terrains_et_fermes/25_hectares_pour_immeubles_58836572.htm
- `58837015` — https://www.avito.ma/fr/derb_ghallef/local/Local_commercial_Local_commercial_%C3%A0_louer_58837015.htm
- `58838594` — https://www.avito.ma/fr/agdal/terrains_et_fermes/Terrain_R_plus_4_58838594.htm
- `58842989` — https://www.avito.ma/fr/sidi_othmane/maisons/Maison_%C3%A0_vendre_58842989.htm
- `58848017` — https://www.avito.ma/fr/agdal/appartements/Apparemment_%C3%A0_vendre_58848017.htm
- `58855780` — https://www.avito.ma/fr/sidi_othmane/local/Magasin_Sarout_%C3%A0_vendre_58855780.htm
- `58857932` — https://www.avito.ma/fr/agdal/terrains_et_fermes/Terrain_Agdal_600_m2_R4_58857932.htm
- `58859109` — https://www.avito.ma/fr/sidi_othmane/bureaux/Bureaux_%C3%A0_louer_58859109.htm
- `58859431` — https://www.avito.ma/fr/derb_ghallef/appartements/Location_appartement_meubl%C3%A9_58859431.htm
- `58859452` — https://www.avito.ma/fr/sidi_othmane/appartements/Appartement_%C3%A0_vendre_68_m%C2%B2_%C3%A0_Casablanca_58859452.htm
- `58860766` — https://www.avito.ma/fr/derb_ghallef/local/Louer_Magasin_d%C3%A9p%C3%B4t_centre_ville_la_yacout_Prince_58860766.htm
- `58864924` — https://www.avito.ma/fr/agdal/terrains_et_fermes/Beau_terrain_R4_58864924.htm
- `58869312` — https://www.avito.ma/fr/agdal/terrains_et_fermes/Terrain_pour_immeuble_58869312.htm
- `58886528` — https://www.avito.ma/fr/sidi_othmane/appartements/Appartement_%C3%A0_vendre_rue_Tadart_Californie_96_millions_58886528.htm
- `58890209` — https://www.avito.ma/fr/derb_ghallef/appartements/Nouveau_studio_meubl%C3%A9_Bd_Abdelmoumen_TRAM_58890209.htm
- `58911779` — https://www.avito.ma/fr/agdal/terrains_et_fermes/Terrain_R4_en_plein_c_ur_de_Rabat_Agdal_58911779.htm
- `58914026` — https://www.avito.ma/fr/derb_ghallef/bureaux/Bureau_neuf_%C3%A0_louer_Ghandi_58914026.htm
- `58926320` — https://www.avito.ma/fr/agdal/terrains_et_fermes/A_vendre_terrain_320m2_triple_fa%C3%A7ade_Haut_Agdal_58926320.htm
- `58926614` — https://www.avito.ma/fr/agdal/terrains_et_fermes/A_vendre_splendide_terrain_750m2_sur_haut_Agdal_Rplus4_58926614.htm
- `58951500` — https://www.avito.ma/fr/sidi_othmane/appartements/Appartement_Bureau_%C3%A0_vendre_60_m%C2%B2_58951500.htm
- `58952261` — https://www.avito.ma/fr/sidi_othmane/terrains_et_fermes/Lotissement_Al_Abrar__Casablanca_58952261.htm
- `58952404` — https://www.avito.ma/fr/sidi_othmane/local/Magasin_227m%C2%B2_%C3%A0_vendre_Driss_EL_ALLAM_58952404.htm
- `58960219` — https://www.avito.ma/fr/sidi_othmane/maisons/___Opportunit%C3%A9_d_investissement_%C3%A0_vendre_%C3%A0_Sidi_Othmane___Rue_Nil_58960219.htm
- `58966964` — https://www.avito.ma/fr/sidi_othmane/appartements/Appartement_%C3%A0_vendre_80_m%C2%B2_%C3%A0_Casablanca_58966964.htm
- `58980166` — https://www.avito.ma/fr/sidi_othmane/maisons/Maison_%C3%A0_vendre_58980166.htm
- `58985067` — https://www.avito.ma/fr/sidi_othmane/maisons/%C3%80_VENDRE___MAISON_%C3%80_CASABLANCA_Lahhraouin__Est_ce_vrai___58985067.htm
- `58985556` — https://www.avito.ma/fr/sidi_othmane/maisons/Maison_%C3%A0_vendre_58985556.htm

## Reproductibilité

```powershell
python scripts/qualify_avito_new.py --live <source-canary-urls.txt> --history <listing-urls.txt> --out docs/handovers/avito-qualification-results.json --markdown docs/handovers/avito-qualification-report.md --limit 10
```
