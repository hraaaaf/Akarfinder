import type { Listing } from "@/lib/listings/types";
import { getIndicativePricePositionDisplay } from "@/lib/price-position/price-position-display";

type PricePositionBlockProps = {
  listing: Listing;
  className?: string;
};

export function PricePositionBlock({ listing, className = "" }: PricePositionBlockProps) {
  const display = getIndicativePricePositionDisplay(listing);
  if (!display) return null;

  return (
    <div className={`rounded-2xl border border-[#fde68a] bg-[#fefce8] p-5 ${className}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#a16207]">
        {display.title}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${
          display.tone === "warning"
            ? "bg-[#fee2e2] text-[#dc2626]"
            : display.tone === "success"
              ? "bg-[#dbeafe] text-[#2563eb]"
              : "bg-[#dcfce7] text-[#166534]"
        }`}>
          {display.label}
        </span>
        {display.isImportantGap ? (
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#a16207]">
            Écart indicatif important
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-[13px] leading-6 text-gray-700">
        {display.description}
      </p>
      <p className="mt-2 text-[11.5px] font-medium leading-5 text-gray-500">
        {display.note}
      </p>
    </div>
  );
}
