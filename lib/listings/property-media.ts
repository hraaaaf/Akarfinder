import {
  canDisplayGallery,
  canDisplayRealImage,
  getImageAttribution,
  getListingImageMode,
} from "@/lib/listings/image-policy";
import type { Listing } from "@/lib/listings/types";

export type PropertyMediaKind = "real" | "provider_preview";

export type PropertyMediaItem = {
  id: string;
  url: string;
  alt: string;
  attribution: string | null;
  kind: PropertyMediaKind;
};

export type PropertyMediaModel = {
  mode: "gallery" | "single_real" | "provider_preview" | "fallback";
  items: PropertyMediaItem[];
  count: number;
  galleryAllowed: boolean;
  attribution: string | null;
};

export function isSafePropertyMediaUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return !trimmed.startsWith("//");
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function uniqueSafeUrls(values: unknown[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!isSafePropertyMediaUrl(value)) continue;
    const normalized = value.trim();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

export function buildPropertyMediaModel(listing: Listing): PropertyMediaModel {
  const attribution = getImageAttribution(listing);

  if (canDisplayGallery(listing) && listing.can_show_gallery === true) {
    const urls = uniqueSafeUrls([
      listing.main_image_url,
      ...(listing.gallery_image_urls ?? []),
    ]);
    if (urls.length >= 2) {
      const items = urls.map((url, index) => ({
        id: `real-${index}`,
        url,
        alt: `${listing.title} — photo ${index + 1}`,
        attribution,
        kind: "real" as const,
      }));
      return {
        mode: "gallery",
        items,
        count: items.length,
        galleryAllowed: true,
        attribution,
      };
    }
  }

  if (canDisplayRealImage(listing) && isSafePropertyMediaUrl(listing.main_image_url)) {
    return {
      mode: "single_real",
      items: [{
        id: "real-0",
        url: listing.main_image_url.trim(),
        alt: listing.title,
        attribution,
        kind: "real",
      }],
      count: 1,
      galleryAllowed: false,
      attribution,
    };
  }

  if (getListingImageMode(listing) === "db_provider_thumbnail" && isSafePropertyMediaUrl(listing.thumbnail_url)) {
    return {
      mode: "provider_preview",
      items: [{
        id: "provider-preview-0",
        url: listing.thumbnail_url.trim(),
        alt: `${listing.title} — aperçu fourni par la source`,
        attribution,
        kind: "provider_preview",
      }],
      count: 1,
      galleryAllowed: false,
      attribution,
    };
  }

  return {
    mode: "fallback",
    items: [],
    count: 0,
    galleryAllowed: false,
    attribution: null,
  };
}
