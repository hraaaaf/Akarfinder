export type CasablancaTargetBoundaryEvidenceStatus =
  | "OFFICIAL_GRAPHIC_BOUNDARY_CANDIDATE"
  | "OFFICIAL_SECTOR_IDENTITY_WITH_TEXTUAL_LIMITS"
  | "OFFICIAL_GRAPHIC_EVIDENCE_RASTER_ONLY"
  | "OFFICIAL_IDENTITY_ONLY"
  | "HOLD_NO_PRODUCT_BOUNDARY";

export type CasablancaTargetBoundaryEvidence = {
  slug: string;
  canonicalName: string;
  evidenceStatus: CasablancaTargetBoundaryEvidenceStatus;
  publicationAllowed: false;
  sourceAuthority: "Agence Urbaine de Casablanca";
  sourceKind: "PA" | "PA_REPORT" | "PA_STATUS";
  sourceRef: string;
  evidenceNote: string;
};

export const CASABLANCA_TARGET_BOUNDARY_EVIDENCE: readonly CasablancaTargetBoundaryEvidence[] = [
  {
    slug: "maarif",
    canonicalName: "Maârif",
    evidenceStatus: "OFFICIAL_GRAPHIC_BOUNDARY_CANDIDATE",
    publicationAllowed: false,
    sourceAuthority: "Agence Urbaine de Casablanca",
    sourceKind: "PA_STATUS",
    sourceRef: "https://www.auc.ma/gestion-planification-urbaine/plans-damenagement/etat-davancement-des-pa/",
    evidenceNote:
      "AUC reports the Maârif plan public inquiry closed on 2025-10-10. The planning document is an official geometry candidate, but no neighborhood product polygon has been digitally extracted and certified.",
  },
  {
    slug: "racine",
    canonicalName: "Racine",
    evidenceStatus: "OFFICIAL_GRAPHIC_EVIDENCE_RASTER_ONLY",
    publicationAllowed: false,
    sourceAuthority: "Agence Urbaine de Casablanca",
    sourceKind: "PA_REPORT",
    sourceRef: "https://auc.ma/wp-content/uploads/2020/05/RAPPORT-JUSTIFICATIF-ANFA.pdf",
    evidenceNote:
      "AUC Anfa report explicitly lists Racine as one of seven Anfa sectors. The official PA-ANFA-5000-0 plan was inspected and is raster-only (page images, no vector paths/text), so direct geometry extraction is not available. Publication remains blocked.",
  },
  {
    slug: "bourgogne",
    canonicalName: "Bourgogne",
    evidenceStatus: "OFFICIAL_GRAPHIC_EVIDENCE_RASTER_ONLY",
    publicationAllowed: false,
    sourceAuthority: "Agence Urbaine de Casablanca",
    sourceKind: "PA_REPORT",
    sourceRef: "https://auc.ma/wp-content/uploads/2020/05/RAPPORT-JUSTIFICATIF-ANFA.pdf",
    evidenceNote:
      "AUC identifies Bourgogne 2 as an Anfa sector and provides explicit road limits. The official PA-ANFA-5000-0 plan is raster-only, so the graphic boundary cannot be extracted directly. No road-loop polygon may be reconstructed manually.",
  },
  {
    slug: "ain-diab",
    canonicalName: "Aïn Diab",
    evidenceStatus: "OFFICIAL_GRAPHIC_EVIDENCE_RASTER_ONLY",
    publicationAllowed: false,
    sourceAuthority: "Agence Urbaine de Casablanca",
    sourceKind: "PA_REPORT",
    sourceRef: "https://auc.ma/wp-content/uploads/2020/05/RAPPORT-JUSTIFICATIF-ANFA.pdf",
    evidenceNote:
      "AUC Anfa report explicitly lists Aïn Diab as one of the official Anfa sectors. The official PA-ANFA-5000-0 plan is raster-only, so the graphic boundary cannot be extracted directly. Geometry publication remains blocked.",
  },
  {
    slug: "hay-hassani",
    canonicalName: "Hay Hassani",
    evidenceStatus: "OFFICIAL_GRAPHIC_BOUNDARY_CANDIDATE",
    publicationAllowed: false,
    sourceAuthority: "Agence Urbaine de Casablanca",
    sourceKind: "PA",
    sourceRef: "https://auc.ma/wp-content/uploads/2020/05/pla_compressed.pdf",
    evidenceNote:
      "Official approved Hay Hassani development plan contains an arrondissement perimeter. This is an administrative planning boundary and must not be silently equated with a modern product-neighborhood boundary.",
  },
  {
    slug: "sidi-maarouf",
    canonicalName: "Sidi Maârouf",
    evidenceStatus: "OFFICIAL_IDENTITY_ONLY",
    publicationAllowed: false,
    sourceAuthority: "Agence Urbaine de Casablanca",
    sourceKind: "PA_REPORT",
    sourceRef: "https://auc.ma/wp-content/uploads/2020/05/RAPPORT-JUSTIFICATIF-AINCHOCK.pdf",
    evidenceNote:
      "AUC Ain Chock report explicitly references the former Sidi Maarouf planning area and projected dense development. Identity is official; a certified modern product boundary is not yet available.",
  },
  {
    slug: "finance-city",
    canonicalName: "Casablanca Finance City",
    evidenceStatus: "OFFICIAL_IDENTITY_ONLY",
    publicationAllowed: false,
    sourceAuthority: "Agence Urbaine de Casablanca",
    sourceKind: "PA_REPORT",
    sourceRef: "https://auc.ma/wp-content/uploads/2020/05/Rapport_justificatif_HAY-HASSANI.pdf",
    evidenceNote:
      "AUC planning documents identify the Casablanca-Anfa urban pole underlying the CFC area. CFC product boundary is not automatically the same as the planning pole boundary.",
  },
  {
    slug: "californie",
    canonicalName: "Californie",
    evidenceStatus: "OFFICIAL_IDENTITY_ONLY",
    publicationAllowed: false,
    sourceAuthority: "Agence Urbaine de Casablanca",
    sourceKind: "PA_REPORT",
    sourceRef: "https://auc.ma/wp-content/uploads/2020/05/RAPPORT-JUSTIFICATIF-AINCHOCK.pdf",
    evidenceNote:
      "AUC Ain Chock report explicitly names Californie and its continuation toward Bouskoura. Identity is official; no product polygon is promoted without a certified graphic boundary.",
  },
] as const;

export const CASABLANCA_TARGET_BOUNDARY_EVIDENCE_SUMMARY = {
  targetCount: CASABLANCA_TARGET_BOUNDARY_EVIDENCE.length,
  officialGraphicCandidateCount: CASABLANCA_TARGET_BOUNDARY_EVIDENCE.filter(
    (item) => item.evidenceStatus === "OFFICIAL_GRAPHIC_BOUNDARY_CANDIDATE",
  ).length,
  officialSectorIdentityCount: CASABLANCA_TARGET_BOUNDARY_EVIDENCE.filter(
    (item) => item.evidenceStatus === "OFFICIAL_SECTOR_IDENTITY_WITH_TEXTUAL_LIMITS",
  ).length,
  officialRasterGraphicEvidenceCount: CASABLANCA_TARGET_BOUNDARY_EVIDENCE.filter(
    (item) => item.evidenceStatus === "OFFICIAL_GRAPHIC_EVIDENCE_RASTER_ONLY",
  ).length,
  officialIdentityOnlyCount: CASABLANCA_TARGET_BOUNDARY_EVIDENCE.filter(
    (item) => item.evidenceStatus === "OFFICIAL_IDENTITY_ONLY",
  ).length,
  publishedProductBoundaryCount: 0,
} as const;
