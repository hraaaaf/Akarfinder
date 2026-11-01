import { getIndexedPropertyTypeVisual } from "@/lib/ux/indexed-property-type-visual";

type PropertyTypeArtworkProps = {
  kind: string;
  className?: string;
  decorative?: boolean;
};

export function PropertyTypeArtwork({ kind, className = "", decorative = false }: PropertyTypeArtworkProps) {
  const visual = getIndexedPropertyTypeVisual(kind);
  const asset = visual.targetAsset ?? "/visuals/property-types/target/apartment.svg";
  return (
    <img
      src={asset}
      alt={decorative ? "" : `Illustration ${visual.label}`}
      aria-hidden={decorative ? true : undefined}
      data-property-visual-family={visual.key}
      className={`block h-full w-full object-contain object-center ${className}`.trim()}
      loading="lazy"
      decoding="async"
    />
  );
}
