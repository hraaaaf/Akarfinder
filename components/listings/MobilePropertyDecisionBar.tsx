"use client";

import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { CompareToggleButton } from "@/components/compare/CompareToggleButton";
import { FavoriteToggleButton } from "@/components/favorites/FavoriteToggleButton";

export function MobilePropertyDecisionBar({ listingId }: { listingId: string }) {
  return (
    <aside
      aria-label="Actions rapides pour ce bien"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/20 bg-card/95 px-3 pt-2 shadow-[0_-12px_36px_rgba(2,10,24,0.14)] backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "max(0.55rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto grid max-w-xl grid-cols-[48px_48px_minmax(0,1fr)] items-center gap-2">
        <FavoriteToggleButton listingId={listingId} className="items-center" />
        <CompareToggleButton
          listingId={listingId}
          className="h-12 w-12 justify-center rounded-xl border-border/25 bg-surface p-0 text-foreground"
        />
        <Link
          href="/mon-projet"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[13px] font-extrabold text-primary-foreground shadow-sm transition hover:bg-primary/90"
        >
          <FolderKanban size={17} aria-hidden="true" />
          Continuer dans Mon Projet
        </Link>
      </div>
    </aside>
  );
}
