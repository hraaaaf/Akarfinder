type NeighborhoodVisualIdentityOverlayProps = {
  neighborhood: string;
  city: string;
  descriptors: readonly string[];
  disclosureLabel?: string;
};

export function NeighborhoodVisualIdentityOverlay({
  neighborhood,
  city,
  descriptors,
  disclosureLabel = "Photo d’ambiance",
}: NeighborhoodVisualIdentityOverlayProps) {
  const visibleDescriptors = descriptors.slice(0, 3);

  return (
    <>
      <div
        aria-hidden="true"
        data-neighborhood-template-a-overlay
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(3,16,31,0.46),rgba(3,16,31,0.12)_54%,rgba(255,255,255,0.02))]"
      />
      <div className="pointer-events-none absolute bottom-8 left-2 right-2 text-white sm:bottom-11 sm:left-3 sm:right-3">
        <p
          data-neighborhood-template-a-title
          className="truncate text-[11px] font-black uppercase tracking-[0.08em] drop-shadow-[0_1px_4px_rgba(0,0,0,0.7)] sm:text-[14px]"
        >
          {neighborhood}
        </p>
        <p className="mt-0.5 text-[8px] font-semibold text-white/82 sm:text-[10px]">{city}</p>
        <p
          data-neighborhood-template-a-descriptors
          className="mt-1 hidden truncate text-[8px] font-semibold text-white/88 sm:block sm:text-[9px]"
        >
          {visibleDescriptors.join(" • ")}
        </p>
      </div>
      <span
        data-neighborhood-template-a-disclosure
        className="absolute bottom-2 right-2 rounded-full bg-deepblue/82 px-1.5 py-0.5 text-[8px] font-semibold text-white/95 ring-1 ring-white/10 backdrop-blur-sm sm:bottom-3 sm:right-3 sm:px-2 sm:py-1 sm:text-[9px]"
      >
        {disclosureLabel}
      </span>
    </>
  );
}
