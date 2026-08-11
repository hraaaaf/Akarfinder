export const NEIGHBORHOOD_VISUAL_TEMPLATE_A = {
  id: "akarfinder-neighborhood-template-a-v1",
  version: 1,
  intendedSurface: "search_card_fallback",
  sourcePolicy: {
    requiresRealSourcePhoto: true,
    requiresGeoVerification: true,
    requiresPublicationAndModificationRights: true,
    allowsTextToImageSubstitution: false,
    preservesSceneGeometry: true,
    preservesVisibleArchitecture: true,
    preservesCharacteristicVegetation: true,
    forbidsInventedLandmarks: true,
  },
  composition: {
    orientation: "landscape",
    masterAspectRatio: "16:9",
    searchCropMode: "cover",
    focalSafeZone: "center",
    textSafeZone: "lower_left",
    neighborhoodNameMaxLines: 1,
    cityNameMaxLines: 1,
    descriptorCountMax: 3,
    disclosureRequired: true,
    disclosureLabel: "Photo d’ambiance",
  },
  branding: {
    photoDominance: "high",
    treatment: "light",
    palette: ["cream", "deep_navy", "teal", "gold_accent"],
    overlay: "subtle_navy_teal_gradient",
    neighborhoodNameStyle: "prominent",
    cityNameStyle: "secondary",
    descriptorsStyle: "compact",
  },
  searchCard: {
    mobileImageHeightPx: 164,
    desktopImageHeightPx: 196,
    mobileColumns: 2,
    transparencyDisclosure: true,
  },
} as const;

export type NeighborhoodVisualTemplateA = typeof NEIGHBORHOOD_VISUAL_TEMPLATE_A;
