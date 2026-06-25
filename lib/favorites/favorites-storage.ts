export const FAVORITES_STORAGE_KEY = "akarfinder:favorites:listings";
export const FAVORITES_STORAGE_EVENT = "akarfinder:favorites-updated";

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type FavoriteStoredIds = string[];

function dedupeIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)));
}

export function parseFavoriteIds(raw: string | null | undefined): FavoriteStoredIds {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? dedupeIds(parsed.filter((v): v is string => typeof v === "string"))
      : [];
  } catch {
    return [];
  }
}

export function readFavoriteIds(storage?: StorageLike | null): FavoriteStoredIds {
  return parseFavoriteIds(storage?.getItem(FAVORITES_STORAGE_KEY));
}

function writeFavoriteIds(ids: FavoriteStoredIds, storage?: StorageLike | null): FavoriteStoredIds {
  const next = dedupeIds(ids);
  if (!storage) return next;
  if (next.length === 0) {
    storage.removeItem(FAVORITES_STORAGE_KEY);
  } else {
    storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

export function addFavoriteId(id: string, storage?: StorageLike | null): FavoriteStoredIds {
  const current = readFavoriteIds(storage);
  if (current.includes(id)) return current;
  return writeFavoriteIds([...current, id], storage);
}

export function removeFavoriteId(id: string, storage?: StorageLike | null): FavoriteStoredIds {
  return writeFavoriteIds(
    readFavoriteIds(storage).filter((fid) => fid !== id),
    storage
  );
}

export function toggleFavoriteId(id: string, storage?: StorageLike | null): FavoriteStoredIds {
  const current = readFavoriteIds(storage);
  return current.includes(id)
    ? removeFavoriteId(id, storage)
    : addFavoriteId(id, storage);
}

export function clearFavoriteIds(storage?: StorageLike | null): FavoriteStoredIds {
  return writeFavoriteIds([], storage);
}

export function isFavorited(id: string, storage?: StorageLike | null): boolean {
  return readFavoriteIds(storage).includes(id);
}

export function dispatchFavoritesUpdated(ids: FavoriteStoredIds) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FAVORITES_STORAGE_EVENT, { detail: { ids } }));
}
