import { getIndexedPropertyTypeVisual } from "@/lib/ux/indexed-property-type-visual";

export function IndexedPropertyTypeArtwork({
  propertyType,
  title,
  className = "",
}: {
  propertyType: string | null | undefined;
  title?: string | null;
  className?: string;
}) {
  const visual = getIndexedPropertyTypeVisual(propertyType, title);
  return (
    <div
      data-indexed-property-artwork={visual.key}
      className={`relative h-full w-full overflow-hidden bg-white ${className}`}
      style={{ color: visual.foreground }}
      aria-hidden="true"
    >
      {visual.targetAsset ? (
        <>
          <img
            src={visual.targetAsset}
            alt=""
            className="h-full w-full object-contain object-center"
            loading="lazy"
            decoding="async"
          />
          <div
            data-indexed-artwork-label
            className="absolute left-3 top-3 rounded-[6px] px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.04em] text-white shadow-[0_1px_4px_rgba(15,23,42,0.06)] sm:left-4 sm:top-4 sm:px-2.5 sm:py-1 sm:text-[10px]"
            style={{ backgroundColor: visual.accent }}
          >
            {visual.label}
          </div>
        </>
      ) : (
        <div data-property-visual-family="unknown" className="h-full w-full bg-slate-100" />
      )}

      <style jsx global>{`
        [data-indexed-artwork-card="true"] {
          border-radius: 16px !important;
          border-color: #e6eaf0 !important;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.065) !important;
          background: #fff !important;
        }
        [data-indexed-artwork-card="true"] [data-card-image] {
          height: 190px !important;
          background: #fff !important;
          border-bottom: 1px solid #f1f3f6;
        }
        [data-indexed-artwork-card="true"] [data-card-image] > .left-2.top-2,
        [data-indexed-artwork-card="true"] [data-card-image] > .left-3.top-3,
        [data-indexed-artwork-card="true"] [data-indexed-artwork-disclosure],
        [data-indexed-artwork-card="true"] [data-card-image] > span.bottom-2.left-2,
        [data-indexed-artwork-card="true"] [data-card-image] > span.bottom-3.left-3 {
          display: none !important;
        }
        [data-indexed-artwork-card="true"] [data-card-price] {
          font-weight: 800 !important;
          letter-spacing: -0.035em !important;
          line-height: 1 !important;
          font-variant-numeric: tabular-nums;
        }
        [data-indexed-artwork-card="true"] [data-card-price] + p { display: none !important; }
        [data-indexed-artwork-card="true"] [data-card-title] {
          color: #0f172a !important;
          font-weight: 800 !important;
          letter-spacing: -0.012em !important;
        }
        [data-indexed-artwork-card="true"] [data-card-location] {
          color: #667085 !important;
          font-weight: 600 !important;
        }
        [data-indexed-artwork-card="true"] [data-card-facts] {
          gap: 0.5rem !important;
          color: #475569 !important;
          overflow: visible !important;
          font-weight: 650 !important;
        }
        [data-indexed-artwork-card="true"] [data-card-facts] > span {
          border: 0 !important;
          background: transparent !important;
          border-radius: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
        }
        [data-indexed-artwork-card="true"] [data-card-facts] > span:not(:last-child)::after {
          content: "·";
          margin-left: 0.5rem;
          color: #c7cdd6;
        }
        [data-indexed-artwork-card="true"] [data-card-provenance] {
          margin-top: 0.8rem !important;
          padding-top: 0.75rem !important;
          border-top-color: #edf0f4 !important;
          font-weight: 700 !important;
        }
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="apartment"]) [data-card-price],
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="apartment"]) [data-card-provenance] { color: #1769e0 !important; }
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="villa"]) [data-card-price],
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="villa"]) [data-card-provenance] { color: #16843a !important; }
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="land"]) [data-card-price],
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="land"]) [data-card-provenance] { color: #ea6a00 !important; }
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="office"]) [data-card-price],
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="office"]) [data-card-provenance] { color: #7352c7 !important; }
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="commercial"]) [data-card-price],
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="commercial"]) [data-card-provenance] { color: #008ca3 !important; }
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="riad"]) [data-card-price],
        [data-indexed-artwork-card="true"]:has([data-indexed-property-artwork="riad"]) [data-card-provenance] { color: #b98213 !important; }
        @media (max-width: 639px) {
          [data-indexed-artwork-card="true"] [data-card-image] { height: 164px !important; }
          [data-indexed-artwork-card="true"] [data-card-facts] {
            gap: 0.25rem !important;
            font-size: 9px !important;
          }
          [data-indexed-artwork-card="true"] [data-card-facts] > span:not(:last-child)::after {
            margin-left: 0.25rem;
          }
        }
      `}</style>
    </div>
  );
}
