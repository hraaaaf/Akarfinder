import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Database, FileImage, Search, Users } from "lucide-react";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

type Audience = "agency" | "promoter";

const COPY = {
  agency: {
    eyebrow: "AkarFinder Pro · Agences",
    title: "Transformez un portefeuille d’annonces en données plus utiles.",
    description: "Un même bien peut alimenter Search, une fiche structurée et une demande qualifiée — à condition que les données, les droits et la provenance soient explicites.",
    demo: "/demo/agence",
    data: ["Identité et type du bien", "Prix, surfaces et pièces", "Localisation et quartier", "Équipements et état", "Médias avec droits", "Informations manquantes explicites"],
    icon: Users,
  },
  promoter: {
    eyebrow: "AkarFinder Pro · Promoteurs",
    title: "Structurez vos projets, typologies et médias avant de les diffuser.",
    description: "AkarFinder sépare projet, typologies, prix, livraison, plans et médias afin de produire une expérience plus comparable sans inventer les informations absentes.",
    demo: "/demo/promoteur",
    data: ["Identité du projet", "Typologies et unités", "Prix et surfaces", "Livraison et statut", "Plans, brochures et droits", "Transparence et données manquantes"],
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
            <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.2em] text-bronze-400">{copy.eyebrow}</p>
            <h1 className="mt-4 text-[2.35rem] font-extrabold leading-[1.04] tracking-[-0.05em] sm:text-[3.5rem]">{copy.title}</h1>
            <p className="mx-auto mt-5 max-w-3xl text-[15px] leading-7 text-white/68">{copy.description}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/pro#contact" className="inline-flex items-center gap-2 rounded-xl bg-bronze-700 px-6 py-3.5 text-[14px] font-extrabold text-white">Demander une activation pilote <ArrowRight size={14} /></Link>
              <Link href={copy.demo} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-6 py-3.5 text-[14px] font-extrabold text-white/90">Voir la démo fictive</Link>
            </div>
          </div>
        </Container>
      </section>

      <section className="py-14 lg:py-18">
        <Container>
          <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <article className="rounded-3xl border border-border/15 bg-card p-7 dark:border-white/10 dark:bg-white/[0.04]">
              <Database size={21} className="text-bronze-500" />
              <h2 className="mt-4 text-2xl font-extrabold">Les données qui créent de la valeur</h2>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">{copy.data.map((item) => <div key={item} className="flex items-start gap-2 rounded-xl bg-surface px-3 py-3 text-[12px] font-semibold"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" />{item}</div>)}</div>
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

      <section className="border-y border-border/12 bg-surface py-14 dark:border-white/8">
        <Container>
          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
            <article className="rounded-3xl border border-border/15 bg-card p-7 dark:border-white/10 dark:bg-white/[0.04]">
              <FileImage size={21} className="text-bronze-500" />
              <h2 className="mt-4 text-xl font-extrabold">Publication après validation</h2>
              <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">La transmission de données ne crée ni badge, ni statut partenaire, ni publication automatique. Les droits média, la source et l’éligibilité restent contrôlés séparément.</p>
            </article>
            <article className="rounded-3xl border border-border/15 bg-card p-7 dark:border-white/10 dark:bg-white/[0.04]">
              <Building2 size={21} className="text-bronze-500" />
              <h2 className="mt-4 text-xl font-extrabold">Un socle Pro, des options séparées</h2>
              <p className="mt-2 text-[12.5px] leading-6 text-muted-foreground">Sponsoring labellisé, reporting avancé et présence événementielle sont des options. Ils ne modifient jamais la pertinence organique ou le niveau d’information.</p>
            </article>
          </div>
        </Container>
      </section>

      <section className="py-14 text-center"><Container><p className="text-[13px] text-muted-foreground">Programme pilote · aucune promesse de volume de leads, de classement ou de vente.</p><Link href="/pro#contact" className="mt-4 inline-flex items-center gap-2 text-[14px] font-extrabold text-bronze-500">Préparer l’activation <ArrowRight size={14} /></Link></Container></section>
      <SiteFooter />
    </main>
  );
}
