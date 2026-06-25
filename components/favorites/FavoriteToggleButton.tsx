"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import {
  dispatchFavoritesUpdated,
  isFavorited,
  readFavoriteIds,
  toggleFavoriteId,
} from "@/lib/favorites/favorites-storage";

type FavoriteToggleButtonProps = {
  listingId: string;
  /** "icon" = round icon only (cards). "block" = full-width text button (detail sidebar). */
  variant?: "icon" | "block";
  className?: string;
};

export function FavoriteToggleButton({
  listingId,
  variant = "icon",
  className = "",
}: FavoriteToggleButtonProps) {
  const [favorited, setFavorited] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    function sync() {
      setFavorited(isFavorited(listingId, window.localStorage));
    }

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("akarfinder:favorites-updated", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("akarfinder:favorites-updated", sync);
    };
  }, [listingId]);

  function handleToggle() {
    if (typeof window === "undefined") return;
    const next = toggleFavoriteId(listingId, window.localStorage);
    const nowFavorited = next.includes(listingId);
    setFavorited(nowFavorited);
    dispatchFavoritesUpdated(next);
    setFeedback(nowFavorited ? "Ajouté aux favoris" : "Retiré des favoris");
    setTimeout(() => setFeedback(""), 2200);
  }

  if (variant === "block") {
    return (
      <div className={`space-y-1 ${className}`}>
        <button
          type="button"
          onClick={handleToggle}
          aria-pressed={favorited}
          aria-label={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-[13.5px] font-extrabold transition ${
            favorited
              ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
              : "border-[#d8c8a3] bg-[#fffdf8] text-deepblue hover:bg-[#f7f3ea]"
          }`}
        >
          <Heart
            size={16}
            strokeWidth={2}
            fill={favorited ? "currentColor" : "none"}
            aria-hidden="true"
          />
          {favorited ? "Retiré des favoris" : "Ajouter aux favoris"}
        </button>
        {feedback ? (
          <p className="text-center text-[11px] font-semibold text-gray-500">{feedback}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-end gap-0.5 ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={favorited}
        aria-label={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border transition ${
          favorited
            ? "border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
            : "border-[#eadfca] bg-[#fffdf8] text-gray-400 hover:border-red-200 hover:text-red-500"
        }`}
      >
        <Heart
          size={17}
          strokeWidth={2}
          fill={favorited ? "currentColor" : "none"}
          aria-hidden="true"
        />
      </button>
      {feedback ? (
        <span className="whitespace-nowrap text-[10px] font-semibold text-gray-500">{feedback}</span>
      ) : null}
    </div>
  );
}
