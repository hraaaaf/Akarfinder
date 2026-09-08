export type MubawabIdentityStatus = 'exact' | 'category_redirect' | 'listing_mismatch' | 'missing_listing_id';

export function extractMubawabListingId(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    return pathname.match(/\/a\/(\d+)(?:\/|$)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

export function validateMubawabFinalUrl(originalUrl: string, finalUrl: string): MubawabIdentityStatus {
  let finalPath = '';
  try {
    finalPath = new URL(finalUrl).pathname;
  } catch {
    return 'missing_listing_id';
  }
  if (/\/sd(?:\/|$)/i.test(finalPath)) return 'category_redirect';
  const originalId = extractMubawabListingId(originalUrl);
  const finalId = extractMubawabListingId(finalUrl);
  if (!originalId || !finalId) return 'missing_listing_id';
  return originalId === finalId ? 'exact' : 'listing_mismatch';
}
