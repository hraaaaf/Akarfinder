import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PricePositionBlock } from "@/components/price-position/PricePositionBlock";
import {
  canAccessPricePositionPreviewDemo,
  ensurePricePositionPreviewDemoAccess,
} from "@/lib/price-position/price-position-preview-access";
import { PRICE_POSITION_PREVIEW_FIXTURE } from "@/lib/price-position/price-position-preview-fixture";
import { getIndicativePricePositionDisplay } from "@/lib/price-position/price-position-display";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Démonstration technique Preview — Price Position | AkarFinder",
  description:
    "Surface technique réservée aux previews pour valider le module Price Position sur une fixture fictive déterministe.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PricePositionPreviewPage() {
  try {
    ensurePricePositionPreviewDemoAccess();
  } catch {
    notFound();
  }

  const display = getIndicativePricePositionDisplay(PRICE_POSITION_PREVIEW_FIXTURE.listing);

  return (
    <main
      data-testid="price-position-preview-page"
      className="min-h-screen bg-gradient-to-b from-[#faf7ef] via-white to-[#f7f5ee] px-4 py-10 text-[#0f172a]"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <section className="rounded-[1.75rem] border border-[#e8dbc2] bg-white p-6 shadow-[0_18px_54px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#9a6d19]">
            Démonstration technique Preview
          </p>
          <h1 className="mt-3 text-[2rem] font-extrabold tracking-[-0.05em] text-[#0f172a] sm:text-[2.5rem]">
            Surface fictive de validation Price Position
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600">
            Cette page est réservée aux previews Vercel. Elle réutilise le vrai calcul
            produit sur une fixture locale déterministe, sans appeler Supabase, OpenSERP ni
            le Search Gateway.
          </p>

          <div
            data-testid="price-position-fixture"
            className="mt-6 grid gap-3 rounded-2xl border border-dashed border-[#e7d7ba] bg-[#fffdf8] p-5 sm:grid-cols-2"
          >
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9a6d19]">
                Bien fictif
              </p>
              <p className="mt-1 text-[16px] font-extrabold text-[#0f172a]">
                {PRICE_POSITION_PREVIEW_FIXTURE.title}
              </p>
              <p className="mt-2 text-[13px] leading-6 text-slate-600">
                {PRICE_POSITION_PREVIEW_FIXTURE.description}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="rounded-xl bg-white p-3 ring-1 ring-[#f0e3cb]">
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Ville
                </dt>
                <dd className="mt-1 font-semibold text-[#0f172a]">
                  {PRICE_POSITION_PREVIEW_FIXTURE.listing.city}
                </dd>
              </div>
              <div className="rounded-xl bg-white p-3 ring-1 ring-[#f0e3cb]">
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Quartier
                </dt>
                <dd className="mt-1 font-semibold text-[#0f172a]">
                  {PRICE_POSITION_PREVIEW_FIXTURE.listing.neighborhood}
                </dd>
              </div>
              <div className="rounded-xl bg-white p-3 ring-1 ring-[#f0e3cb]">
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Prix
                </dt>
                <dd className="mt-1 font-semibold text-[#0f172a]">
                  {PRICE_POSITION_PREVIEW_FIXTURE.listing.price.toLocaleString("fr-MA")} DH
                </dd>
              </div>
              <div className="rounded-xl bg-white p-3 ring-1 ring-[#f0e3cb]">
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                  Surface
                </dt>
                <dd className="mt-1 font-semibold text-[#0f172a]">
                  {PRICE_POSITION_PREVIEW_FIXTURE.listing.surface_m2} m²
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {display ? (
          <section
            data-testid="price-position-public-block"
            className="rounded-[1.75rem] border border-[#e8dbc2] bg-white p-6 shadow-[0_18px_54px_rgba(15,23,42,0.08)]"
          >
            <PricePositionBlock listing={PRICE_POSITION_PREVIEW_FIXTURE.listing} />
            <p className="mt-4 text-[12px] font-medium leading-6 text-slate-500">
              À confirmer avec la source originale.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

export const runtime = "nodejs";
