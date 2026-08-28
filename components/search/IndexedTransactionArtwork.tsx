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
        <circle cx="268" cy="34" r="72" fill={visual.accent} opacity="0.09" />
        <circle cx="40" cy="168" r="54" fill={visual.foreground} opacity="0.06" />
        <path
          d="M-10 154C52 123 96 129 146 151C198 175 247 174 330 132"
          stroke={visual.foreground}
          strokeOpacity="0.12"
          strokeWidth="2"
        />
        <path
          d="M-8 166C54 135 102 141 154 163C208 186 258 183 330 145"
          stroke={visual.foreground}
          strokeOpacity="0.08"
          strokeWidth="2"
        />

        {visual.key === "buy" ? (
          <g stroke={visual.foreground} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M89 108V72L145 34L201 72V108" />
            <path d="M106 108V82H184V108" />
            <circle cx="222" cy="95" r="15" />
            <path d="M237 95H273M260 95V107M270 95V103" />
          </g>
        ) : visual.key === "rent" ? (
          <g stroke={visual.foreground} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M101 118V38H183V118" />
            <path d="M122 118V60H169V118" />
            <circle cx="158" cy="90" r="3" fill={visual.foreground} stroke="none" />
            <circle cx="222" cy="83" r="15" />
            <path d="M237 83H273M260 83V95M270 83V91" />
          </g>
        ) : visual.key === "new" ? (
          <g stroke={visual.foreground} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M104 122V42M104 49H220M160 49V122" />
            <path d="M104 65L160 49L215 65" />
            <path d="M194 49V29H218V49" />
            <path d="M132 122V90H187V122" />
          </g>
        ) : (
          <g stroke={visual.foreground} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M97 114L160 54L223 114" />
            <path d="M115 101V124H205V101" />
            <path d="M151 124V95H174V124" />
          </g>
        )}
      </svg>

      {showTransactionLabel ? (
        <div className="absolute left-3 top-3 rounded-full bg-white/82 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur-sm sm:left-4 sm:top-4 sm:text-[11px]">
          {visual.label}
        </div>
      ) : null}
      {showIndexedDisclosure ? (
        <div className="absolute bottom-3 left-3 text-[9px] font-bold uppercase tracking-[0.12em] opacity-65 sm:bottom-4 sm:left-4 sm:text-[10px]">
          AkarFinder · annonce indexée
        </div>
      ) : null}
    </div>
  );
}