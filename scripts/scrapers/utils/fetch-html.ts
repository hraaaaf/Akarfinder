// Polite HTML fetch for the P0 research scraper.
// - Clear, identifiable User-Agent (no spoofing a browser).
// - Hard timeout so a hanging source fails cleanly.
// - Lightweight robots.txt awareness (skip disallowed paths).
// - No cookies, no login, no captcha handling, no private APIs.

export const USER_AGENT =
  "AkarFinderResearchBot/0.1 (+https://akarfinder.ma; research; non-commercial; contact: research@akarfinder.ma)";

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

// --- Minimal robots.txt awareness -----------------------------------------
// Parses Disallow rules that apply to our UA or to "*". This is intentionally
// conservative: if robots.txt cannot be read, we assume the path is allowed
// (standard behaviour) but we never bypass an explicit Disallow.

const robotsCache = new Map<string, string[]>();

function originOf(url: string): string {
  const u = new URL(url);
  return `${u.protocol}//${u.host}`;
}

async function loadDisallows(origin: string): Promise<string[]> {
  if (robotsCache.has(origin)) return robotsCache.get(origin)!;
  const disallows: string[] = [];
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const txt = await res.text();
      let applies = false;
      for (const lineRaw of txt.split(/\r?\n/)) {
        const line = lineRaw.split("#")[0].trim();
        if (!line) continue;
        const [keyRaw, ...valParts] = line.split(":");
        const key = keyRaw.trim().toLowerCase();
        const val = valParts.join(":").trim();
        if (key === "user-agent") {
          const ua = val.toLowerCase();
          applies = ua === "*" || "akarfinderresearchbot".includes(ua) || ua.includes("akarfinder");
        } else if (key === "disallow" && applies && val) {
          disallows.push(val);
        }
      }
    }
  } catch {
    // robots.txt unreachable — assume allowed.
  }
  robotsCache.set(origin, disallows);
  return disallows;
}

export async function isAllowedByRobots(url: string): Promise<boolean> {
  try {
    const origin = originOf(url);
    const path = new URL(url).pathname || "/";
    const disallows = await loadDisallows(origin);
    return !disallows.some((rule) => rule !== "/" ? path.startsWith(rule) : path === "/" || path.startsWith("/"));
  } catch {
    return true;
  }
}
