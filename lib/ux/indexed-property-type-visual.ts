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

export function getIndexedPropertyTypeVisual(
  propertyType: string | null | undefined,
  title?: string | null,
): IndexedPropertyTypeVisual {
  const type = normalize(propertyType);
  const searchable = `${type} ${normalize(title)}`;

  // Presentation-only enrichment. Commercial comes first because upstream
  // listing taxonomy does not currently expose a dedicated Local commercial enum.
  if (/\b(local commercial|commerce|commercial|magasin|boutique|retail|shop)\b/.test(searchable)) {
    return VISUALS.commercial;
  }
  if (/\b(riad)\b/.test(searchable)) return VISUALS.riad;
  if (/\b(terrain|land|parcelle)\b/.test(searchable)) return VISUALS.land;
  if (/\b(bureau|office)\b/.test(searchable)) return VISUALS.office;
  if (/\b(villa|maison|house)\b/.test(searchable)) return VISUALS.villa;
  if (/\b(appartement|apartment|studio|duplex|penthouse)\b/.test(searchable)) return VISUALS.apartment;

  return VISUALS.unknown;
}

export const INDEXED_PROPERTY_TYPE_VISUALS = VISUALS;
