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
      <svg
        viewBox="0 0 320 190"
        className="absolute inset-0 h-full w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {visual.key === "buy" ? (
          <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
            {/* Context copied from the approved mockup: faint skyline + horizon. */}
            <g strokeOpacity="0.13" strokeWidth="0.72">
              <path d="M20 143V105H44V143M31 105V87H55V143" />
              <path d="M56 143V123H76V143M68 123V111H88V143" />
              <path d="M244 143V116H268V143M257 116V99H282V143M282 143V125H299V143" />
              <path d="M30 64H53M34 60C38 53 46 53 50 60M50 60C55 56 61 57 64 62" />
              <path d="M260 60H282M264 56C268 49 276 49 280 56M280 56C284 53 290 54 293 59" />
            </g>

            {/* House: intentionally centered and compact like the reference. */}
            <path d="M99 137V86L160 51L221 86V137" strokeWidth="1.15" />
            <path d="M89 78L160 38L232 78" strokeWidth="0.92" strokeOpacity="0.72" />
            <path d="M111 137V96H209V137" strokeWidth="0.72" strokeOpacity="0.28" />

            {/* Pin. */}
            <path
              d="M160 71C148 71 139 80 139 92C139 108 160 126 160 126C160 126 181 108 181 92C181 80 172 71 160 71Z"
              fill={visual.accent}
              fillOpacity="0.018"
              strokeWidth="1.05"
            />
            <circle cx="160" cy="92" r="6.4" strokeWidth="0.9" />

            {/* Key, directly below the house as in the mockup. */}
            <circle cx="145" cy="140" r="6.2" strokeWidth="0.92" />
            <path d="M151 140H182M168 140V146M177 140V144" strokeWidth="0.92" />

            {/* Soft ground curves. */}
            <path d="M23 145C62 143 88 136 111 136C130 136 142 140 154 143" strokeOpacity="0.15" strokeWidth="0.72" />
            <path d="M173 143C193 138 216 137 240 141C259 144 277 145 298 144" strokeOpacity="0.15" strokeWidth="0.72" />
            <path d="M25 153H296" strokeOpacity="0.055" strokeWidth="0.65" />
          </g>
        ) : visual.key === "rent" ? (
          <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
            {/* City context. */}
            <g strokeOpacity="0.13" strokeWidth="0.7">
              <path d="M27 142V111H49V142M38 111V94H62V142" />
              <path d="M66 142V122H84V142" />
              <path d="M235 142V109H258V142M247 109V91H273V142M274 142V121H296V142" />
              <path d="M29 63H51M34 58C38 52 45 52 49 58M49 58C54 55 60 56 63 61" />
              <path d="M252 61H275M258 56C262 50 269 50 273 56M273 56C278 53 284 54 287 59" />
              <path d="M73 141V124M67 141H79M73 124C67 124 64 118 67 113C70 108 76 108 79 113C82 118 79 124 73 124Z" />
              <path d="M286 141V126M280 141H292M286 126C280 126 277 120 280 115C283 110 289 110 292 115C295 120 292 126 286 126Z" />
            </g>

            {/* Arched entry shell. */}
            <path d="M103 141V79C103 56 119 41 141 41H178C200 41 216 56 216 79V141" strokeOpacity="0.22" strokeWidth="0.82" />

            {/* Door frame and open leaf, matching the reference silhouette. */}
            <path d="M123 141V69H178V141" strokeWidth="1.12" />
            <path d="M136 78L166 70V133L136 141V78Z" fill={visual.accent} fillOpacity="0.085" strokeWidth="0.94" />
            <path d="M178 69H194V141" strokeOpacity="0.38" strokeWidth="0.78" />
            <circle cx="159" cy="103" r="2.1" fill={visual.foreground} stroke="none" />

            {/* Small key to the right of the door. */}
            <circle cx="220" cy="100" r="7.1" strokeWidth="0.9" />
            <path d="M227 100H250M239 100V107M247 100V105" strokeWidth="0.9" />

            <path d="M91 148C116 140 141 136 162 137C187 138 207 143 231 150" strokeOpacity="0.15" strokeWidth="0.72" />
            <path d="M25 153H296" strokeOpacity="0.055" strokeWidth="0.65" />
          </g>
        ) : visual.key === "new" ? (
          <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
            {/* Faint skyline/landscape behind the construction site. */}
            <g strokeOpacity="0.12" strokeWidth="0.68">
              <path d="M23 143V121H40V143M40 143V110H58V143" />
              <path d="M262 143V116H281V143M282 143V128H298V143" />
              <path d="M29 62H52M34 57C38 51 45 51 49 57M49 57C54 54 60 55 63 60" />
              <path d="M258 61H281M263 56C267 50 274 50 278 56M278 56C283 53 289 54 292 59" />
              <path d="M24 143C62 142 91 143 117 146M202 146C230 142 258 142 298 144" />
            </g>

            {/* Detailed crane tower, rebuilt from the reference. */}
            <path d="M74 145V55M65 145H84M68 55H190" strokeWidth="0.98" />
            <path d="M74 55L116 38L159 55M116 38V145" strokeWidth="0.94" />
            <path d="M74 55L116 72L74 88L116 104L74 120L116 136" strokeOpacity="0.66" strokeWidth="0.68" />
            <path d="M116 55L74 72L116 88L74 104L116 120L74 136" strokeOpacity="0.66" strokeWidth="0.68" />
            <path d="M116 55H196M182 55V42H196V55" strokeWidth="0.8" />
            <path d="M188 55V97" strokeWidth="0.76" />
            <path d="M188 97C188 103 184 107 179 107C174 107 170 103 170 97" strokeWidth="0.7" strokeOpacity="0.55" />
            <path d="M67 145H122" strokeWidth="0.9" />

            {/* Construction frame to the right. */}
            <path d="M147 145V93H276V145" strokeWidth="0.8" />
            <path d="M147 107H276M147 120H276M147 133H276" strokeOpacity="0.62" strokeWidth="0.68" />
            <path d="M171 93V145M197 93V145M223 93V145M249 93V145" strokeOpacity="0.62" strokeWidth="0.68" />
            <path d="M147 145H288" strokeWidth="0.9" />

            {/* Trees at both sides. */}
            <g strokeOpacity="0.15" strokeWidth="0.68">
              <path d="M35 145V126M29 145H41M35 126C29 126 26 120 29 115C32 110 38 110 41 115C44 120 41 126 35 126Z" />
              <path d="M296 145V123M289 145H303M296 123C289 123 286 116 289 111C292 106 299 106 302 111C305 116 303 123 296 123Z" />
            </g>
            <path d="M25 153H297" strokeOpacity="0.055" strokeWidth="0.65" />
          </g>
        ) : (
          <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
            <path d="M88 139L160 67L232 139" strokeWidth="1" />
            <path d="M108 119V143H212V119M145 143V111H176V143" strokeOpacity="0.62" strokeWidth="0.78" />
          </g>
        )}
      </svg>

      {renderTransactionLabel ? (
        <div
          className="absolute left-3 top-3 rounded-md px-2 py-0.5 text-[7px] font-black uppercase tracking-[0.055em] text-white shadow-[0_1px_4px_rgba(15,23,42,0.06)] sm:left-4 sm:top-4 sm:px-2.5 sm:py-1 sm:text-[10px] sm:tracking-[0.06em]"
          style={{ backgroundColor: visual.accent }}
        >
          {visual.label}
        </div>
      ) : null}

      {renderIndexedDisclosure ? (
        <div
          className="absolute right-3 top-[14px] whitespace-nowrap text-[6.5px] font-black uppercase tracking-[0.035em] sm:left-1/2 sm:right-auto sm:top-[18px] sm:-translate-x-1/2 sm:text-[9px] sm:tracking-[0.08em]"
          style={{ color: visual.foreground }}
        >
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
          font-variant-numeric: tabular-nums;
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
        [data-indexed-artwork-card="true"] [data-card-provenance] > span:first-child {
          flex: 0 0 auto;
          font-size: 0 !important;
        }
        [data-indexed-artwork-card="true"] [data-card-provenance] > span:first-child::after {
          content: "Annonce indexée";
          font-size: 10.5px;
          font-weight: 800;
        }
        [data-indexed-artwork-card="true"] [data-card-provenance] [data-public-attribution] {
          flex: 0 0 auto;
          max-width: none !important;
          overflow: visible !important;
          text-overflow: clip !important;
          white-space: nowrap !important;
          font-size: 0 !important;
          color: inherit !important;
        }
        [data-indexed-artwork-card="true"] [data-card-provenance] [data-public-attribution]::after {
          content: "Voir sur la source ↗";
          font-size: 10.5px;
          font-weight: 800;
        }
        [data-indexed-artwork-card="true"] [data-card-primary-action] { display: none !important; }
        [data-indexed-artwork-card="true"] [data-card-provenance] ~ a { display: none !important; }
        @media (min-width: 640px) {
          [data-indexed-artwork-card="true"] > div.flex.flex-1 { padding: 1rem 1rem 0.9rem !important; }
        }
        @media (max-width: 639px) {
          [data-indexed-artwork-card="true"] { border-radius: 14px !important; }
          [data-indexed-artwork-card="true"] [data-card-image] { height: 154px !important; }
          [data-indexed-artwork-card="true"] [data-card-provenance] {
            gap: 4px !important;
            margin-top: 0.7rem !important;
            padding-top: 0.65rem !important;
          }
          [data-indexed-artwork-card="true"] [data-card-provenance] > span:first-child::after,
          [data-indexed-artwork-card="true"] [data-card-provenance] [data-public-attribution]::after {
            font-size: 7.5px;
            letter-spacing: -0.01em;
          }
        }
      `}</style>
    </div>
  );
}
