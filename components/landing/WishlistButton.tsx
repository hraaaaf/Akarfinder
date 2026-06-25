"use client";

import { useState } from "react";
import { Heart } from "lucide-react";

export function WishlistButton() {
  const [saved, setSaved] = useState(false);

  return (
    <button
      type="button"
      aria-label={saved ? "Retirer des favoris" : "Ajouter aux favoris"}
      onClick={() => setSaved((s) => !s)}
      className={`absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white shadow-sm transition-all hover:scale-110 ${
        saved ? "text-red-500" : "text-gray-400 hover:text-red-400"
      }`}
    >
      <Heart
        size={16}
        strokeWidth={2}
        fill={saved ? "currentColor" : "none"}
        className={saved ? "heart-pop" : ""}
      />
    </button>
  );
}
