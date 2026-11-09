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
  publicationSourceGeometry: null,
  centralSectorBoundaryCertified: false,
  projectedCoordinateReferenceVerified: false,
  is2026CentralSectorPolygon: false,
  publishedMapBoundaryAllowed: false,
  attributionAndReuseReviewed: false,
  auditStatus: "source-authenticated-no-central-vector",
} as const;
