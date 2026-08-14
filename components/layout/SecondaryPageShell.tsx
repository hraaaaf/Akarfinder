import type { ReactNode } from "react";

import { SiteFooter } from "@/components/landing/SiteFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { ui } from "@/components/ui/design-system";

type SecondaryPageShellProps = {
  title: string;
  eyebrow?: string;
  intro?: string;
  children: ReactNode;
  maxWidth?: "2xl" | "3xl";
};

export function SecondaryPageShell({
  title,
  eyebrow = "AkarFinder",
  intro,
  children,
  maxWidth = "2xl",
}: SecondaryPageShellProps) {
  return (
    <main className={`min-h-screen ${ui.pageLight}`} data-p4-secondary-shell>
      <SiteHeader searchMode fluid />
      <section className="pb-28 pt-7 sm:pb-16 sm:pt-10 md:pb-16 lg:pt-12">
        <Container className={maxWidth === "3xl" ? "max-w-3xl" : "max-w-2xl"}>
          <header className="mb-6 sm:mb-8">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-[2rem] font-extrabold tracking-[-0.045em] text-[#0B1F3A] sm:text-[2.55rem]">
              {title}
            </h1>
            {intro ? (
              <p className="mt-3 max-w-2xl text-[14px] leading-6 text-slate-600 sm:text-[14.5px] sm:leading-7">
                {intro}
              </p>
            ) : null}
          </header>
          <div className={`${ui.surfacePremium} p-5 sm:p-7`}>{children}</div>
        </Container>
      </section>
      <SiteFooter />
      <MobileBottomNav />
    </main>
  );
}
