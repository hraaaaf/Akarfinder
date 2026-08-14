import Link from "next/link";

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
      intro="Une question sur une annonce, un partenariat ou le fonctionnement du site ? Écrivez-nous directement."
    >
      <div className="rounded-[1.2rem] border border-slate-200/80 bg-slate-50/80 p-5 sm:p-6">
        <p className="text-[13.5px] leading-6 text-slate-600">
          Pour les demandes générales, utilisez l&apos;adresse de contact. Pour retirer ou corriger un résultat,
          passez par la procédure dédiée afin de nous transmettre les bonnes références.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <a href={MAILTO} className={`${ui.primaryActionPill} min-h-11 px-5`}>
            Envoyer un email
          </a>
          <Link href="/demande-retrait" className={`${ui.secondaryActionPill} min-h-11 px-4`}>
            Demande de retrait
          </Link>
        </div>
      </div>
    </SecondaryPageShell>
  );
}
