# DATA MASS-INDEX — M3 Source Factory adapters

**Issue : #854**  
**Lot : M3**  
**Statut : ✅ CLOSED — certification finale quality-hardened**

## Goal
Industrialiser les sources prioritaires par configuration/adaptateur sans réinterpréter les droits de réutilisation et sans introduire de fetch direct pendant la certification M3.

## Succès atteint
- 10 domaines prioritaires mesurés ;
- providers natifs M2 uniquement : `openserp` / `serper_mass_harvest` ;
- 40 candidates max/domain ; 10 canary listings max/domain ;
- M1 + garde structurel spécifique à la source ;
- rendement candidate -> vraie fiche mesuré par domaine ;
- 0 write DB, 0 source-network request, 0 direct fetch, 0 activation publique, 0 provider relabel, 0 policy mutation ;
- 0 breaker ouvert.

## Preuve finale
- PR #863 ;
- HEAD certifié `1822be22e94d94d7cb37219b7405ed58a729db91` ;
- run `32594176513` SUCCESS ;
- artifact `9481117150` ;
- digest `sha256:8a8c8d9947e35940571e8a359cb0bbfa7bb9aa87f3d7ec18a76167cecd74b388` ;
- merge `fe6740ff40872e57789f67d12b02a5b43ea412d6`.

## Pourquoi un second gate était nécessaire
La première passe M3, bien que techniquement verte, classait certaines pages catalogue comme détails. Exemples détectés avant closeout : pages `2p.ma` de catégorie, catalogues `housing.place`, landing pages `portail-immobilier.ma` et route technique `sakane.ma/annonce/mark/spam/...`.

M3 a donc été durci : un candidat n'est valide que s'il passe à la fois le classifieur M1 et une structure URL source-specific prouvée par le réservoir existant.

## Résultat final
- canonical candidates : 350 ;
- fiches détail valides : 77 ;
- rendement agrégé : 22 % ;
- sources à rendement positif : 7/10.

| Source | Candidates | Valid listings | Yield |
|---|---:|---:|---:|
| milkiya.ma | 36 | 31 | 86,1 % |
| sakane.ma | 39 | 16 | 41,0 % |
| 1000-annonces.com | 32 | 10 | 31,3 % |
| expat.com | 32 | 10 | 31,3 % |
| marocannonces.com | 38 | 6 | 15,8 % |
| housing.place | 38 | 3 | 7,9 % |
| domio.ma | 32 | 1 | 3,1 % |
| yakeey.com | 37 | 0 | 0 % |
| 2p.ma | 38 | 0 | 0 % |
| portail-immobilier.ma | 28 | 0 | 0 % |

## Gate M4
Wave 1 M4 : `marocannonces.com`, `domio.ma`, `sakane.ma`, `1000-annonces.com`, `housing.place`, `expat.com`, `milkiya.ma`.

`yakeey.com`, `2p.ma` et `portail-immobilier.ma` restent hors wave 1, sans exclusion définitive. Le réservoir complet contient notamment des URLs Yakeey structurellement detail-like ; une requalification ciblée ultérieure peut les rendre admissibles.

## Invariants permanents
- aucun contournement de login/CAPTCHA/anti-bot/paywall ;
- aucun spoofing ou mécanisme furtif ;
- aucun contenu riche réutilisé implicitement ;
- aucun déploiement Vercel sans autorisation explicite.
