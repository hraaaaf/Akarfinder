import Link from "next/link";
import { ArrowRight, Building2, Compass, Home, Search } from "lucide-react";

import { Container } from "@/components/ui/Container";

const actions = [
  {
    key: "search",
    href: "/search",
    eyebrow: "Acheter ou louer",
    title: "Rechercher un bien",
    body: "Parcourez les biens visibles dans AkarFinder et affinez vos critères.",
    icon: Search,
  },
  {
    key: "project",
    href: "/compagnon",
    eyebrow: "Votre projet",
    title: "Préparer mon projet",
    body: "Structurez ville, budget et critères avant de comparer les options.",
    icon: Compass,
  },
  {
    key: "sell",
    href: "/vendre",
    eyebrow: "Vous avez un bien",
    title: "Préparer ma vente",
    body: "Consultez les repères disponibles et préparez les prochaines étapes.",
    icon: Home,
  },
  {
    key: "pro",
    href: "/pro",
    eyebrow: "Professionnels",
    title: "Agences & promoteurs",
    body: "Accédez à l’espace dédié aux professionnels de l’immobilier.",
    icon: Building2,
  },
] as const;

export function HomeActionGrid() {
  return (
    <section data-hvr5-action-grid="compact" className="bg-[#F7FAFD] py-11 sm:py-16 lg:py-16">
      <Container>
        <div className="mx-auto max-w-[1240px]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div>
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.19em] text-[#0B63CE]">Pour aller plus loin</p>
              <h2 className="mt-2 max-w-[760px] text-[1.85rem] font-extrabold leading-[1.06] tracking-[-0.04em] text-[#0B1F3A] sm:text-[2.55rem]">
                Que voulez-vous faire maintenant ?
              </h2>
            </div>
            <p className="max-w-[420px] text-[12.5px] leading-5 text-slate-500 sm:text-right sm:text-[13px]">
              Quatre chemins directs. Pas de détour, pas de chiffres d’exemple présentés comme des données.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.key}
                  href={action.href}
                  data-hvr5-action={action.key}
                  className="group flex min-h-[176px] flex-col rounded-[1.25rem] border border-[#DCE8F5] bg-white p-4 shadow-[0_10px_28px_rgba(11,31,58,0.055)] transition duration-200 hover:-translate-y-0.5 hover:border-[#93C5FD] hover:shadow-[0_18px_42px_rgba(11,99,206,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE] focus-visible:ring-offset-2 motion-reduce:transform-none sm:min-h-[190px] sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#EAF4FF] text-[#0B63CE]">
                      <Icon size={19} strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    <ArrowRight size={17} className="mt-1 text-[#0B63CE] transition group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
                  </div>

                  <p className="mt-5 text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">{action.eyebrow}</p>
                  <h3 className="mt-1.5 text-[1.18rem] font-extrabold tracking-[-0.025em] text-[#0B1F3A]">{action.title}</h3>
                  <p className="mt-2 text-[11.5px] leading-5 text-slate-600 sm:text-[12px]">{action.body}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
}
