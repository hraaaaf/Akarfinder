import Link from "next/link";
import { Container } from "@/components/ui/Container";
import {
  getMarketPulseListings,
  type MarketPulseItem,
} from "@/lib/market-pulse/get-market-pulse-listings";

function OperationBadge({ label }: { label: MarketPulseItem["operationLabel"] }) {
  const badgeClass =
    label === "Location"
      ? "border-[#C2A368]/40 bg-[#C2A368]/14 text-[#E7D0A0]"
      : label === "Neuf"
        ? "border-[#D8B97A]/45 bg-[#D8B97A]/16 text-[#F4DFC0]"
        : "border-white/14 bg-white/8 text-white";

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] ${badgeClass}`}
    >
      {label}
    </span>
  );
}

function MarketPulseCard({ item }: { item: MarketPulseItem }) {
  const content = (
    <div className="group/item inline-flex min-w-[290px] max-w-[360px] items-center gap-3 rounded-full border border-white/10 bg-white/[0.055] px-3.5 py-2.5 text-sm text-white/84 backdrop-blur-md transition duration-300 hover:border-[#C2A368]/40 hover:bg-white/[0.085] hover:text-white hover:shadow-[0_0_0_1px_rgba(194,163,104,0.1),0_14px_28px_rgba(0,0,0,0.18)] md:min-w-[360px]">
      <OperationBadge label={item.operationLabel} />
      <span className="min-w-0 truncate text-[13px] font-medium leading-6">
        {item.lineLabel}
      </span>
    </div>
  );

  if (!item.href) {
    return content;
  }

  return (
    <Link
      href={item.href}
      className="inline-flex shrink-0 cursor-pointer rounded-full transition hover:[text-decoration-color:#C2A368] hover:underline hover:underline-offset-4"
    >
      {content}
    </Link>
  );
}

export async function MarketPulse() {
  const items = await getMarketPulseListings(10);

  if (items.length === 0) {
    return null;
  }

  const loopItems = [...items, ...items];

  return (
    <section
      aria-label="Dernières annonces analysées"
      className="relative overflow-hidden border-y border-[#C2A368]/18 bg-[#08131D] text-[#F7F5EF]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(194,163,104,0.16),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_60%)]" />
      <Container className="relative py-5 sm:py-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#C2A368]">
              Dernières annonces analysées
            </p>
            <p className="mt-2 max-w-[680px] text-[13px] leading-6 text-white/64 sm:text-[13.5px]">
              Biens récemment intégrés à l&apos;index AkarFinder.
            </p>
          </div>
        </div>

        <div className="mt-4 md:hidden">
          <div
            className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {items.map((item) => (
              <MarketPulseCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        <div className="relative mt-4 hidden md:block">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#08131D] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#08131D] to-transparent" />
          <div className="market-pulse-marquee overflow-hidden">
            <div className="market-pulse-track flex w-max items-center gap-4">
              {loopItems.map((item, index) => (
                <MarketPulseCard
                  key={`${item.id}-${index}`}
                  item={item}
                />
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
