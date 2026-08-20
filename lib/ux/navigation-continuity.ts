const LOCAL_BASE = "https://akarfinder.local";

const RETURN_SURFACES = new Set(["/search", "/map"]);

export function sanitizeReturnHref(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) return null;

  try {
    const parsed = new URL(trimmed, LOCAL_BASE);
    if (parsed.origin !== LOCAL_BASE || !RETURN_SURFACES.has(parsed.pathname)) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function buildListingDetailHref(
  listingHref: string,
  returnHref: string | null | undefined,
  projectId?: string | null,
): string {
  const trimmed = listingHref.trim();
  if (!trimmed.startsWith("/listings/") || trimmed.startsWith("//")) return listingHref;

  try {
    const parsed = new URL(trimmed, LOCAL_BASE);
    if (parsed.origin !== LOCAL_BASE || !parsed.pathname.startsWith("/listings/")) return listingHref;

    const safeReturnHref = sanitizeReturnHref(returnHref);
    if (safeReturnHref) parsed.searchParams.set("return_to", safeReturnHref);

    const normalizedProjectId = projectId?.trim();
    if (normalizedProjectId) parsed.searchParams.set("project_id", normalizedProjectId);

    const query = parsed.searchParams.toString();
    return `${parsed.pathname}${query ? `?${query}` : ""}${parsed.hash}`;
  } catch {
    return listingHref;
  }
}
