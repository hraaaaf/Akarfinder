export type VisualAssetStatus = "KEEP" | "REDESIGN" | "REPLACE" | "CREATE" | "REMOVE";
export type VisualAssetLayer = "photography" | "identity-illustration" | "functional-icon" | "data-imagery";

export type VisualAssetRecord = {
  id: string;
  label: string;
  layer: VisualAssetLayer;
  status: VisualAssetStatus;
  path?: string;
  notes: string;
};

export const VISUAL_ASSETS: VisualAssetRecord[] = [
  {
    id: "hero-home",
    label: "Homepage hero photography",
    layer: "photography",
    status: "KEEP",
    path: "/images/hero/akar-residence-sunset-desktop.webp",
    notes: "Real editorial context; mobile variant exists separately.",
  },
  {
    id: "city-photography",
    label: "City photography",
    layer: "photography",
    status: "KEEP",
    notes: "Keep until each city mark passes architectural-fidelity QA.",
  },
  {
    id: "listing-imagery",
    label: "Listing and source imagery",
    layer: "data-imagery",
    status: "KEEP",
    notes: "Data content, not a brand illustration surface. Preserve provenance and source rules.",
  },
  {
    id: "functional-icons",
    label: "Lucide functional icon layer",
    layer: "functional-icon",
    status: "KEEP",
    notes: "Use for controls and universal UI actions; do not redraw merely for branding.",
  },
  {
    id: "property-apartment",
    label: "Appartement",
    layer: "identity-illustration",
    status: "CREATE",
    path: "/brand/visual-system/property-apartment.svg",
    notes: "Style 3 master family asset.",
  },
  {
    id: "property-villa",
    label: "Villa",
    layer: "identity-illustration",
    status: "CREATE",
    path: "/brand/visual-system/property-villa.svg",
    notes: "Style 3 master family asset.",
  },
  {
    id: "property-land",
    label: "Terrain",
    layer: "identity-illustration",
    status: "CREATE",
    path: "/brand/visual-system/property-land.svg",
    notes: "Style 3 master family asset.",
  },
];

export const PROPERTY_VISUALS = {
  Appartement: "/brand/visual-system/property-apartment.svg",
  Villa: "/brand/visual-system/property-villa.svg",
  Terrain: "/brand/visual-system/property-land.svg",
} as const;
