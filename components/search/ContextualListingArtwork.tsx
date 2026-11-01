import { PropertyTypeArtwork } from "@/components/property-types/PropertyTypeArtwork";

type ContextualListingArtworkProps = {
  stableRepresentationKey: string;
  city?: string | null;
  normalizedDistrict?: string | null;
  propertyType?: string | null;
  className?: string;
};

export function ContextualListingArtwork({
  propertyType,
  className = "",
}: ContextualListingArtworkProps) {
  return (
    <div data-visual-inventory-class="canonical_property_type" className={`h-full w-full bg-white ${className}`}>
      <PropertyTypeArtwork kind={propertyType ?? ""} className="h-full w-full" decorative />
    </div>
  );
}
