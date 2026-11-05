import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PropertyTypeArtwork } from "@/components/property-types/PropertyTypeArtwork";
import { Container } from "@/components/ui/Container";
import { OPTION_A_PROPERTY_TYPES } from "@/lib/property-types/presentation";

/**
 * Six existing public property filters. Visual artwork is shared with Search
 * and Vendre; Studio deliberately reuses the apartment family rather than
 * claiming a non-existent seventh certified asset.
 */
export function HomePropertyTypesSection() {
  return (
    <section
      data-home-property-types="canonical-target-v1"
      aria-labelledby="home-property-types-title"
      className="border-b border-[#E3EAF3] bg-[#F7FAFE] py-8 sm:py-12"
    >
      <Container>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 sm:mb-6">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">Trouver le bon bien</p>
            <h2 id="home-property-types-title" className="mt-1 text-xl font-extrabold tracking-tight text-[#0B1F3A] sm:text-2xl">
              Explorer par type de bien
            </h2>
          </div>
          <Link href="/search" className="inline-flex items-center gap-1 text-xs font-bold text-[#0B63CE] hover:underline">
            Tous les biens <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {OPTION_A_PROPERTY_TYPES.map((item) => (
            <Link
              key={item.value}
              href={`/search?property_type=${encodeURIComponent(item.value)}`}
              data-home-property-type={item.value}
              className="group min-w-0 overflow-hidden rounded-2xl border border-[#DCE8F5] bg-white p-2.5 shadow-[0_6px_18px_rgba(7,27,60,0.06)] transition hover:-translate-y-0.5 hover:border-[#8ABCF3] hover:shadow-[0_12px_28px_rgba(11,99,206,0.11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] motion-reduce:transform-none"
            >
              <div className="aspect-[16/10] overflow-hidden rounded-xl bg-white">
                <PropertyTypeArtwork kind={item.value} className="h-full w-full" decorative />
              </div>
              <div className="flex items-center justify-between gap-1.5 px-1 pb-0.5 pt-2">
                <span className="min-w-0 truncate text-[12px] font-extrabold text-[#0B1F3A]">{item.label}</span>
                <ArrowRight size={14} className="shrink-0 text-[#0B63CE]" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
