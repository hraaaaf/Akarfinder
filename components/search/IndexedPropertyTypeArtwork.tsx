import { getIndexedPropertyTypeVisual } from "@/lib/ux/indexed-property-type-visual";

export function IndexedPropertyTypeArtwork({ propertyType, title, className = "" }: {
  propertyType: string | null | undefined;
  title?: string | null;
  className?: string;
}) {
  const visual = getIndexedPropertyTypeVisual(propertyType, title);
  return (
    <div data-indexed-property-artwork={visual.key} className={`relative h-full w-full overflow-hidden bg-white ${className}`} aria-hidden="true">
      {visual.targetAsset ? (
        <img src={visual.targetAsset} alt="" className="h-full w-full object-contain object-center" loading="lazy" decoding="async" />
      ) : (
        <div data-property-visual-family="unknown" className="h-full w-full bg-slate-100" />
      )}
    </div>
  );
}
