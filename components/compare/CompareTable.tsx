import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Trash2 } from "lucide-react";
import { ListingVisual } from "@/components/listings/ListingVisual";
import { ReliabilityBadge } from "@/components/ui/ReliabilityBadge";
import { ui } from "@/components/ui/design-system";
import { formatPrice, formatSurface } from "@/lib/listings/utils";
import type { CompareListingInsights } from "@/lib/compare/types";

function getReliabilityLevel(score: number): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function compareValue(items: CompareListingInsights[], getter: (item: CompareListingInsights) => string | number | null) {
  return items.map((item) => ({ id: item.listing.id, value: getter(item) }));
}

function getPriceLabel(item: CompareListingInsights) {
  return item.listing.transaction_type === "rent"
    ? `${formatPrice(item.listing.price, item.listing.currency)}/mois`
    : formatPrice(item.listing.price, item.listing.currency);
}

function TableRow({ label, values }: { label: string; values: Array<{ id: string; value: string | number | null }> }) {
  return (
    <tr className="border-t border-slate-200">
      <th className="min-w-[180px] bg-slate-50 px-4 py-3 text-left text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </th>
      {values.map((item) => (
        <td key={`${label}-${item.id}`} className="px-4 py-3 text-[14px] font-semibold text-slate-700">
          {item.value ?? "—"}
        </td>
      ))}
    </tr>
  );
}

type CompareTableProps = {
  items: CompareListingInsights[];
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function CompareTable({ items, onRemove, onClear }: CompareTableProps) {
  return (
    <>
      <section className={`${ui.surfacePremium} hidden overflow-hidden lg:block`}>
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-4">
          <div>
            <p className={ui.eyebrow}>Tableau comparatif</p>
            <h2 className="mt-1 text-[1.25rem] font-extrabold tracking-[-0.03em] text-[#0B1F3A]">2 à 4 biens côte à côte</h2>
          </div>
          <button type="button" onClick={onClear} className={`${ui.secondaryActionPill} gap-2 text-[12px]`}>
            <Trash2 size={14} strokeWidth={2.4} aria-hidden="true" />
            Vider la comparaison
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="bg-slate-50 px-4 py-4 text-left text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Critère</th>
                {items.map((item) => (
                  <th key={item.listing.id} className="w-[300px] min-w-[300px] border-l border-slate-200 px-4 py-4 align-top">
                    <div className="space-y-3">
                      <div className="relative h-[180px] overflow-hidden rounded-2xl">
                        {item.imageMode !== "fallback_visual" && item.listing.main_image_url ? (
                          <Image src={item.listing.main_image_url} alt={item.listing.title} fill className="object-cover" sizes="300px" />
                        ) : (
                          <ListingVisual listing={item.listing} className="h-full w-full" />
                        )}
                      </div>
                      <div className="space-y-2 text-left">
                        <Link href={`/listings/${item.listing.id}`} className="line-clamp-2 text-[1rem] font-extrabold leading-snug text-[#0B1F3A] hover:underline">
                          {item.listing.title}
                        </Link>
                        <p className="text-[13px] font-semibold text-slate-500">
                          {item.listing.city}{item.listing.neighborhood ? ` · ${item.listing.neighborhood}` : ""}
                        </p>
                        <button type="button" onClick={() => onRemove(item.listing.id)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-extrabold text-slate-500 transition hover:bg-slate-50 hover:text-[#0B2545]">
                          <Trash2 size={13} strokeWidth={2.4} aria-hidden="true" /> Retirer
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <TableRow label="Prix" values={compareValue(items, (item) => getPriceLabel(item))} />
              <TableRow label="Surface" values={compareValue(items, (item) => formatSurface(item.listing.surface_m2))} />
              <TableRow label="Prix / m²" values={compareValue(items, (item) => item.listing.price_per_m2 != null ? `${item.listing.price_per_m2.toLocaleString("fr-FR")} DH/m²` : "Prix non communique")} />
              <TableRow label="Type de bien" values={compareValue(items, (item) => item.listing.property_type)} />
              <TableRow label="Chambres" values={compareValue(items, (item) => item.listing.bedrooms || "—")} />
              <TableRow label="Salles de bain" values={compareValue(items, (item) => item.listing.bathrooms || "—")} />
              <TableRow label="Source" values={compareValue(items, (item) => item.sourceLabel)} />
              <TableRow label="Fiabilité" values={compareValue(items, (item) => `${item.listing.reliability_score}/100 · ${item.reliabilityLabel}`)} />
              <TableRow label="Package score" values={compareValue(items, (item) => `${item.packageScore.overall_label} · ${item.packageScore.overall_score}/100`)} />
              <TableRow label="Doublon possible" values={compareValue(items, (item) => item.duplicatePossible ? "Oui" : "Non signalé")} />
              <TableRow label="Prix observé" values={compareValue(items, (item) => item.observedPriceDeltaLabel ? `${item.observedPriceLabel} (${item.observedPriceDeltaLabel})` : item.observedPriceLabel)} />
              <TableRow label="Proximité utile" values={compareValue(items, (item) => item.proximitySummary)} />
              <tr className="border-t border-slate-200">
                <th className="bg-slate-50 px-4 py-3 text-left text-[12px] font-extrabold uppercase tracking-[0.12em] text-slate-500">Actions</th>
                {items.map((item) => (
                  <td key={`actions-${item.listing.id}`} className="space-y-2 px-4 py-3">
                    <Link href={`/listings/${item.listing.id}`} className={`${ui.primaryActionPill} w-full gap-2 text-[13px]`}>
                      Voir le bien <ArrowRight size={15} strokeWidth={2.4} aria-hidden="true" />
                    </Link>
                    <Link href={`/listings/${item.listing.id}#visite`} className={`${ui.secondaryActionPill} w-full text-[13px]`}>
                      Demander une visite
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4 lg:hidden">
        <div className={`${ui.surfaceGlass} sticky top-[71px] z-20 flex gap-2 overflow-x-auto p-2`} data-compare-mobile-identity>
          {items.map((item, index) => (
            <Link key={item.listing.id} href={`#compare-${item.listing.id}`} className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white/90 px-3 py-2 text-left">
              <span className="block text-[9px] font-extrabold uppercase tracking-[0.1em] text-primary">Bien {index + 1}</span>
              <span className="mt-0.5 block truncate text-[11px] font-extrabold text-[#0B1F3A]">{item.listing.title}</span>
            </Link>
          ))}
        </div>

        {items.map((item) => (
          <article id={`compare-${item.listing.id}`} key={item.listing.id} className="scroll-mt-36 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_26px_rgba(24,56,96,0.07)]">
            <div className="relative h-[210px] overflow-hidden">
              {item.imageMode !== "fallback_visual" && item.listing.main_image_url ? (
                <Image src={item.listing.main_image_url} alt={item.listing.title} fill className="object-cover" sizes="100vw" />
              ) : (
                <ListingVisual listing={item.listing} className="h-full w-full" />
              )}
              <div className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/92 px-3 py-1.5 text-[11px] font-extrabold text-[#0B2545] shadow-sm backdrop-blur">
                {item.listing.property_type}
              </div>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/listings/${item.listing.id}`} className="text-[1.1rem] font-extrabold leading-snug text-[#0B1F3A]">{item.listing.title}</Link>
                  <p className="mt-1 text-[13px] text-slate-500">{item.listing.city}{item.listing.neighborhood ? ` · ${item.listing.neighborhood}` : ""}</p>
                </div>
                <button type="button" onClick={() => onRemove(item.listing.id)} className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-extrabold text-slate-500">
                  <Trash2 size={13} strokeWidth={2.4} aria-hidden="true" /> Retirer
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ReliabilityBadge level={getReliabilityLevel(item.listing.reliability_score)} label={item.reliabilityLabel} />
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-extrabold text-primary">{item.packageScore.overall_label}</span>
              </div>

              <dl className="grid grid-cols-2 gap-2 text-[13px]">
                {[
                  ["Prix", getPriceLabel(item)],
                  ["Surface", formatSurface(item.listing.surface_m2)],
                  ["Prix / m²", item.listing.price_per_m2 != null ? `${item.listing.price_per_m2.toLocaleString("fr-FR")} DH/m²` : "Prix non communique"],
                  ["Source", item.sourceLabel],
                  ["Prix observé", item.observedPriceDeltaLabel ? `${item.observedPriceLabel} (${item.observedPriceDeltaLabel})` : item.observedPriceLabel],
                  ["Proximité utile", item.proximitySummary],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                    <dt className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-500">{label}</dt>
                    <dd className="mt-1 font-bold text-[#0B1F3A]">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex gap-2">
                <Link href={`/listings/${item.listing.id}`} className={`${ui.primaryActionPill} flex-1 text-[12px]`}>Voir le bien</Link>
                <Link href={`/listings/${item.listing.id}#visite`} className={`${ui.secondaryActionPill} flex-1 text-[12px]`}>Demander une visite</Link>
              </div>
            </div>
          </article>
        ))}

        <button type="button" onClick={onClear} className={`${ui.secondaryActionPill} w-full gap-2`}>
          <Trash2 size={15} strokeWidth={2.3} aria-hidden="true" /> Vider la comparaison
        </button>
      </section>
    </>
  );
}
