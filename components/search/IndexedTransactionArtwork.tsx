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
        <circle cx="274" cy="30" r="62" fill={visual.accent} opacity="0.035" />
        <circle cx="40" cy="166" r="46" fill={visual.foreground} opacity="0.025" />

        <g
          stroke={visual.foreground}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        >
          <path d="M12 150C62 140 95 141 128 149C173 160 211 159 308 145" strokeOpacity="0.16" strokeWidth="1.25" />
          <path d="M24 161H297" strokeOpacity="0.10" strokeWidth="1" />
          <path d="M28 67H48M34 60C38 53 45 53 49 60M47 60C51 56 57 57 60 62" strokeOpacity="0.17" strokeWidth="1.1" />
          <path d="M258 57H280M264 51C268 44 276 45 279 52M278 52C283 48 289 50 291 55" strokeOpacity="0.14" strokeWidth="1.1" />
        </g>

        {visual.key === "buy" ? (
          <>
            <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
              <path d="M22 139V102H50V139M36 102V85H64V139M270 139V105H296V139M282 105V91H304V139" strokeOpacity="0.16" strokeWidth="1.15" />
              <path d="M72 139V81L151 38L230 81V139" strokeWidth="2.2" />
              <path d="M92 69L151 31L211 65" strokeOpacity="0.72" strokeWidth="1.4" />
              <path d="M93 139V91H209V139" strokeOpacity="0.45" strokeWidth="1.25" />
              <path d="M151 59C138 59 128 69 128 82C128 101 151 119 151 119C151 119 174 101 174 82C174 69 164 59 151 59Z" fill={visual.accent} fillOpacity="0.055" strokeWidth="2" />
              <circle cx="151" cy="82" r="7" strokeWidth="1.7" />
              <circle cx="116" cy="135" r="7" strokeWidth="1.7" />
              <path d="M123 135H154M142 135V142M151 135V140" strokeWidth="1.7" />
              <path d="M62 145C88 136 106 137 129 143M171 144C194 137 219 138 247 145" strokeOpacity="0.25" strokeWidth="1.2" />
            </g>
          </>
        ) : visual.key === "rent" ? (
          <>
            <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
              <path d="M28 139V99H51V139M39 99V84H61V139M255 139V91H278V139M269 91V76H294V139" strokeOpacity="0.14" strokeWidth="1.1" />
              <path d="M96 139V72C96 49 113 34 136 34H184C207 34 224 49 224 72V139" strokeOpacity="0.28" strokeWidth="1.4" />
              <path d="M115 139V61H179V139" strokeWidth="2.15" />
              <path d="M128 72L169 62V132L128 139V72Z" fill={visual.accent} fillOpacity="0.075" strokeWidth="1.7" />
              <path d="M179 61H198V139" strokeOpacity="0.55" strokeWidth="1.3" />
              <circle cx="158" cy="101" r="2.8" fill={visual.foreground} stroke="none" />
              <circle cx="225" cy="92" r="9" strokeWidth="1.8" />
              <path d="M234 92H259M248 92V101M256 92V98" strokeWidth="1.8" />
              <path d="M102 145C120 136 141 133 163 134C188 135 209 141 230 148" strokeOpacity="0.23" strokeWidth="1.3" />
              <path d="M57 137C57 128 63 121 72 121C81 121 87 128 87 137M71 121V105" strokeOpacity="0.18" strokeWidth="1.1" />
            </g>
          </>
        ) : visual.key === "new" ? (
          <>
            <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
              <path d="M62 142V52M55 142H70M55 52H185M62 65L110 52L151 65M110 52V142" strokeWidth="1.9" />
              <path d="M110 52H189M174 52V39H189V52M183 52V106" strokeWidth="1.35" />
              <path d="M181 106C181 112 176 116 170 116C164 116 159 112 159 106" strokeOpacity="0.65" strokeWidth="1.25" />
              <path d="M129 142V89H267V142M129 103H267M129 118H267M129 132H267M154 89V142M181 89V142M208 89V142M236 89V142" strokeOpacity="0.72" strokeWidth="1.25" />
              <path d="M129 142H279" strokeWidth="1.8" />
              <path d="M38 143V124M30 143H46M38 124C30 124 27 116 31 110C34 104 42 104 45 110C49 116 46 124 38 124Z" strokeOpacity="0.20" strokeWidth="1.1" />
              <path d="M291 143V120M283 143H299M291 120C283 120 280 112 284 106C287 100 295 100 298 106C302 112 299 120 291 120Z" strokeOpacity="0.18" strokeWidth="1.1" />
            </g>
          </>
        ) : (
          <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
            <path d="M84 139L160 61L236 139" strokeWidth="2" />
            <path d="M105 118V143H215V118M145 143V108H176V143" strokeOpacity="0.75" strokeWidth="1.6" />
            <path d="M44 150C82 137 111 139 139 147M181 147C214 138 247 139 280 149" strokeOpacity="0.20" strokeWidth="1.2" />
          </g>
        )}
      </svg>

      {showTransactionLabel ? (
        <div
          className="absolute left-3 top-3 rounded-md px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-sm sm:left-4 sm:top-4 sm:text-[11px]"
          style={{ backgroundColor: visual.accent }}
        >
          {visual.label}
        </div>
      ) : null}
      {showIndexedDisclosure ? (
        <div
          className="absolute right-3 top-3 text-[9px] font-black uppercase tracking-[0.08em] sm:right-4 sm:top-4 sm:text-[10px]"
          style={{ color: visual.foreground }}
        >
          Annonce indexée
        </div>
      ) : null}
    </div>
  );
}
