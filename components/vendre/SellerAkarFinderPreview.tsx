"use client";

import {
  Bath,
  BedDouble,
  Building2,
  CheckCircle2,
  FileCheck2,
  Home,
  MapPin,
  Maximize2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { SellerScoreResult } from "@/lib/seller/listing-score";

type PreviewProps = {
  photoPreview?: string | null;
  propertyType?: string;
  title?: string;
  city?: string;
  neighborhood?: string;
  residenceName?: string;
  surface?: number | null;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  floorNumber?: number | null;
  negotiable?: boolean | null;
  documentsAvailable?: boolean | null;
  acceptedPhotoCount: number;
  score: SellerScoreResult;
};

const formatMad = (value?: number | null) =>
  value && Number.isFinite(value)
    ? new Intl.NumberFormat("fr-MA").format(value) + " DH"
    : "Prix à compléter";

export function SellerAkarFinderPreview({
  photoPreview,
  propertyType,
  title,
  city,
  neighborhood,
  residenceName,
  surface,
  price,
  bedrooms,
  bathrooms,
  floorNumber,
  negotiable,
  documentsAvailable,
  acceptedPhotoCount,
  score,
}: PreviewProps) {
  const location = [neighborhood, city].filter(Boolean).join(", ") || "Localisation à compléter";
  const pricePerM2 = price && surface ? Math.round(price / surface) : null;

  return (
    <section
      data-p8-akar-preview
      className="overflow-hidden rounded-[26px] border border-[#D9E7F3] bg-white shadow-[0_20px_60px_rgba(11,37,69,0.08)]"
      aria-label="Aperçu de l’annonce AkarFinder"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-[#E9F3FD] via-white to-[#DCEBFA]">
        {photoPreview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoPreview} alt="Photo principale de l’annonce" className="h-full w-full object-cover" />
          </>
        ) : (
          <div className="grid h-full place-items-center px-8 text-center">
            <div>
              <Home className="mx-auto text-[#0B63CE]" size={34} strokeWidth={1.7} />
              <p className="mt-3 text-sm font-black text-[#0B2545]">Votre bien ouvrira l’annonce ici</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">La première photo acceptée devient l’accroche visuelle.</p>
            </div>
          </div>
        )}
        <div className="absolute left-3 top-3 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[10px] font-black text-[#0B2545] shadow-sm backdrop-blur">
          Galerie AkarFinder
        </div>
        <div className="absolute bottom-3 right-3 rounded-full bg-[#0B2545]/90 px-3 py-1.5 text-[10px] font-black text-white">
          {acceptedPhotoCount} photo{acceptedPhotoCount > 1 ? "s" : ""}
        </div>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#0B63CE] px-3 py-1 text-[9.5px] font-black uppercase tracking-[0.12em] text-white">Vente</span>
          <span className="rounded-full border border-[#D9E7F3] bg-[#F8FBFF] px-3 py-1 text-[9.5px] font-black uppercase tracking-[0.12em] text-[#0B2545]">
            {propertyType || "Type à compléter"}
          </span>
        </div>

        <h2 className="mt-3 text-[1.25rem] font-black leading-tight tracking-[-0.035em] text-[#0B2545]">
          {title?.trim() || `${propertyType || "Bien"} à ${city || "localiser"}`}
        </h2>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <MapPin size={14} className="text-[#0B63CE]" />
          {location}
        </p>

        <div className="mt-4 flex items-end justify-between gap-3 border-y border-slate-100 py-4">
          <div>
            <p className="text-xl font-black tracking-[-0.035em] text-[#0B2545]">{formatMad(price)}</p>
            {pricePerM2 ? <p className="mt-1 text-[10.5px] font-bold text-slate-500">{new Intl.NumberFormat("fr-MA").format(pricePerM2)} DH/m²</p> : null}
          </div>
          {negotiable === true ? (
            <span className="rounded-full bg-[#EEF6FF] px-2.5 py-1 text-[10px] font-black text-[#0B63CE]">Négociable</span>
          ) : null}
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {surface ? <MiniFact icon={Maximize2} label="Surface" value={`${surface} m²`} /> : null}
          {typeof bedrooms === "number" ? <MiniFact icon={BedDouble} label="Chambres" value={String(bedrooms)} /> : null}
          {typeof bathrooms === "number" ? <MiniFact icon={Bath} label="SDB" value={String(bathrooms)} /> : null}
          {typeof floorNumber === "number" ? <MiniFact icon={Building2} label="Étage" value={String(floorNumber)} /> : null}
        </dl>

        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/45 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-emerald-700" size={19} />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.13em] text-[#0B63CE]">Confiance AkarFinder</p>
              <p className="mt-1 text-sm font-black text-[#0B2545]">Données déclarées, provenance claire</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold text-slate-600">
                <span className="inline-flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-600" /> Source vendeur</span>
                <span className="inline-flex items-center gap-1"><FileCheck2 size={12} className={documentsAvailable ? "text-emerald-600" : "text-slate-400"} /> {documentsAvailable ? "Documents déclarés" : "Documents à préciser"}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-[#D9E7F3] bg-[#F8FBFF]">
          <div className="grid grid-cols-[1fr_112px]">
            <div className="p-4">
              <p className="text-[9.5px] font-black uppercase tracking-[0.14em] text-[#0B63CE]">Territoire AkarFinder</p>
              <p className="mt-1 text-base font-black text-[#0B2545]">{neighborhood || city ? [neighborhood, city].filter(Boolean).join(" – ") : "Territoire à préciser"}</p>
              <p className="mt-1 text-[10.5px] leading-4 text-slate-500">
                {residenceName ? `Repère déclaré : ${residenceName}.` : "Le contexte quartier sera calculé à partir de données disponibles, jamais supposé."}
              </p>
            </div>
            <div className="relative min-h-28 overflow-hidden border-l border-[#D9E7F3] bg-[linear-gradient(90deg,#eef6ff_1px,transparent_1px),linear-gradient(#eef6ff_1px,transparent_1px)] bg-[size:18px_18px]">
              <span className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#0B63CE] text-white shadow-lg">
                <MapPin size={17} />
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <ReadingRow icon={TrendingUp} title="Marché" detail={pricePerM2 ? `${new Intl.NumberFormat("fr-MA").format(pricePerM2)} DH/m² calculé · comparables après analyse` : "Prix/m² et comparables après données suffisantes"} tone="blue" />
          <ReadingRow icon={Sparkles} title="Vie locale" detail={neighborhood ? `Analyse locale de ${neighborhood} après géocodage` : "Quartier et proximité après localisation"} tone="teal" />
          <ReadingRow icon={FileCheck2} title="Source" detail={documentsAvailable ? "Vendeur déclaré · documents annoncés" : "Vendeur déclaré · vérification séparée"} tone="sand" />
        </div>

        <div className="mt-4 rounded-2xl border border-[#D9E7F3] bg-white p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[9.5px] font-black uppercase tracking-[0.13em] text-[#0B63CE]">Qualité des données</p>
              <p className="mt-1 text-lg font-black text-[#0B2545]">{score.score}/100 · {score.label}</p>
            </div>
            <p className="max-w-36 text-right text-[9.5px] leading-4 text-slate-500">Qualité de la fiche, jamais valeur du bien.</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#0B63CE] transition-[width] motion-reduce:transition-none" style={{ width: `${score.score}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Maximize2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-[#F8FBFF] p-2.5">
      <Icon size={14} className="text-[#0B63CE]" />
      <dt className="mt-2 text-[8.5px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-xs font-black text-[#0B2545]">{value}</dd>
    </div>
  );
}

function ReadingRow({
  icon: Icon,
  title,
  detail,
  tone,
}: {
  icon: typeof TrendingUp;
  title: string;
  detail: string;
  tone: "blue" | "teal" | "sand";
}) {
  const classes =
    tone === "blue"
      ? "border-blue-100 bg-blue-50/50"
      : tone === "teal"
        ? "border-cyan-100 bg-cyan-50/45"
        : "border-amber-100 bg-amber-50/45";
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${classes}`}>
      <Icon size={17} className="mt-0.5 shrink-0 text-[#0B63CE]" />
      <div>
        <p className="text-[9.5px] font-black uppercase tracking-[0.12em] text-[#0B63CE]">{title}</p>
        <p className="mt-0.5 text-[10.5px] font-semibold leading-4 text-slate-600">{detail}</p>
      </div>
    </div>
  );
}
