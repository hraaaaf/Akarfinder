// Normalize a raw price string to an integer amount in MAD (dirhams).
//
//   "1 300 000 DH"     -> 1300000
//   "1.3 MDH"          -> 1300000
//   "1,3 MDH"          -> 1300000
//   "8 500 MAD/mois"   -> 8500
//   absent / "Prix sur demande" -> null

export function normalizePrice(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const s = String(raw)
    .toLowerCase()
    .replace(/ /g, " ")
    .trim();
  if (!s || !/\d/.test(s)) return null;

  // Million notation: "1.3 mdh", "1,3 m dh", "2 millions" (never "120 m²").
  const isMillion = /\bmdh\b|\bm\.?\s*dhs?\b|\bmillions?\b/.test(s);
  if (isMillion) {
    const m = s.match(/(\d+(?:[.,]\d+)?)\s*m/);
    if (m) {
      const num = parseFloat(m[1].replace(",", "."));
      if (Number.isFinite(num)) return Math.round(num * 1_000_000);
    }
  }

  // Generic: dots / spaces / commas are thousand separators here.
  const digits = s.replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = parseInt(digits, 10);
  return Number.isFinite(value) ? value : null;
}
