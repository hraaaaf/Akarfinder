export type MinimalListingRegistryRow = {
  source_domain: string;
  authorization_status: string | null;
  machine_gate: string | null;
  ingestion_gate: string | null;
  display_gate: string | null;
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

const POSITIVE_AUTH = new Set(["authorized", "approved", "permission_granted"]);
const POSITIVE_MACHINE = new Set(["canonical_link_only", "allowed", "enabled"]);
const POSITIVE_INGESTION = new Set(["canonical_link_only", "allowed", "enabled"]);
const POSITIVE_DISPLAY = new Set(["external_tail_link_only", "canonical_link_only", "allowed", "enabled"]);

export function isPolicyAdmissible(row: MinimalListingRegistryRow, now = new Date()): boolean {
  if (!row.source_domain || !POSITIVE_AUTH.has(row.authorization_status ?? "")) return false;
  if (!POSITIVE_MACHINE.has(row.machine_gate ?? "")) return false;
  if (!POSITIVE_INGESTION.has(row.ingestion_gate ?? "")) return false;
  if (!POSITIVE_DISPLAY.has(row.display_gate ?? "")) return false;
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
