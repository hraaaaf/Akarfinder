// P5A — Deterministic duplicate detection for a batch of listings.
// No merges, no deletions. Pure enrichment.
// P6 adds DB-native variant (DbRowForDuplicate) for full-DB enrichment scripts.
import type { Listing } from "@/lib/listings/types";

export type DuplicateInfo = {
  group_id: string;
  score: number;
};

function jaccardWords(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 2)
    );
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

// Returns a [0, 1] similarity score. City must match (otherwise 0).
// Scoring breakdown (max = 1.00):
//   same city          : 0.25
//   same property_type : 0.15
//   same transaction   : 0.15
//   price within ±10%  : 0.15
//   surface within ±10%: 0.10
//   same bedrooms      : 0.10
//   title Jaccard ×0.10: 0.10
export function computeSimilarityScore(a: Listing, b: Listing): number {
  if (!a.city || !b.city || a.city !== b.city) return 0;

  let score = 0.25; // same city

  if (a.property_type === b.property_type) score += 0.15;
  if (a.transaction_type === b.transaction_type) score += 0.15;

  const pa = a.price_mad ?? a.price;
  const pb = b.price_mad ?? b.price;
  if (pa != null && pb != null && pa > 0 && pb > 0) {
    const ratio = Math.min(pa, pb) / Math.max(pa, pb);
    if (ratio >= 0.9) score += 0.15;
  }

  if (a.surface_m2 > 0 && b.surface_m2 > 0) {
    const ratio = Math.min(a.surface_m2, b.surface_m2) / Math.max(a.surface_m2, b.surface_m2);
    if (ratio >= 0.9) score += 0.10;
  }

  if (a.bedrooms >= 0 && b.bedrooms >= 0 && a.bedrooms === b.bedrooms) score += 0.10;

  score += 0.10 * jaccardWords(a.title, b.title);

  return Math.min(1.0, Math.max(0, score));
}

// Union-Find helpers (path-compressed, non-recursive).
function find(parent: Map<string, string>, id: string): string {
  let root = id;
  while (parent.get(root) !== root) {
    root = parent.get(root)!;
  }
  // Path compression
  let cur = id;
  while (cur !== root) {
    const next = parent.get(cur)!;
    parent.set(cur, root);
    cur = next;
  }
  return root;
}

function unite(parent: Map<string, string>, a: string, b: string) {
  const ra = find(parent, a);
  const rb = find(parent, b);
  if (ra !== rb) parent.set(ra, rb);
}

// Groups listings by similarity (threshold = 0.70).
// Returns a map: listing.id → { group_id, score }.
// group_id = id of the listing with the highest data_completeness_score
//            in its component (tie-break: numerically smallest id).
// score = max similarity against any other listing in the same group (0 if alone).
export function assignDuplicateGroups(listings: Listing[]): Map<string, DuplicateInfo> {
  if (listings.length === 0) return new Map();

  const ids = listings.map((l) => l.id);
  // Initialise Union-Find: each node is its own root.
  const parent = new Map<string, string>(ids.map((id) => [id, id]));

  // Pairwise similarity — acceptable for small result sets (limit ≤ 100).
  const pairScore = new Map<string, number>(); // `${id_a}:${id_b}` → score

  for (let i = 0; i < listings.length; i++) {
    for (let j = i + 1; j < listings.length; j++) {
      const s = computeSimilarityScore(listings[i], listings[j]);
      if (s >= 0.70) {
        unite(parent, listings[i].id, listings[j].id);
      }
      pairScore.set(`${listings[i].id}:${listings[j].id}`, s);
    }
  }

  // Build component map: root → member ids.
  const components = new Map<string, string[]>();
  for (const l of listings) {
    const root = find(parent, l.id);
    const members = components.get(root) ?? [];
    members.push(l.id);
    components.set(root, members);
  }

  // Index listings by id for quick lookup.
  const byId = new Map<string, Listing>(listings.map((l) => [l.id, l]));

  // For each component, choose the representative (best completeness, then smallest numeric id).
  const groupRepresentative = (memberIds: string[]): string => {
    return memberIds.sort((a, b) => {
      const la = byId.get(a);
      const lb = byId.get(b);
      const scoreA = la?.data_completeness_score ?? la?.reliability_score ?? 0;
      const scoreB = lb?.data_completeness_score ?? lb?.reliability_score ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const na = Number(a) || 0;
      const nb = Number(b) || 0;
      return na - nb;
    })[0];
  };

  // Compute per-listing max score.
  const maxScore = new Map<string, number>(ids.map((id) => [id, 0]));
  for (const [key, s] of pairScore) {
    const [idA, idB] = key.split(":");
    if (find(parent, idA) === find(parent, idB)) {
      maxScore.set(idA, Math.max(maxScore.get(idA) ?? 0, s));
      maxScore.set(idB, Math.max(maxScore.get(idB) ?? 0, s));
    }
  }

  // Build output map.
  const result = new Map<string, DuplicateInfo>();
  for (const [_root, memberIds] of components) {
    const rep = groupRepresentative(memberIds);
    for (const id of memberIds) {
      result.set(id, {
        group_id: rep,
        score: memberIds.length > 1 ? (maxScore.get(id) ?? 0) : 0,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// P6 — DB-native duplicate detection (operates on raw property_listings rows).
// Identical scoring logic as above but uses raw field names (not mapped types).
// ---------------------------------------------------------------------------

export type DbRowForDuplicate = {
  id: number;
  city: string | null;
  property_type: string | null;   // raw: "apartment" | "villa" | "land" | "office"
  transaction_type: string | null; // raw: "sale" | "rent" | "new"
  price_mad: number | null;
  surface_m2: number | null;
  bedrooms_count: number | null;
  title: string | null;
  data_completeness_score: number;
  canonical_fingerprint: string;
};

export function computeSimilarityScoreFromRow(
  a: DbRowForDuplicate,
  b: DbRowForDuplicate
): number {
  const cityA = a.city?.toLowerCase().trim();
  const cityB = b.city?.toLowerCase().trim();
  if (!cityA || !cityB || cityA !== cityB) return 0;

  let score = 0.25; // same city

  if (a.property_type && b.property_type && a.property_type === b.property_type) score += 0.15;
  if (a.transaction_type && b.transaction_type && a.transaction_type === b.transaction_type) score += 0.15;

  const pa = a.price_mad ?? 0;
  const pb = b.price_mad ?? 0;
  if (pa > 0 && pb > 0) {
    const ratio = Math.min(pa, pb) / Math.max(pa, pb);
    if (ratio >= 0.9) score += 0.15;
  }

  const sa = a.surface_m2 ?? 0;
  const sb = b.surface_m2 ?? 0;
  if (sa > 0 && sb > 0) {
    const ratio = Math.min(sa, sb) / Math.max(sa, sb);
    if (ratio >= 0.9) score += 0.10;
  }

  const ba = a.bedrooms_count ?? -1;
  const bb = b.bedrooms_count ?? -1;
  if (ba >= 0 && bb >= 0 && ba === bb) score += 0.10;

  score += 0.10 * jaccardWords(a.title ?? "", b.title ?? "");

  return Math.min(1.0, Math.max(0, score));
}

// Full-DB duplicate grouping. Expects rows already filtered to a single city
// (or a small set) for efficiency. Returns map: string(id) → DuplicateInfo.
export function assignDuplicateGroupsFromRows(
  rows: DbRowForDuplicate[]
): Map<string, DuplicateInfo> {
  if (rows.length === 0) return new Map();

  const ids = rows.map((r) => String(r.id));
  const parent = new Map<string, string>(ids.map((id) => [id, id]));
  const pairScore = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const s = computeSimilarityScoreFromRow(rows[i], rows[j]);
      if (s >= 0.70) {
        unite(parent, ids[i], ids[j]);
      }
      pairScore.set(`${ids[i]}:${ids[j]}`, s);
    }
  }

  const components = new Map<string, string[]>();
  for (const id of ids) {
    const root = find(parent, id);
    const members = components.get(root) ?? [];
    members.push(id);
    components.set(root, members);
  }

  const byId = new Map<string, DbRowForDuplicate>(rows.map((r) => [String(r.id), r]));

  const groupRepresentative = (memberIds: string[]): string => {
    return memberIds.sort((a, b) => {
      const ra = byId.get(a);
      const rb = byId.get(b);
      const scoreA = ra?.data_completeness_score ?? 0;
      const scoreB = rb?.data_completeness_score ?? 0;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return (Number(a) || 0) - (Number(b) || 0);
    })[0];
  };

  const maxScore = new Map<string, number>(ids.map((id) => [id, 0]));
  for (const [key, s] of pairScore) {
    const [idA, idB] = key.split(":");
    if (find(parent, idA) === find(parent, idB)) {
      maxScore.set(idA, Math.max(maxScore.get(idA) ?? 0, s));
      maxScore.set(idB, Math.max(maxScore.get(idB) ?? 0, s));
    }
  }

  const result = new Map<string, DuplicateInfo>();
  for (const [_root, memberIds] of components) {
    const rep = groupRepresentative(memberIds);
    for (const id of memberIds) {
      result.set(id, {
        group_id: rep,
        score: memberIds.length > 1 ? (maxScore.get(id) ?? 0) : 0,
      });
    }
  }

  return result;
}
