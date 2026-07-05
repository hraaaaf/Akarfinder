# SEO Foundation — AkarFinder

Mission : SEO-FOUNDATION-1
Date : 2026-07-06

## 1. Objectif SEO Foundation

Rendre AkarFinder techniquement propre pour Google avant de construire les
grandes pages SEO ville/quartier/prix (SEO-CITY-INTENT-PAGES-1, mission
future). Cette fondation ne crée aucun contenu SEO massif : elle met en place
sitemap, robots, canonical, metadata globale et structured data prudent, sans
toucher au Search Gateway ni à sa doctrine.

## 2. Routes indexables maintenant

- `/` (page d'accueil)
- `/pro`
- `/profil-recherche`

Ces 3 routes ont un `alternates.canonical` explicite et héritent de
`robots: { index: true, follow: true }` défini par défaut dans
`app/layout.tsx`.

## 3. Routes noindex

Toutes les pages `/demo/**` portent déjà `robots: { index: false, follow: false }`
dans leur propre `export const metadata` (vérifié, aucune modification
nécessaire) :

- `/demo`
- `/demo/promoteur`
- `/demo/agence`
- `/demo/projet`
- `/demo/bien`
- `/demo/demande`
- `/demo/partenaire`
- `/demo/acheter`
- `/demo/louer`
- `/demo/vendre`

`/search` est également noindex (voir section 4).

## 4. Politique /search

`/search` reste **noindex, follow** pour l'instant :

- Les résultats affichés viennent du Search Gateway : dynamiques, tiers, non
  propriétaires.
- Le contenu de la page varie entièrement par querystring (`?q=`, `?city=`,
  `?property_type=`...), ce qui produirait du contenu dupliqué de faible
  valeur si indexé tel quel.
- `follow: true` permet à Google de suivre les liens internes présents sur la
  page (vers `/pro`, `/profil-recherche`, etc.).
- Un `canonical` pointe vers `/search` (sans querystring) pour éviter la
  dispersion de signaux entre variantes de la même page.

Les futures pages SEO contrôlées et propriétaires (ville/quartier/prix)
arriveront avec **SEO-CITY-INTENT-PAGES-1** et seront indexables
individuellement, à la différence de `/search` qui restera une interface
utilisateur, pas une page SEO.

## 5. Politique /demo

Les pages `/demo/**` sont des mockups partenaire (promoteur/agence) à usage de
démonstration commerciale. Elles doivent rester invisibles de Google :

- `noindex, nofollow` sur chacune (déjà en place avant cette mission).
- **Pas de `Disallow: /demo` dans `robots.txt`** : un blocage robots.txt
  empêcherait Google de crawler la page et donc de *lire* la balise
  `noindex` — contre-productif. Le noindex meta suffit et est la méthode
  recommandée par Google pour ce cas de figure.

## 6. Politique Gateway

Non modifiée par cette mission (hors scope absolu) :

- Aucune page interne créée pour les résultats Gateway.
- Aucun contact/WhatsApp/galerie ajouté aux résultats externes.
- Aucun schema `RealEstateListing`, `Offer`, `AggregateRating` ou `Review`
  ajouté nulle part dans le site.
- `Search Gateway`, `app/api/search/**`, `lib/search-gateway/**`, le ranking,
  la DB et Supabase n'ont subi aucune modification.

## 7. Structured data autorisé

Deux schemas globaux uniquement, injectés dans `app/layout.tsx` via
`components/seo/JsonLd.tsx` et `lib/seo/structured-data.ts` :

- `Organization` (identité du site : nom, URL, logo)
- `WebSite` + `SearchAction` (permet à Google de proposer une recherche
  directe sur `/search?q={search_term_string}` dans les résultats Google)

## 8. Structured data interdit

- `RealEstateListing` — jamais sur des résultats Gateway externes.
- `Offer` — aucune offre commerciale certifiée sur des tiers.
- `AggregateRating` / `Review` — aucune note ou avis fabriqué.
- Tout schema impliquant un prix "officiel/certifié/garanti" ou une
  disponibilité "garantie".

## 9. Sitemap actuel

`app/sitemap.ts` — génère uniquement :

- `https://akarfinder.vercel.app/`
- `https://akarfinder.vercel.app/pro`
- `https://akarfinder.vercel.app/profil-recherche`

Exclut explicitement `/demo/**`, `/search`, `/listings/**` et toute page
Gateway externe.

## 10. Robots actuel

`app/robots.ts` :

```
User-agent: *
Allow: /

Sitemap: https://akarfinder.vercel.app/sitemap.xml
```

Pas de `Disallow` sur `/demo` (voir section 5 pour la justification).

## 11. Canonical actuel

| Route               | Canonical                                      |
|----------------------|------------------------------------------------|
| `/`                  | `https://akarfinder.vercel.app/` (via layout)  |
| `/pro`               | `https://akarfinder.vercel.app/pro`            |
| `/profil-recherche`  | `https://akarfinder.vercel.app/profil-recherche` |
| `/search`            | `https://akarfinder.vercel.app/search` (noindex malgré le canonical) |
| `/demo/**`           | Aucun — noindex prioritaire, canonical non nécessaire |

## 12. Préparation future akarfinder.ma

`lib/seo/site.ts` documente `futureDomain: "https://akarfinder.ma"` mais ne
l'utilise **nulle part** dans le code actif. `metadataBase`, le sitemap et le
robots utilisent tous `siteUrl = "https://akarfinder.vercel.app"` — l'URL
réellement servie aujourd'hui.

**Important** : le `metadataBase` de `app/layout.tsx` pointait auparavant vers
`https://akarfinder.ma` (domaine non branché). C'était une incohérence
préexistante : cette mission l'a corrigée vers `siteConfig.siteUrl`
(`akarfinder.vercel.app`), sinon canonical/OG/sitemap auraient généré des URLs
vers un domaine ne servant aucun contenu.

Quand `akarfinder.ma` sera réellement branché (DNS + domaine Vercel) :

1. Mettre à jour `siteConfig.siteUrl` vers `https://akarfinder.ma`.
2. Configurer une redirection 301 permanente de `akarfinder.vercel.app` vers
   le nouveau domaine (au niveau Vercel, pas dans le code applicatif).
3. Soumettre le nouveau domaine à Google Search Console et migrer la
   propriété existante (voir section 13).

## 13. Préparation Search Console

Pas encore configuré (hors scope de cette mission). Étapes prévues pour une
mission future :

1. Vérifier la propriété `akarfinder.vercel.app` dans Google Search Console
   (méthode DNS TXT ou balise HTML `<meta name="google-site-verification">`).
2. Soumettre `https://akarfinder.vercel.app/sitemap.xml`.
3. Surveiller la couverture d'indexation (s'assurer que `/demo/**` et
   `/search` n'apparaissent pas en "Indexé").
4. Migrer la propriété vers `akarfinder.ma` une fois le domaine branché
   (section 12).

## 14. Prochaines missions SEO

- **SEO-CITY-INTENT-PAGES-1** : pages SEO ville/quartier/prix propriétaires,
  indexables, ajoutées au sitemap une par une après validation.
- **MOROCCO-PRICE-LIFESTYLE-REFERENCE-DATASET-1** : dataset de repères
  prix/lifestyle par ville/quartier, alimentant les futures pages SEO
  (prochaine étape roadmap après validation production de cette mission,
  80% → 82%).
- Configuration Google Search Console (section 13).
- Réévaluation de la politique `/search` une fois que des pages SEO
  propriétaires existent pour absorber l'intention de recherche organique.
