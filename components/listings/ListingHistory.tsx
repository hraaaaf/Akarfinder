import { Clock } from "lucide-react";
import { formatPrice } from "@/lib/listings/utils";
import type { Listing } from "@/lib/listings/types";
import type { ListingEnrichment } from "@/lib/listings/enrichment";

type ListingHistoryProps = {
  listing: Listing;
  enrichment: ListingEnrichment;
};

type Step = { label: string; value: string; strike?: boolean; strong?: boolean };

export function ListingHistory({ listing, enrichment }: ListingHistoryProps) {
  const hasObservedHistory =
    listing.initial_price != null ||
    listing.current_price != null ||
    listing.price_change_percent != null ||
    listing.listed_at_label != null;

  if (!hasObservedHistory) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#a16207] text-white">
            <Clock size={16} strokeWidth={2} aria-hidden="true" />
          </span>
          <h2 className="text-[1.2rem] font-bold tracking-tight text-gray-900">
            Historique de l&apos;annonce
          </h2>
        </div>
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
          <p className="text-[13.5px] font-bold text-gray-700">Historique indisponible</p>
          <p className="mt-1.5 text-[12px] leading-5 text-gray-500">
            Aucune observation historique suffisamment documentée n&apos;est disponible pour cette annonce.
            AkarFinder n&apos;invente pas de prix antérieur ni de variation.
          </p>
        </div>
      </div>
    );
  }

  const { initialPrice, currentPrice, priceChangePercent } = enrichment;
  const hasChange =
    initialPrice != null &&
    currentPrice != null &&
    priceChangePercent != null &&
    priceChangePercent !== 0 &&
    initialPrice !== currentPrice;
  const dropped = hasChange && priceChangePercent! < 0;

  const changeCls = !hasChange
    ? "bg-gray-100 text-gray-500"
    : dropped
      ? "bg-[#dcfce7] text-[#16a34a]"
      : "bg-[#fee2e2] text-[#dc2626]";
  const changeLabel = !hasChange
    ? "Variation non établie"
    : `${priceChangePercent! > 0 ? "+" : ""}${priceChangePercent}%`;

  const steps: Step[] = [];

  if (listing.listed_at_label) {
    steps.push({ label: "Première observation disponible", value: listing.listed_at_label });
  }
  if (listing.updated_at_label) {
    steps.push({ label: "Dernière observation disponible", value: listing.updated_at_label });
  }
  if (initialPrice != null && hasChange) {
    steps.push({
      label: "Prix antérieur observé",
      value: formatPrice(initialPrice, listing.currency),
      strike: true,
    });
  }
  if (currentPrice != null) {
    steps.push({
      label: "Prix actuellement observé",
      value: formatPrice(currentPrice, listing.currency),
      strong: true,
    });
  }
  steps.push({ label: "Source", value: listing.source_type });

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#a16207] text-white">
            <Clock size={16} strokeWidth={2} aria-hidden="true" />
          </span>
          <h2 className="text-[1.2rem] font-bold tracking-tight text-gray-900">
            Historique de l&apos;annonce
          </h2>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${changeCls}`}>
          {changeLabel}
        </span>
      </div>

      <ol className="mt-4 space-y-0">
        {steps.map((step, i) => (
          <li key={`${step.label}-${i}`} className="relative flex items-center justify-between gap-4 pl-6">
            <span
              className="absolute left-[5px] top-0 h-full w-px bg-gray-200"
              style={{ display: i === steps.length - 1 ? "none" : undefined }}
              aria-hidden="true"
            />
            <span
              className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-[#2563eb] ring-2 ring-white"
              aria-hidden="true"
            />
            <span className="py-2.5 text-[13.5px] text-gray-500">{step.label}</span>
            <span
              className={`py-2.5 text-[13.5px] ${
                step.strong
                  ? "font-bold text-gray-900"
                  : step.strike
                    ? "font-semibold text-gray-400 line-through"
                    : "font-semibold text-gray-800"
              }`}
            >
              {step.value}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-[12px] text-gray-400">
        Historique affiché uniquement à partir des observations disponibles. Les données absentes ne sont pas reconstituées.
      </p>
    </div>
  );
}
