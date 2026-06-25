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
  const base = "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-[13.5px] font-extrabold transition";
  const variants: Record<string, string> = {
    primary: `${base} bg-deepblue text-white shadow-[0_6px_18px_rgba(7,27,51,0.22)] hover:bg-[#0d2a4d]`,
    secondary: `${base} border border-[#d8c8a3] bg-[#fffdf8] text-deepblue hover:bg-[#f7f3ea]`,
    ghost: `${base} border border-white/20 bg-white/10 text-white hover:bg-white/20`,
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
    <article className="flex flex-col gap-4 rounded-[1.4rem] border border-[#eadfca] bg-white p-5 shadow-[0_6px_22px_rgba(7,27,51,0.05)]">
      <span className={`inline-grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${block.iconBg} text-white`}>
        {block.icon}
      </span>
      <div className="flex flex-1 flex-col gap-2">
        <h3 className="text-[1rem] font-extrabold tracking-[-0.02em] text-deepblue">
          {block.title}
        </h3>
        <p className="text-[13.5px] leading-6 text-gray-500">{block.body}</p>
      </div>
      {block.cta ? (
        <Link
          href={block.cta.href}
          className="mt-auto inline-flex items-center gap-1.5 text-[12.5px] font-extrabold text-deepblue transition hover:text-bronze-700"
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
    <main className="min-h-screen bg-[#f8f9fa] text-gray-900">
      <SiteHeader />

      {/* ── Hero ── */}
      <section className="bg-deepblue px-4 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className={`text-[11px] font-extrabold uppercase tracking-[0.18em] ${badgeColor}`}>
            {badge}
          </p>
          <h1 className="mt-3 text-[2.2rem] font-extrabold leading-[1.12] tracking-[-0.05em] sm:text-[3rem]">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-white/72">
            {subtitle}
          </p>
          {heroCtas.length > 0 ? (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {heroCtas.map((cta) => (
                <CTAButton key={cta.href + cta.label} cta={cta} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* ── Blocks ── */}
      <Container className="py-12 lg:py-16">
        <h2 className="mb-8 text-[1.4rem] font-extrabold tracking-[-0.04em] text-deepblue">
          {whyTitle}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {blocks.map((block, i) => (
            <BlockCard key={i} block={block} />
          ))}
        </div>

        {/* ── Optional callout ── */}
        {callout ? (
          <div className="mt-10 rounded-[1.7rem] bg-deepblue p-8 text-white">
            <h2 className="text-[1.5rem] font-extrabold tracking-[-0.04em]">
              {callout.title}
            </h2>
            <p className="mt-3 max-w-xl text-[14px] leading-7 text-white/72">
              {callout.body}
            </p>
            <div className="mt-6">
              <CTAButton cta={{ ...callout.cta, variant: "ghost" }} />
            </div>
          </div>
        ) : null}

        {/* ── Disclaimer ── */}
        {disclaimer ? (
          <p className="mt-8 rounded-xl border border-[#eadfca] bg-[#fffdf8] px-4 py-3 text-[12px] leading-5 text-gray-500">
            {disclaimer}
          </p>
        ) : null}
      </Container>

      <SiteFooter />
    </main>
  );
}
