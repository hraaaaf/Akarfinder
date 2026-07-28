"use client";

import { useEffect, useMemo, useState } from "react";
import { Scale, Trash2, X } from "lucide-react";
import { usePropertySelection } from "@/components/search/PropertySelectionProvider";
import {
  clearCompareIds,
  COMPARE_STORAGE_EVENT,
  dispatchCompareUpdated,
  readCompareIds,
  removeCompareId,
} from "@/lib/compare/compare-storage";
import { buildCanonicalPropertyComparisonModel } from "@/lib/ux/canonical-property-comparison";
import { getCanonicalPropertyId } from "@/lib/ux/property-selection";

export function SearchCompareDock() {
  const { visibleListings } = usePropertySelection();
  const [ids, setIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setIds(readCompareIds(window.localStorage));
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(COMPARE_STORAGE_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(COMPARE_STORAGE_EVENT, sync);
    };
  }, []);

  const comparedListings = useMemo(() => {
    const byId = new Map(visibleListings.map((listing) => [listing.id, listing]));
    const seenCanonical = new Set<string>();
    return ids
      .map((id) => byId.get(id))
      .filter((listing): listing is NonNullable<typeof listing> => Boolean(listing))
      .filter((listing) => {
        const canonicalId = getCanonicalPropertyId(listing);
        if (seenCanonical.has(canonicalId)) return false;
        seenCanonical.add(canonicalId);
        return true;
      });
  }, [ids, visibleListings]);

  const model = useMemo(
    () => buildCanonicalPropertyComparisonModel(comparedListings),
    [comparedListings],
  );

  if (ids.length === 0) return null;

  function remove(id: string) {
    if (typeof window === "undefined") return;
    const result = removeCompareId(id, window.localStorage);
    dispatchCompareUpdated(result.ids);
  }

  function clear() {
    if (typeof window === "undefined") return;
    const result = clearCompareIds(window.localStorage);
    dispatchCompareUpdated(result.ids);
    setOpen(false);
  }

  return (
    <aside className="sticky top-0 z-30 border-b border-border/15 bg-background/95 px-4 py-3 backdrop-blur dark:border-white/10 sm:px-6" aria-label="Comparateur de propriétés">
      <div className="mx-auto max-w-[1480px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-bronze-500/25 bg-bronze-500/10 text-bronze-500">
              <Scale size={16} aria-hidden="true" />
            </span>
            <div>
              <p className="text-[12px] font-extrabold text-foreground">Comparaison canonique</p>
              <p className="text-[10.5px] text-muted-foreground">
                {model.properties.length} propriété{model.properties.length > 1 ? "s" : ""} distincte{model.properties.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen((current) => !current)}
              disabled={model.properties.length < 2}
              className="rounded-xl bg-gradient-to-br from-bronze-500 to-bronze-700 px-4 py-2.5 text-[12px] font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {open ? "Masquer" : "Comparer maintenant"}
            </button>
            <button
              type="button"
              onClick={clear}
              aria-label="Vider le comparateur"
              className="grid h-10 w-10 place-items-center rounded-xl border border-border/20 text-muted-foreground transition hover:text-foreground dark:border-white/12"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        {open && model.properties.length >= 2 ? (
          <div className="mt-3 overflow-x-auto rounded-2xl border border-border/15 bg-card dark:border-white/10 dark:bg-white/[0.035]">
            <table className="min-w-[720px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border/15 dark:border-white/10">
                  <th className="w-44 px-4 py-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Critère</th>
                  {model.properties.map((property) => (
                    <th key={property.canonicalPropertyId} className="min-w-52 px-4 py-3 align-top">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="line-clamp-2 text-[12px] font-extrabold text-foreground">{property.title}</p>
                          {property.sourceName ? <p className="mt-1 text-[10px] text-muted-foreground">{property.sourceName}</p> : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(property.listingId)}
                          aria-label={`Retirer ${property.title} du comparateur`}
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-border/15 text-muted-foreground hover:text-foreground dark:border-white/10"
                        >
                          <X size={12} aria-hidden="true" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {model.rows.map((row) => (
                  <tr key={row.code} className="border-b border-border/10 last:border-0 dark:border-white/8">
                    <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground">{row.label}</th>
                    {row.values.map((value, index) => (
                      <td key={`${row.code}:${model.properties[index]?.canonicalPropertyId}`} className="px-4 py-3 text-[12px] font-bold text-foreground/85">
                        {value ?? "Non renseigné"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-border/15 px-4 py-3 text-[10.5px] leading-5 text-muted-foreground dark:border-white/10">
              {model.limitation}
            </p>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
