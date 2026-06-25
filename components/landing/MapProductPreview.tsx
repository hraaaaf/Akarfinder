import Image from "next/image";
import { mockListings } from "@/lib/listings/mock-listings";

// Static, honest product preview: the Light Zillow Morocco surface
// (premium map + a real photo-first listing card + reliability + WhatsApp).
// No live data, no fake numbers; it mirrors what /search and /listings show.
export function MapProductPreview() {
  const listing = mockListings[0];

  const zones = [
    { label: "Rabat", x: 52, y: 27, color: "#57a6ff" },
    { label: "Casablanca", x: 49, y: 35, color: "#34d399" },
    { label: "Marrakech", x: 45, y: 49, color: "#fbbf24" }
  ];

  return (
    <div className="relative">
      <div
        className="relative h-[360px] overflow-hidden rounded-3xl ring-1 ring-white/10 shadow-[0_30px_70px_rgba(15,40,80,0.34)] sm:h-[440px]"
        style={{ background: "linear-gradient(160deg, #11264a 0%, #1e3a5f 55%, #0f1f3a 100%)" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_70%_15%,rgba(56,189,248,0.18),transparent_60%)]" />
        <Image
          src="/images/morocco-map-complete-premium.png"
          alt="Carte du Maroc"
          width={420}
          height={460}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[88%] w-auto -translate-x-1/2 -translate-y-1/2 object-contain opacity-50 mix-blend-screen"
        />
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:26px_26px]" />

        {zones.map((z) => (
          <div key={z.label} className="absolute" style={{ left: `${z.x}%`, top: `${z.y}%` }}>
            <div className="relative flex items-center justify-center">
              <span className="absolute h-8 w-8 animate-pulse rounded-full opacity-40" style={{ background: z.color, filter: "blur(6px)" }} />
              <span className="relative h-3 w-3 rounded-full ring-2 ring-white/80" style={{ background: z.color }} />
              <span className="absolute left-5 top-[-0.5rem] whitespace-nowrap rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                {z.label}
              </span>
            </div>
          </div>
        ))}

        <div className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/90 backdrop-blur">
          Carte intelligente · Maroc
        </div>
      </div>

      <div className="float-y absolute -bottom-6 left-4 right-4 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_18px_44px_rgba(15,40,80,0.28)] sm:left-auto sm:right-6 sm:w-[300px]">
        <div className="relative h-28">
          <Image
            src={listing.image_url}
            alt={listing.title}
            fill
            sizes="300px"
            className="object-cover"
          />
          <span className="absolute left-3 top-3 rounded-full bg-[#ede9fe] px-2 py-0.5 text-[10px] font-bold text-[#7c3aed]">MRE</span>
          <span className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1 text-[10.5px] font-semibold text-white backdrop-blur-sm">
            {listing.source_type}
          </span>
        </div>
        <div className="p-3.5">
          <div className="flex items-baseline gap-2">
            <p className="text-[1.15rem] font-extrabold tracking-tight text-gray-900">1 250 000 DH</p>
            <p className="text-[11px] font-medium text-gray-400">14 706 DH/m²</p>
          </div>
          <p className="mt-0.5 text-[12px] text-gray-500">Casablanca, Finance City</p>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 text-[10.5px] font-bold text-[#16a34a]">Fiabilité élevée</span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#25D366] px-2.5 py-1 text-[11px] font-bold text-white">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12.05 0C5.5 0 .16 5.33.16 11.9c0 2.1.55 4.14 1.6 5.95L0 24l6.3-1.65a11.9 11.9 0 005.74 1.46h.01c6.55 0 11.89-5.33 11.89-11.9C23.94 5.33 18.6 0 12.05 0zm6.96 16.94c-.29.82-1.68 1.56-2.3 1.6-.6.06-1.17.28-3.95-.83-3.32-1.32-5.43-4.74-5.6-4.96-.16-.22-1.34-1.78-1.34-3.4 0-1.6.85-2.4 1.15-2.72.3-.32.65-.4.87-.4l.62.01c.2.01.47-.08.73.56.29.7.98 2.43 1.07 2.6.09.18.15.4.03.62-.12.22-.18.36-.36.55-.18.2-.38.44-.54.59-.18.18-.37.37-.16.72.21.35.93 1.53 2 2.48 1.37 1.22 2.53 1.6 2.88 1.78.35.18.56.15.76-.09.2-.24.87-1.02 1.1-1.37.23-.35.46-.29.78-.18.32.12 2.04.96 2.39 1.14.35.18.58.26.66.4.09.15.09.81-.2 1.62z" />
              </svg>
              WhatsApp
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
