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
      style={{ backgroundColor: "#fff", color: visual.foreground }}
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
            {/* Faint skyline and clouds from the approved reference. */}
            <g strokeOpacity="0.14" strokeWidth="0.7">
              <path d="M18 151H61M35 151V109H57V151M57 151V125H78V151M47 109H68" />
              <path d="M242 151V128H266V151M266 151V112H287V151M287 151V132H301V151" />
              <path d="M34 72H58M39 68C43 61 50 61 54 68M54 68C58 65 64 66 67 70" />
              <path d="M252 70H278M258 66C262 59 270 59 274 66M274 66C279 63 285 64 288 69" />
            </g>

            {/* House: lower, narrower and softer, matching the mockup proportions. */}
            <path d="M116 149V100L174 69L227 100V149" strokeWidth="1.05" />
            <path d="M108 94L174 61L235 94" strokeWidth="0.8" strokeOpacity="0.72" />
            <path d="M126 149V108H217V149" strokeWidth="0.66" strokeOpacity="0.2" />

            {/* Location pin. */}
            <path
              d="M174 93C163 93 155 101 155 112C155 127 174 143 174 143C174 143 193 127 193 112C193 101 185 93 174 93Z"
              fill={visual.accent}
              fillOpacity="0.012"
              strokeWidth="0.98"
            />
            <circle cx="174" cy="112" r="5.8" strokeWidth="0.82" />

            {/* Key tucked into the horizon, as in the approved drawing. */}
            <circle cx="158" cy="151" r="6" strokeWidth="0.9" />
            <path d="M164 151H191M178 151V156M187 151V155" strokeWidth="0.9" />

            {/* Soft terrain curves. */}
            <path d="M21 153C57 153 76 146 96 145C112 145 123 149 135 151" strokeOpacity="0.22" strokeWidth="0.7" />
            <path d="M201 151C219 147 236 146 251 149C269 153 284 153 300 152" strokeOpacity="0.2" strokeWidth="0.7" />
            <path d="M26 161H296" strokeOpacity="0.055" strokeWidth="0.62" />
          </g>
        ) : visual.key === "rent" ? (
          <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
            {/* City context: intentionally pale and asymmetric like the target. */}
            <g strokeOpacity="0.14" strokeWidth="0.68">
              <path d="M21 151H89M39 151V120H58V151M58 151V137H77V151" />
              <path d="M211 151V126H232V151M232 151V108H258V151M258 151V129H280V151M280 151V116H298V151" />
              <path d="M33 75H59M39 70C43 63 51 63 55 70" />
              <path d="M239 70H269M245 65C249 59 256 59 260 65M260 65C264 62 270 63 273 67" />
              <path d="M82 151V133M76 151H88M82 133C76 133 73 127 76 122C79 117 85 117 88 122C91 127 88 133 82 133Z" />
              <path d="M286 151V135M280 151H292M286 135C280 135 277 129 280 124C283 119 289 119 292 124C295 129 292 135 286 135Z" />
            </g>

            {/* Double arched shell from the reference. */}
            <path d="M112 151V91C112 68 128 53 151 53H169C192 53 208 68 208 91V151" strokeWidth="0.86" />
            <path d="M118 151V92C118 73 131 60 151 60H169C189 60 202 73 202 92V151" strokeOpacity="0.34" strokeWidth="0.68" />

            {/* Open door: strong cobalt plane with the same narrow perspective. */}
            <path d="M135 151V94H177V151" strokeWidth="1.0" />
            <path d="M143 100L172 95V145L143 151V100Z" fill={visual.accent} fillOpacity="0.92" strokeWidth="0.88" />
            <path d="M177 94H190V151" strokeOpacity="0.36" strokeWidth="0.7" />
            <circle cx="158" cy="122" r="1.9" fill="#fff" stroke="none" />
            <path d="M153 122H159M156 119V125" stroke="#fff" strokeWidth="0.72" />

            {/* Small vertical key at the right of the door, matching the approved reference. */}
            <circle cx="214" cy="116" r="5" strokeWidth="0.82" />
            <path d="M214 121V139M214 130H220M214 135H218" strokeWidth="0.82" />

            {/* Entrance path kept subtle beneath the door. */}
            <path d="M143 151L137 165" strokeWidth="0.86" />
            <path d="M172 146C178 153 188 157 202 159C220 162 238 162 257 162" strokeWidth="0.82" strokeOpacity="0.72" />
            <path d="M22 160H92M262 160H299" strokeOpacity="0.07" strokeWidth="0.62" />
          </g>
        ) : visual.key === "new" ? (
          <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
            {/* Pale surroundings from the approved construction illustration. */}
            <g strokeOpacity="0.13" strokeWidth="0.66">
              <path d="M20 156H57M32 156V132H49V156M49 156V143H63V156" />
              <path d="M266 156V136H284V156" />
              <path d="M253 76H282M259 71C263 65 270 65 274 71M274 71C279 68 284 69 287 73" />
              <path d="M292 156V136M286 156H298M292 136C286 136 283 130 286 125C289 120 295 120 298 125C301 130 298 136 292 136Z" />
            </g>

            {/* Crane: compact lattice tower + triangular boom, traced to the target. */}
            <path d="M76 156V79H96V156" strokeWidth="0.9" />
            <path d="M76 79L86 62L96 79" strokeWidth="0.9" />
            <path d="M58 79H159" strokeWidth="0.9" />
            <path d="M58 79V86H70V79M149 79H159" strokeWidth="0.82" />
            <path d="M86 62L114 79M86 62L58 79" strokeWidth="0.78" />
            <path d="M96 79L110 72L124 79L137 72L151 79" strokeOpacity="0.7" strokeWidth="0.65" />
            <path d="M76 79L96 94L76 109L96 124L76 139L96 154" strokeOpacity="0.68" strokeWidth="0.64" />
            <path d="M96 79L76 94L96 109L76 124L96 139L76 154" strokeOpacity="0.68" strokeWidth="0.64" />
            <path d="M67 156H106M72 156V161H101V156" strokeWidth="0.82" />

            {/* Hook beneath the boom. */}
            <path d="M139 79V111" strokeWidth="0.7" />
            <path d="M139 111C139 116 136 119 132 119C128 119 125 116 125 112" strokeOpacity="0.65" strokeWidth="0.68" />

            {/* Open construction grid, deliberately lighter than the crane. */}
            <path d="M126 156V119M126 156H267" strokeWidth="0.78" />
            <path d="M151 111V156M176 106V156M202 102V156M228 108V156M253 116V156" strokeWidth="0.72" />
            <path d="M126 132H263M126 145H263" strokeOpacity="0.72" strokeWidth="0.66" />

            <path d="M22 163H297" strokeOpacity="0.06" strokeWidth="0.62" />
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