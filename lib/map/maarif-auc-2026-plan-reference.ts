/**
 * Verified AUC source artifact: the July 2026 plan for the entire Maârif
 * ARRONDISSEMENT. Its raster and regulatory-sector borders are NOT a certified
 * GIS polygon for the historic ~103 ha Maârif central sector.
 *
 * Strictly metadata. Do not import it as a publishable GeoJSON geometry.
 */
export const MAARIF_AUC_2026_ARRONDISSEMENT_PLAN_REFERENCE = {
  sourceRole: "arrondissement-urban-planning-reference",
  sourceAuthority: "Agence Urbaine de Casablanca",
  documentUrl: "https://www.auc.ma/wp-content/uploads/2020/05/PL-ENS.pdf",
  sourceIndexUrl: "https://www.auc.ma/e-services-2/e-documents/?IdP=1085",
  planNumber: "AUC 01/2026",
  planPrintedDate: "2026-07",
  homologationDecree: "2.26.658",
  bulletinOfficielNumber: 7548,
  bulletinOfficielPublication: "2026-10-01",
  pdfCreatedAt: "2026-10-09T14:49:42Z",
  pdfSha256: "07c4345f48ebc8943a5a256b1264190556f7b9d2cacf544fc1ab0bd718be3daa",
  pdfBytes: 59646409,
  pdfPages: 1,
  printedScaleDenominator: 5000,
  embeddedRasterPixels: { width: 7234, height: 9083 },
  // Separate ArcGIS REST service from the printed PDF and from any 103-ha
  // historic central-sector boundary. Official service snapshot is a raster.
  // WKID 102191 is Esri Nord_Maroc_Degree; do NOT silently alias to EPSG:26191.
  aucSeptember2026ArcgisService: {
    portalItemId: "5fff1840bbce45f5a709f33c2e7d3fba",
    url: "https://carto.auc.ma/server/rest/services/DOCUMENTS_URBANISME/PA_MAARIF_SEPTEMBRE_2026/MapServer",
    inspectedAt: "2026-11-10",
    mapName: "PA_MAARIF_SEPTEMBRE_2026",
    layerCount: 1,
    layer: {
      id: 1,
      name: "PA MAARIF EDITION CC 2026_CLIP.tif",
      type: "Raster Layer",
      geometryType: null,
    },
    serviceSpatialReferenceWkid: 102191,
    serviceSpatialReferenceLabel: "Nord_Maroc_Degree",
    mapsToEpsg26191WithoutExplicitTransformation: false,
    centralSectorVectorLayerFound: false,
    verifiedCentralSectorGeometry: null,
    serviceCopyrightText: "",
    reuseRightsVerified: false,
    publishedMapBoundaryAllowed: false,
  },
  publicationSourceGeometry: null,
  centralSectorBoundaryCertified: false,
  projectedCoordinateReferenceVerified: false,
  is2026CentralSectorPolygon: false,
  publishedMapBoundaryAllowed: false,
  attributionAndReuseReviewed: false,
  auditStatus: "source-authenticated-no-central-vector",
} as const;
