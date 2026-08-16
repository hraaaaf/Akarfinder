import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MobilePropertyDecisionBar } from "@/components/listings/MobilePropertyDecisionBar";
import { PropertyDetailV2 } from "@/components/listings/PropertyDetailV2";
import { Container } from "@/components/ui/Container";
import { ui } from "@/components/ui/design-system";
import type { LivingHereModel } from "@/lib/geo/living-here";
import type { Listing } from "@/lib/listings/types";
import type { PublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

const DEFAULT_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export function AnnouncementPageShell({
  listing,
  detail,
  livingHere = null,
  mapStyleUrl = DEFAULT_MAP_STYLE_URL,
  visualQa = false,
}: {
  listing: Listing;
  detail: PublicPropertyDetailV2;
  livingHere?: LivingHereModel | null;
  mapStyleUrl?: string | null;
  visualQa?: boolean;
}) {
  return (
    <div
      data-announcement-premium-shell="ann-l1"
      data-visual-qa={visualQa ? "announcement-page" : undefined}
      className={`min-h-screen pb-24 lg:pb-0 ${ui.pageLight}`}
    >
      <SiteHeader searchMode fluid />
      <main>
        <Container fluid className="max-w-[1500px] lg:px-8">
          <PropertyDetailV2 listing={listing} detail={detail} livingHere={livingHere} mapStyleUrl={mapStyleUrl} />
        </Container>
      </main>
      <SiteFooter />
      <MobilePropertyDecisionBar listingId={listing.id} />
    </div>
  );
}
