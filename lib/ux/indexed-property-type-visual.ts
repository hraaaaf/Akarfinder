export type IndexedPropertyVisualKey =
  | "apartment"
  | "villa"
  | "land"
  | "office"
  | "commercial"
  | "riad"
  | "unknown";

export type IndexedPropertyTypeVisual = {
  key: IndexedPropertyVisualKey;
  label: string;
  accent: string;
  foreground: string;
  wash: string;
};

const VISUALS: Record<IndexedPropertyVisualKey, IndexedPropertyTypeVisual> = {
  apartment: {
    key: "apartment",
    label: "Appartement",
    accent: "#1769E0",
    foreground: "#1769E0",
    wash: "#F6FAFF",
  },
  villa: {
    key: "villa",
    label: "Villa",
    accent: "#16843A",
    foreground: "#16843A",
    wash: "#F6FBF7",
  },
  land: {
    key: "land",
    label: "Terrain",
    accent: "#EA6A00",
    foreground: "#EA6A00",
    wash: "#FFF9F4",
  },
  office: {
    key: "office",
    label: "Bureau",
    accent: "#7352C7",
    foreground: "#7352C7",
    wash: "#FAF8FF",
  },
  commercial: {
    key: "commercial",
    label: "Local commercial",
    accent: "#008CA3",
    foreground: "#008CA3",
    wash: "#F4FBFC",
  },
  riad: {
    key: "riad",
    label: "Riad",
    accent: "#B98213",
    foreground: "#B98213",
    wash: "#FFFBF3",
  },
  unknown: {
    key: "unknown",
    label: "Bien",
    accent: "#2F63A4",
    foreground: "#2F63A4",
    wash: "#F7FAFD",
  },
};

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

const COMMERCIAL_TYPE = /\b(local commercial|commerce|commercial|magasin|boutique|retail|shop)\b/;
const COMMERCIAL_TITLE_ALIAS = /\b(local commercial|commerce|magasin|boutique|retail|shop)\b/;

export function getIndexedPropertyTypeVisual(
  propertyType: string | null | undefined,
  title?: string | null,
): IndexedPropertyTypeVisual {
  const type = normalize(propertyType);
  const titleText = normalize(title);

  // Explicit métier type wins over incidental words in the title. The sole
  // enrichment exception is Bureau -> Local commercial because the current
  // upstream enum has no dedicated commercial type yet.
  if (COMMERCIAL_TYPE.test(type)) return VISUALS.commercial;
  if (/\b(riad)\b/.test(type)) return VISUALS.riad;
  if (/\b(terrain|land|parcelle)\b/.test(type)) return VISUALS.land;
  if (/\b(bureau|office)\b/.test(type)) {
    return COMMERCIAL_TITLE_ALIAS.test(titleText) ? VISUALS.commercial : VISUALS.office;
  }
  if (/\b(villa|maison|house)\b/.test(type)) return VISUALS.villa;
  if (/\b(appartement|apartment|studio|duplex|penthouse)\b/.test(type)) return VISUALS.apartment;

  // Safe presentation fallback only when the métier type itself is unknown.
  if (COMMERCIAL_TITLE_ALIAS.test(titleText)) return VISUALS.commercial;
  if (/\b(riad)\b/.test(titleText)) return VISUALS.riad;
  if (/\b(terrain|land|parcelle)\b/.test(titleText)) return VISUALS.land;
  if (/\b(bureau|office)\b/.test(titleText)) return VISUALS.office;
  if (/\b(villa|maison|house)\b/.test(titleText)) return VISUALS.villa;
  if (/\b(appartement|apartment|studio|duplex|penthouse)\b/.test(titleText)) return VISUALS.apartment;

  return VISUALS.unknown;
}

export const INDEXED_PROPERTY_TYPE_VISUALS = VISUALS;
