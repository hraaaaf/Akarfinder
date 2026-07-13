import { createHash } from "node:crypto";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "yclid",
]);

const PHONE_RE = /(\+212|0[5-7])[\s.-]?\d(?:[\s.-]?\d){7,}/g;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const WHATSAPP_RE = /\b(?:whatsapp|wa\.me)\b/gi;
const SECRET_RE = /\b(?:bearer|token|apikey|api_key|authorization|cookie)\b/gi;

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, "");
}

export function canonicalizeSourceUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    url.protocol = "https:";
    url.hostname = normalizeHostname(url.hostname);
    url.hash = "";

    const kept = [...url.searchParams.entries()]
      .filter(([key]) => !TRACKING_PARAMS.has(key.toLowerCase()))
      .sort(([a], [b]) => a.localeCompare(b));

    url.search = "";
    for (const [key, value] of kept) {
      url.searchParams.append(key, value);
    }

    let pathname = url.pathname.replace(/\/{2,}/g, "/");
    if (pathname.length > 1) pathname = pathname.replace(/\/+$/, "");
    url.pathname = pathname || "/";

    return url.toString();
  } catch {
    return null;
  }
}

export function extractDomain(input: string): string | null {
  try {
    return normalizeHostname(new URL(input).hostname);
  } catch {
    return null;
  }
}

export function redactSensitiveText(value: string | null | undefined): {
  value: string | null;
  phone_hits: number;
  whatsapp_hits: number;
  personal_email_hits: number;
  secret_hits: number;
} {
  if (!value?.trim()) {
    return {
      value: null,
      phone_hits: 0,
      whatsapp_hits: 0,
      personal_email_hits: 0,
      secret_hits: 0,
    };
  }

  const phoneHits = (value.match(PHONE_RE) ?? []).length;
  const whatsappHits = (value.match(WHATSAPP_RE) ?? []).length;
  const emailHits = (value.match(EMAIL_RE) ?? []).length;
  const secretHits = (value.match(SECRET_RE) ?? []).length;

  const cleaned = value
    .replace(PHONE_RE, "")
    .replace(WHATSAPP_RE, "")
    .replace(EMAIL_RE, "")
    .replace(/\s+/g, " ")
    .trim();

  return {
    value: cleaned.length > 0 ? cleaned : null,
    phone_hits: phoneHits,
    whatsapp_hits: whatsappHits,
    personal_email_hits: emailHits,
    secret_hits: secretHits,
  };
}

export function scoreCompleteness(input: {
  title: string;
  city: string | null;
  district: string | null;
  transaction_type: string | null;
  property_type: string | null;
  price_mad: number | null;
  surface_m2: number | null;
  bedrooms_count: number | null;
  short_description: string | null;
}): number {
  let score = 0;
  if (input.title) score += 20;
  if (input.city) score += 12;
  if (input.district) score += 8;
  if (input.transaction_type) score += 10;
  if (input.property_type) score += 10;
  if (input.price_mad) score += 15;
  if (input.surface_m2) score += 15;
  if (input.bedrooms_count != null) score += 5;
  if (input.short_description) score += 5;
  return Math.min(score, 100);
}

export function parseBedrooms(text: string): number | null {
  const normalized = normalizeText(text);
  const match = normalized.match(/(\d{1,2})\s*(?:chambres?|bedrooms?|pieces?)/);
  if (!match?.[1]) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parsePriceMad(text: string): number | null {
  const normalized = normalizeText(text);
  const candidates = [
    ...normalized.matchAll(/(\d[\d\s.,]{3,})\s*(?:dh|mad)\b/g),
    ...normalized.matchAll(/\b(?:dh|mad)\s*(\d[\d\s.,]{3,})/g),
  ];

  for (const candidate of candidates) {
    const raw = candidate[1]?.replace(/\s+/g, "").replace(/,/g, ".");
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isFinite(parsed) && parsed >= 1000) return Math.round(parsed);
  }
  return null;
}

export function parseSurfaceM2(text: string): number | null {
  const normalized = normalizeText(text);
  const match = normalized.match(/(\d[\d\s.,]{1,})\s*(?:m2|sqm)\b/);
  if (!match?.[1]) return null;
  const parsed = Number(match[1].replace(/\s+/g, "").replace(/,/g, "."));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

export function toPropertyType(value: string | undefined): "apartment" | "villa" | "studio" | "house" | "land" | "office" | "commercial" | null {
  if (!value) return null;
  const normalized = normalizeText(value);
  if (normalized.includes("studio")) return "studio";
  if (normalized.includes("villa")) return "villa";
  if (normalized.includes("terrain") || normalized.includes("land")) return "land";
  if (normalized.includes("bureau") || normalized.includes("office")) return "office";
  if (normalized.includes("local commercial") || normalized.includes("commercial")) return "commercial";
  if (normalized.includes("maison") || normalized.includes("house")) return "house";
  if (normalized.includes("appartement") || normalized.includes("apartment") || normalized.includes("flat")) return "apartment";
  return null;
}

export function toTransactionType(value: string | undefined): "sale" | "rent" | null {
  if (!value) return null;
  const normalized = normalizeText(value);
  if (
    normalized.includes("a vendre") ||
    normalized.includes("vente") ||
    normalized.includes("for sale")
  ) {
    return "sale";
  }
  if (
    normalized.includes("a louer") ||
    normalized.includes("location") ||
    normalized.includes("for rent")
  ) {
    return "rent";
  }
  return null;
}
