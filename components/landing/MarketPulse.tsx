import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { getMarketPulseListings, type MarketPulseItem } from "@/lib/market-pulse/get-market-pulse-listings";

function MarketPulseCard({ item }: { item: MarketPulseItem }) {
  const card = (
    <article className="group h-full overflow-hidden rounded-3xl border border-border/15 bg-card shadow-[0_10px_35px_rgba(7,27,51,0.08)] transition duration-300 hover:-translate-y-1 hover:border-accent/35 hover:shadow-[0_22px_55px_rgba(7,27,51,0.14)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt=""
          className={`h-full w-full transition duration-500 group-hover:scale-[1.03] ${item.usesFallbackImage ? "object-contain p-6" : "object-cover"}`}
        />
        {item.freshnessLabel ? (
          <span className="absolute right-3 top-3 rounded-full bg-[rgba(7,27,51,0.88)] px-3 py-1.5 text-[10px] font-extrabold text-white backdrop-blur">
            {item.freshnessLabel}
          </span>
        ) : null}
        <span className="absolute left-3 top-3 rounded-full border border-white/30 bg-white/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#071b33]">
          {item.operationLabel}
        </span>
      </div>

      <div className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          {item.city}{item.neighborhood ? ` · ${item.neighborhood}` : ""}
        </p>
        <h3 className="mt-2 line-clamp-2 min-h-12 text-[1rem] font-extrabold leading-6 text-card-foreground">
          {item.title}
        </h3>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-[1.08rem] font-extrabold tracking-tight text-foreground">
              {item.priceLabel || item.shortDetail}
            </p>
            {item.priceLabel ? <p className="mt-1 text-[12px] text-muted-foreground">{item.shortDetail}</p> : null}
          </div>
          {item.propertyType ? <span className="text-right text-[12px] font-semibold text-muted-foreground">{item.propertyType}</span> : null}
        </div>
        <p className="mt-4 border-t border-border/15 pt-3 text-[11.5px] font-semibold text-muted-foreground">
          Source : <span className="text-foreground">{item.sourceLabel}</span>
        </p>
      </div>
    </article>
  );

  return item.href ? <Link href={item.href} className="block h-full min-w-[82vw] snap-start sm:min-w-[320px] md:min-w-0">{card}</Link> : card;
}

export async function MarketPulse() {
  const items = await getMarketPulseListings(4);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="market-pulse-title" className="bg-surface-muted py-16 sm:py-24">
      <Container>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-accent">Activité du marché</p>
            <h2 id="market-pulse-title" className="mt-3 text-[2rem] font-extrabold tracking-[-0.035em] text-foreground sm:text-[2.7rem]">
              Le marché en mouvement
            </h2>
            <p className="mt-3 max-w-[650px] text-[14px] leading-7 text-muted-foreground">
              Des biens récemment observés, avec leur source et leur niveau d’information.
            </p>
          </div>
          <Link href="/search?sort=freshness" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-accent/35 px-5 text-[13px] font-extrabold text-accent transition hover:bg-accent hover:text-white">
            Voir le marché
          </Link>
        </div>

        <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-4">
          {items.map((item) => <MarketPulseCard key={item.id} item={item} />)}
        </div>
      </Container>
    </section>
  );
}
