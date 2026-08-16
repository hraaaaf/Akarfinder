import type {
  GeoCoordinate,
  GeoProviderEvidence,
  NearbyPoi,
  NearbyProvider,
  NearbyProviderResult,
} from "@/lib/geo/provider-contracts";

const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
const DEFAULT_EVIDENCE_TTL_MS = 60 * 60 * 1000;

const CATEGORY_SELECTORS: Record<string, string[]> = {
  education: [
    '[amenity~"^(school|kindergarten|college|university)$"]',
  ],
  groceries: [
    '[shop~"^(supermarket|convenience|greengrocer|grocery)$"]',
    '[amenity="marketplace"]',
  ],
  health: [
    '[amenity~"^(pharmacy|clinic|hospital|doctors)$"]',
  ],
  transport: [
    '[highway="bus_stop"]',
    '[public_transport~"^(platform|station)$"]',
    '[railway~"^(station|halt|tram_stop)$"]',
  ],
  food: [
    '[amenity~"^(cafe|restaurant|fast_food)$"]',
  ],
  green_sport: [
    '[leisure~"^(park|playground|fitness_centre|sports_centre|pitch)$"]',
  ],
  worship: [
    '[amenity="place_of_worship"][religion="muslim"]',
  ],
  banking: [
    '[amenity~"^(bank|atm)$"]',
  ],
  parking: [
    '[amenity="parking"]',
  ],
  shopping: [
    '[shop~"^(mall|department_store)$"]',
  ],
  coast: [
    '[natural="beach"]',
  ],
};

type OverpassElement = {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

type OverpassResponse = { elements?: OverpassElement[] };

type FetchLike = typeof fetch;

export type OverpassNearbyProviderOptions = {
  endpoint: string;
  fetchImpl?: FetchLike;
  evidenceTtlMs?: number;
  attribution?: string;
};

function finiteCoordinate(latitude: unknown, longitude: unknown): GeoCoordinate | null {
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function elementCoordinate(element: OverpassElement): GeoCoordinate | null {
  return finiteCoordinate(element.lat ?? element.center?.lat, element.lon ?? element.center?.lon);
}

function providerCategory(tags: Record<string, string>): string {
  if (tags.amenity) {
    if (tags.amenity === "place_of_worship" && tags.religion === "muslim") return "mosque";
    return tags.amenity;
  }
  if (tags.shop) return tags.shop;
  if (tags.public_transport) return `public_transport_${tags.public_transport}`;
  if (tags.railway) return `railway_${tags.railway}`;
  if (tags.highway === "bus_stop") return "bus_stop";
  if (tags.leisure) return tags.leisure;
  if (tags.natural === "beach") return "beach";
  return "other";
}

function buildOverpassQuery(origin: GeoCoordinate, categories: string[], radiusMeters: number): string | null {
  const selectors = Array.from(
    new Set(categories.flatMap((category) => CATEGORY_SELECTORS[category] ?? [])),
  );
  if (selectors.length === 0) return null;

  const radius = Math.max(50, Math.min(Math.round(radiusMeters), 10_000));
  const around = `(around:${radius},${origin.latitude},${origin.longitude})`;
  const clauses = selectors.map((selector) => `nwr${selector}${around};`).join("\n");
  return `[out:json][timeout:20];(\n${clauses}\n);out center tags;`;
}

function evidence(
  providerId: string,
  attribution: string,
  ttlMs: number,
  now: Date,
): GeoProviderEvidence {
  return {
    providerId,
    attribution,
    fetchedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + Math.min(Math.max(ttlMs, 1), 86_400_000)).toISOString(),
  };
}

export class OverpassNearbyProvider implements NearbyProvider {
  readonly id = "overpass";
  private readonly endpoint: string;
  private readonly fetchImpl: FetchLike;
  private readonly evidenceTtlMs: number;
  private readonly attribution: string;

  constructor(options: OverpassNearbyProviderOptions) {
    this.endpoint = options.endpoint.trim();
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.evidenceTtlMs = options.evidenceTtlMs ?? DEFAULT_EVIDENCE_TTL_MS;
    this.attribution = options.attribution?.trim() || OSM_ATTRIBUTION;
  }

  async nearby(input: {
    origin: { coordinate: GeoCoordinate | null };
    categories: string[];
    radiusMeters: number;
  }): Promise<NearbyProviderResult> {
    if (!this.endpoint) {
      return { status: "unavailable", providerId: this.id, reason: "not_configured" };
    }
    if (!input.origin.coordinate) {
      return { status: "unavailable", providerId: this.id, reason: "unsupported_origin" };
    }

    const query = buildOverpassQuery(input.origin.coordinate, input.categories, input.radiusMeters);
    if (!query) {
      return { status: "unavailable", providerId: this.id, reason: "empty" };
    }

    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          accept: "application/json",
        },
        body: `data=${encodeURIComponent(query)}`,
        cache: "no-store",
      });
      if (!response.ok) {
        return { status: "unavailable", providerId: this.id, reason: "upstream_error" };
      }

      const payload = (await response.json()) as OverpassResponse;
      const pois: NearbyPoi[] = [];
      for (const element of payload.elements ?? []) {
        const coordinate = elementCoordinate(element);
        const tags = element.tags ?? {};
        const name = (tags.name ?? tags["name:fr"] ?? tags["name:ar"] ?? "").trim();
        if (!coordinate || !name || !element.type || !Number.isFinite(element.id)) continue;
        pois.push({
          id: `osm:${element.type}:${element.id}`,
          name,
          category: providerCategory(tags),
          coordinate,
        });
      }

      if (pois.length === 0) {
        return { status: "unavailable", providerId: this.id, reason: "empty" };
      }

      const now = new Date();
      return {
        status: "available",
        evidence: evidence(this.id, this.attribution, this.evidenceTtlMs, now),
        pois,
      };
    } catch {
      return { status: "unavailable", providerId: this.id, reason: "upstream_error" };
    }
  }
}
