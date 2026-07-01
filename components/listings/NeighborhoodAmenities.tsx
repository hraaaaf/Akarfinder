import { Bus, GraduationCap, ShoppingBag, Plus, Building, Waves, Train, MapPin } from "lucide-react";
import type { NearbyPlace } from "@/lib/listings/types";
import type { ListingEnrichment } from "@/lib/listings/enrichment";
import { sanitizeNearbyPlaceTime } from "@/lib/listings/sanitize-nearby-place";

type NeighborhoodAmenitiesProps = {
  enrichment: ListingEnrichment;
};

function AmenityIcon({ icon }: { icon: NearbyPlace["icon"] }) {
  const props = { size: 16, strokeWidth: 1.75, "aria-hidden": true as const };
  switch (icon) {
    case "transport": return <Bus      {...props} />;
    case "school":    return <GraduationCap {...props} />;
    case "shop":      return <ShoppingBag   {...props} />;
    case "health":    return <Plus          {...props} />;
    case "mosque":    return <Building      {...props} />;
    case "coast":     return <Waves         {...props} />;
    case "station":   return <Train         {...props} />;
    default:          return <MapPin        {...props} />;
  }
}

export function NeighborhoodAmenities({ enrichment }: NeighborhoodAmenitiesProps) {
  return (
    <div className="rounded-2xl border border-[#dbeafe] bg-[#f5f9ff] p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#2563eb] text-white">
          <MapPin size={16} strokeWidth={2} aria-hidden="true" />
        </span>
        <h2 className="text-[1.2rem] font-bold tracking-tight text-gray-900">Quartier &amp; proximité</h2>
      </div>
      <p className="mt-3 text-[14px] leading-6 text-gray-600">{enrichment.neighborhoodSummary}</p>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {enrichment.nearbyPlaces.map((place) => (
          <div
            key={place.label}
            className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-3.5 py-3"
          >
            <span className="flex items-center gap-2.5 text-[13.5px] font-medium text-gray-700">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#eff6ff] text-[#2563eb]">
                <AmenityIcon icon={place.icon} />
              </span>
              {place.label}
            </span>
            <span className="text-[12px] font-semibold text-gray-500 italic">
              {sanitizeNearbyPlaceTime(place.time).display_label}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[12px] text-gray-400">
        Repères indicatifs à confirmer lors de la visite — présence dans le secteur selon l&apos;adresse.
      </p>
    </div>
  );
}
