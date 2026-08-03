"use client";

import { Check } from "lucide-react";
import { PropertyTypeArtwork } from "@/components/property-types/PropertyTypeArtwork";
import type { ListingPropertyType } from "@/lib/listings/types";
import { OPTION_A_PROPERTY_TYPES } from "@/lib/property-types/presentation";

type PropertyTypeVisualSelectorProps = {
  value: "all" | ListingPropertyType | "";
  onChange: (value: "all" | ListingPropertyType) => void;
  showAll?: boolean;
  className?: string;
  ariaLabel?: string;
};

export function PropertyTypeVisualSelector({
  value,
  onChange,
  showAll = false,
  className = "",
  ariaLabel = "Type de bien",
}: PropertyTypeVisualSelectorProps) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
          {ariaLabel}
        </p>
        {showAll ? (
          <button
            type="button"
            onClick={() => onChange("all")}
            aria-pressed={value === "all" || value === ""}
            className={
              value === "all" || value === ""
                ? "rounded-full border border-[#0B63CE]/35 bg-[#0B63CE]/10 px-3 py-1.5 text-[11px] font-extrabold text-[#0B63CE]"
                : "rounded-full border border-border/20 bg-card px-3 py-1.5 text-[11px] font-bold text-muted-foreground transition hover:border-[#0B63CE]/35 hover:text-[#0B63CE] dark:border-white/10 dark:bg-white/[0.04]"
            }
          >
            Tous les biens
          </button>
        ) : null}
      </div>

      <div
        role="group"
        aria-label={ariaLabel}
        className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {OPTION_A_PROPERTY_TYPES.map((item) => {
          const active = value === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              aria-pressed={active}
              title={item.description}
              className={`group relative min-w-[126px] snap-start overflow-hidden rounded-2xl border bg-white p-2 text-left shadow-[0_10px_30px_rgba(7,27,60,0.07)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(11,99,206,0.13)] motion-reduce:transform-none sm:min-w-[142px] ${
                active
                  ? "border-[#0B63CE] ring-2 ring-[#0B63CE]/15"
                  : "border-[#DCE8F5] hover:border-[#8ABCF3] dark:border-white/10"
              }`}
            >
              <div className="aspect-[16/10] overflow-hidden rounded-xl bg-[#F7FAFF]">
                <PropertyTypeArtwork kind={item.value} className="h-full w-full" decorative />
              </div>
              <div className="flex items-center justify-between gap-2 px-1 pb-0.5 pt-2">
                <span className="text-[11.5px] font-extrabold text-[#0B1F3A]">{item.label}</span>
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg transition ${
                    active
                      ? "bg-[#0B63CE] text-white"
                      : "bg-[#EEF6FF] text-[#0B63CE] group-hover:bg-[#0B63CE] group-hover:text-white"
                  }`}
                  aria-hidden="true"
                >
                  {active ? <Check size={13} strokeWidth={3} /> : "→"}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
