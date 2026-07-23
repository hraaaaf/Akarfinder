export const PROFESSIONAL_ACTIVATION_REQUEST_VERSION = "1.0" as const;

export type ProfessionalRequestType = "agency" | "promoter" | "exhibitor";

export type ProfessionalActivationRequestInput = {
  requestedType?: unknown;
  companyName?: unknown;
  city?: unknown;
  requestedAddons?: unknown;
};

export type PreparedProfessionalActivationRequest = {
  requested_type: ProfessionalRequestType;
  company_name: string;
  city: string | null;
  requested_addons: string[];
};

const TYPE_ALIASES: Record<string, ProfessionalRequestType> = {
  agence: "agency",
  agency: "agency",
  promoteur: "promoter",
  promoter: "promoter",
  exposant: "exhibitor",
  exhibitor: "exhibitor",
};

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, max) : null;
}

export function prepareProfessionalActivationRequest(
  input: ProfessionalActivationRequestInput,
): PreparedProfessionalActivationRequest | null {
  const rawType = cleanText(input.requestedType, 40)?.toLocaleLowerCase("fr");
  const requestedType = rawType ? TYPE_ALIASES[rawType] : null;
  const companyName = cleanText(input.companyName, 160);
  if (!requestedType || !companyName) return null;

  const addons = Array.isArray(input.requestedAddons)
    ? [...new Set(input.requestedAddons.map((item) => cleanText(item, 60)).filter((item): item is string => Boolean(item)))].slice(0, 10)
    : [];

  return {
    requested_type: requestedType,
    company_name: companyName,
    city: cleanText(input.city, 120),
    requested_addons: addons,
  };
}
