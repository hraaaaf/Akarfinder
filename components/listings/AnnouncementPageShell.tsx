import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MobilePropertyDecisionBar } from "@/components/listings/MobilePropertyDecisionBar";
import { PropertyDetailV2 } from "@/components/listings/PropertyDetailV2";
import { Container } from "@/components/ui/Container";
import { ui } from "@/components/ui/design-system";
import type { Listing } from "@/lib/listings/types";
import type { PublicPropertyDetailV2 } from "@/lib/property-detail/public-property-detail-v2";

export function AnnouncementPageShell({
  listing,
  detail,
  visualQa = false,
}: {
  listing: Listing;
  detail: PublicPropertyDetailV2;
  visualQa?: boolean;
}) {
  return (
    <div
      data-announcement-premium-shell="ann-l1"
      data-visual-qa={visualQa ? "announcement-page" : undefined}
      className={`min-h-screen ${ui.pageLight}`}
    >
      <SiteHeader searchMode fluid />
      <main className="pb-24 lg:pb-0">
        <Container fluid className="max-w-[1500px] lg:px-8">
          <PropertyDetailV2 listing={listing} detail={detail} />
        </Container>
      </main>
      <SiteFooter />
      <MobilePropertyDecisionBar listingId={listing.id} />
    </div>
  );
}
