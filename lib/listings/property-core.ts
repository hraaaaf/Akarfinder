import type { Listing } from "@/lib/listings/types";

export type PropertyCoreFactKey = "surface" | "bedrooms" | "bathrooms" | "garage";

export type PropertyCoreFact = {
  key: PropertyCoreFactKey;
  label: string;
  value: string;
};

export type PropertyCoreModel = {
  transactionLabel: "Vente" | "Location" | "Neuf";
  propertyType: Listing["property_type"];
  priceLabel: string;
  priceAvailable: boolean;
  title: string;
  location: string;
  facts: PropertyCoreFact[];
};

function formatInteger(value: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
}

function positiveFinite(value: number | null | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

function transactionLabel(type: Listing["transaction_type"]): PropertyCoreModel["transactionLabel"] {
  if (type === "rent") return "Location";
  if (type === "new") return "Neuf";
  return "Vente";
}

function locationLabel(listing: Listing): string {
  const neighborhood = listing.neighborhood.trim();
  const city = listing.city.trim();
  if (neighborhood && city && neighborhood.toLocaleLowerCase("fr") !== city.toLocaleLowerCase("fr")) {
    return `${neighborhood}, ${city}`;
  }
  return neighborhood || city || "Localisation non renseignée";
}

export function buildPropertyCoreModel(listing: Listing): PropertyCoreModel {
  const priceAvailable = positiveFinite(listing.price);
  const facts: PropertyCoreFact[] = [];

  if (positiveFinite(listing.surface_m2)) {
    facts.push({ key: "surface", label: "Surface", value: `${formatInteger(listing.surface_m2)} m²` });
  }
  if (positiveFinite(listing.bedrooms)) {
    facts.push({ key: "bedrooms", label: "Chambres", value: formatInteger(listing.bedrooms) });
  }
  if (positiveFinite(listing.bathrooms)) {
    facts.push({ key: "bathrooms", label: "Salles de bain", value: formatInteger(listing.bathrooms) });
  }
  if (positiveFinite(listing.garage_spaces)) {
    facts.push({
      key: "garage",
      label: "Garage",
      value: `${formatInteger(listing.garage_spaces)} place${listing.garage_spaces === 1 ? "" : "s"}`,
    });
  }

  return {
    transactionLabel: transactionLabel(listing.transaction_type),
    propertyType: listing.property_type,
    priceLabel: priceAvailable ? `${formatInteger(listing.price)} ${listing.currency}` : "Prix non communiqué",
    priceAvailable,
    title: listing.title.trim() || "Annonce immobilière",
    location: locationLabel(listing),
    facts,
  };
}
