export type MaarifTargetContextLabel = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  osmEntityType: "node";
  osmEntityId: number;
  sourceUrl: string;
  verificationUrl: string;
  attribution: "© OpenStreetMap contributors";
  licenseUrl: "https://www.openstreetmap.org/copyright";
  semantic: "sourced-place-label";
};

function osmNode(
  id: number,
  name: string,
  latitude: number,
  longitude: number,
  verificationUrl: string,
): MaarifTargetContextLabel {
  return {
    id: `osm:node:${id}`,
    name,
    latitude,
    longitude,
    osmEntityType: "node",
    osmEntityId: id,
    sourceUrl: `https://www.openstreetmap.org/node/${id}`,
    verificationUrl,
    attribution: "© OpenStreetMap contributors",
    licenseUrl: "https://www.openstreetmap.org/copyright",
    semantic: "sourced-place-label",
  };
}

// Target-only orientation labels. They are point labels sourced from OSM,
// never neighborhood boundaries or proof that a point is inside Maârif.
export const MAARIF_TARGET_CONTEXT_LABELS: readonly MaarifTargetContextLabel[] = [
  osmNode(7229046882, "Aïn Diab", 33.58116, -7.68439, "https://mapcarta.com/N7229046882"),
  osmNode(13920081606, "Anfa", 33.57856, -7.69056, "https://mapcarta.com/17461274"),
  osmNode(12189841324, "Bourgogne", 33.59857, -7.64186, "https://mapcarta.com/N12189841324"),
  osmNode(12178947325, "Racine", 33.58961, -7.64070, "https://mapcarta.com/N12178947325"),
  osmNode(12189801867, "Gauthier", 33.58983, -7.63063, "https://mapcarta.com/N12189801867"),
  osmNode(12178902639, "Maârif Extension", 33.57966, -7.64209, "https://mapcarta.com/N12178902639"),
  osmNode(12241613617, "Les Hôpitaux", 33.57713, -7.61705, "https://mapcarta.com/N12241613617"),
  osmNode(2186570857, "Mers Sultan", 33.57580, -7.59990, "https://mapcarta.com/25437612"),
  osmNode(2186532407, "Sidi Othmane", 33.55700, -7.56040, "https://mapcarta.com/25437620"),
] as const;
