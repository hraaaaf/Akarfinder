import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { ui } from "@/components/ui/design-system";

function Pulse({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-slate-200/75 motion-reduce:animate-none ${className}`}
    />
  );
}

export default function ListingDetailLoading() {
  return (
    <div className={`min-h-screen ${ui.pageLight}`} data-announcement-loading="ann-l1">
      <SiteHeader searchMode fluid />
      <main aria-busy="true" aria-label="Chargement de la fiche du bien">
        <Container fluid className="max-w-[1500px] py-5 lg:px-8 lg:py-6">
          <Pulse className="h-5 w-36" />
          <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <div className="space-y-5">
              <Pulse className="h-[280px] w-full rounded-[1.6rem] sm:h-[460px]" />
              <div className="space-y-3 rounded-[1.4rem] border border-slate-200 bg-white p-5 sm:p-6">
                <Pulse className="h-7 w-3/4" />
                <Pulse className="h-5 w-2/5" />
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Pulse className="h-16 w-full" />
                  <Pulse className="h-16 w-full" />
                  <Pulse className="h-16 w-full" />
                  <Pulse className="h-16 w-full" />
                </div>
              </div>
              <Pulse className="h-40 w-full rounded-[1.4rem]" />
              <Pulse className="h-48 w-full rounded-[1.4rem]" />
            </div>
            <aside className="hidden lg:block">
              <div className="sticky top-24 space-y-3 rounded-[1.4rem] border border-slate-200 bg-white p-5">
                <Pulse className="h-8 w-2/3" />
                <Pulse className="h-11 w-full" />
                <Pulse className="h-11 w-full" />
                <Pulse className="h-20 w-full" />
              </div>
            </aside>
          </div>
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
