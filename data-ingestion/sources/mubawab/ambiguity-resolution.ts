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

function hasExplicitRoomOfferWording(text: string): boolean {
  if (/\bcoloc(?:ation)?\b|\bco[- ]?location\b/i.test(text)) return true;
  if (/^(?:loue[rz]?\s+|location\s+)?(?:une\s+)?chambre\b/i.test(text.trim())) return true;
  if (/\bchambre\b[^.]{0,80}\b(?:à\s+louer|a\s+louer|louer|location|meubl[ée]e?\s+pour|pour\s+(?:fille|gar[çc]on|étudiant|etudiant))\b/i.test(text)) return true;
  if (/\b(?:loue|louer|location)\b[^.]{0,60}\b(?:une\s+)?chambre\b/i.test(text)) return true;
  return false;
}

function isExplicitRoomScopedOffer(title: string, description: string): boolean {
  // Keep the fields isolated. "Appartement à louer" in the title plus
  // "1 chambre" in the description is a whole-apartment listing, not a room offer.
  return hasExplicitRoomOfferWording(title) || hasExplicitRoomOfferWording(description);
}

export function resolveDetailSemanticEvidence(input: {
  extractedPropertyType?: string | null;
  extractedTransaction?: ResolvedTransaction | null;
  title?: string | null;
  description?: string | null;
}): DetailSemanticResolution {
  const title = (input.title ?? "").replace(/\s+/g, " ").trim();
  const description = (input.description ?? "").replace(/\s+/g, " ").trim();
  const text = `${title} ${description}`.trim();
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

  const roomScoped = isExplicitRoomScopedOffer(title, description);
  const offerScope: ResolvedOfferScope = roomScoped ? "room" : "whole_property";
  if (roomScoped) evidence.push("room_scope_from_detail_text");

  // Human precedent #1: an explicit room/colocation offer whose physical
  // dwelling is an apartment remains an apartment with offer_scope=room.
  const apartmentMentioned = /\bappartement\b|\bappart\b|\bapartement\b|\bapartment\b/i.test(text);
  const precedentProperty = !propertyType && roomScoped && apartmentMentioned
    ? "apartment" as const
    : propertyType;
  if (roomScoped && precedentProperty === "apartment") {
    evidence.push("human_precedent_1_room_in_apartment");
  }

  return {
    clear: precedentProperty != null && transaction != null,
    property_type: precedentProperty,
    transaction_type: transaction,
    offer_scope: offerScope,
    evidence,
  };
}
