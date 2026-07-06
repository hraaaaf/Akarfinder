import type { SearchGatewayCacheEntry } from "./types";

export function computeAgeSeconds(createdAt: string, now = new Date()): number {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((now.getTime() - created) / 1000));
}

export function isFreshEntry(entry: SearchGatewayCacheEntry, now = new Date()): boolean {
  return new Date(entry.expires_at).getTime() > now.getTime();
}

export function isStaleEligibleEntry(entry: SearchGatewayCacheEntry, now = new Date()): boolean {
  return (
    new Date(entry.expires_at).getTime() <= now.getTime() &&
    new Date(entry.stale_until).getTime() > now.getTime()
  );
}
