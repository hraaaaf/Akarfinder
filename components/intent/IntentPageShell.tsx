import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";

export type IntentCTA = {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost";
};

export type IntentBlock = {
  icon: ReactNode;
  iconBg: string;
  title: string;
  body: string;
  cta?: IntentCTA;
};

export type IntentPageShellProps = {
  badge: string;
  badgeColor?: string;
  title: string;
  subtitle: string;
  heroCtas: IntentCTA[];
  whyTitle?: string;
  blocks: IntentBlock[];
  callout?: { title: string; body: string; cta: IntentCTA };
  disclaimer?: string;
};

function CTAButton({ cta }: { cta: IntentCTA }) {
  const base = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-extrabold transition max-sm:w-full";
  const variants: Record<string, string> = {
    primary: `${base} bg-[#0B63CE] text-white shadow-[0_8px_22px_rgba(11,99,206,0.2)] hover:bg-[#084BA8]`,
    secondary: `${base} border border-[#C9DDF0] bg-white text-deepblue shadow-[0_6px_18px_rgba(7,27,51,0.05)] hover:border-[#93C5FD] hover:bg-blue-50`,
    ghost: `${base} border border-[#C9DDF0] bg-white/80 text-deepblue hover:border-[#93C5FD] hover:bg-white dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20`,
  };
  return (
    <Link href={cta.href} className={variants[cta.variant ?? "secondary"]}>
      {cta.label}
      <ArrowRight size={14} strokeWidth={2.4} aria-hidden="true" />
    </Link>
  );
}

function BlockCard({ block }: { block: IntentBlock }) {
  return (
    <article className="flex flex-col gap-3 rounded-[1.25rem] border border-[#DFE8F1] bg-white p-[18px] shadow-[0_10px_30px_rgba(7,27,51,0.055)]">
      <span className={`inline-grid h-10 w-10 shrink-0 place-items-center rounded-[14px] ${block.iconBg} text-white`}>
        {block.icon}
      </span>
      <div className="flex flex-1 flex-col gap-1.5">
        <h3 className="text-[0.98rem] font-extrabold tracking-[-0.02em] text-deepblue">
          {block.title}
        </h3>
        <p className="text-[13px] leading-[1.58] text-gray-500">{block.body}</p>
      </div>
      {block.cta ? (
        <Link
          href={block.cta.href}
          className="mt-auto inline-flex min-h-9 items-center gap-1.5 text-[12px] font-extrabold text-[#0B63CE] transition hover:text-[#084BA8]"
        >
          {block.cta.label}
          <ArrowRight size={12} strokeWidth={2.5} aria-hidden="true" />
        </Link>
      ) : null}
    </article>
  );
}

export function IntentPageShell({
  badge,
  badgeColor = "text-bronze-400",
  title,
  subtitle,
  heroCtas,
  whyTitle = "Comment ça marche",
  blocks,
  callout,
  disclaimer,
}: IntentPageShellProps) {
  return (
    <main className="min-h-screen bg-[#F7FAFD] text-gray-900" data-p1-intent-shell>
      <SiteHeader />

      <section
        className="border-b border-[#E1EAF3] bg-[radial-gradient(circle_at_50%_0%,rgba(219,234,254,0.8),transparent_58%),linear-gradient(180deg,#F7FBFF_0%,#FFFFFF_100%)] px-4 py-10 text-deepblue sm:py-14 lg:py-16"
        data-p1-intent-hero
      >
        <div className="mx-auto max-w-3xl text-center">
          <p className={`text-[10.5px] font-extrabold uppercase tracking-[0.18em] ${badgeColor}`}>
            {badge}
          </p>
          <h1 className="mt-3 text-[2.05rem] font-extrabold leading-[1.05] tracking-[-0.05em] sm:text-[2.8rem] lg:text-[3rem]">
            {title}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-[14px] leading-6 text-gray-600 sm:text-[15px] sm:leading-7">
            {subtitle}
          </p>
          {heroCtas.length > 0 ? (
            <div className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-2.5 sm:mt-7">
              {heroCtas.map((cta) => (
                <CTAButton key={cta.href + cta.label} cta={cta} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <Container className="py-9 sm:py-11 lg:py-12" data-p1-intent-content>
        <h2 className="mb-6 text-[1.35rem] font-extrabold tracking-[-0.04em] text-deepblue sm:text-[1.55rem]">
          {whyTitle}
        </h2>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3" data-p1-intent-grid>
          {blocks.map((block, i) => (
            <BlockCard key={i} block={block} />
          ))}
        </div>

        {callout ? (
          <div className="mt-7 rounded-[1.45rem] border border-blue-200 bg-[#EEF6FF] p-5 text-deepblue sm:p-6" data-p1-intent-callout>
            <h2 className="text-[1.35rem] font-extrabold tracking-[-0.04em] sm:text-[1.5rem]">
              {callout.title}
            </h2>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-6 text-gray-600">
              {callout.body}
            </p>
            <div className="mt-5 max-w-sm">
              <CTAButton cta={{ ...callout.cta, variant: "primary" }} />
            </div>
          </div>
        ) : null}

        {disclaimer ? (
          <p className="mt-6 rounded-xl border border-[#E8DEC8] bg-[#FFFDF7] px-4 py-3 text-[11.5px] leading-5 text-gray-500">
            {disclaimer}
          </p>
        ) : null}
      </Container>

      <SiteFooter />
    </main>
  );
}
