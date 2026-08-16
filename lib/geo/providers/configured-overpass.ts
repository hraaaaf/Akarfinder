import type { GeoTruth } from "@/lib/geo/geo-truth";
import type { GeoCoordinate, NearbyProvider, NearbyProviderResult, NearbyPoi } from "@/lib/geo/provider-contracts";

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const CACHE_MAX_ENTRIES = 128;

type FetchLike = typeof fetch;

type OverpassElement = {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string | undefined>;
};

type OverpassPayload = { elements?: OverpassElement[] };

type CachedResult = { expiresAt: number; result: NearbyProviderResult };

const cache = new Map<string, CachedResult>();

const CATEGORY_TAGS: Record<string, Array<[string, string]>> = {
  education: [["amenity", "school"], ["amenity", "kindergarten"], ["amenity", "university"]],
  groceries: [["shop", "supermarket"], ["shop", "convenience"], ["amenity", "marketplace"]],
  health: [["amenity", "pharmacy"], ["amenity", "clinic"], ["amenity", "hospital"]],
  transport: [["public_transport", "station"], ["public_transport", "platform"], ["railway", "station"], ["railway", "tram_stop"]],
  food: [["amenity", "restaurant"], ["amenity", "cafe"]],
  green_sport: [["leisure", "park"], ["leisure", "sports_centre"], ["leisure", "fitness_centre"]],
  worship: [["amenity", "place_of_worship"]],
  banking: [["amenity", "bank"], ["amenity", "atm"]],
  parking: [["amenity", "parking"]],
  shopping: [["shop", "mall"], ["shop", "department_store"]],
  coast: [["natural", "beach"]],
};

function finiteCoordinate(value: GeoCoordinate | null | undefined): value is GeoCoordinate {
  return Boolean(
    value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude) &&
    value.latitude >= -90 && value.latitude <= 90 && value.longitude >= -180 && value.longitude <= 180,
  );
}

function buildQuery(origin: GeoCoordinate, radiusMeters: number, categories: string[]): string {
  const tags = categories.flatMap((category) => CATEGORY_TAGS[category] ?? []);
  const unique = Array.from(new Map(tags.map(([key, value]) => [`${key}=${value}`, [key, value] as const])).values());
  const statements = unique.flatMap(([key, value]) => [
    `node(around:${radiusMeters},${origin.latitude},${origin.longitude})["${key}"="${value}"];`,
    `way(around:${radiusMeters},${origin.latitude},${origin.longitude})["${key}"="${value}"];`,
    `relation(around:${radiusMeters},${origin.latitude},${origin.longitude})["${key}"="${value}"];`,
  ]);
  return `[out:json][timeout:12];(${statements.join("")});out center tags;`;
}

function categoryFor(tags: Record<string, string | undefined> = {}): string {
  for (const [category, pairs] of Object.entries(CATEGORY_TAGS)) {
    if (pairs.some(([key, value]) => tags[key] === value)) return category;
  }
  return "other";
}

function parsePoi(element: OverpassElement): NearbyPoi | null {
  const latitude = element.lat ?? element.center?.lat;
  const longitude = element.lon ?? element.center?.lon;
  const coordinate = { latitude: Number(latitude), longitude: Number(longitude) };
  if (!finiteCoordinate(coordinate)) return null;
  const type = element.type?.trim() || "element";
  const id = Number.isFinite(element.id) ? `${type}/${element.id}` : "";
  if (!id) return null;
  const name = element.tags?.name?.trim() || element.tags?.["name:fr"]?.trim() || element.tags?.["name:en"]?.trim();
  if (!name) return null;
  return { id, name, category: categoryFor(element.tags), coordinate };
}

function cacheKey(origin: GeoCoordinate, radiusMeters: number, categories: string[]): string {
  return [origin.latitude.toFixed(4), origin.longitude.toFixed(4), radiusMeters, [...categories].sort().join(",")].join("|");
}

function pruneCache(now: number): void {
  for (const [key, value] of cache) if (value.expiresAt <= now) cache.delete(key);
  while (cache.size > CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value as string);
}

export class ConfiguredOverpassNearbyProvider implements NearbyProvider {
  readonly id = "overpass-configured-v1";

  constructor(
    private readonly endpoint: string | null,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly ttlMs = DEFAULT_TTL_MS,
  ) {}

  async nearby(input: { origin: GeoTruth; categories: string[]; radiusMeters: number }): Promise<NearbyProviderResult> {
    if (!this.endpoint?.trim()) return { status: "unavailable", providerId: this.id, reason: "not_configured" };
    if (!finiteCoordinate(input.origin.coordinate) || input.origin.availability === "unavailable") {
      return { status: "unavailable", providerId: this.id, reason: "unsupported_origin" };
    }

    const radiusMeters = Math.max(100, Math.min(5_000, Math.round(input.radiusMeters)));
    const key = cacheKey(input.origin.coordinate, radiusMeters, input.categories);
    const now = Date.now();
    pruneCache(now);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > now) return cached.result;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_500);
    try {
      const body = new URLSearchParams({ data: buildQuery(input.origin.coordinate, radiusMeters, input.categories) }).toString();
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": "AkarFinder-LivingHere/1.0 (+https://akarfinder.ma)",
        },
        body,
      });
      if (!response.ok) return { status: "unavailable", providerId: this.id, reason: "upstream_error" };
      const payload = await response.json() as OverpassPayload;
      const pois = (payload.elements ?? []).map(parsePoi).filter((value): value is NearbyPoi => value != null).slice(0, 80);
      if (pois.length === 0) return { status: "unavailable", providerId: this.id, reason: "empty" };
      const fetchedAt = new Date(now).toISOString();
      const expiresAt = new Date(now + Math.min(this.ttlMs, 24 * 60 * 60 * 1000)).toISOString();
      const result: NearbyProviderResult = {
        status: "available",
        evidence: { providerId: this.id, attribution: "© OpenStreetMap contributors", fetchedAt, expiresAt },
        pois,
      };
      cache.set(key, { expiresAt: Date.parse(expiresAt), result });
      return result;
    } catch {
      return { status: "unavailable", providerId: this.id, reason: "upstream_error" };
    } finally {
      clearTimeout(timeout);
    }
  }
}
