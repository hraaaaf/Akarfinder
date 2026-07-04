import type { PropertyVisualType } from "@/components/demo/PropertyVisual";

// Premium partner-page demo data. All entries are fictional, local-only and
// non-contractual. No real partner, phone number, URL, lead or inventory.

export const DEMO_PARTNER_PROMOTER_EXPERIENCE = {
  promoterName: "Promoteur Demo Casablanca",
  tagline: "Exemple de presence promoteur partenaire sur AkarFinder.",
  zones: ["Casablanca", "Bouskoura", "Californie", "Dar Bouazza"],
  mainProject: "Residence Palmier Demo",
  projects: [
    {
      name: "Residence Palmier Demo",
      city: "Casablanca",
      district: "Californie",
      type: "Programme neuf demo",
      price: "Fourchette fictive : 920 000 - 2 450 000 MAD",
      status: "Commercialisation demo",
      visual: "project-garden" as PropertyVisualType,
    },
    {
      name: "Horizon Bouskoura Demo",
      city: "Bouskoura",
      district: "Centre",
      type: "Villas demo",
      price: "Fourchette fictive : 2 100 000 - 3 800 000 MAD",
      status: "Bientot disponible demo",
      visual: "villa-premium" as PropertyVisualType,
    },
    {
      name: "Les Jardins Anfa Demo",
      city: "Casablanca",
      district: "Anfa",
      type: "Appartements & duplex demo",
      price: "Fourchette fictive : 1 200 000 - 3 100 000 MAD",
      status: "Projet futur demo",
      visual: "project-facade" as PropertyVisualType,
    },
  ],
  report: {
    searches: "128 recherches demo",
    budgets: "Budget declare moyen fictif : 1,6M MAD",
    neighborhoods: ["Californie", "Bouskoura", "Anfa"],
    typologies: ["T3", "T4", "Duplex"],
  },
};

export const DEMO_PARTNER_PROJECT = {
  name: "Residence Palmier Demo",
  city: "Casablanca",
  district: "Californie",
  locationLevel: "Zone approximative fictive a titre d'illustration",
  type: "Programme neuf demo",
  priceRange: "Fourchette indicative fictive : 920 000 - 2 450 000 MAD",
  visuals: ["project-garden", "residence-walkway", "apartment-modern"] as PropertyVisualType[],
  phases: [
    { name: "Tranche 1", status: "Commercialisation demo", delivery: "Livraison fictive : T4 2027", note: "Premier ensemble d'unites types presente en demonstration." },
    { name: "Tranche 2", status: "Bientot disponible demo", delivery: "Livraison fictive : T2 2028", note: "Ouverture indicative selon validation partenaire." },
    { name: "Tranche 3", status: "Projet futur demo", delivery: "Calendrier fictif a confirmer", note: "Phase illustree pour montrer la lecture long terme du projet." },
  ],
  typologies: [
    { name: "T2 72 m2", surface: "72 m2", bedrooms: "1 chambre", bathrooms: "1 SDB", orientation: "Sud-Est fictif", parking: "Parking en option demo", terrace: "Balcon demo", price: "920k - 1,15M MAD fictif", availability: "Disponible demo" },
    { name: "T3 104 m2", surface: "104 m2", bedrooms: "2 chambres", bathrooms: "2 SDB", orientation: "Ouest fictif", parking: "1 place demo", terrace: "Terrasse demo", price: "1,35M - 1,75M MAD fictif", availability: "Selection demo" },
    { name: "T4 128 m2", surface: "128 m2", bedrooms: "3 chambres", bathrooms: "2 SDB", orientation: "Sud fictif", parking: "1 place demo", terrace: "Grande terrasse demo", price: "1,85M - 2,15M MAD fictif", availability: "Quantite fictive limitee" },
    { name: "Duplex 165 m2", surface: "165 m2", bedrooms: "4 chambres", bathrooms: "3 SDB", orientation: "Double orientation fictive", parking: "2 places demo", terrace: "Terrasse familiale demo", price: "2,25M - 2,45M MAD fictif", availability: "Sur demande demo" },
  ],
  floorPlans: [
    { title: "Plan T2 72 m2", surface: "72 m2", rooms: "Sejour + 1 chambre", orientation: "Sud-Est fictif", scope: "Unite type" },
    { title: "Plan T3 104 m2", surface: "104 m2", rooms: "Sejour + 2 chambres", orientation: "Ouest fictif", scope: "Unite type" },
    { title: "Plan T4 128 m2", surface: "128 m2", rooms: "Sejour + 3 chambres", orientation: "Sud fictif", scope: "Unite type" },
    { title: "Plan Duplex 165 m2", surface: "165 m2", rooms: "Double niveau", orientation: "Double orientation", scope: "Unite type" },
  ],
  modelApartment: {
    title: "Appartement temoin demo - T3 104 m2",
    composition: ["Sejour", "Suite parentale", "Chambre enfant", "Cuisine", "Balcon", "2 SDB"],
    strengths: ["Distribution lisible", "Espace familial", "Balcon exploitable", "Plan 2D indicatif"],
    pointsToVerify: ["Surface contractuelle", "Orientation exacte", "Charges", "Parking", "Cahier des charges"],
    visual: "appartement-familial" as PropertyVisualType,
  },
  nearby: [
    { category: "Commerces", items: ["Dans le secteur - fictif", "A confirmer sur place"] },
    { category: "Ecoles et creches", items: ["Dans l'environnement elargi - fictif", "A confirmer aupres du partenaire"] },
    { category: "Sante", items: ["Clinique dans le secteur - fictif", "Pharmacie a proximite - fictif"] },
    { category: "Transport", items: ["Axes routiers proches - fictif", "Taxi dans le secteur - fictif"] },
    { category: "Loisirs", items: ["Espaces verts dans le secteur - fictif"] },
  ],
  mobility: [
    "Voiture : acces aux grands axes a confirmer",
    "Transport : desserte a verifier selon adresse finale",
    "Taxi : disponibilite indicative dans le secteur",
    "Marche : services proches a confirmer",
    "Stationnement : selon lot et contrat partenaire",
  ],
  neighborhood: {
    advantages: ["Secteur residentiel demo", "Projet adapte famille demo", "Services dans le secteur demo"],
    checks: ["Circulation", "Bruit selon rue", "Stationnement visiteurs", "Livraison effective", "Charges"],
  },
  reservationChecklist: [
    "Titre et autorisations",
    "Cahier des charges",
    "Plan signe",
    "Surface contractuelle",
    "Charges",
    "Livraison",
    "Frais annexes",
    "Syndic",
    "Parking",
    "Conditions de reservation",
  ],
};

export const DEMO_PARTNER_AGENCY_EXPERIENCE = {
  agencyName: "Agence Demo Rabat",
  tagline: "Agence virtuelle premium - exemple non contractuel.",
  zones: ["Agdal", "Hay Riad", "Souissi", "Haut Agdal", "Hassan"],
  specialties: ["Achat familial", "Location longue duree", "MRE", "Investissement", "Villas / appartements"],
  advisor: {
    name: "Conseiller Demo",
    role: "Accompagnement acheteur et vendeur - fictif",
    note: "Dans une version partenaire, le contact s'affiche uniquement si l'agence l'autorise.",
  },
  listings: [
    { title: "Appartement familial demo", city: "Rabat", neighborhood: "Agdal", propertyType: "Appartement", transaction: "Achat", price: "1,85M MAD fictif", surface: "112 m2", locationLevel: "Quartier uniquement - demo", contactMode: "Contact autorise fictif", visual: "appartement-familial" as PropertyVisualType, pointsToVerify: ["Charges", "Parking", "Etat copropriete"] },
    { title: "Villa demo avec jardin", city: "Rabat", neighborhood: "Souissi", propertyType: "Villa", transaction: "Achat", price: "4,2M MAD fictif", surface: "310 m2", locationLevel: "Zone approximative - demo", contactMode: "Contact autorise fictif", visual: "villa-premium" as PropertyVisualType, pointsToVerify: ["Titre", "Travaux", "Jardin"] },
    { title: "Studio location demo", city: "Rabat", neighborhood: "Haut Agdal", propertyType: "Studio", transaction: "Location", price: "5 800 MAD/mois fictif", surface: "42 m2", locationLevel: "Quartier uniquement - demo", contactMode: "Contact autorise fictif", visual: "studio-urbain" as PropertyVisualType, pointsToVerify: ["Bail", "Meubles", "Charges"] },
    { title: "Bureau demo", city: "Rabat", neighborhood: "Hassan", propertyType: "Bureau", transaction: "Location", price: "13 500 MAD/mois fictif", surface: "86 m2", locationLevel: "Zone approximative - demo", contactMode: "Contact autorise fictif", visual: "local-commercial" as PropertyVisualType, pointsToVerify: ["Acces", "Stationnement", "Contrat"] },
    { title: "Appartement MRE demo", city: "Rabat", neighborhood: "Hay Riad", propertyType: "Appartement", transaction: "Achat", price: "2,35M MAD fictif", surface: "128 m2", locationLevel: "Quartier uniquement - demo", contactMode: "Contact autorise fictif", visual: "urban-building" as PropertyVisualType, pointsToVerify: ["Dossier a distance", "Syndic", "Orientation"] },
  ],
  qualifiedRequests: [
    { profile: "Famille avec enfants", budget: "Budget fictif : 1,8M - 2,2M MAD", zone: "Agdal ou Hay Riad", urgency: "Horizon demo : 3 mois", propertyType: "Appartement 3 chambres", importantPoint: "Ecoles et parking", source: "Source de la demande : parcours Acheter demo" },
    { profile: "MRE", budget: "Budget fictif : 2M - 2,8M MAD", zone: "Hay Riad", urgency: "Voyage prevu cet ete - demo", propertyType: "Appartement familial", importantPoint: "Gestion a distance", source: "Source de la demande : profil MRE demo" },
    { profile: "Locataire longue duree", budget: "Budget fictif : 7 000 - 10 000 MAD/mois", zone: "Haut Agdal", urgency: "A emmenager sous 30 jours - demo", propertyType: "Studio ou T2", importantPoint: "Proximite transport", source: "Source de la demande : parcours Louer demo" },
  ],
};
