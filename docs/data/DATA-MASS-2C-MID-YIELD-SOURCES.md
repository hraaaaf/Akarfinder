# DATA MASS-2C — Mid-Yield Source Policy Review

**Statut : ACTIVE — certification required**  
**Branche : `data/mass-2c-mid-yield-sources`**  
**Prédécesseur : MASS-2B merge `97bb8c6a9596553d7e8794b5f3b06a71cd845d2f`**

## 1. Responsabilité

Auditer les **30 domaines MID_YIELD certifiés par MASS-2A (rangs 21→50)** sous la doctrine introduite par MASS-2B : acquisition directe et indexation minimale attribuée sont deux axes distincts. MASS-2C n'écrit ni dans la DB ni dans le Source Registry et n'active rien dans Search.

## 2. Doctrine

- modèle futur étudié : `ATTRIBUTED_MINIMAL_INDEX` ;
- toute représentation tierce future exige `Source : X` + lien canonique ;
- attribution ≠ permission ;
- robots/sitemap/capacité ≠ permission ;
- photos et descriptions complètes non réutilisables par défaut ;
- `CANONICAL_LINK_ONLY_CANDIDATE` n'est jamais une autorisation ;
- preuve absente/inaccessible/ambiguë = `HOLD` ;
- 0 canal direct autorisé dans ce lot.

## 3. Résultat de revue

- **30/30** domaines audités ;
- **16 `PERMISSION_REQUIRED`** ;
- **14 `HOLD`** ;
- **16** `CANONICAL_LINK_ONLY_CANDIDATE`, **0 approuvé** ;
- **0** acquisition directe autorisée ;
- **0** photo/description complète autorisée ;
- **0** permission inférée ;
- **0** activation publique ;
- **0/30** source présente dans `source_policy_registry` lors du double-check production.

### `PERMISSION_REQUIRED`

`immobilier.cari.ma`, `toutypasse.com`, `logic-immo.com`, `luxuryestate.com`, `holprop.fr`, `annonces-express.com`, `souika.ma`, `bakimmo.com`, `paruvendu.fr`, `2ememain.be`, `chridari.ma`, `kensingtonmorocco.com`, `proprietes.lefigaro.fr`, `emilegarcin.com`, `quicherchequoi.com`, `abicapital.ma`.

### `HOLD`

`fazwaz.fr`, `capalmrabat.com`, `lyz-marrakech-immobilier.com`, `fadlimmo.com`, `properstar.fr`, `maroc.realigro.fr`, `maisons-maroc.com`, `acropole-immo.net`, `immobakkali.com`, `baytchamal.com`, `kaynly.com`, `mbi-maroc.com`, `dardar.ma`, `mbi-invest.com`.

`HOLD` ne signifie pas interdit : il signifie uniquement que la preuve publique actuelle n'est pas assez résolue pour sortir du fail-closed.

## 4. Preuves structurantes

Le manifeste `data/data-mass-2c/mid-yield-source-review.json` conserve l'URL officielle utilisée lorsqu'une décision `PERMISSION_REQUIRED` est rendue.

Exemples nets :

- ParuVendu : CGU — reproduction/représentation/modification/adaptation/traduction/extraction interdites sans autorisation ;
- Propriétés Le Figaro : reproduction, extraction de base et collecte automatisée commerciale restreintes sans autorisation préalable ;
- LuxuryEstate : exploitation commerciale et reproduction/distribution non autorisées ;
- Kensington Morocco : copie/reproduction/distribution/republication/commercial copying interdits sans autorisation ;
- Emile Garcin : usage hors reproduction/consultation individuelles et privées interdit sans autorisation ;
- QuiChercheQuoi : reproduction/représentation/diffusion/extraction/réutilisation interdites sans autorisation écrite ;
- ABI Capital : reproduction/transmission/modification/usage public ou commercial et création de liens interdits sans autorisation écrite préalable.

## 5. Gate machine

Le workflow `DATA MASS-2C Mid-Yield Source Review` doit prouver sur le head exact :

- cohorte exacte rangs **21→50**, scores MASS-1 immuables ;
- predecessor MASS-2B exact (head/run/artifact/digest/merge) ;
- distribution **16/14** ;
- tests MASS-2C + predecessors ;
- TypeScript + build production ;
- live-audit Registry strictement read-only ;
- **0/30 Registry drift** sinon fail-closed ;
- firewall CI : Supabase uniquement, aucun fetch vers les 30 sources ;
- 0 DB/DDL/Registry/policy write, 0 ingestion, 0 Search activation, 0 permission inférée.

## 6. Hors scope

MASS-2C ne résout pas la baseline transversale qui décidera si un **lien canonique + métadonnées factuelles minimales obtenues sur une base indépendante** peut devenir `CANONICAL_LINK_ONLY`. Tant que cette baseline n'existe pas, les 16 candidats restent non activables.

## 7. Fermeture

MASS-2C ne devient CLOSED qu'après CI exact-head, artefact live read-only, score technique ≥9/10, merge et vérification post-merge SHA/tree. **MASS-2D ne démarre qu'ensuite.**
