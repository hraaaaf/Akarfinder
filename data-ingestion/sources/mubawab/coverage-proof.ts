export type MubawabCoverageRole = "primary_harvest" | "control" | "project_non_unit" | "identity_only";

export type MubawabRouteFamily = {
  family: "st" | "sc" | "cc" | "ct" | "crp" | "t" | "is" | "pl" | "vacation_st" | "detail";
  role: MubawabCoverageRole;
  inventory_bearing: boolean;
  unit_listing_candidate: boolean;
  example: string;
  rationale: string;
};

export const MUBAWAB_ROUTE_FAMILIES: MubawabRouteFamily[] = [
  {
    family: "st",
    role: "primary_harvest",
    inventory_bearing: true,
    unit_listing_candidate: true,
    example: "https://www.mubawab.ma/fr/st/casablanca/appartements-a-vendre",
    rationale: "city x category listing surface",
  },
  {
    family: "sc",
    role: "primary_harvest",
    inventory_bearing: true,
    unit_listing_candidate: true,
    example: "https://www.mubawab.ma/fr/sc/appartements-a-vendre",
    rationale: "national category listing surface",
  },
  {
    family: "cc",
    role: "control",
    inventory_bearing: true,
    unit_listing_candidate: true,
    example: "https://www.mubawab.ma/fr/cc/immobilier-a-louer",
    rationale: "broad national aggregate used to detect unexplained residual listing ids",
  },
  {
    family: "ct",
    role: "control",
    inventory_bearing: true,
    unit_listing_candidate: true,
    example: "https://www.mubawab.ma/fr/ct/casablanca/immobilier-a-vendre",
    rationale: "city x transaction aggregate; control until full reachability is proven",
  },
  {
    family: "crp",
    role: "control",
    inventory_bearing: true,
    unit_listing_candidate: true,
    example: "https://www.mubawab.ma/fr/crp/rabat-salé-zemmour-zaër/préfecture-de-rabat/immobilier-a-vendre",
    rationale: "hierarchical region/prefecture aggregate discovered during Phase 0; redundancy vs other geography surfaces is not yet proven",
  },
  {
    family: "t",
    role: "control",
    inventory_bearing: true,
    unit_listing_candidate: true,
    example: "https://www.mubawab.ma/fr/t/casablanca",
    rationale: "city aggregate used for geography coverage checks",
  },
  {
    family: "is",
    role: "control",
    inventory_bearing: true,
    unit_listing_candidate: true,
    example: "https://www.mubawab.ma/fr/is/logement-vente_casablanca_pas-cher",
    rationale: "indexed/search-like thematic surface; control until residual inventory is fully explained",
  },
  {
    family: "vacation_st",
    role: "primary_harvest",
    inventory_bearing: true,
    unit_listing_candidate: true,
    example: "https://www.mubawab.ma/fr/st/rabat/appartements-vacational",
    rationale: "vacation is a distinct transaction family from long-term rent",
  },
  {
    family: "pl",
    role: "project_non_unit",
    inventory_bearing: true,
    unit_listing_candidate: false,
    example: "https://www.mubawab.ma/fr/pl/cité-ennasr/listing-promotion",
    rationale: "public new-development catalogue must be reconciled separately from unit listings",
  },
  {
    family: "detail",
    role: "identity_only",
    inventory_bearing: false,
    unit_listing_candidate: true,
    example: "https://www.mubawab.ma/fr/a/<source_id>/...",
    rationale: "a/pa identify listing objects but are not Phase 0 discovery surfaces",
  },
];

export type MubawabCoverageGateId = "P0-A" | "P0-B" | "P0-C" | "P0-D" | "P0-E";

export type MubawabCoverageGate = {
  id: MubawabCoverageGateId;
  name: string;
  status: "pending" | "in_progress" | "pass" | "fail";
};

export const INITIAL_PHASE0_GATES: MubawabCoverageGate[] = [
  { id: "P0-A", name: "route families", status: "in_progress" },
  { id: "P0-B", name: "dimensions", status: "in_progress" },
  { id: "P0-C", name: "reachability", status: "in_progress" },
  { id: "P0-D", name: "authorized pagination / complete traversal", status: "fail" },
  { id: "P0-E", name: "denominator reconciliation", status: "pending" },
];

export function validateCoverageRegistry(families: MubawabRouteFamily[] = MUBAWAB_ROUTE_FAMILIES): void {
  const seen = new Set<string>();
  for (const family of families) {
    if (seen.has(family.family)) throw new Error(`mubawab_phase0_duplicate_route_family:${family.family}`);
    if (!family.example.startsWith("https://www.mubawab.ma/")) {
      throw new Error(`mubawab_phase0_invalid_example:${family.family}`);
    }
    if (family.role === "identity_only" && family.inventory_bearing) {
      throw new Error(`mubawab_phase0_identity_cannot_be_inventory_surface:${family.family}`);
    }
    if (family.role === "project_non_unit" && family.unit_listing_candidate) {
      throw new Error(`mubawab_phase0_project_cannot_be_assumed_unit_listing:${family.family}`);
    }
    seen.add(family.family);
  }
}

export function phase0CanPass(gates: MubawabCoverageGate[]): boolean {
  const required: MubawabCoverageGateId[] = ["P0-A", "P0-B", "P0-C", "P0-D", "P0-E"];
  const byId = new Map(gates.map((gate) => [gate.id, gate]));
  return required.every((id) => byId.get(id)?.status === "pass");
}

export function fullHarvestIsBlocked(gates: MubawabCoverageGate[]): boolean {
  return !phase0CanPass(gates);
}
