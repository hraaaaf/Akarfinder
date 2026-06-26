// Promoters and projects local data layer.
//
// RÈGLE CRITIQUE : seules les entrées visibility_status="active" sont publiques.
// Les entrées "demo" et "draft" ne sont jamais liées publiquement ni indexées.
// Les entrées "demo" sont accessibles uniquement via ?preview=demo (usage interne/commercial).
//
// Pour ajouter un vrai partenaire :
//   1. Obtenir les données directement du promoteur (formulaire /pro ou accord direct).
//   2. Ajouter une entrée avec visibility_status: "active".
//   3. Ne jamais utiliser de données issues du scraping public pour contact_whatsapp/contact_email.

import type { Promoter, NewProject } from "./types";

// Aucun promoteur actif pour l'instant — en attente de vrais partenaires.
// L'entrée "demo" ci-dessous sert uniquement à la démonstration commerciale interne
// accessible via ?preview=demo. Elle n'est jamais exposée publiquement.
export const PROMOTERS: Promoter[] = [
  {
    id: "demo-promoteur-01",
    slug: "promoteur-demo-akarfinder",
    name: "Promoteur Démo AkarFinder",
    city: "Casablanca",
    description:
      "Exemple de présentation promoteur — données illustratives fournies pour démonstration. Ce profil montre comment une page promoteur partenaire apparaît sur AkarFinder. Les vraies données seront fournies par le promoteur partenaire.",
    partner_status: "partner",
    visibility_status: "demo",
    source_note: "Données fournies par le promoteur",
    created_at: "2026-06-25T00:00:00Z",
    updated_at: "2026-06-26T00:00:00Z",
  },
];

export const PROJECTS: NewProject[] = [
  {
    id: "demo-projet-01",
    slug: "residence-demo-akarfinder",
    promoter_id: "demo-promoteur-01",
    name: "Résidence Démo AkarFinder",
    city: "Casablanca",
    neighborhood: "Maârif",
    address_label: "Casablanca, secteur Maârif — repère indicatif",
    price_from: 850_000,
    currency: "MAD",
    property_types: ["Appartement", "Studio"],
    typologies: ["Studio", "T2", "T3"],
    surfaces: { min: 45, max: 120, unit: "m²" },
    delivery_date_label: "Prévu 2026 — à confirmer auprès du promoteur",
    project_status: "upcoming",
    visibility_status: "demo",
    partner_badge: "Projet partenaire",
    lead_cta_type: "form",
    source_access_level: "partner_full",
    image_permission_status: "fallback_visual",
    disclaimer:
      "Informations fournies à titre illustratif. À confirmer directement auprès du promoteur avant tout engagement. Prix à partir de, hors frais notariaux et charges.",
  },
];
