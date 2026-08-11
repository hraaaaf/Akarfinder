"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, MessageCircle, Plus, UserRound } from "lucide-react";

const items = [
  { href: "/search", label: "Explorer", icon: Compass },
  { href: "/favorites", label: "Favoris", icon: Heart },
  { href: "/vendre", label: "Ajouter", icon: Plus },
  { href: "/contact", label: "Messages", icon: MessageCircle },
  { href: "/mon-projet", label: "Compte", icon: UserRound },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-slate-200/90 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid h-[64px] max-w-lg grid-cols-5 px-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/search" ? pathname === "/" || pathname.startsWith("/search") : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-semibold transition-colors ${
                active ? "text-[#F97316]" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {label === "Ajouter" ? (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#F97316] text-white shadow-[0_4px_12px_rgba(249,115,22,0.28)]">
                  <Icon size={19} strokeWidth={2.35} />
                </span>
              ) : (
                <Icon size={20} strokeWidth={active ? 2.35 : 2} fill={label === "Favoris" && active ? "currentColor" : "none"} />
              )}
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
