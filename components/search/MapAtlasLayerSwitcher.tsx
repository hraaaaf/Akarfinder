"use client";

import {
  MAP_ATLAS_LAYERS,
  canSelectMapAtlasLayer,
  type MapAtlasAvailability,
  type MapAtlasLayer,
} from "@/lib/ux/map-atlas";

type MapAtlasLayerSwitcherProps = {
  value: MapAtlasLayer;
  availability: MapAtlasAvailability;
  onChange: (layer: MapAtlasLayer) => void;
};

export function MapAtlasLayerSwitcher({
  value,
  availability,
  onChange,
}: MapAtlasLayerSwitcherProps) {
  return (
    <div>
      <div
        className="grid grid-cols-3 gap-1 rounded-xl border border-[#dfe7f3] bg-white/95 p-1 shadow-sm backdrop-blur"
        role="group"
        aria-label="Couche de l’Atlas immobilier"
      >
        {MAP_ATLAS_LAYERS.map((layer) => {
          const enabled = canSelectMapAtlasLayer(layer.id, availability);
          const active = value === layer.id;
          return (
            <button
              key={layer.id}
              type="button"
              disabled={!enabled}
              onClick={() => enabled && onChange(layer.id)}
              aria-pressed={active}
              aria-describedby={!enabled ? `atlas-reason-${layer.id}` : undefined}
              className={`rounded-lg px-2 py-2 text-[10.5px] font-extrabold transition ${
                active
                  ? "bg-[#0B63CE] text-white shadow-sm"
                  : enabled
                    ? "text-[#17324f] hover:bg-[#eef4ff]"
                    : "cursor-not-allowed text-slate-400"
              }`}
            >
              {layer.label}
            </button>
          );
        })}
      </div>
      {MAP_ATLAS_LAYERS.map((layer) =>
        availability[layer.id].available ? null : (
          <p key={layer.id} id={`atlas-reason-${layer.id}`} className="sr-only">
            {layer.label} indisponible : {availability[layer.id].reason}
          </p>
        ),
      )}
    </div>
  );
}
