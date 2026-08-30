import Link from "next/link";
import { FilePenLine, Mail } from "lucide-react";

import { SecondaryPageShell } from "@/components/layout/SecondaryPageShell";
import { ui } from "@/components/ui/design-system";

export const metadata = {
  title: "Contact — AkarFinder",
  description: "Contacter l'équipe AkarFinder.",
};

const MAILTO = "mailto:contact@akarfinder.ma?subject=Contact%20AkarFinder";

export default function ContactPage() {
  return (
    <SecondaryPageShell
      eyebrow="Contact"
      title="Nous contacter"
      intro="Une question sur une annonce, un partenariat ou le fonctionnement du site ? Choisissez le canal adapté."
      maxWidth="3xl"
    >
      <div className="grid gap-3 sm:grid-cols-2" data-p1-editorial-contact>
        <article className="flex flex-col rounded-[20px] border border-[#DCE8F5] bg-[#F8FBFF] p-5 sm:p-6">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#EEF6FF] text-[#0B63CE]">
            <Mail size={18} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-[1rem] font-extrabold text-[#0B1F3A]">Question générale</h2>
          <p className="mt-2 flex-1 text-[13px] leading-6 text-slate-600">
            Pour une question sur le site, une annonce ou un partenariat, écrivez directement à l’équipe AkarFinder.
          </p>
          <a href={MAILTO} className={`${ui.primaryActionPill} mt-5 min-h-11 px-5`}>
            Envoyer un email
          </a>
        </article>

        <article className="flex flex-col rounded-[20px] border border-[#DCE8F5] bg-white p-5 sm:p-6">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-slate-100 text-[#0B1F3A]">
            <FilePenLine size={18} strokeWidth={2.2} aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-[1rem] font-extrabold text-[#0B1F3A]">Retrait ou correction</h2>
          <p className="mt-2 flex-1 text-[13px] leading-6 text-slate-600">
            Pour retirer ou corriger un résultat, utilisez la procédure dédiée afin de transmettre les bonnes références.
          </p>
          <Link href="/demande-retrait" className={`${ui.secondaryActionPill} mt-5 min-h-11 px-4`}>
            Demande de retrait
          </Link>
        </article>
      </div>
    </SecondaryPageShell>
  );
}
