import { cityMapPositions } from "@/lib/listings/utils";

type MapPreviewProps = {
  cityCounts: Array<{
    city: string;
    count: number;
    position?: { x: number; y: number };
  }>;
};

export function MapPreview({ cityCounts }: MapPreviewProps) {
  const displayedCities = cityCounts.slice(0, 8);

  return (
    <aside className="rounded-[1.8rem] border border-navy/10 bg-[#06172f] p-5 text-white shadow-[0_18px_65px_rgba(0,0,0,0.2)] sm:p-6">
      <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#ffb266]">
        Carte preview
      </p>
      <h2 className="mt-2 text-[1.6rem] font-bold tracking-[-0.03em]">
        Repartition des resultats
      </h2>
      <p className="mt-3 text-[14px] leading-7 text-white/72">
        Apercu visuel sans dependance externe. Les points montrent seulement les villes presentes dans les mock listings filtres.
      </p>

      <div className="relative mt-6 overflow-hidden rounded-[1.5rem] border border-white/12 bg-[radial-gradient(circle_at_65%_15%,rgba(255,255,255,0.12),transparent_20%),linear-gradient(180deg,#0b2345_0%,#06172f_100%)] p-4">
        <div className="absolute inset-0 opacity-[0.1] [background-image:linear-gradient(rgba(255,255,255,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.4)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative aspect-[1.05] overflow-hidden rounded-[1.1rem] border border-white/10">
          <img
            src="/images/morocco-map-complete-premium.png"
            alt="Carte complete du Maroc"
            className="absolute inset-0 h-full w-full object-contain p-6 opacity-90"
          />

          {displayedCities.map((entry) => {
            const position = entry.position ?? cityMapPositions[entry.city];

            if (!position) {
              return null;
            }

            return (
              <div
                key={entry.city}
                className="absolute"
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
              >
                <span className="absolute -left-3 -top-3 h-6 w-6 rounded-full bg-[#145ee8]/28 blur-sm" />
                <span className="absolute -left-1.5 -top-1.5 h-3.5 w-3.5 rounded-full bg-[#57a6ff] ring-[3px] ring-white/90" />
                <span className="absolute left-4 top-[-0.75rem] whitespace-nowrap rounded-full bg-[#041227]/84 px-2.5 py-1 text-[11px] font-bold text-white">
                  {entry.city} · {entry.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-2 text-[13px] text-white/74">
        {displayedCities.map((entry) => (
          <div
            key={entry.city}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/6 px-3 py-2"
          >
            <span>{entry.city}</span>
            <span className="font-semibold text-white">{entry.count} biens</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
