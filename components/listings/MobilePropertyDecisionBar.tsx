"use client";

import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";
import { MobileVisitRequestButton } from "@/components/listings/MobileVisitRequestButton";
import { WhatsAppCTA } from "@/components/listings/WhatsAppCTA";
import motion from "@/components/ui/perceived-quality.module.css";
import type { Listing } from "@/lib/listings/types";
import type { ProConversionModel } from "@/lib/listings/pro-conversion";

export function MobilePropertyDecisionBar({ listing, model }: { listing: Listing; model: ProConversionModel }) {
  const hasVisit = model.actions.visit;
  const hasWhatsApp = model.actions.whatsapp.enabled && model.actions.whatsapp.phone;
  const hasDirectContact = Boolean(hasVisit || hasWhatsApp);

  return (
    <aside
      aria-label="Actions rapides pour ce bien"
      data-pro-conversion-mobile="ann-l11"
      className={`${motion.dockEnter} fixed inset-x-0 bottom-0 z-40 border-t border-border/20 bg-card/95 px-3 pt-2 shadow-[0_-12px_36px_rgba(2,10,24,0.14)] backdrop-blur-xl lg:hidden`}
      style={{ paddingBottom: "max(0.55rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto max-w-xl space-y-2">
        {hasDirectContact ? (
          <div className={`grid gap-2 ${hasVisit && hasWhatsApp ? "grid-cols-2" : "grid-cols-1"}`}>
            {hasVisit ? <MobileVisitRequestButton listingId={listing.id} /> : null}
            {hasWhatsApp ? <WhatsAppCTA phone={model.actions.whatsapp.phone ?? undefined} label="WhatsApp" size="sm" variant="primary" /> : null}
          </div>
        ) : model.actions.sourceOriginal.enabled && model.actions.sourceOriginal.url ? (
          <a href={model.actions.sourceOriginal.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-[13px] font-extrabold text-primary-foreground">
            Voir la source d’origine
          </a>
        ) : null}

        <div className="grid grid-cols-[48px_48px_minmax(0,1fr)] items-center gap-2">
          <FavoriteToggleButton listingId={listing.id} className="items-center" />
          <CompareToggleButton
            listingId={listing.id}
            className="h-12 w-12 justify-center rounded-xl border-border/25 bg-surface p-0 text-foreground"
          />
          <Link
            href="/mon-projet"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border/25 bg-surface px-3 text-[12.5px] font-extrabold text-deepblue transition duration-150 hover:bg-slate-50 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
          >
            <FolderKanban size={16} aria-hidden="true" />
            Continuer dans Mon Projet
          </Link>
        </div>
      </div>
    </aside>
  );
}
