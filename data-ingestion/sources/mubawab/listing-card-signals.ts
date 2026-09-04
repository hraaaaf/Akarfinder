import { load, type Cheerio } from "cheerio";
import type { AnyNode } from "domhandler";

export type ListingCardSignal = {
  source_id: string;
  detail_family: "a" | "pa";
  url: string;
  route_url: string;
  title_text: string | null;
  card_text: string | null;
};

export type CardSemanticReview = ListingCardSignal & {
  property_type_candidates: string[];
  status: "clear" | "ambiguous_or_unmapped";
};

const DETAIL_RE = /\/fr\/(a|pa)\/(\d+)(?:\/[^?#\s"']*)?/i;

function clean(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized ? normalized : null;
}

function chooseCardContainer($: ReturnType<typeof load>, anchor: Cheerio<AnyNode>): Cheerio<AnyNode> {
  let node = anchor;
  let fallback = anchor.parent();

  for (let depth = 0; depth < 7; depth++) {
    const parent = node.parent();
    if (!parent.length) break;
    fallback = parent;
    const text = clean(parent.text());
    if (text && text.length >= 40 && text.length <= 1800) return parent;
    node = parent;
  }

  return fallback;
}

function inferTitle($: ReturnType<typeof load>, anchor: Cheerio<AnyNode>, card: Cheerio<AnyNode>): string | null {
  const candidates = [
    clean(anchor.attr("title")),
    clean(anchor.text()),
    clean(card.find("h1,h2,h3,h4").first().text()),
    clean(card.find('[class*="title"], [class*="Title"]').first().text()),
  ];

  return candidates.find((value) => value && value.length >= 4 && value.length <= 220) ?? null;
}

export function extractListingCardSignals(html: string, routeUrl: string): ListingCardSignal[] {
  const $ = load(html);
  const byId = new Map<string, ListingCardSignal>();

  $("a[href]").each((_, element) => {
    const anchor = $(element);
    const href = anchor.attr("href");
    if (!href) return;
    const match = href.match(DETAIL_RE);
    if (!match) return;

    const sourceId = match[2];
    if (byId.has(sourceId)) return;

    const card = chooseCardContainer($, anchor);
    const title = inferTitle($, anchor, card);
    const rawCard = clean(card.text());

    byId.set(sourceId, {
      source_id: sourceId,
      detail_family: match[1].toLowerCase() as "a" | "pa",
      url: new URL(href, routeUrl).toString(),
      route_url: routeUrl,
      title_text: title,
      card_text: rawCard ? rawCard.slice(0, 1200) : null,
    });
  });

  return [...byId.values()];
}

function explicitWholePropertyCandidates(text: string): Set<string> {
  const candidates = new Set<string>();
  if (/\bappartement\b|\bappart\b|\bapartement\b|\bapartment\b|\bstudio\b|\bduplex\b/i.test(text)) candidates.add("apartment");
  if (/\bvilla\b/i.test(text)) candidates.add("villa");
  if (/\bmaison\b/i.test(text) && !/\bvilla\b/i.test(text)) candidates.add("house");
  if (/\bterrain\b|\blot\b|\bparcelle\b/i.test(text)) candidates.add("land");
  if (/\blocal\b|\bmagasin\b|\bcommerce\b|\bcommercial\b/i.test(text)) candidates.add("commercial");
  if (/\bbureau\b/i.test(text)) candidates.add("office");
  if (/\briad\b/i.test(text)) candidates.add("riad");
  return candidates;
}

export function reviewCardSemantics(signal: ListingCardSignal): CardSemanticReview {
  const title = signal.title_text?.toLowerCase() ?? "";
  const card = signal.card_text?.toLowerCase() ?? "";

  // A room/colocation offer is a genuine modelling ambiguity: the underlying
  // property may be an apartment, but the advertised object is not the whole unit.
  if (/\bchambre\b|\bcolocation\b|\bco[- ]?location\b/i.test(title)) {
    const underlying = explicitWholePropertyCandidates(card);
    return {
      ...signal,
      property_type_candidates: [...underlying, "room_or_colocation"],
      status: "ambiguous_or_unmapped",
    };
  }

  // Prefer an explicit type in the title. This prevents place names such as
  // "Riad El Oulfa" from creating a second false property-type candidate.
  const titleCandidates = explicitWholePropertyCandidates(title);
  if (titleCandidates.has("apartment")) {
    return { ...signal, property_type_candidates: ["apartment"], status: "clear" };
  }
  if (titleCandidates.size === 1) {
    return { ...signal, property_type_candidates: [...titleCandidates], status: "clear" };
  }
  if (titleCandidates.size > 1) {
    return { ...signal, property_type_candidates: [...titleCandidates], status: "ambiguous_or_unmapped" };
  }

  // If the title is vague, the visible card description may still explicitly
  // identify the whole-property type. This remains page-level evidence only.
  const cardCandidates = explicitWholePropertyCandidates(card);
  if (cardCandidates.size === 1) {
    return { ...signal, property_type_candidates: [...cardCandidates], status: "clear" };
  }

  return {
    ...signal,
    property_type_candidates: [...cardCandidates],
    status: "ambiguous_or_unmapped",
  };
}
