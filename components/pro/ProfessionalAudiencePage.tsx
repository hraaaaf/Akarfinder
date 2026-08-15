import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Cable,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Eye,
  FileImage,
  Search,
  Users,
} from "lucide-react";
import { PropertyVisual } from "@/components/demo/PropertyVisual";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

type Audience = "agency" | "promoter";

const COPY = {
  agency: {
    eyebrow: "AkarFinder Pro · Agences",
    title: "Transformez votre portefeuille en vitrine utile pour vos clients.",
    description:
      "Vos annonces restent les vôtres. AkarFinder les structure, les rend plus lisibles et prépare un parcours de demande qualifiée sans inventer les informations absentes.",
    demo: "/demo/agence",
    demoLabel: "Voir la démo agence complète",
    activation: "/pro?type=agence&source=agency#contact",
    proof: {
      eyebrow: "Aperçu réel du rendu",
      title: "Une page agence qui montre vos biens, vos zones et vos demandes qualifiées.",
      description:
        "La démo utilise le même langage visuel que l’expérience partenaire cible : identité agence, portefeuille structuré, repères quartier et demande qualifiée.",
      visual: "villa-premium" as const,
      cardTitle: "Aperçu page agence",
      cardMeta: "Biens structurés · quartiers · demandes qualifiées",
      badges: ["Page agence", "Fiches enrichies", "Leads qualifiés"],
    },
    data: [
      "Identité et type du bien",
      "Prix, surfaces et pièces",
      "Localisation et quartier",
      "Équipements et état",
      "Médias avec droits",
      "Informations manquantes explicites",
    ],
    onboarding: [
      ["01", "Cadrage", "Zones, typologies, source des annonces et droits de diffusion."],
      ["02", "Import pilote", "Petit lot représentatif pour valider structure, médias et qualité."],
      ["03", "Mise en ligne", "Publication uniquement après validation des données et de l’éligibilité."],
    ],
    integrations: [
      "CSV structuré pour démarrer simplement",
      "Flux/API à cadrer selon votre outil métier",
      "Import pilote avant toute automatisation",
    ],
    deliverables: [
      "Page agence et identité partenaire",
      "Fiches biens structurées au standard AkarFinder",
      "Repères quartier selon les données disponibles",
      "Parcours de demande qualifiée avec contexte du bien",
    ],
    reporting: [
      "Qualité et complétude des annonces intégrées",
      "Demandes reçues avec leur contexte d’origine",
      "Suivi opérationnel du portefeuille publié",
    ],
    distinction: {
      title: "L’agence vend un portefeuille et une expertise locale.",
      body: "L’expérience met donc l’accent sur les biens disponibles, les secteurs couverts, la qualité des fiches et la qualification des demandes.",
    },
    faq: [
      [
        "Quels formats pouvez-vous intégrer ?",
        "On démarre avec un CSV structuré. Un flux ou une API peut ensuite être cadré si votre outil métier le justifie.",
      ],
      [
        "Mes annonces sont-elles publiées automatiquement ?",
        "Non. Source, droits média, qualité et éligibilité sont vérifiés avant publication.",
      ],
      [
        "Que reçoit mon agence pendant le pilote ?",
        "Une page agence, des fiches structurées et un parcours de demande contextualisé selon les données réellement disponibles.",
      ],
    ],
    icon: Users,
  },
  promoter: {
    eyebrow: "AkarFinder Pro · Promoteurs",
    title: "Transformez vos projets en expérience de commercialisation structurée.",
    description:
      "AkarFinder sépare projet, typologies, prix, livraison, plans et médias pour donner aux acheteurs une lecture plus claire, sans transformer une donnée absente en promesse commerciale.",
    demo: "/demo/promoteur",
    demoLabel: "Voir la démo promoteur complète",
    activation: "/pro?type=promoteur&source=promoter#contact",
    proof: {
      eyebrow: "Aperçu réel du rendu",
      title: "Une page promoteur centrée sur vos projets, typologies et étapes de livraison.",
      description:
        "La démo montre la cible concrète : identité promoteur, projets, typologies, plans 2D, tranches de livraison et expérience quartier.",
      visual: "project-facade" as const,
      cardTitle: "Aperçu page promoteur",
      cardMeta: "Projets · typologies · plans 2D · livraisons",
      badges: ["Page promoteur", "Projets structurés", "Plans & typologies"],
    },
    data: [
      "Identité du projet",
      "Typologies et unités",
      "Prix et surfaces",
      "Livraison et statut",
      "Plans, brochures et droits",
      "Transparence et données manquantes",
    ],
    onboarding: [
      ["01", "Cadrage projet", "Projets, tranches, typologies, documents et droits de diffusion."],
      ["02", "Montage pilote", "Un projet représentatif pour valider structure, plans, médias et statuts."],
      ["03", "Publication", "Mise en ligne après validation des contenus et de leur éligibilité."],
    ],
    integrations: [
      "CSV structuré pour projets et typologies",
      "Documents et médias transmis avec leurs droits",
      "Flux/API à cadrer si le catalogue doit être synchronisé",
    ],
    deliverables: [
      "Page promoteur et identité partenaire",
      "Pages projets avec typologies et informations disponibles",
      "Plans, médias et jalons de livraison lorsque fournis",
      "Parcours de prise de contact rattaché au projet",
    ],
    reporting: [
      "Qualité et complétude des projets intégrés",
      "Demandes reçues avec projet ou typologie d’origine",
      "Suivi opérationnel des contenus publiés",
    ],
    distinction: {
      title: "Le promoteur commercialise des projets, pas une simple liste d’annonces.",
      body: "L’expérience met donc l’accent sur les programmes, les typologies, les plans, les jalons de livraison et le contexte de chaque demande.",
    },
    faq: [
      [
        "Peut-on intégrer plusieurs projets et typologies ?",
        "Oui, après validation d’un projet pilote représentatif et du schéma de données retenu.",
      ],
      [
        "Plans et brochures sont-ils obligatoires ?",
        "Non. Ils sont intégrés lorsqu’ils sont fournis avec les droits nécessaires ; leur absence reste explicite.",
      ],
      [
        "Que reçoit le promoteur pendant le pilote ?",
        "Une page promoteur, des pages projets structurées et un parcours de contact rattaché au projet, selon les données disponibles.",
      ],
    ],
    icon: Building2,
  },
} as const;

export function ProfessionalAudiencePage({ audience }: { audience: Audience }) {
  const copy = COPY[audience];
  const Icon = copy.icon;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader variant="dark" />

      <section className="bg-deepblue py-16 text-white lg:py-22">
        <Container>
          <div className="mx-auto max-w-4xl text-center">
            <Icon size={28} className="mx-auto text-bronze-400" />
            <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-bronze-400">
              {copy.eyebrow}
            </p>
            <h1 className="mt-4 text-[2.35rem] font-extrabold leading-[1.04] tracking-[-0.05em] sm:text-[3.5rem]">
              {copy.title}
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-[15px] leading-7 text-white/68">
              {copy.description}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href={copy.activation}
                className="inline-flex items-center gap-2 rounded-xl bg-bronze-700 px-6 py-3.5 text-[14px] font-extrabold text-white"
              >
                Demander une activation pilote <ArrowRight size={14} />
              </Link>
              <Link
                href={copy.demo}
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-6 py-3.5 text-[14px] font-extrabold text-white/90"
              >
                {copy.demoLabel}
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-14 lg:py-18" aria-labelledby="partner-proof-title">
        <Container>
          <div className="grid items-center gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <Eye size={22} className="text-bronze-500" />
              <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.18em] text-bronze-600">
                {copy.proof.eyebrow}
              </p>
              <h2 id="partner-proof-title" className="mt-3 text-3xl font-extrabold tracking-[-0.035em]">
                {copy.proof.title}
              </h2>
              <p className="mt-4 max-w-xl text-[13.5px] leading-6 text-muted-foreground">
                {copy.proof.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {copy.proof.badges.map((badge) => (
                  <span key={badge} className="rounded-full border border-border/20 bg-surface px-3 py-1.5 text-[11.5px] font-bold">
                    {badge}
                  </span>
                ))}
              </div>
              <Link href={copy.demo} className="mt-6 inline-flex items-center gap-2 text-[13.5px] font-extrabold text-bronze-600">
                Explorer la démo fictive <ArrowRight size={14} />
              </Link>
            </div>

            <Link
              href={copy.demo}
              aria-label={copy.demoLabel}
              className="group block overflow-hidden rounded-3xl border border-border/15 bg-card p-3 shadow-[0_18px_50px_rgba(15,35,65,0.10)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_64px_rgba(15,35,65,0.14)] dark:border-white/10 dark:bg-white/[0.04]"
            >
              <div className="relative overflow-hidden rounded-2xl">
                <PropertyVisual type={copy.proof.visual} ratio="16:10" className="rounded-2xl" />
                <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-white/95 p-4 text-[#0B1F3A] shadow-[0_10px_28px_rgba(15,35,65,0.16)] backdrop-blur-sm sm:inset-x-5 sm:bottom-5">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#0B63CE]">Aperçu de démonstration</p>
                  <h3 className="mt-1 text-[17px] font-extrabold">{copy.proof.cardTitle}</h3>
                  <p className="mt-1 text-[11.5px] font-semibold text-slate-500">{copy.proof.cardMeta}</p>
                </div>
              </div>
            </Link>
          </div>
        </Container>
      </section>

      <section className="border-y border-border/12 bg-surface py-14 dark:border-white/8">
        <Container>
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl border border-border/15 bg-card p-7 dark:border-white/10 dark:bg-white/[0.04]">
              <Database size={21} className="text-bronze-500" />
              <h2 className="mt-4 text-2xl font-extrabold">Les données qui créent de la valeur</h2>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {copy.data.map((item) => (
                  <div key={item} className="flex items-start gap-2 rounded-xl bg-surface px-3 py-3 text-[12px] font-semibold">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                    {item}
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-3xl border border-border/15 bg-card p-7 dark:border-white/10 dark:bg-white/[0.04]">
              <Search size={21} className="text-bronze-500" />
              <h2 className="mt-4 text-2xl font-extrabold">Ce qu’AkarFinder en fait</h2>
              <ol className="mt-5 space-y-3 text-[12.5px] leading-5 text-muted-foreground">
                <li><strong className="text-foreground">1. Structure :</strong> normalisation dans le Property Schema.</li>
                <li><strong className="text-foreground">2. Sépare :</strong> déclaré, calculé, déduit et non renseigné.</li>
                <li><strong className="text-foreground">3. Contrôle :</strong> complétude, provenance, droits et éligibilité de publication.</li>
                <li><strong className="text-foreground">4. Utilise :</strong> Search, fiches, comparaison et parcours de demande selon les données disponibles.</li>
              </ol>
            </article>
          </div>
        </Container>
      </section>

      <section className="py-14 lg:py-18" aria-labelledby="partner-onboarding-title">
        <Container>
          <div className="mx-auto max-w-5xl">
            <ClipboardCheck size={22} className="text-bronze-500" />
            <h2 id="partner-onboarding-title" className="mt-4 text-3xl font-extrabold tracking-[-0.035em]">
              Un onboarding pilote en trois étapes
            </h2>
            <p className="mt-3 max-w-2xl text-[13px] leading-6 text-muted-foreground">
              On commence petit, on vérifie les données et les droits, puis on élargit seulement quand le format est propre.
            </p>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {copy.onboarding.map(([step, title, body]) => (
                <article key={step} className="rounded-3xl border border-border/15 bg-card p-6 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-[12px] font-extrabold text-bronze-500">{step}</p>
                  <h3 className="mt-2 text-[17px] font-extrabold">{title}</h3>
                  <p className="mt-2 text-[12.5px] leading-5 text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="border-y border-border/12 bg-surface py-14 dark:border-white/8">
        <Container>
          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl border border-border/15 bg-card p-7 dark:border-white/10 dark:bg-white/[0.04]">
              <Cable size={21} className="text-bronze-500" />
              <h2 className="mt-4 text-xl font-extrabold">Formats d’intégration</h2>
              <ul className="mt-5 space-y-3">
                {copy.integrations.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[12.5px] leading-5 text-muted-foreground">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-3xl border border-border/15 bg-card p-7 dark:border-white/10 dark:bg-white/[0.04]">
              <FileImage size={21} className="text-bronze-500" />
              <h2 className="mt-4 text-xl font-extrabold">Livrables du pilote</h2>
              <ul className="mt-5 space-y-3">
                {copy.deliverables.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[12.5px] leading-5 text-muted-foreground">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </Container>
      </section>

      <section className="py-14 lg:py-18">
        <Container>
          <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[0.95fr_1.05fr]">
            <article className="rounded-3xl border border-border/15 bg-card p-7 dark:border-white/10 dark:bg-white/[0.04]">
              <BarChart3 size={21} className="text-bronze-500" />
              <h2 className="mt-4 text-xl font-extrabold">Reporting opérationnel</h2>
              <ul className="mt-5 space-y-3">
                {copy.reporting.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[12.5px] leading-5 text-muted-foreground">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[11.5px] leading-5 text-muted-foreground">
                Aucun volume de leads, classement ou vente n’est garanti.
              </p>
            </article>

            <article className="rounded-3xl bg-deepblue p-7 text-white">
              <Icon size={22} className="text-bronze-400" />
              <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.16em] text-bronze-400">Pourquoi cette offre est différente</p>
              <h2 className="mt-3 text-2xl font-extrabold">{copy.distinction.title}</h2>
              <p className="mt-3 text-[13px] leading-6 text-white/68">{copy.distinction.body}</p>
              <Link href={copy.demo} className="mt-6 inline-flex items-center gap-2 text-[13.5px] font-extrabold text-bronze-400">
                Voir cette différence dans la démo <ArrowRight size={14} />
              </Link>
            </article>
          </div>
        </Container>
      </section>

      <section className="border-y border-border/12 bg-surface py-14 dark:border-white/8" aria-labelledby="partner-faq-title">
        <Container>
          <div className="mx-auto max-w-5xl">
            <Search size={21} className="text-bronze-500" />
            <h2 id="partner-faq-title" className="mt-4 text-3xl font-extrabold tracking-[-0.035em]">
              Questions commerciales fréquentes
            </h2>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {copy.faq.map(([question, answer]) => (
                <article key={question} className="rounded-3xl border border-border/15 bg-card p-6 dark:border-white/10 dark:bg-white/[0.04]">
                  <h3 className="text-[15px] font-extrabold leading-5">{question}</h3>
                  <p className="mt-3 text-[12.5px] leading-5 text-muted-foreground">{answer}</p>
                </article>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="py-14 lg:py-18">
        <Container>
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
            <article className="rounded-3xl border border-border/15 bg-card p-7 dark:border-white/10 dark:bg-white/[0.04]">
              <FileImage size={21} className="text-bronze-500" />
              <h2 className="mt-4 text-xl font-extrabold">Publication après validation</h2>
              <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">
                La transmission de données ne crée ni badge, ni statut partenaire, ni publication automatique. Les droits média, la source et l’éligibilité restent contrôlés séparément.
              </p>
            </article>
            <article className="rounded-3xl border border-border/15 bg-card p-7 dark:border-white/10 dark:bg-white/[0.04]">
              <Building2 size={21} className="text-bronze-500" />
              <h2 className="mt-4 text-xl font-extrabold">Un socle Pro, des options séparées</h2>
              <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">
                Sponsoring labellisé, reporting avancé et présence événementielle sont des options. Ils ne modifient jamais la pertinence organique ou le niveau d’information.
              </p>
            </article>
          </div>
        </Container>
      </section>

      <section className="py-14 text-center">
        <Container>
          <p className="text-[13px] text-muted-foreground">Programme pilote · aucune promesse de volume de leads, de classement ou de vente.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-4">
            <Link href={copy.activation} className="inline-flex items-center gap-2 text-[14px] font-extrabold text-bronze-500">
              Préparer l’activation <ArrowRight size={14} />
            </Link>
            <Link href={copy.demo} className="inline-flex items-center gap-2 text-[14px] font-extrabold text-foreground">
              {copy.demoLabel}
            </Link>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </main>
  );
}
