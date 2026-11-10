/** J11-C local QA host defense. Keep behind NODE_ENV=development and bind the dev server to 127.0.0.1. */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function headerIsLoopback(raw) {
  if (typeof raw !== "string" || raw !== raw.trim() || !raw ||
      raw.includes(",") || raw.includes("/") || raw.includes("@") || /\s/.test(raw)) return false;
  const value = raw.toLowerCase();
  if (value === "::1") return true;
  return LOOPBACK.has(value.replace(/:[0-9]{1,5}$/, ""));
}

/**
 * NextRequest.nextUrl.hostname can differ from the literal Host header.
 * Require both; reject externally forwarded hosts. This is defense-in-depth,
 * not authentication, and is insufficient if a dev server is bound publicly.
 */
export function isPrivateQaLoopbackRequest(urlHostname, hostHeader, forwardedHostHeader) {
  return typeof urlHostname === "string" &&
    LOOPBACK.has(urlHostname.toLowerCase()) &&
    headerIsLoopback(hostHeader) &&
    (forwardedHostHeader == null || headerIsLoopback(forwardedHostHeader));
}
