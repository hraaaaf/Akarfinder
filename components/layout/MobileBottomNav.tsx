"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, MessageCircle, Plus, UserRound } from "lucide-react";

const items = [
  {
    href: "/search",
    label: "Explorer",
    icon: Compass,
    primary: false,
    activePrefixes: ["/search", "/acheter", "/louer", "/neuf", "/map", "/immobilier", "/quartiers", "/listings"],
  },
  {
    href: "/favorites",
    label: "Favoris",
    icon: Heart,
    primary: false,
    activePrefixes: ["/favorites"],
  },
  {
    href: "/vendre",
    label: "Publier",
    icon: Plus,
    primary: true,
    activePrefixes: ["/vendre"],
  },
  {
    href: "/contact",
    label: "Contact",
    icon: MessageCircle,
    primary: false,
    activePrefixes: ["/contact"],
  },
  {
    href: "/mon-projet",
    label: "Compte",
    icon: UserRound,
    primary: false,
    activePrefixes: ["/mon-projet", "/profil-recherche", "/onboarding"],
  },
] as const;

function matchesPath(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation mobile"
      data-mobile-bottom-nav="exact-light-blue"
      data-theme="light"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] text-[#0B2545] shadow-[0_-6px_22px_rgba(15,23,42,0.07)] md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 px-1.5">
        {items.map(({ href, label, icon: Icon, primary, activePrefixes }) => {
          const isActive = activePrefixes.some((prefix) => matchesPath(pathname, prefix));

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              aria-label={primary ? "Publier une annonce" : undefined}
              data-mobile-bottom-nav-item={href}
              data-mobile-bottom-nav-active={isActive ? "true" : "false"}
              data-mobile-bottom-nav-primary={primary ? "true" : "false"}
              className={`relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2 ${
                isActive ? "text-[#0B63CE]" : "text-slate-500 hover:text-[#0B2545]"
              }`}
            >
              {primary ? (
                <span
                  data-mobile-bottom-nav-primary-icon
                  className={`grid h-9 w-9 place-items-center rounded-full text-white transition-colors ${
                    isActive ? "bg-[#0B2545]" : "bg-[#0B63CE]"
                  }`}
                >
                  <Icon size={20} strokeWidth={2.35} />
                </span>
              ) : (
                <span
                  data-mobile-bottom-nav-icon
                  className={`grid h-7 w-10 place-items-center rounded-lg transition-colors ${
                    isActive ? "bg-blue-50 text-[#0B63CE]" : "bg-transparent"
                  }`}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.35 : 2} />
                </span>
              )}
              <span className={`max-w-full truncate ${primary ? "mt-[-1px] text-[#0B2545]" : ""}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
