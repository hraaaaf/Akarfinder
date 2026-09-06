// Polite HTML fetch for the P0 research scraper.
// - Clear, identifiable User-Agent (no spoofing a browser).
// - Hard timeout so a hanging source fails cleanly.
// - robots.txt awareness with wildcard/query matching.
// - No cookies, no login, no captcha handling, no private APIs.

export const USER_AGENT =
  "AkarFinderResearchBot/0.1 (+https://akarfinder.ma; research; non-commercial; contact: research@akarfinder.ma)";

const USER_AGENT_PRODUCT = "akarfinderresearchbot";
const DEFAULT_TIMEOUT_MS = 20000;

export type FetchResult = {
  ok: boolean;
  status: number;
  url: string;
  html: string;
};

export async function fetchHtml(
  url: string,
  { timeoutMs = DEFAULT_TIMEOUT_MS }: { timeoutMs?: number } = {}
): Promise<FetchResult> {
  const res = await fetch(url, {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "fr-FR,fr;q=0.9,ar;q=0.8,en;q=0.7",
    },
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }

  const html = await res.text();
  return { ok: true, status: res.status, url: res.url, html };
}

type RobotsDirective = { kind: "allow" | "disallow"; pattern: string };
type RobotsGroup = { agents: string[]; directives: RobotsDirective[] };

const robotsCache = new Map<string, RobotsDirective[]>();

function originOf(url: string): string {
  const u = new URL(url);
  return `${u.protocol}//${u.host}`;
}

function escapeRegexChar(char: string): string {
  return /[\\^$.*+?()[\]{}|]/.test(char) ? `\\${char}` : char;
}

export function robotsPatternMatches(pathAndQuery: string, pattern: string): boolean {
  if (!pattern) return false;
  let source = "^";
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === "*") source += ".*";
    else if (char === "$" && i === pattern.length - 1) source += "$";
    else source += escapeRegexChar(char);
  }
  return new RegExp(source).test(pathAndQuery);
}

export function parseApplicableRobotsDirectives(
  text: string,
  productToken = USER_AGENT_PRODUCT,
): RobotsDirective[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let sawDirective = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (key === "user-agent") {
      if (!current || sawDirective) {
        current = { agents: [], directives: [] };
        groups.push(current);
        sawDirective = false;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }

    if ((key === "allow" || key === "disallow") && current) {
      sawDirective = true;
      if (value) current.directives.push({ kind: key, pattern: value });
    }
  }

  const token = productToken.toLowerCase();
  const specific = groups.filter((group) => group.agents.some((agent) => agent !== "*" && token.includes(agent)));
  const selected = specific.length > 0 ? specific : groups.filter((group) => group.agents.includes("*"));
  return selected.flatMap((group) => group.directives);
}

export function isPathAllowedByRobotsDirectives(pathAndQuery: string, directives: RobotsDirective[]): boolean {
  const matches = directives.filter((directive) => robotsPatternMatches(pathAndQuery, directive.pattern));
  if (matches.length === 0) return true;

  matches.sort((a, b) => {
    const lengthDelta = b.pattern.length - a.pattern.length;
    if (lengthDelta !== 0) return lengthDelta;
    if (a.kind === b.kind) return 0;
    return a.kind === "allow" ? -1 : 1;
  });

  return matches[0].kind === "allow";
}

async function loadDirectives(origin: string): Promise<RobotsDirective[]> {
  if (robotsCache.has(origin)) return robotsCache.get(origin)!;
  let directives: RobotsDirective[] = [];
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) directives = parseApplicableRobotsDirectives(await res.text());
  } catch {
    // robots.txt unreachable: standard fallback is allow; explicit rules are never bypassed.
  }
  robotsCache.set(origin, directives);
  return directives;
}

export async function isAllowedByRobots(url: string): Promise<boolean> {
  try {
    const u = new URL(url);
    const directives = await loadDirectives(originOf(url));
    return isPathAllowedByRobotsDirectives(`${u.pathname}${u.search}`, directives);
  } catch {
    return true;
  }
}
