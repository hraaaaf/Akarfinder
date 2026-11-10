/**
 * Two different, UNVERIFIED points used for private QA around Maârif.
 *
 * WARNING: neither point is a current official district, historic sector,
 * neighborhood centroid, or proof of any POI belonging "inside Maârif".
 */
export const MAARIF_QA_REFERENCE_POINTS = {
  originalRadiusSample: {
    latitude: 33.5898,
    longitude: -7.644,
    radiusMeters: 1800,
    meaning: "private-sampling-reference-only",
    sourceCandidateCountOnPinnedPbf: 415,
    generatedPolygon: null,
    geofenceEligible: false,
  },
  osmCommunityQuarterPoint: {
    osmId: "node/2186618782",
    sourceUrl: "https://www.openstreetmap.org/node/2186618782",
    osmPlaceTag: "quarter",
    latitude: 33.58363,
    longitude: -7.6367,
    meaning: "OSM-volunteer-quarter-label-position-only",
    isVerifiedQuarterCentroid: false,
    isCertifiedBoundarySource: false,
    geometry: null,
    geofenceEligible: false,
  },
  qaOnlyComparison: {
    distanceBetweenPointsMetersApprox: 963.3,
    firstSampleCountOutside1800mOfOsmQuarterPoint: 76,
    originalCandidateCount: 415,
    subsetOnly: true,
    notProofOfSectorPopulationOrCoverage: true,
  },
  centralSectorPolygon: null,
  centralSectorMembershipCertified: false,
  mapPublishingAllowed: false,
} as const;
