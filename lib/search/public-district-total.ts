/**
 * The structured district COUNT(*) counts DB rows before public source-policy,
 * geo canonicalization and quality filters. Those rows must not be advertised
 * as available properties when none are public.
 *
 * Fail closed to the actual matched, publishable result count ONLY after a
 * complete district scan. Retain the original estimate for bounded scans
 * that cannot know whether more eligible rows exist.
 */
export function publicEligibleDistrictTotal(input: {
  districtRequested: boolean;
  scanComplete: boolean;
  eligibleMatches: number;
  rawTotal: number;
  structuredDistrictTotal: number | null;
}): number {
  const baseTotal = input.structuredDistrictTotal ?? input.rawTotal;
  if (!input.districtRequested || !input.scanComplete) return baseTotal;
  return input.eligibleMatches;
}
