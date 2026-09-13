"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, Map, UserRound, Tag } from "lucide-react";
import { ui } from "@/components/ui/design-system";
import { PRODUCT_MOBILE_BOTTOM_NAV } from "@/lib/product-navigation";

const icons = {
  "/search": Compass,
  "/favorites": Heart,
  "/map": Map,
  "/vendre": Tag,
  "/mon-projet": UserRound,
} as const;

function matchesPath(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function MobileBottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/visual-qa/")) return null;

  return (
    <nav
      aria-label="Navigation mobile"
      data-mobile-bottom-nav="p2-ia-v1"
      data-premium-bottomnav="ux-premium-bottomnav-glass-1"
      data-theme="light"
      className={`${ui.surfaceGlass} fixed bottom-[calc(8px+env(safe-area-inset-bottom))] left-[10px] right-[10px] z-[70] overflow-hidden md:hidden`}
    >
      <div className="mx-auto grid h-[66px] max-w-lg grid-cols-5 px-1.5 py-1">
        {PRODUCT_MOBILE_BOTTOM_NAV.map(({ href, label, activePrefixes }) => {
          const Icon = icons[href];
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
                className={`grid h-7 w-9 place-items-center rounded-[12px] transition-colors ${isActive ? "text-[#0B63CE]" : "bg-transparent"}`}
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
