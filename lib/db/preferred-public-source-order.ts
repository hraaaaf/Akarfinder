/**
 * In public structured Search, a property is a candidate when ANY active
 * source is first-party / partner-authorized. The lateral SELECT must use
 * that authorized representation before older third-party records, or the
 * subsequent publication guard may hide a legitimate partner-owned record.
 *
 * Preserve the historical ordering for non-public reads and for purely
 * external OpenSERP candidates. Placeholder-only interpolation prevents
 * source names or query text from entering SQL directly.
 */
export function buildPublicSourceOrderBy(publicSourcePlaceholders: readonly string[]): string {
  const stableOrder = "first_seen_at NULLS LAST,id";
  if (publicSourcePlaceholders.length === 0) return stableOrder;

  if (!publicSourcePlaceholders.every((placeholder) => /^\$[1-9]\d*$/.test(placeholder))) {
    throw new Error("invalid_public_source_placeholder");
  }
  return `CASE WHEN lower(trim(source_name)) IN (${publicSourcePlaceholders.join(",")}) THEN 0 ELSE 1 END, ${stableOrder}`;
}


/**
 * Read the authorized representation first when multiple active sources
 * describe the same property. No new source is authorized by this ordering.
 * Missing authorized sources fall back to the existing heuristic and remain
 * subject to the final public publication guard.
 */
export function pickAuthorizedActiveSource<T extends { source_name: string; is_active: boolean }>(
  sources: readonly T[],
  allowedSourceNames: readonly string[],
): T | undefined {
  const allowed = new Set(allowedSourceNames.map((name) => name.trim().toLowerCase()));
  return sources.find((source) =>
    source.is_active === true && allowed.has(source.source_name.trim().toLowerCase()));
}
