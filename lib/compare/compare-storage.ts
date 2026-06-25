import {
  MAX_COMPARE_LISTINGS,
  type CompareActionResult,
  type CompareStoredIds,
} from "@/lib/compare/types";

export const COMPARE_STORAGE_KEY = "akarfinder:compare:listings";
export const COMPARE_STORAGE_EVENT = "akarfinder:compare-updated";

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function dedupeIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter(Boolean)));
}

export function parseCompareIds(raw: string | null | undefined): CompareStoredIds {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? dedupeIds(parsed.filter((value): value is string => typeof value === "string"))
      : [];
  } catch {
    return [];
  }
}

export function readCompareIds(storage?: StorageLike | null): CompareStoredIds {
  return parseCompareIds(storage?.getItem(COMPARE_STORAGE_KEY));
}

export function writeCompareIds(
  ids: CompareStoredIds,
  storage?: StorageLike | null
): CompareStoredIds {
  const nextIds = dedupeIds(ids).slice(0, MAX_COMPARE_LISTINGS);
  if (!storage) return nextIds;
  if (nextIds.length === 0) {
    storage.removeItem(COMPARE_STORAGE_KEY);
  } else {
    storage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(nextIds));
  }
  return nextIds;
}

export function addCompareId(
  id: string,
  storage?: StorageLike | null
): CompareActionResult {
  const current = readCompareIds(storage);
  if (current.includes(id)) {
    return { ok: true, status: "added", ids: current };
  }
  if (current.length >= MAX_COMPARE_LISTINGS) {
    return { ok: false, status: "limit_reached", ids: current };
  }
  return {
    ok: true,
    status: "added",
    ids: writeCompareIds([...current, id], storage),
  };
}

export function removeCompareId(
  id: string,
  storage?: StorageLike | null
): CompareActionResult {
  const nextIds = writeCompareIds(
    readCompareIds(storage).filter((currentId) => currentId !== id),
    storage
  );
  return { ok: true, status: "removed", ids: nextIds };
}

export function clearCompareIds(storage?: StorageLike | null): CompareActionResult {
  const nextIds = writeCompareIds([], storage);
  return { ok: true, status: "cleared", ids: nextIds };
}

export function toggleCompareId(
  id: string,
  storage?: StorageLike | null
): CompareActionResult {
  const current = readCompareIds(storage);
  return current.includes(id)
    ? removeCompareId(id, storage)
    : addCompareId(id, storage);
}

export function isListingCompared(
  id: string,
  storage?: StorageLike | null
): boolean {
  return readCompareIds(storage).includes(id);
}

export function dispatchCompareUpdated(ids: CompareStoredIds) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(COMPARE_STORAGE_EVENT, {
      detail: { ids },
    })
  );
}
