// DEMO-LISTING-VISUALS-1 — Fictional, illustrative visuals for /demo
// property cards. Locally-hosted stock-style photos (no external requests),
// never a real listing photo. Always paired with the "Visuel fictif" label.
import Image from "next/image";

export type PropertyVisualType =
  | "apartment-modern"
  | "villa-premium"
  | "residence-neuve"
  | "appartement-familial"
  | "studio-urbain"
  | "terrain"
  | "local-commercial"
  | "urban-balcony"
  | "urban-building"
  | "project-garden"
  | "residence-walkway"
  | "project-facade";

type PropertyVisualProps = {
  type: PropertyVisualType;
  ratio?: "4:3" | "16:10";
  className?: string;
};

const RATIO_CLASS: Record<NonNullable<PropertyVisualProps["ratio"]>, string> = {
  "4:3": "aspect-[4/3]",
  "16:10": "aspect-[16/10]",
};

const IMAGE_SRC: Record<PropertyVisualType, string> = {
  "apartment-modern": "/demo/properties/apartment-modern.jpg",
  "villa-premium": "/demo/properties/villa-premium.jpg",
  "residence-neuve": "/demo/properties/residence-neuve.jpg",
  "appartement-familial": "/demo/properties/appartement-familial.jpg",
  "studio-urbain": "/demo/properties/studio-urbain.jpg",
  terrain: "/demo/properties/terrain.jpg",
  "local-commercial": "/demo/properties/local-commercial.jpg",
  "urban-balcony": "/demo/properties/urban-balcony.jpg",
  "urban-building": "/demo/properties/urban-building.jpg",
  "project-garden": "/demo/properties/project-garden.jpg",
  "residence-walkway": "/demo/properties/residence-walkway.jpg",
  "project-facade": "/demo/properties/project-facade.jpg",
};

export function PropertyVisual({ type, ratio = "16:10", className = "" }: PropertyVisualProps) {
  return (
    <div className={`relative overflow-hidden ${RATIO_CLASS[ratio]} ${className}`}>
      <Image
        src={IMAGE_SRC[type]}
        alt=""
        fill
        sizes="(max-width: 640px) 100vw, 50vw"
        className="object-cover"
      />
      <span className="absolute bottom-2 right-2 rounded-full bg-black/45 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
        Visuel fictif
      </span>
    </div>
  );
}
