// L6-B: Carto basemaps are browser-rendered by MapLibre. A NEXT_PUBLIC key
// will be visible in client requests, so protect it with CARTO Referer
// restrictions and usage monitoring; never put its real value in git.
const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const CARTO_VECTOR_BASE = "https://basemaps.cartocdn.com/gl";
const CARTO_ATTRIBUTION = "© OpenStreetMap contributors, © CARTO";
const OPENFREEMAP_ATTRIBUTION = "© OpenStreetMap contributors · OpenFreeMap";

export function nationalBasemapConfiguration(
  theme: string | undefined,
  apiKey: string | undefined = process.env.NEXT_PUBLIC_CARTO_BASEMAP_API_KEY,
): { style: string; attribution: string; provider: "carto" | "openfreemap" } {
  const key = apiKey?.trim();
  if (!key) {
    // Never use an unkeyed CARTO URL: CARTO now requires a registered key.
    // Liberty is a documented fallback for both themes, with AkarFinder's
    // existing theme-specific paint treatment applied after style.load.
    return {
      style: OPENFREEMAP_STYLE,
      attribution: OPENFREEMAP_ATTRIBUTION,
      provider: "openfreemap",
    };
  }

  const variant = theme === "dark" ? "dark-matter" : "voyager";
  return {
    style: `${CARTO_VECTOR_BASE}/${variant}-gl-style/style.json?key=${encodeURIComponent(key)}`,
    attribution: CARTO_ATTRIBUTION,
    provider: "carto",
  };
}
