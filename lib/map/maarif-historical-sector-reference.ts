/**
 * AUC historical planning text about the *secteur Maârif*.
 *
 * This is NOT the arrondissement, NOT a GIS polygon, NOT a current 2026
 * administrative boundary and NOT authority to label a POI "inside quartier".
 *
 * Source: AUC, Rapport justificatif du Plan d'Aménagement du secteur Maârif,
 * printed page 10 (historical document, archived under the 2020 URL).
 */
export const MAARIF_HISTORICAL_CENTRAL_SECTOR_REFERENCE = {
  geographicScope: "historical-central-sector",
  areaHectaresApprox: 103,
  sourceKind: "historical-urban-planning-text",
  sourceUrl: "https://auc.ma/wp-content/uploads/2020/05/RAPPORT-JUSTIFICATIF-MAARIF.pdf",
  sourcePrintedPage: 10,
  axes: {
    north: ["Boulevard Abdelkrim Khattabi", "Boulevard d'Anfa"],
    south: ["Boulevard Brahim Roudani"],
    east: ["Boulevard Mohamed Zerktouni"],
    west: ["Boulevard de Lybie", "Boulevard Bir Anzarane"],
  },
  geometry: null,
  sigCertified: false,
  current2026BoundaryVerified: false,
  publicationStatus: "textual-reference-only",
} as const;
