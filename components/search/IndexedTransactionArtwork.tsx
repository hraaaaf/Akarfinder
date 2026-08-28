import { getIndexedTransactionVisual } from "@/lib/ux/indexed-transaction-visual";

export function IndexedTransactionArtwork({
  transaction,
  className = "",
  showTransactionLabel = true,
  showIndexedDisclosure = true,
}: {
  transaction: string | null | undefined;
  className?: string;
  showTransactionLabel?: boolean;
  showIndexedDisclosure?: boolean;
}) {
  const visual = getIndexedTransactionVisual(transaction);
  const forcePremiumLabels = visual.key !== "unknown";
  const renderTransactionLabel = showTransactionLabel || forcePremiumLabels;
  const renderIndexedDisclosure = showIndexedDisclosure || forcePremiumLabels;

  return (
    <div
      data-indexed-transaction-artwork={visual.key}
      className={`relative h-full w-full overflow-hidden ${className}`}
      style={{ backgroundColor: visual.background, color: visual.foreground }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 320 190" className="absolute inset-0 h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
          <path d="M18 151C64 146 99 146 129 151C174 158 218 157 302 149" strokeOpacity="0.14" strokeWidth="0.8" />
          <path d="M28 159H294" strokeOpacity="0.06" strokeWidth="0.7" />
          <path d="M30 63H48M34 58C38 52 44 52 48 58M48 58C52 55 57 56 60 60" strokeOpacity="0.13" strokeWidth="0.7" />
          <path d="M260 57H278M264 52C268 46 274 46 278 52M278 52C282 49 287 50 290 54" strokeOpacity="0.11" strokeWidth="0.7" />
        </g>

        {visual.key === "buy" ? (
          <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
            <path d="M35 139V111H58V139M46 111V95H69V139M251 139V108H274V139M263 108V94H286V139" strokeOpacity="0.13" strokeWidth="0.72" />
            <path d="M82 138V89L158 47L234 89V138" strokeWidth="1.18" />
            <path d="M101 76L158 41L216 74" strokeOpacity="0.66" strokeWidth="0.82" />
            <path d="M101 138V96H216V138" strokeOpacity="0.32" strokeWidth="0.72" />
            <path d="M158 66C146 66 137 75 137 87C137 104 158 121 158 121C158 121 179 104 179 87C179 75 170 66 158 66Z" fill={visual.accent} fillOpacity="0.025" strokeWidth="1.05" />
            <circle cx="158" cy="87" r="6" strokeWidth="0.9" />
            <circle cx="125" cy="136" r="6" strokeWidth="0.9" />
            <path d="M131 136H160M149 136V142M157 136V140" strokeWidth="0.9" />
            <path d="M70 146C96 139 116 140 137 144M179 145C202 139 225 140 248 146" strokeOpacity="0.16" strokeWidth="0.72" />
          </g>
        ) : visual.key === "rent" ? (
          <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
            <path d="M39 139V106H60V139M49 106V91H70V139M247 139V101H270V139M259 101V86H282V139" strokeOpacity="0.12" strokeWidth="0.68" />
            <path d="M98 139V77C98 56 114 42 135 42H182C203 42 219 56 219 77V139" strokeOpacity="0.20" strokeWidth="0.78" />
            <path d="M117 139V68H178V139" strokeWidth="1.18" />
            <path d="M129 77L168 68V132L129 139V77Z" fill={visual.accent} fillOpacity="0.032" strokeWidth="0.9" />
            <path d="M178 68H196V139" strokeOpacity="0.40" strokeWidth="0.78" />
            <circle cx="158" cy="101" r="2.1" fill={visual.foreground} stroke="none" />
            <circle cx="223" cy="96" r="7.5" strokeWidth="0.9" />
            <path d="M231 96H255M244 96V103M252 96V101" strokeWidth="0.9" />
            <path d="M102 145C121 139 141 136 160 137C184 138 204 142 226 148" strokeOpacity="0.15" strokeWidth="0.72" />
            <path d="M76 139V124M70 139H82M76 124C70 124 67 118 70 113C73 108 79 108 82 113C85 118 82 124 76 124Z" strokeOpacity="0.13" strokeWidth="0.68" />
          </g>
        ) : visual.key === "new" ? (
          <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
            <path d="M72 142V57M65 142H79M65 57H184M72 69L112 57L150 69M112 57V142" strokeWidth="1" />
            <path d="M112 57H193M178 57V44H193V57M186 57V104" strokeWidth="0.78" />
            <path d="M186 104C186 109 182 113 177 113C172 113 168 109 168 104" strokeOpacity="0.52" strokeWidth="0.72" />
            <path d="M133 142V92H269V142M133 105H269M133 118H269M133 131H269M157 92V142M182 92V142M207 92V142M232 92V142M257 92V142" strokeOpacity="0.56" strokeWidth="0.72" />
            <path d="M133 142H280" strokeWidth="0.92" />
            <path d="M43 143V126M37 143H49M43 126C37 126 34 120 37 115C40 110 46 110 49 115C52 120 49 126 43 126Z" strokeOpacity="0.15" strokeWidth="0.68" />
            <path d="M293 143V122M286 143H300M293 122C286 122 283 115 286 110C289 105 296 105 299 110C302 115 300 122 293 122Z" strokeOpacity="0.13" strokeWidth="0.68" />
          </g>
        ) : (
          <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
            <path d="M88 139L160 67L232 139" strokeWidth="1" />
            <path d="M108 119V143H212V119M145 143V111H176V143" strokeOpacity="0.62" strokeWidth="0.78" />
          </g>
        )}
      </svg>

      {renderTransactionLabel ? (
        <div className="absolute left-3 top-3 rounded-md px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.06em] text-white shadow-[0_1px_4px_rgba(15,23,42,0.06)] sm:left-4 sm:top-4 sm:text-[10px]" style={{ backgroundColor: visual.accent }}>
          {visual.label}
        </div>
      ) : null}

      {renderIndexedDisclosure ? (
        <div className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap text-[8px] font-black uppercase tracking-[0.08em] sm:top-[18px] sm:text-[9px]" style={{ color: visual.foreground }}>
          Annonce indexée
        </div>
      ) : null}

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
        [data-indexed-artwork-card="true"] [data-card-image] > span.bottom-3.left-3 { display: none !important; }
        [data-indexed-artwork-card="true"] [data-card-price] {
          font-weight: 800 !important;
          letter-spacing: -0.035em !important;
          line-height: 1 !important;
        }
        [data-indexed-artwork-card="true"] [data-card-price] + p { display: none !important; }
        [data-indexed-artwork-card="true"]:has([data-indexed-transaction-artwork="buy"]) [data-card-price],
        [data-indexed-artwork-card="true"]:has([data-indexed-transaction-artwork="buy"]) [data-card-provenance] { color: #ea6a00 !important; }
        [data-indexed-artwork-card="true"]:has([data-indexed-transaction-artwork="rent"]) [data-card-price],
        [data-indexed-artwork-card="true"]:has([data-indexed-transaction-artwork="rent"]) [data-card-provenance] { color: #1457d9 !important; }
        [data-indexed-artwork-card="true"]:has([data-indexed-transaction-artwork="rent"]) [data-card-price]::after {
          content: " / mois";
          font-size: 0.48em;
          font-weight: 700;
          letter-spacing: 0;
        }
        [data-indexed-artwork-card="true"]:has([data-indexed-transaction-artwork="new"]) [data-card-price],
        [data-indexed-artwork-card="true"]:has([data-indexed-transaction-artwork="new"]) [data-card-provenance] { color: #16813a !important; }
        [data-indexed-artwork-card="true"] [data-card-title] {
          color: #0f172a !important;
          font-weight: 800 !important;
          letter-spacing: -0.012em !important;
        }
        [data-indexed-artwork-card="true"] [data-card-location] { color: #667085 !important; font-weight: 600 !important; }
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
        [data-indexed-artwork-card="true"] [data-card-provenance] > span:first-child { font-size: 0 !important; }
        [data-indexed-artwork-card="true"] [data-card-provenance] > span:first-child::after {
          content: "Annonce indexée";
          font-size: 10.5px;
          font-weight: 800;
        }
        [data-indexed-artwork-card="true"] [data-card-provenance] [data-public-attribution] { font-size: 0 !important; color: inherit !important; }
        [data-indexed-artwork-card="true"] [data-card-provenance] [data-public-attribution]::after {
          content: "Voir sur la source ↗";
          font-size: 10.5px;
          font-weight: 800;
        }
        [data-indexed-artwork-card="true"] [data-card-primary-action] { display: none !important; }
        @media (min-width: 640px) {
          [data-indexed-artwork-card="true"] > div.flex.flex-1 { padding: 1rem 1rem 0.9rem !important; }
        }
        @media (max-width: 639px) {
          [data-indexed-artwork-card="true"] { border-radius: 14px !important; }
          [data-indexed-artwork-card="true"] [data-card-image] { height: 154px !important; }
          [data-indexed-artwork-card="true"] [data-card-provenance] > span:first-child::after,
          [data-indexed-artwork-card="true"] [data-card-provenance] [data-public-attribution]::after { font-size: 9px; }
        }
      `}</style>
    </div>
  );
}
