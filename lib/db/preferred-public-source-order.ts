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
