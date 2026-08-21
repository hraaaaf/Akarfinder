import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Database,
  FileQuestion,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { ProActivationForm } from "@/components/pro/ProActivationForm";

const PRO_PILLARS = [
  { icon: Users, title: "Identité pro", detail: "Profil, équipe et provenance visibles." },
  { icon: Upload, title: "Publication structurée", detail: "Même Listing Standard pour tous." },
  { icon: BarChart3, title: "Intelligence marché", detail: "Lecture territoriale sans donnée inventée." },
] as const;

const DATA_STATES = [
  { icon: Database, title: "Déclaré par le professionnel", text: "Prix, caractéristiques, médias et informations fournis explicitement." },
  { icon: BarChart3, title: "Calculé par AkarFinder", text: "Indicateurs calculables uniquement à partir de données suffisantes, avec méthode explicite." },
  { icon: Sparkles, title: "Déduit avec prudence", text: "Signaux dérivés lorsque la méthode l’autorise, sans transformer une déduction en fait déclaré." },
  { icon: FileQuestion, title: "Non renseigné", text: "Une donnée absente reste absente. AkarFinder ne la complète pas pour embellir une fiche." },
] as const;

const TRUST_RULES = [
  "Le paiement n’achète pas la pertinence organique, la qualité ou la confiance.",
  "Toute visibilité sponsorisée est séparée et clairement labellisée.",
  "Aucun badge spécial sans processus réel de validation documenté.",
  "Les médias ne sont publiés que lorsque les droits et permissions sont compatibles avec la politique AkarFinder.",
] as const;

const PREVIEW_ROWS = [
  ["Portefeuille", "Annonces structurées"],
  ["Demandes", "Contexte conservé"],
  ["Qualité", "Complétude visible"],
] as const;

export function ProPageV2() {
  return (
    <main className="min-h-screen bg-[#061027] text-white" data-p9-professionnels="canonical-reconciliation">
      <SiteHeader variant="transparent" fluid />

      <section className="relative overflow-hidden px-0 pb-14 pt-28 sm:pb-16 lg:pt-32" data-p9-hero>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(11,99,206,.3),transparent_36%)]" />
        <Container>
          <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_.86fr] lg:gap-12">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-blue-300">AkarFinder Pro</p>
              <h1 className="mt-4 max-w-2xl text-[2.65rem] font-black leading-[1.02] tracking-[-0.055em] sm:text-6xl">
                Vos annonces, votre identité, notre intelligence territoriale.
              </h1>
              <p className="mt-5 max-w-xl text-[14px] leading-6 text-slate-300 sm:text-[15px] sm:leading-7">
                Agences et promoteurs publient des dossiers structurés, conservent leur provenance et gagnent une lecture marché cohérente, sans transformer une estimation ou une déduction en fait déclaré.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#contact" className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-white px-5 py-3 text-sm font-extrabold text-[#0B2545] transition hover:bg-blue-50">
                  Devenir partenaire <ArrowRight size={15} />
                </a>
                <a href="#standards" className="inline-flex min-h-11 items-center rounded-[14px] border border-white/20 bg-white/[0.04] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-white/[0.09]">
                  Voir les standards
                </a>
              </div>
              <p className="mt-5 max-w-xl text-[11px] leading-5 text-slate-500">
                Une demande d’activation ne crée ni organisation publique, ni badge, ni résultat garanti avant onboarding et validation.
              </p>
            </div>

            <div className="rounded-[28px] border border-white/15 bg-white/10 p-3 backdrop-blur sm:p-5" data-p9-dashboard-preview>
              <div className="rounded-[22px] bg-white p-5 text-[#0B1F3A] shadow-[0_24px_80px_rgba(0,0,0,.2)] sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9.5px] font-extrabold uppercase tracking-[0.17em] text-[#0B63CE]">Aperçu du produit</p>
                    <h2 className="mt-1 text-xl font-black">Tableau de bord partenaire</h2>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600"><ShieldCheck size={19} /></span>
                </div>
                <p className="mt-3 text-[11px] leading-5 text-slate-500">Aucun KPI fictif : les valeurs réelles n’apparaissent qu’après activation et alimentation du compte.</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {PREVIEW_ROWS.map(([label, state]) => (
                    <div key={label} className="rounded-[15px] border border-[#DCE8F5] bg-[#F7FAFD] p-3">
                      <span className="block text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">{label}</span>
                      <strong className="mt-1.5 block text-[11px] leading-4 text-[#0B2545]">{state}</strong>
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  {["Annonce structurée", "Demande qualifiée", "Lecture territoriale"].map((label) => (
                    <div key={label} className="flex items-center justify-between rounded-[14px] border border-[#DCE8F5] px-3 py-3 text-[11px] font-bold">
                      <span>{label}</span><span className="text-[#0B63CE]">Aperçu</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-white/10 bg-white/[0.035] py-8" data-p9-pillars>
        <Container>
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
            {PRO_PILLARS.map(({ icon: Icon, title, detail }) => (
              <article key={title} className="rounded-[22px] border border-white/10 bg-white/5 p-5">
                <Icon size={19} className="text-blue-300" />
                <h2 className="mt-3 text-sm font-extrabold">{title}</h2>
                <p className="mt-2 text-xs leading-5 text-slate-400">{detail}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-[#F7FAFD] py-12 text-[#0B1F3A] lg:py-16">
        <Container>
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Deux métiers · un standard</p>
              <h2 className="mt-2 text-[1.9rem] font-black tracking-[-0.04em]">Une façade commune, des parcours adaptés.</h2>
              <p className="mt-3 max-w-2xl text-[13.5px] leading-6 text-slate-600">Le socle reste identique : données autorisées, provenance conservée, publication structurée et demande contextualisée.</p>
            </div>
            <div className="mt-7 grid gap-4 lg:grid-cols-2">
              <Link href="/pro/agences" className="group rounded-[24px] border border-[#DCE8F5] bg-white p-6 transition hover:border-[#0B63CE]/45">
                <Users size={21} className="text-[#0B63CE]" />
                <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">Agences</p>
                <h3 className="mt-2 text-xl font-black">Structurer un portefeuille de biens</h3>
                <p className="mt-3 text-[13px] leading-6 text-slate-600">Qualité de donnée, complétude, droits média et demandes associées dans un modèle professionnel explicite.</p>
                <span className="mt-5 inline-flex items-center gap-2 text-[12.5px] font-extrabold text-[#0B63CE]">Parcours agence <ArrowRight size={13} /></span>
              </Link>
              <Link href="/promoteurs" className="group rounded-[24px] border border-[#DCE8F5] bg-white p-6 transition hover:border-[#0B63CE]/45">
                <Building2 size={21} className="text-[#0B63CE]" />
                <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#0B63CE]">Promoteurs</p>
                <h3 className="mt-2 text-xl font-black">Structurer projets, typologies et médias</h3>
                <p className="mt-3 text-[13px] leading-6 text-slate-600">Un modèle adapté aux projets neufs, avec données déclarées, typologies, plans, droits et publication après validation.</p>
                <span className="mt-5 inline-flex items-center gap-2 text-[12.5px] font-extrabold text-[#0B63CE]">Parcours promoteur <ArrowRight size={13} /></span>
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section id="standards" className="bg-white py-12 text-[#0B1F3A] lg:py-16" data-p9-standards>
        <Container>
          <div className="mx-auto max-w-6xl">
            <div className="max-w-3xl">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-[#0B63CE]">Contrat data-for-value</p>
              <h2 className="mt-2 text-[1.9rem] font-black tracking-[-0.04em]">Plus de données utiles, jamais plus de données inventées.</h2>
              <p className="mt-3 text-[13.5px] leading-6 text-slate-600">Le Property Schema AkarFinder distingue explicitement quatre états et garde cette séparation visible dans l’onboarding comme dans les surfaces publiques.</p>
            </div>
            <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {DATA_STATES.map(({ icon: Icon, title, text }) => (
                <article key={title} className="rounded-[20px] border border-[#DCE8F5] bg-[#F7FAFD] p-5">
                  <Icon size={18} className="text-[#0B63CE]" />
                  <h3 className="mt-4 text-[13.5px] font-extrabold">{title}</h3>
                  <p className="mt-2 text-[12px] leading-5 text-slate-600">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-[#F7FAFD] py-12 text-[#0B1F3A] lg:py-16">
        <Container>
          <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-2">
            <article className="rounded-[24px] border border-[#DCE8F5] bg-white p-6">
              <Sparkles size={20} className="text-[#0B63CE]" />
              <h2 className="mt-4 text-xl font-black">Socle Pro pilote</h2>
              <p className="mt-3 text-[13px] leading-6 text-slate-600">Intégration de données autorisées, structuration, complétude, publication après validation et demande structurée. Les options restent séparées du classement organique.</p>
              <div className="mt-5 flex flex-wrap gap-2 text-[10.5px] font-bold text-slate-600">
                <span className="rounded-full border border-[#DCE8F5] px-3 py-2">Socle Pro pilote</span>
                <span className="rounded-full border border-[#DCE8F5] px-3 py-2">Sponsoring labellisé</span>
                <span className="rounded-full border border-[#DCE8F5] px-3 py-2">Reporting avancé</span>
              </div>
            </article>
            <article className="rounded-[24px] border border-[#DCE8F5] bg-white p-6">
              <ShieldCheck size={20} className="text-[#0B63CE]" />
              <h2 className="mt-4 text-xl font-black">Règles non négociables</h2>
              <ul className="mt-5 space-y-3">
                {TRUST_RULES.map((rule) => (
                  <li key={rule} className="flex items-start gap-2.5 text-[12.5px] leading-5 text-slate-600"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />{rule}</li>
                ))}
              </ul>
            </article>
          </div>
        </Container>
      </section>

      <section className="border-y border-white/10 bg-[#081A33] py-10">
        <Container>
          <div className="mx-auto max-w-5xl text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-300">Démonstrations fictives</p>
            <h2 className="mt-2 text-2xl font-black">Voir le produit cible sans le confondre avec l’état actif</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[{ href: "/demo/agence", title: "Page agence" }, { href: "/demo/promoteur", title: "Page promoteur" }, { href: "/demo/bien", title: "Fiche bien enrichie" }].map((item) => (
                <Link key={item.href} href={item.href} className="rounded-[16px] border border-white/12 bg-white/[0.06] px-4 py-4 text-[12px] font-extrabold transition hover:bg-white/[0.1]">{item.title} <span className="ml-1 text-blue-300">→</span></Link>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <ProActivationForm />
      <SiteFooter />
    </main>
  );
}
