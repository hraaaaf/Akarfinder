"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Compass, Heart, Map, UserRound } from "lucide-react";
import { ui } from "@/components/ui/design-system";

const items = [
  {
    href: "/search",
    label: "Explorer",
    icon: Compass,
    activePrefixes: ["/search", "/acheter", "/louer", "/neuf", "/immobilier", "/quartiers", "/listings"],
  },
  {
    href: "/favorites",
    label: "Favoris",
    icon: Heart,
    activePrefixes: ["/favorites", "/compare"],
  },
  {
    href: "/map",
    label: "Carte",
    icon: Map,
    activePrefixes: ["/map"],
  },
  {
    href: "/alerts",
    label: "Alertes",
    icon: Bell,
    activePrefixes: ["/alerts"],
  },
  {
    href: "/mon-projet",
    label: "Compte",
    icon: UserRound,
    activePrefixes: ["/mon-projet", "/profil-recherche", "/onboarding"],
  },
] as const;

function matchesPath(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/visual-qa/")) return null;

  return (
    <nav
      aria-label="Navigation mobile"
      data-mobile-bottom-nav="exact-light-blue"
      data-premium-bottomnav="ux-premium-bottomnav-glass-1"
      data-theme="light"
      className={`${ui.surfaceGlass} fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-[10px] right-[10px] z-[70] overflow-hidden md:hidden`}
    >
      <div className="mx-auto grid h-[66px] max-w-lg grid-cols-5 px-1.5 py-1">
        {items.map(({ href, label, icon: Icon, activePrefixes }) => {
          const isActive = activePrefixes.some((prefix) => matchesPath(pathname, prefix));

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              data-mobile-bottom-nav-item={href}
              data-mobile-bottom-nav-active={isActive ? "true" : "false"}
              className={`relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[16px] px-1 text-[9.75px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-inset ${
                isActive ? "bg-[#eef6ff]/72 text-[#0B63CE]" : "text-slate-500 hover:bg-white/65 hover:text-[#0B2545]"
              }`}
            >
              <span
                data-mobile-bottom-nav-icon
                className={`grid h-7 w-9 place-items-center rounded-[12px] transition-colors ${
                  isActive ? "text-[#0B63CE]" : "bg-transparent"
                }`}
              >
                <Icon size={19} strokeWidth={isActive ? 2.2 : 1.95} />
              </span>
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
