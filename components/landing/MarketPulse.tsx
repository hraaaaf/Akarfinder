import Link from "next/link";
import { Container } from "@/components/ui/Container";
import {
  getMarketPulseListings,
  type MarketPulseItem,
} from "@/lib/market-pulse/get-market-pulse-listings";

function OperationBadge({ label }: { label: MarketPulseItem["operationLabel"] }) {
  const badgeClass =
    label === "Location"
      ? "border-accent/40 bg-accent/14 text-accent"
      : label === "Neuf"
        ? "border-accent/45 bg-accent/16 text-accent"
        : "border-border/20 bg-surface-muted text-foreground";

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
    <div className="group/item inline-flex min-w-[290px] max-w-[360px] items-center gap-3 rounded-full border border-border/15 bg-card px-3.5 py-2.5 text-sm text-card-foreground backdrop-blur-md transition duration-300 hover:border-accent/40 hover:shadow-[0_0_0_1px_rgba(194,163,104,0.1),0_14px_28px_rgba(0,0,0,0.18)] md:min-w-[360px]">
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
      aria-label="Derniers biens à comparer"
      className="relative overflow-hidden border-y border-border/15 bg-surface-muted text-foreground"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(194,163,104,0.12),transparent_38%)]" />
      <Container className="relative py-5 sm:py-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-accent">
              Derniers biens à comparer
            </p>
            <p className="mt-2 max-w-[680px] text-[13px] leading-6 text-muted-foreground sm:text-[13.5px]">
              Comparez les biens, les quartiers et les repères de prix avant de contacter une source.
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
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-surface-muted to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-surface-muted to-transparent" />
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
