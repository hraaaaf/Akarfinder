import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { AkarEstimateHistorySection } from "@/components/listings/AkarEstimateHistorySection";
import { MobilePropertyDecisionBar } from "@/components/listings/MobilePropertyDecisionBar";
import { PropertyDetailV2 } from "@/components/listings/PropertyDetailV2";
import { Container } from "@/components/ui/Container";
import { ui } from "@/components/ui/design-system";
import type { LivingHereModel } from "@/lib/geo/living-here";
import type { StreetRealityModel } from "@/lib/geo/street-reality";
import { buildProConversionModel } from "@/lib/listings/pro-conversion";
import type { Listing } from "@/lib/listings/types";
import type { AkarEstimateHistoryRuntime } from "@/lib/property-detail/akar-estimate-history-runtime";
import type { MarketComparableSet } from "@/lib/property-detail/market-comparables";
import type { PublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

export function AnnouncementPageShell({
  listing,
  detail,
  livingHere = null,
  streetReality = null,
  marketComparables = null,
  akarEstimateHistory = null,
  mapStyleUrl = process.env.NEXT_PUBLIC_AKAR_MAP_STYLE_URL ?? null,
  visualQa = false,
}: {
  listing: Listing;
  detail: PublicPropertyDetailV2;
  livingHere?: LivingHereModel | null;
  streetReality?: StreetRealityModel | null;
  marketComparables?: MarketComparableSet | null;
  akarEstimateHistory?: AkarEstimateHistoryRuntime | null;
  mapStyleUrl?: string | null;
  visualQa?: boolean;
}) {
  const proConversion = buildProConversionModel(listing);

  return (
    <div
      data-announcement-premium-shell="ann-l1"
      data-visual-qa={visualQa ? "announcement-page" : undefined}
      className={`min-h-screen pb-40 lg:pb-0 ${ui.pageLight}`}
    >
      <SiteHeader searchMode fluid />
      <main>
        <Container fluid className="max-w-[1500px] lg:px-8">
          <PropertyDetailV2
            listing={listing}
            detail={detail}
            livingHere={livingHere}
            streetReality={streetReality}
            marketComparables={marketComparables}
            proConversion={proConversion}
            mapStyleUrl={mapStyleUrl}
          />
          <div className="pb-16 lg:pr-[388px]">
            <AkarEstimateHistorySection model={akarEstimateHistory} />
          </div>
        </Container>
      </main>
      <SiteFooter />
      <MobilePropertyDecisionBar listing={listing} model={proConversion} />
    </div>
  );
}
