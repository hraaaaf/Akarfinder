import Link from "next/link";
import { ArrowRight, Building2, Calculator, CheckCircle2, Database, FileQuestion, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { ProActivationForm } from "@/components/pro/ProActivationForm";

const DATA_STATES = [
  { icon: Database, title: "Déclaré par le professionnel", text: "Prix, caractéristiques, médias et informations que vous fournissez explicitement." },
  { icon: Calculator, title: "Calculé par AkarFinder", text: "Indicateurs calculables à partir de données suffisantes, avec méthode et limites explicites." },
  { icon: Sparkles, title: "Déduit avec prudence", text: "Signaux dérivés uniquement lorsque la méthode l’autorise, sans transformer une déduction en fait déclaré." },
  { icon: FileQuestion, title: "Non renseigné", text: "Une donnée absente reste absente. AkarFinder ne la complète pas pour embellir une fiche." },
] as const;

const VALUE_LOOP = [
  { step: "01", title: "Vous fournissez des données autorisées", text: "Une seule base structurée pour vos biens ou projets, avec droits média et provenance explicites." },
  { step: "02", title: "AkarFinder structure et normalise", text: "Property Schema, complétude pondérée, dédoublonnage et séparation stricte des états de donnée." },
  { step: "03", title: "Le moteur devient plus utile", text: "Fiches plus riches, comparaison plus claire, meilleure adaptation aux critères Search et Mon Projet lorsque les données le permettent." },
  { step: "04", title: "La demande arrive plus structurée", text: "Les parcours peuvent transmettre davantage de contexte utile, sans promettre un volume de leads ou une vente." },
] as const;

const TRUST_RULES = [
  "Le paiement n’achète pas la pertinence organique, la qualité ou la confiance.",
  "Toute visibilité sponsorisée est séparée et clairement labellisée.",
  "Aucun badge spécial sans processus réel de validation documenté.",
  "Les médias ne sont publiés que lorsque les droits et permissions sont compatibles avec la politique AkarFinder.",
] as const;

export function ProPageV2() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="dark" />

      <section className="relative overflow-hidden bg-deepblue py-16 text-white lg:py-24">
        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-bronze-400">AkarFinder Pro · Programme pilote</p>
            <h1 className="mt-4 text-[2.4rem] font-extrabold leading-[1.04] tracking-[-0.05em] sm:text-[3.7rem]">Transformez vos données immobilières en expériences plus utiles.</h1>
            <p className="mx-auto mt-5 max-w-3xl text-[15px] leading-7 text-white/68 sm:text-[17px]">Donnez à AkarFinder des informations fiables sur vos biens une seule fois. Nous les structurons, séparons ce qui est déclaré de ce qui est calculé ou déduit, puis les utilisons pour améliorer la recherche, la comparaison et la qualification de la demande.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="#contact" className="inline-flex items-center gap-2 rounded-xl bg-bronze-700 px-6 py-3.5 text-[14px] font-extrabold text-white">Demander une activation pilote <ArrowRight size={15} /></a>
              <Link href="/demo" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-6 py-3.5 text-[14px] font-extrabold text-white/90">Voir les démonstrations</Link>
            </div>
            <p className="mt-5 text-[11.5px] leading-5 text-white/42">Aucune organisation professionnelle n’est présentée ici comme active tant que l’onboarding, l’authentification, la validation et l’autorisation des sources ne sont pas terminés.</p>
          </div>
        </Container>
      </section>

      <section className="py-14 lg:py-18">
        <Container>
          <div className="grid gap-5 lg:grid-cols-2">
            <Link href="/pro/agences" className="group rounded-3xl border border-border/15 bg-card p-7 transition hover:border-bronze-500/40 dark:border-white/10 dark:bg-white/[0.04]">
              <Users size={22} className="text-bronze-500" />
              <p className="mt-5 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-bronze-500">Agences</p>
              <h2 className="mt-2 text-2xl font-extrabold">Structurer un portefeuille de biens</h2>
              <p className="mt-3 text-[13.5px] leading-6 text-muted-foreground">Qualité de donnée, complétude, droits média, résultats Search et demandes associées dans un modèle professionnel explicite.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-bronze-500">Parcours agence <ArrowRight size={13} /></span>
            </Link>
            <Link href="/promoteurs" className="group rounded-3xl border border-border/15 bg-card p-7 transition hover:border-bronze-500/40 dark:border-white/10 dark:bg-white/[0.04]">
              <Building2 size={22} className="text-bronze-500" />
              <p className="mt-5 text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-bronze-500">Promoteurs</p>
              <h2 className="mt-2 text-2xl font-extrabold">Structurer projets, typologies et médias</h2>
              <p className="mt-3 text-[13.5px] leading-6 text-muted-foreground">Un modèle adapté aux projets neufs, avec données déclarées, typologies, plans, droits et publication après validation.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-extrabold text-bronze-500">Parcours promoteur <ArrowRight size={13} /></span>
            </Link>
          </div>
        </Container>
      </section>

      <section className="border-y border-border/12 bg-surface py-14 dark:border-white/8">
        <Container>
          <div className="max-w-3xl">
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-bronze-500">Contrat data-for-value</p>
            <h2 className="mt-2 text-[1.9rem] font-extrabold tracking-[-0.04em]">Plus de données utiles, pas plus de données inventées.</h2>
            <p className="mt-3 text-[13.5px] leading-6 text-muted-foreground">Le Property Schema AkarFinder distingue explicitement quatre états. Cette séparation doit rester visible dans l’onboarding et dans les surfaces publiques.</p>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {DATA_STATES.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-2xl border border-border/15 bg-card p-5 dark:border-white/10 dark:bg-white/[0.04]"><Icon size={19} className="text-bronze-500" /><h3 className="mt-4 text-[14px] font-extrabold">{title}</h3><p className="mt-2 text-[12px] leading-5 text-muted-foreground">{text}</p></article>)}
          </div>
        </Container>
      </section>

      <section className="py-14 lg:py-18">
        <Container>
          <div className="mx-auto max-w-4xl">
            <div className="text-center"><p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-bronze-500">Boucle de valeur</p><h2 className="mt-2 text-[1.9rem] font-extrabold tracking-[-0.04em]">De la donnée professionnelle à une recherche plus utile</h2></div>
            <div className="mt-8 space-y-3">
              {VALUE_LOOP.map((item) => <article key={item.step} className="flex gap-4 rounded-2xl border border-border/15 bg-card p-5 dark:border-white/10 dark:bg-white/[0.04]"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-deepblue text-sm font-extrabold text-bronze-400">{item.step}</span><div><h3 className="font-extrabold">{item.title}</h3><p className="mt-1 text-[12.5px] leading-5 text-muted-foreground">{item.text}</p></div></article>)}
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-border/12 bg-surface py-14 dark:border-white/8">
        <Container>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-3xl border border-border/15 bg-card p-7 dark:border-white/10 dark:bg-white/[0.04]">
              <Search size={21} className="text-bronze-500" />
              <h2 className="mt-4 text-2xl font-extrabold">Une offre pilote unique, adaptée au type de partenaire</h2>
              <p className="mt-3 text-[13px] leading-6 text-muted-foreground">Le socle reste le même : intégration de données autorisées, structuration, complétude, publication après validation et demande structurée. Les différences viennent du modèle métier agence ou promoteur — pas de quatre packs contradictoires.</p>
              <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full border border-border/15 px-3 py-2 text-[11.5px] font-bold">Socle Pro pilote</span><span className="rounded-full border border-border/15 px-3 py-2 text-[11.5px] font-bold">+ Sponsoring labellisé</span><span className="rounded-full border border-border/15 px-3 py-2 text-[11.5px] font-bold">+ Reporting avancé</span><span className="rounded-full border border-border/15 px-3 py-2 text-[11.5px] font-bold">+ Sakan Expo</span></div>
            </article>
            <article className="rounded-3xl border border-border/15 bg-card p-7 dark:border-white/10 dark:bg-white/[0.04]">
              <ShieldCheck size={21} className="text-bronze-500" />
              <h2 className="mt-4 text-2xl font-extrabold">Règles non négociables</h2>
              <ul className="mt-5 space-y-3">{TRUST_RULES.map((rule) => <li key={rule} className="flex items-start gap-2.5 text-[12.5px] leading-5 text-muted-foreground"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />{rule}</li>)}</ul>
            </article>
          </div>
        </Container>
      </section>

      <section className="py-14 lg:py-18">
        <Container>
          <div className="text-center"><p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-bronze-500">Démonstrations fictives</p><h2 className="mt-2 text-[1.9rem] font-extrabold tracking-[-0.04em]">Voir le produit cible sans le confondre avec l’état actif</h2></div>
          <div className="mx-auto mt-7 grid max-w-5xl gap-4 md:grid-cols-3">
            {[{ href: "/demo/agence", title: "Page agence" }, { href: "/demo/promoteur", title: "Page promoteur" }, { href: "/demo/bien", title: "Fiche bien enrichie" }].map((item) => <Link key={item.href} href={item.href} className="rounded-2xl border border-border/15 bg-card p-5 text-center font-extrabold transition hover:border-bronze-500/40 dark:border-white/10 dark:bg-white/[0.04]">{item.title}<span className="ml-2 text-bronze-500">→</span></Link>)}
          </div>
        </Container>
      </section>

      <ProActivationForm />
      <SiteFooter />
    </main>
  );
}
