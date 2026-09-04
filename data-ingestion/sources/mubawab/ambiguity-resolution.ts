export type AmbiguityResolutionStep = "classify_from_card" | "inspect_allowed_detail" | "human_review";
export type ResolvedPropertyType = "apartment" | "villa" | "house" | "land" | "office" | "commercial" | "riad";
export type ResolvedTransaction = "sale" | "rent";
export type ResolvedOfferScope = "whole_property" | "room";

export type DetailSemanticResolution = {
  clear: boolean;
  property_type: ResolvedPropertyType | null;
  transaction_type: ResolvedTransaction | null;
  offer_scope: ResolvedOfferScope;
  evidence: string[];
};

export function nextAmbiguityResolutionStep(input: {
  cardClear: boolean;
  detailRobotsAllowed: boolean;
  detailClear?: boolean;
}): AmbiguityResolutionStep {
  if (input.cardClear) return "classify_from_card";
  if (input.detailClear === true) return "classify_from_card";
  if (input.detailClear === false) return "human_review";
  if (input.detailRobotsAllowed) return "inspect_allowed_detail";
  return "human_review";
}

function propertyTypeFromText(text: string): ResolvedPropertyType | null {
  const candidates = new Set<ResolvedPropertyType>();
  if (/\bappartement\b|\bappart\b|\bapartement\b|\bapartment\b|\bstudio\b|\bduplex\b/i.test(text)) candidates.add("apartment");
  if (/\bvilla\b/i.test(text)) candidates.add("villa");
  if (/\bmaison\b/i.test(text) && !/\bvilla\b/i.test(text)) candidates.add("house");
  if (/\bterrain\b|\blot\b|\bparcelle\b/i.test(text)) candidates.add("land");
  if (/\bbureau\b/i.test(text)) candidates.add("office");
  if (/\blocal\b|\bmagasin\b|\bcommerce\b|\bcommercial\b/i.test(text)) candidates.add("commercial");
  if (/\briad\b/i.test(text)) candidates.add("riad");
  return candidates.size === 1 ? [...candidates][0] : null;
}

function transactionFromText(text: string): ResolvedTransaction | null {
  const sale = /(?:à|a)\s+vendre|(?:à|a)\s+la\s+vente|\ben\s+vente\b|\bvente\b|\bacheter\b|\bachat\b/i.test(text);
  const rent = /(?:à|a)\s+louer|(?:à|a)\s+la\s+location|\ben\s+location\b|\blocation\b|\bloyer\b/i.test(text);
  if (sale === rent) return null;
  return sale ? "sale" : "rent";
}

export function resolveDetailSemanticEvidence(input: {
  extractedPropertyType?: string | null;
  extractedTransaction?: ResolvedTransaction | null;
  title?: string | null;
  description?: string | null;
}): DetailSemanticResolution {
  const text = `${input.title ?? ""} ${input.description ?? ""}`.replace(/\s+/g, " ").trim();
  const evidence: string[] = [];

  const knownExtracted = input.extractedPropertyType && input.extractedPropertyType !== "unknown"
    ? input.extractedPropertyType as ResolvedPropertyType
    : null;
  const textPropertyType = knownExtracted ? null : propertyTypeFromText(text);
  const propertyType = knownExtracted ?? textPropertyType;
  if (knownExtracted) evidence.push("property_type_from_detail_extractor");
  else if (textPropertyType) evidence.push("property_type_from_detail_text");

  const transaction = input.extractedTransaction ?? transactionFromText(text);
  if (input.extractedTransaction) evidence.push("transaction_from_detail_extractor");
  else if (transaction) evidence.push("transaction_from_detail_text");

  const roomScoped = /\bchambre\b|\bcolocation\b|\bco[- ]?location\b/i.test(text);
  const offerScope: ResolvedOfferScope = roomScoped ? "room" : "whole_property";
  if (roomScoped) evidence.push("room_scope_from_detail_text");

  // Human precedent #1: explicit room/colocation inside an apartment remains
  // an apartment property with a room-scoped offer.
  const precedentProperty = !propertyType && roomScoped && /\bappartement\b|\bappart\b|\bapartement\b|\bapartment\b/i.test(text)
    ? "apartment" as const
    : propertyType;
  if (precedentProperty === "apartment" && !propertyType && roomScoped) evidence.push("human_precedent_1_room_in_apartment");

  return {
    clear: precedentProperty != null && transaction != null,
    property_type: precedentProperty,
    transaction_type: transaction,
    offer_scope: offerScope,
    evidence,
  };
}
