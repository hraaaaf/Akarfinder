// Normalize a raw surface string to an integer number of square metres.
//
//   "120 m²"  -> 120
//   "85 m2"   -> 85
//   "90m²"    -> 90
//   absent    -> null

export function normalizeSurface(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const s = String(raw).toLowerCase().replace(/ /g, " ").trim();
  if (!s) return null;

  // Prefer a number directly attached to a m² / m2 unit.
  const withUnit = s.match(/(\d+(?:[.,]\d+)?)\s*m(?:²|2|\b)/);
  if (withUnit) {
    const n = parseFloat(withUnit[1].replace(",", "."));
    return Number.isFinite(n) ? Math.round(n) : null;
  }

  // Fallback: a bare number (surface_raw is a dedicated field).
  const bare = s.match(/(\d+(?:[.,]\d+)?)/);
  if (bare) {
    const n = parseFloat(bare[1].replace(",", "."));
    return Number.isFinite(n) ? Math.round(n) : null;
  }

  return null;
}
