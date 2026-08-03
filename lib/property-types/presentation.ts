import type { ListingPropertyType } from "@/lib/listings/types";

// OPTION-A-PROPERTY-VISUALS-1 — canonical visual taxonomy shared by every public journey.
export type OptionAPropertyType =
  | "Appartement"
  | "Villa"
  | "Terrain"
  | "Studio"
  | "Riad"
  | "Bureau";

export type PropertyTypePresentation = {
  value: OptionAPropertyType;
  label: string;
  pluralLabel: string;
  description: string;
};

export const OPTION_A_PROPERTY_TYPES: readonly PropertyTypePresentation[] = [
  {
    value: "Appartement",
    label: "Appartement",
    pluralLabel: "Appartements",
    description: "Résidences et appartements urbains",
  },
  {
    value: "Villa",
    label: "Villa",
    pluralLabel: "Villas",
    description: "Villas contemporaines et maisons avec extérieur",
  },
  {
    value: "Terrain",
    label: "Terrain",
    pluralLabel: "Terrains",
    description: "Terrains constructibles et parcelles",
  },
  {
    value: "Studio",
    label: "Studio",
    pluralLabel: "Studios",
    description: "Petites surfaces et logements compacts",
  },
  {
    value: "Riad",
    label: "Riad",
    pluralLabel: "Riads",
    description: "Riads et demeures marocaines à patio",
  },
  {
    value: "Bureau",
    label: "Bureau",
    pluralLabel: "Bureaux",
    description: "Bureaux et espaces professionnels",
  },
] as const;

const ALL_LISTING_PROPERTY_TYPES: readonly ListingPropertyType[] = [
  "Appartement",
  "Villa",
  "Terrain",
  "Studio",
  "Riad",
  "Bureau",
  "Maison",
];

function normalizePropertyType(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function isListingPropertyType(value: unknown): value is ListingPropertyType {
  return typeof value === "string" && ALL_LISTING_PROPERTY_TYPES.includes(value as ListingPropertyType);
}

export function getOptionAPropertyType(value: string | null | undefined): OptionAPropertyType | null {
  if (!value) return null;
  const normalized = normalizePropertyType(value);

  if (normalized.includes("appartement") || normalized.includes("apartment")) return "Appartement";
  if (normalized.includes("villa")) return "Villa";
  if (normalized.includes("terrain") || normalized.includes("land")) return "Terrain";
  if (normalized.includes("studio") || normalized.includes("duplex") || normalized.includes("penthouse")) return "Studio";
  if (normalized.includes("riad")) return "Riad";
  if (normalized.includes("bureau") || normalized.includes("office")) return "Bureau";
  return null;
}

export function getPropertyTypePresentation(
  value: string | null | undefined,
): PropertyTypePresentation | null {
  const optionAType = getOptionAPropertyType(value);
  if (!optionAType) return null;
  return OPTION_A_PROPERTY_TYPES.find((item) => item.value === optionAType) ?? null;
}
