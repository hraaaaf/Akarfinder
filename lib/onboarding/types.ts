export type ProjectType = "acheter" | "louer" | "neuf" | "investir" | "mre";
export type PropertyType = "appartement" | "villa" | "terrain" | "studio" | "bureau" | "maison";
export type TimingType = "urgent" | "1-3mois" | "3-6mois" | "veille";
export type LeadTemperature = "chaud" | "tiède" | "froid";
export type MRECurrency = "MAD" | "EUR" | "USD" | "GBP" | "CAD" | "SAR" | "AED";
export type PropertyCondition = "neuf" | "ancien" | "peu-importe";

export type BuyerProfile = {
  // Step 1 — Projet
  project?: ProjectType;
  // Step 2 — Zone
  city?: string;
  neighborhood?: string;
  acceptedZones?: string;
  // Step 3 — Budget
  budgetTotal?: number;
  apport?: number;
  needsCredit?: boolean;
  monthlyCible?: number;
  currency?: MRECurrency;
  // Step 4 — Bien
  propertyType?: PropertyType;
  surface?: number;
  bedrooms?: number;
  condition?: PropertyCondition;
  // Step 5 — Timing
  timing?: TimingType;
  // Step 6 — Contact
  name?: string;
  phone?: string;
  country?: string;
  message?: string;
  consentContact?: boolean;
  consentIndicatif?: boolean;
};

export type LeadTemperatureResult = {
  temperature: LeadTemperature;
  label: string;
  reason: string;
  color: "emerald" | "amber" | "slate";
};
