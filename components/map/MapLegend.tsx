import { AKARFINDER_TERRITORIAL_PALETTE } from "@/lib/map/akarfinder-territorial-style";
import { ui } from "@/components/ui/design-system";

export function MapLegend() {
  return (
    <aside
      aria-label="Légende de la carte immobilière"
      className={`${ui.surfaceGlass} pointer-events-auto absolute bottom-[86px] left-3 z-30 w-[min(260px,calc(100vw-24px))] p-3 sm:bottom-4 sm:left-4 sm:w-[270px]`}
    >
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary">Légende</p>
      <div className="mt-2 space-y-2.5 text-[10.5px] font-semibold text-slate-600">
        <div className="flex items-center gap-2">
          <span className="flex shrink-0 gap-0.5" aria-hidden="true">
            {AKARFINDER_TERRITORIAL_PALETTE.slice(0, 4).map((color) => (
              <span key={color} className="h-3 w-3 rounded-[4px] border border-white shadow-sm" style={{ backgroundColor: color }} />
            ))}
          </span>
          <span>Quartiers cartographiés, différenciés visuellement</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 rounded-lg border border-primary bg-white px-2 py-1 text-[9px] font-extrabold text-primary shadow-sm">
            ~12 400 DH/m²
          </span>
          <span>Prix observé quand un benchmark exact existe</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 shrink-0 rounded-md bg-primary shadow-[0_0_0_3px_rgba(11,99,206,0.15)]" aria-hidden="true" />
          <span>Quartier sélectionné</span>
        </div>
      </div>
      <p className="mt-2.5 border-t border-slate-200 pt-2 text-[9px] leading-4 text-slate-500">
        Les couleurs servent uniquement à distinguer les zones. Elles ne représentent ni prix, ni qualité, ni niveau de confiance.
      </p>
    </aside>
  );
}
