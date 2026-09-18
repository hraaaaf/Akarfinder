import * as cheerio from 'cheerio';

export type PricePeriod = 'sale_total' | 'month' | 'night' | 'unknown';
export type PriceStatus = 'available' | 'not_disclosed' | 'unknown';
export type PriceEvidence = {
  currentPriceMad: number | null;
  oldPriceMad: number | null;
  pricePerM2Mad: number | null;
  period: PricePeriod;
  priceStatus: PriceStatus;
  currency: 'MAD' | null;
  confidence: 'high' | 'medium' | 'none';
  evidence: string | null;
  rejected: string[];
};

const WS = /\s+/g;
const MONEY = /(\d{1,3}(?:[\s,.]\d{3})+|\d{3,9})\s*(?:DH|DHS|MAD|dirhams?)/gi;
const PER_M2 = /(\d{1,6}(?:[\s,.]\d{3})?)\s*(?:DH|DHS|MAD|dirhams?)\s*(?:\/|par)\s*m(?:²|2)/gi;

function normalizeText(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(WS, ' ').trim();
}

function parseAmount(raw: string): number | null {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isFinite(n) ? n : null;
}

function plausible(amount: number, intent: string | null, period: PricePeriod): boolean {
  if (period === 'night') return amount >= 100 && amount <= 100_000;
  if (intent === 'rent' || period === 'month') return amount >= 500 && amount <= 500_000;
  if (intent === 'sale' || period === 'sale_total') return amount >= 50_000 && amount <= 500_000_000;
  return amount >= 500 && amount <= 500_000_000;
}

function detectPeriod(text: string, intent: string | null): PricePeriod {
  const t = text.toLowerCase();
  if (/\b(par\s+)?(nuit|nuitée|night|jour|journée|day)\b/.test(t)) return 'night';
  if (/\b(par\s+)?(mois|mensuel|mensuelle|month|monthly)\b/.test(t) || /\/\s*mois\b/.test(t)) return 'month';
  if (intent === 'sale') return 'sale_total';
  if (intent === 'rent') return 'month';
  return 'unknown';
}

function jsonLdPrice($: cheerio.CheerioAPI, intent: string | null): { value: number; evidence: string } | null {
  for (const node of $('script[type="application/ld+json"]').toArray()) {
    try {
      const parsed = JSON.parse($(node).text());
      const stack = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (stack.length) {
        const item = stack.pop();
        if (!item || typeof item !== 'object') continue;
        const offers = (item as Record<string, unknown>).offers;
        if (offers && typeof offers === 'object') {
          const price = (offers as Record<string, unknown>).price;
          const currency = String((offers as Record<string, unknown>).priceCurrency ?? '').toUpperCase();
          const value = parseAmount(String(price ?? ''));
          if (value && (!currency || currency === 'MAD') && plausible(value, intent, intent === 'sale' ? 'sale_total' : 'month')) {
            return { value, evidence: `jsonld:offers.price=${value}` };
          }
        }
        for (const value of Object.values(item as Record<string, unknown>)) {
          if (value && typeof value === 'object') stack.push(value);
        }
      }
    } catch {
      // Invalid JSON-LD is ignored; visible or metadata evidence is evaluated below.
    }
  }
  return null;
}

function agenzStructuredPrice($: cheerio.CheerioAPI, intent: string | null): { value: number; period: PricePeriod; evidence: string } | null {
  const candidates: Array<{ value: number; period: PricePeriod; evidence: string; score: number }> = [];
  $('body *').each((_, el) => {
    if (!el || el.type !== 'tag') return;
    const attrs = el.attribs ?? {};
    const raw = attrs['data-prix'] ?? attrs['data-price'];
    if (!raw) return;
    const value = parseAmount(raw);
    if (!value) return;
    const tx = normalizeText(attrs['data-transaction-type'] ?? attrs['data-transaction'] ?? '').toLowerCase();
    const period: PricePeriod = /location|rent/.test(tx) ? 'month' : /vente|sale/.test(tx) ? 'sale_total' : intent === 'rent' ? 'month' : intent === 'sale' ? 'sale_total' : 'unknown';
    if (!plausible(value, intent, period)) return;
    const id = attrs['data-id'] ?? '';
    let score = 0;
    if (attrs['data-prix']) score += 6;
    if (attrs['data-price']) score += 4;
    if (id) score += 5;
    if (tx) score += 5;
    if (intent === 'rent' && /location|rent/.test(tx)) score += 6;
    if (intent === 'sale' && /vente|sale/.test(tx)) score += 6;
    candidates.push({ value, period, evidence: `agenz:data-price:${value}${id ? `;id=${id}` : ''}${tx ? `;transaction=${tx}` : ''}`, score });
  });
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return best ? { value: best.value, period: best.period, evidence: best.evidence } : null;
}

function firstPerM2(text: string): number | null {
  PER_M2.lastIndex = 0;
  const m = PER_M2.exec(text);
  return m ? parseAmount(m[1]) : null;
}

type Candidate = { value: number; score: number; period: PricePeriod; evidence: string; old: boolean };

function metadataCandidates($: cheerio.CheerioAPI, intent: string | null): Candidate[] {
  const fields: Array<[string, string]> = [
    ['title', normalizeText($('title').first().text())],
    ['meta:og:title', normalizeText($('meta[property="og:title"]').attr('content') ?? '')],
    ['meta:description', normalizeText($('meta[name="description"]').attr('content') ?? '')],
    ['meta:og:description', normalizeText($('meta[property="og:description"]').attr('content') ?? '')],
  ];
  const out: Candidate[] = [];
  for (const [source, text] of fields) {
    if (!text || text.length > 500) continue;
    MONEY.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = MONEY.exec(text))) {
      const value = parseAmount(m[1]);
      if (!value) continue;
      const period = detectPeriod(text, intent);
      let score = source === 'title' || source === 'meta:og:title' ? 12 : 9;
      if (/\b(vendre|vente|sale|for sale)\b/i.test(text) && intent === 'sale') score += 4;
      if (/\b(louer|location|rent|for rent)\b/i.test(text) && intent === 'rent') score += 4;
      if (/\/\s*(?:mois|month)\b|\bpar\s+mois\b/i.test(text) && intent === 'rent') score += 3;
      if (/\/\s*m(?:²|2)|par\s*m(?:²|2)/i.test(text)) score -= 30;
      if (!plausible(value, intent, period)) score -= 30;
      if (score > -10) out.push({ value, score, period, evidence: `${source}:${text}`, old: false });
    }
  }
  return out;
}

function agenzPrimaryBlockCandidate($: cheerio.CheerioAPI, intent: string | null): Candidate | null {
  const nodes = $('body *').toArray();
  const headingIndex = nodes.findIndex(el => {
    if (!el || el.type !== 'tag' || !$(el).is('h1')) return false;
    const text = normalizeText($(el).text());
    return /(?:\bfor\s+sale\b|\bfor\s+rent\b|à\s+vendre\b|à\s+louer\b)/i.test(text);
  });
  if (headingIndex < 0) return null;

  for (let i = headingIndex + 1; i < Math.min(nodes.length, headingIndex + 80); i++) {
    const el = nodes[i];
    if (!el || el.type !== 'tag') continue;
    const own = normalizeText($(el).clone().children().remove().end().text());
    if (!own || own.length > 120) continue;
    if (/^(?:ref\.?|réf\.?|reference)\b/i.test(own)) break;

    const localContext = normalizeText([
      $(el).prev().text(),
      own,
      $(el).next().text(),
    ].join(' ')).slice(0, 300);
    if (/syndic|charges?\b|mensualit|mortgage|crédit|credit|loyer\s+potentiel|potential\s+rent/i.test(localContext)) continue;
    if (/\/\s*m(?:²|2)|par\s*m(?:²|2)/i.test(own)) continue;

    MONEY.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = MONEY.exec(own))) {
      const value = parseAmount(m[1]);
      if (!value) continue;
      const period = detectPeriod(own, intent);
      if (!plausible(value, intent, period)) continue;
      return {
        value,
        score: 11,
        period,
        evidence: `agenz:primary-block:${own}`,
        old: false,
      };
    }
  }
  return null;
}

function visibleCandidates($: cheerio.CheerioAPI, intent: string | null): Candidate[] {
  const out: Candidate[] = [];
  $('body *').each((_, el) => {
    if (!el || el.type !== 'tag') return;
    const own = normalizeText($(el).clone().children().remove().end().text());
    if (!own || own.length > 180) return;
    MONEY.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = MONEY.exec(own))) {
      const value = parseAmount(m[1]);
      if (!value) continue;
      const period = detectPeriod(own, intent);
      const around = normalizeText($(el).parent().text()).slice(0, 260);
      const classId = `${$(el).attr('class') ?? ''} ${$(el).attr('id') ?? ''}`.toLowerCase();
      const old = $(el).is('del,s,strike') || $(el).parents('del,s,strike').length > 0 || /old|previous|before|strike/.test(classId);
      let score = 0;
      if (/price|prix|loyer|montant/.test(classId)) score += 8;
      if (/\b(prix|price|loyer)\b/i.test(around)) score += 5;
      if (period === 'month' && intent === 'rent') score += 4;
      if (period === 'sale_total' && intent === 'sale') score += 3;
      if (/\/\s*(?:mois|month)\b/i.test(own)) score += 4;
      if (/\/\s*m(?:²|2)|par\s*m(?:²|2)/i.test(own) || /syndic|frais\s+de\s+syndic|charges?\b/i.test(around)) score -= 20;
      if (/à\s+partir\s+de|starting\s+from/i.test(around)) score -= 2;
      if (old) score -= 3;
      if (!plausible(value, intent, period)) score -= 30;
      if (score > -10) out.push({ value, score, period, evidence: own, old });
    }
  });
  return out;
}

export function extractDetailPrice(sourceDomain: string, html: string, intent: string | null): PriceEvidence {
  const domain = sourceDomain.toLowerCase().replace(/^www\./, '');
  if (!['agenz.ma', 'mubawab.ma'].includes(domain)) {
    return { currentPriceMad: null, oldPriceMad: null, pricePerM2Mad: null, period: 'unknown', priceStatus: 'unknown', currency: null, confidence: 'none', evidence: null, rejected: ['unsupported_source'] };
  }
  const $ = cheerio.load(html);
  const body = normalizeText($('body').text());
  const headText = normalizeText([
    $('title').first().text(),
    $('meta[property="og:title"]').attr('content') ?? '',
    $('meta[name="description"]').attr('content') ?? '',
    $('meta[property="og:description"]').attr('content') ?? '',
  ].join(' '));
  const pricePerM2Mad = firstPerM2(`${headText} ${body}`);
  const structured = domain === 'agenz.ma' ? agenzStructuredPrice($, intent) : null;
  const json = jsonLdPrice($, intent);
  const agenzPrimary = domain === 'agenz.ma' ? agenzPrimaryBlockCandidate($, intent) : null;
  const candidates = [
    ...metadataCandidates($, intent),
    ...(agenzPrimary ? [agenzPrimary] : []),
    ...visibleCandidates($, intent),
  ].sort((a, b) => b.score - a.score || b.value - a.value);
  const old = candidates.filter(c => c.old && c.score >= 1)[0] ?? null;
  const current = candidates.filter(c => !c.old && c.score >= 5)[0] ?? null;
  const notDisclosed = /\b(prix\s+(?:à\s+)?consulter|demander\s+le\s+prix|prix\s+sur\s+demande|price\s+on\s+request|contact(?:ez)?\s+(?:nous|l['’]annonceur).*prix)\b/i.test(`${headText} ${body}`);

  if (structured) {
    return {
      currentPriceMad: structured.value,
      oldPriceMad: old && old.value !== structured.value ? old.value : null,
      pricePerM2Mad,
      period: structured.period,
      priceStatus: 'available',
      currency: 'MAD',
      confidence: 'high',
      evidence: structured.evidence,
      rejected: [],
    };
  }

  if (json) {
    return {
      currentPriceMad: json.value,
      oldPriceMad: old && old.value !== json.value ? old.value : null,
      pricePerM2Mad,
      period: intent === 'sale' ? 'sale_total' : intent === 'rent' ? 'month' : 'unknown',
      priceStatus: 'available',
      currency: 'MAD',
      confidence: 'high',
      evidence: json.evidence,
      rejected: [],
    };
  }

  if (!current) {
    return {
      currentPriceMad: null,
      oldPriceMad: old?.value ?? null,
      pricePerM2Mad,
      period: 'unknown',
      priceStatus: notDisclosed ? 'not_disclosed' : 'unknown',
      currency: null,
      confidence: 'none',
      evidence: notDisclosed ? 'visible_or_meta:not_disclosed' : null,
      rejected: [notDisclosed ? 'price_not_disclosed' : 'no_high_confidence_total_price'],
    };
  }

  return {
    currentPriceMad: current.value,
    oldPriceMad: old && old.value !== current.value ? old.value : null,
    pricePerM2Mad,
    period: current.period,
    priceStatus: 'available',
    currency: 'MAD',
    confidence: current.score >= 10 ? 'high' : 'medium',
    evidence: current.evidence,
    rejected: [],
  };
}
