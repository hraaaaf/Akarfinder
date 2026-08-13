export type MinimalListingRegistryRow = {
  source_domain: string;
  authorization_status: string | null;
  acquisition_mode: string | null;
  machine_gate: string | null;
  ingestion_gate: string | null;
  display_policy: string | null;
  policy_expires_at: string | null;
};

export type MinimalListingInput = {
  canonicalUrl: string | null;
  sourceDomain: string | null;
  titleOrStructuralSignal: string | null;
  geography?: string | null;
  price?: number | null;
  surface?: number | null;
  photoUrl?: string | null;
  description?: string | null;
};

function policyPathIsPositive(row: MinimalListingRegistryRow): boolean {
  if (row.authorization_status === "limited_public_facts") {
    return row.acquisition_mode === "public_sitemap_canonical_link" &&
      row.machine_gate === "canonical_link_only" &&
      row.ingestion_gate === "canonical_link_only" &&
      row.display_policy === "canonical_link_only";
  }
  if (row.authorization_status === "authorized_partner") {
    const partnerMode = row.acquisition_mode === "authorized_detail_feed" || row.acquisition_mode === "partner_feed";
    const matchingMachine = row.machine_gate === "authorized_detail_feed" || row.machine_gate === "partner_feed";
    const matchingIngestion = row.ingestion_gate === "authorized_detail_feed" || row.ingestion_gate === "partner_feed";
    return partnerMode && matchingMachine && matchingIngestion && row.display_policy === "partner_content";
  }
  return false;
}

export function isPolicyAdmissible(row: MinimalListingRegistryRow, now = new Date()): boolean {
  if (!row.source_domain || !policyPathIsPositive(row)) return false;
  if (!row.policy_expires_at) return false;
  const expires = new Date(row.policy_expires_at);
  if (!Number.isFinite(expires.getTime()) || expires <= now) return false;
  return true;
}

export function buildMinimalListing(input: MinimalListingInput, row: MinimalListingRegistryRow, now = new Date()) {
  if (!isPolicyAdmissible(row, now)) throw new Error("SOURCE_POLICY_NOT_ADMISSIBLE");
  if (!input.canonicalUrl || !/^https?:\/\//i.test(input.canonicalUrl)) throw new Error("CANONICAL_URL_REQUIRED");
  if (!input.sourceDomain || input.sourceDomain !== row.source_domain) throw new Error("SOURCE_PROVENANCE_REQUIRED");
  if (!input.titleOrStructuralSignal?.trim()) throw new Error("TITLE_OR_STRUCTURAL_SIGNAL_REQUIRED");
  return {
    canonicalUrl: input.canonicalUrl,
    sourceDomain: input.sourceDomain,
    titleOrStructuralSignal: input.titleOrStructuralSignal.trim(),
    geography: input.geography ?? null,
    price: input.price ?? null,
    surface: input.surface ?? null,
    photoUrl: input.photoUrl ?? null,
    description: input.description ?? null,
  };
}
