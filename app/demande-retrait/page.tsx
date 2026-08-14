import { SecondaryPageShell } from "@/components/layout/SecondaryPageShell";
import { ui } from "@/components/ui/design-system";

export const metadata = {
  title: "Demande de retrait — AkarFinder",
  description: "Demander le retrait d'un résultat affiché ou de vos données sur AkarFinder.",
};

const MAILTO = "mailto:retrait@akarfinder.ma?subject=Demande%20de%20retrait%20AkarFinder";

export default function DemandeRetraitPage() {
  return (
    <SecondaryPageShell
      eyebrow="Droits et retrait"
      title="Demande de retrait"
      intro="Vous pouvez demander le retrait ou la correction d'un résultat affiché, ou exercer vos droits sur vos données personnelles."
    >
      <p className="text-[14px] leading-7 text-slate-600 sm:text-[14.5px]">
        AkarFinder affiche des résultats provenant de sources tierces sous forme d&apos;aperçu limité. Si vous êtes le
        propriétaire, l&apos;agence ou le vendeur d&apos;une annonce affichée et souhaitez son retrait, transmettez-nous les
        références utiles afin que la demande puisse être vérifiée et traitée.
      </p>

      <div className="mt-6 rounded-[1.2rem] border border-slate-200/80 bg-slate-50/80 p-5 sm:p-6">
        <h2 className="text-[1.05rem] font-extrabold text-[#0B1F3A]">Informations à préciser</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13.5px] leading-6 text-slate-600">
          <li>Lien(s) de l&apos;annonce concernée sur AkarFinder</li>
          <li>Lien de l&apos;annonce sur le site source</li>
          <li>Motif de la demande : retrait, correction, accès ou suppression</li>
          <li>Un moyen de vous recontacter par email</li>
        </ul>
        <a href={MAILTO} className={`${ui.primaryActionPill} mt-5 min-h-11 px-5`}>
          Envoyer une demande de retrait
        </a>
        <p className="mt-3 text-[12px] text-slate-500">Réponse et traitement sous quelques jours ouvrés.</p>
      </div>
    </SecondaryPageShell>
  );
}
