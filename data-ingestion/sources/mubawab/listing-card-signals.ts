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

export function reviewCardSemantics(signal: ListingCardSignal): CardSemanticReview {
  const title = signal.title_text?.toLowerCase() ?? "";
  const candidates = new Set<string>();

  if (/\bappartement\b|\bstudio\b|\bduplex\b/i.test(title)) candidates.add("apartment");
  if (/\bvilla\b/i.test(title)) candidates.add("villa");
  if (/\bmaison\b/i.test(title) && !/\bvilla\b/i.test(title)) candidates.add("house");
  if (/\bterrain\b|\blot\b/i.test(title)) candidates.add("land");
  if (/\blocal\b|\bmagasin\b|\bcommerce\b|\bcommercial\b/i.test(title)) candidates.add("commercial");
  if (/\bbureau\b/i.test(title)) candidates.add("office");
  if (/\briad\b/i.test(title)) candidates.add("riad");

  return {
    ...signal,
    property_type_candidates: [...candidates],
    status: candidates.size === 1 ? "clear" : "ambiguous_or_unmapped",
  };
}
