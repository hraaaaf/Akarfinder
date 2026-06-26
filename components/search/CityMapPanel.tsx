type CityMapPanelProps = {
  city: string;
  listingCount: number;
};

type MapMarker = {
  label: string;
  x: number;
  y: number;
  color: string;
};

const cityMarkers: Record<string, MapMarker[]> = {
  Casablanca: [
    { label: "Maârif", x: 48, y: 39, color: "#C2A368" },
    { label: "Anfa", x: 42, y: 43, color: "#57a6ff" },
    { label: "Bouskoura", x: 52, y: 49, color: "#34d399" },
  ],
  Rabat: [
    { label: "Agdal", x: 53, y: 31, color: "#57a6ff" },
    { label: "Hay Riad", x: 58, y: 35, color: "#34d399" },
    { label: "Souissi", x: 61, y: 32, color: "#C2A368" },
  ],
  Marrakech: [
    { label: "Guéliz", x: 45, y: 52, color: "#C2A368" },
    { label: "Hivernage", x: 48, y: 55, color: "#57a6ff" },
    { label: "Palmeraie", x: 52, y: 49, color: "#34d399" },
  ],
  Tanger: [
    { label: "Malabata", x: 55, y: 18, color: "#57a6ff" },
    { label: "Centre", x: 51, y: 21, color: "#C2A368" },
    { label: "Achakar", x: 47, y: 20, color: "#34d399" },
  ],
  Agadir: [
    { label: "Founty", x: 39, y: 66, color: "#C2A368" },
    { label: "Centre", x: 42, y: 63, color: "#57a6ff" },
    { label: "Tilila", x: 45, y: 65, color: "#34d399" },
  ],
  Fes: [
    { label: "Médina", x: 64, y: 31, color: "#C2A368" },
    { label: "Saïss", x: 66, y: 36, color: "#34d399" },
    { label: "Ville Nouvelle", x: 62, y: 34, color: "#57a6ff" },
  ],
};

const defaultMarkers: MapMarker[] = [
  { label: "Casablanca", x: 50, y: 38, color: "#C2A368" },
  { label: "Rabat", x: 53, y: 30, color: "#57a6ff" },
  { label: "Marrakech", x: 46, y: 52, color: "#34d399" },
  { label: "Tanger", x: 55, y: 18, color: "#f97316" },
  { label: "Agadir", x: 39, y: 66, color: "#eab308" },
];

export function CityMapPanel({ city, listingCount }: CityMapPanelProps) {
  const markers = city === "all" ? defaultMarkers : cityMarkers[city] ?? defaultMarkers;
  const displayCity = city === "all" ? "Maroc" : city;

  return (
    <aside className="overflow-hidden rounded-[1.5rem] border border-[#eadfca] bg-white shadow-[0_14px_38px_rgba(8,23,47,0.10)]">
      <div className="border-b border-[#eadfca] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#9B7838]">
              Carte de recherche
            </p>
            <h2 className="mt-1 text-[1.35rem] font-extrabold tracking-[-0.03em] text-[#071B33]">
              {displayCity}
            </h2>
            <p className="mt-1 text-[13.5px] font-semibold text-gray-500">
              {listingCount} annonce{listingCount > 1 ? "s" : ""} analysée{listingCount > 1 ? "s" : ""}
            </p>
          </div>
          <span className="rounded-full bg-[#f7f3ea] px-3 py-1.5 text-[11px] font-bold text-gray-500">
            Aperçu
          </span>
        </div>
      </div>

      <div className="relative min-h-[430px] bg-[#071B33] lg:min-h-[610px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(202,163,93,0.20),transparent_34%),linear-gradient(145deg,#071B33,#123d68)]" />
        <div className="absolute inset-0 opacity-[0.10] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:26px_26px]" />
        <img
          src="/images/morocco-map-complete-premium.png"
          alt="Carte indicative du Maroc"
          className="absolute left-1/2 top-1/2 h-[82%] -translate-x-1/2 -translate-y-1/2 object-contain opacity-72 mix-blend-screen"
        />

        {markers.map((marker) => (
          <div
            key={marker.label}
            className="absolute"
            style={{ left: `${marker.x}%`, top: `${marker.y}%`, transform: "translate(-50%, -50%)" }}
          >
            <span
              className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-35 blur-md"
              style={{ backgroundColor: marker.color }}
            />
            <span
              className="relative block h-4 w-4 rounded-full border-2 border-white shadow-[0_3px_12px_rgba(0,0,0,.35)]"
              style={{ backgroundColor: marker.color }}
            />
            <span className="absolute left-5 top-[-0.55rem] whitespace-nowrap rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-extrabold text-[#071B33] shadow-sm">
              {marker.label}
            </span>
          </div>
        ))}

        <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/15 bg-[#06172f]/84 p-4 text-white backdrop-blur">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#C2A368]">
            Repères indicatifs
          </p>
          <p className="mt-1 text-[13px] leading-6 text-white/74">
            Les points indiquent les zones où des annonces sont disponibles. La position peut être approximative selon la précision des données.
          </p>
        </div>
      </div>
    </aside>
  );
}
