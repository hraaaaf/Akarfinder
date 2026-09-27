"use client";

import { Check } from "lucide-react";
import { PropertyTypeArtwork } from "@/components/property-types/PropertyTypeArtwork";
import type { ListingPropertyType } from "@/lib/listings/types";
import { OPTION_A_PROPERTY_TYPES } from "@/lib/property-types/presentation";
import { getIndexedPropertyTypeVisual } from "@/lib/ux/indexed-property-type-visual";

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
          const visual = getIndexedPropertyTypeVisual(item.value);
          const targetStyle = visual.targetAsset
            ? {
                backgroundColor: "#fff",
                backgroundImage: `url("${visual.targetAsset}")`,
                backgroundPosition: "center 58%",
                backgroundRepeat: "no-repeat",
                backgroundSize: "100% auto",
              }
            : { backgroundColor: visual.wash };

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onChange(item.value)}
              aria-pressed={active}
              title={item.description}
              data-property-visual-family={visual.key}
              className={`group relative min-w-[126px] snap-start overflow-hidden rounded-2xl border bg-white p-2 text-left shadow-[0_10px_30px_rgba(7,27,60,0.07)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(11,99,206,0.13)] motion-reduce:transform-none sm:min-w-[142px] ${
                active ? "" : "border-[#DCE8F5] hover:border-[#8ABCF3] dark:border-white/10"
              }`}
              style={
                active
                  ? {
                      borderColor: visual.accent,
                      boxShadow: `0 0 0 2px ${visual.accent}20, 0 10px 30px rgba(7,27,60,0.07)`,
                    }
                  : undefined
              }
            >
              <div
                className="aspect-[16/10] overflow-hidden rounded-xl border border-slate-100"
                style={targetStyle}
                aria-hidden="true"
              >
                {visual.targetAsset ? null : (
                  <PropertyTypeArtwork kind={item.value} className="h-full w-full" decorative />
                )}
              </div>
              <div className="flex items-center justify-between gap-2 px-1 pb-0.5 pt-2">
                <span className="text-[11.5px] font-extrabold text-[#0B1F3A]">{item.label}</span>
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-lg transition"
                  style={
                    active
                      ? { backgroundColor: visual.accent, color: "#fff" }
                      : { backgroundColor: visual.wash, color: visual.foreground }
                  }
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
