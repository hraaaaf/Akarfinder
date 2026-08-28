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
        <g stroke={visual.foreground} strokeWidth="1.5" opacity="0.07">
          <path d="M228 10V180M260 10V180M292 10V180" />
          <path d="M205 44H316M205 76H316M205 108H316M205 140H316" />
        </g>
        <path d="M24 148H296" stroke={visual.foreground} strokeOpacity="0.1" strokeWidth="2" />
        <path d="M24 154H210" stroke={visual.accent} strokeOpacity="0.22" strokeWidth="4" strokeLinecap="round" />
        <path d="M236 154H296" stroke={visual.foreground} strokeOpacity="0.12" strokeWidth="4" strokeLinecap="round" />

        {visual.key === "buy" ? (
          <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round">
            <path d="M76 110V72L137 32L198 72V110" strokeWidth="5" />
            <path d="M94 110V78H180V110" strokeWidth="5" />
            <path d="M125 110V86H151V110" strokeWidth="4" />
            <circle cx="220" cy="83" r="16" strokeWidth="5" />
            <path d="M236 83H277" strokeWidth="5" />
            <path d="M258 83V96M270 83V91" strokeWidth="5" />
            <path d="M205 121H277" stroke={visual.accent} strokeWidth="4" strokeOpacity="0.72" />
          </g>
        ) : visual.key === "rent" ? (
          <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round">
            <path d="M92 118V36H177V118" strokeWidth="5" />
            <path d="M114 118V56L169 66V118" strokeWidth="5" />
            <circle cx="155" cy="88" r="3.5" fill={visual.foreground} stroke="none" />
            <path d="M190 52C212 48 227 57 230 75" strokeWidth="4" strokeOpacity="0.58" />
            <path d="M219 68L231 76L239 64" strokeWidth="4" strokeOpacity="0.58" />
            <circle cx="236" cy="101" r="14" strokeWidth="5" />
            <path d="M250 101H277" strokeWidth="5" />
            <path d="M264 101V112M274 101V108" strokeWidth="5" />
            <path d="M198 124H277" stroke={visual.accent} strokeWidth="4" strokeOpacity="0.72" />
          </g>
        ) : visual.key === "new" ? (
          <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round">
            <path d="M90 122V42M90 49H226M151 49V122" strokeWidth="5" />
            <path d="M90 66L151 49L216 66" strokeWidth="4" />
            <path d="M194 49V25H218V49" strokeWidth="5" />
            <path d="M218 25H267" strokeWidth="4" />
            <path d="M258 25V72" strokeWidth="4" />
            <path d="M253 72H263L258 83Z" fill={visual.accent} stroke="none" opacity="0.78" />
            <path d="M117 122V88H184V122" strokeWidth="5" />
            <path d="M117 104H184M139 88V122M162 88V122" strokeWidth="3.5" strokeOpacity="0.7" />
            <path d="M103 130H220" stroke={visual.accent} strokeWidth="4" strokeOpacity="0.72" />
          </g>
        ) : (
          <g stroke={visual.foreground} strokeLinecap="round" strokeLinejoin="round">
            <path d="M88 116L160 48L232 116" strokeWidth="5" />
            <path d="M110 96V126H210V96" strokeWidth="5" />
            <path d="M148 126V92H175V126" strokeWidth="4" />
            <path d="M110 134H210" stroke={visual.accent} strokeWidth="4" strokeOpacity="0.72" />
          </g>
        )}

        <g transform="translate(274 20)" stroke={visual.foreground} strokeWidth="3" strokeLinecap="round" opacity="0.26">
          <path d="M0 12L12 0L24 12" />
          <path d="M6 9V22M18 9V22" />
        </g>
      </svg>

      {showTransactionLabel ? (
        <div className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/88 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] shadow-[0_3px_10px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:left-4 sm:top-4 sm:text-[11px]">
          {visual.label}
        </div>
      ) : null}
      {showIndexedDisclosure ? (
        <div className="absolute bottom-3 left-3 text-[9px] font-extrabold uppercase tracking-[0.13em] opacity-60 sm:bottom-4 sm:left-4 sm:text-[10px]">
          AkarFinder · annonce indexée
        </div>
      ) : null}
    </div>
  );
}
