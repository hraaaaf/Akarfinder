import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Home,
  LineChart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { Container } from "@/components/ui/Container";
import { PropertyTypeArtwork } from "@/components/property-types/PropertyTypeArtwork";
import { OPTION_A_PROPERTY_TYPES } from "@/lib/property-types/presentation";

const PATHS = [
  { intent: "publish", icon: Home, title: "Publier mon annonce", description: "Préparez une annonce claire, ajoutez les informations utiles et gardez la main avant toute publication.", cta: "Commencer mon annonce", primary: true },
  { intent: "estimate", icon: LineChart, title: "Estimer mon bien", description: "Décrivez d’abord votre bien. Nous n’affichons une fourchette que lorsque les données disponibles le permettent.", cta: "Préparer mon estimation", primary: false },
  { intent: "professional", icon: Building2, title: "Être accompagné", description: "Constituez un dossier utile puis choisissez librement si vous souhaitez être recontacté par un professionnel.", cta: "Préparer mon dossier", primary: false },
] as const;

const STANDARD = [
  { icon: ClipboardCheck, title: "Les mêmes étapes pour tous", text: "Type de bien, localisation, caractéristiques, photos, prix et contact : le parcours reste simple et prévisible." },
  { icon: Sparkles, title: "Annonce prête", text: "Un indicateur compréhensible vous montre ce qui est déjà clair et ce qui peut encore améliorer votre dossier." },
  { icon: Camera, title: "Des photos vraiment utiles", text: "Format, taille et netteté minimale sont vérifiés avant publication, avec des conseils concrets pour remplacer une image faible." },
  { icon: ShieldCheck, title: "Rien n’est publié sans vous", text: "Votre brouillon est conservé, votre téléphone reste privé et aucune estimation n’est inventée." },
] as const;

export async function VendrePageShell() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader compact />
      <section className="relative overflow-hidden border-b border-border/15 bg-surface pb-12 pt-10 sm:pb-16 sm:pt-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(59,130,246,0.16),transparent_42%)]" />
        <Container className="relative">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-primary">Vendre avec AkarFinder</p>
            <h1 className="mt-4 text-[2.45rem] font-extrabold leading-[1.03] tracking-[-0.05em] sm:text-[3.8rem]">Un seul dossier clair pour avancer avec votre bien</h1>
            <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-muted-foreground">Que vous souhaitiez publier, estimer ou être accompagné, vous commencez par les mêmes informations essentielles. Vous avancez à votre rythme, sans jargon ni publication automatique.</p>
          </div>
          <div className="mx-auto mt-9 grid max-w-6xl gap-4 lg:grid-cols-3">
            {PATHS.map(({ intent, icon: Icon, title, description, cta, primary }) => (
              <article key={intent} className={`rounded-[1.5rem] border p-6 shadow-sm ${primary ? "border-primary bg-primary text-primary-foreground shadow-[0_18px_50px_rgba(11,99,206,0.2)]" : "border-border/25 bg-card"}`}>
                <span className={`grid h-11 w-11 place-items-center rounded-2xl ${primary ? "bg-white/15" : "bg-primary/10 text-primary"}`}><Icon size={20} aria-hidden="true" /></span>
                <h2 className="mt-5 text-xl font-extrabold">{title}</h2>
                <p className={`mt-3 min-h-[4.5rem] text-sm leading-6 ${primary ? "text-white/82" : "text-muted-foreground"}`}>{description}</p>
                <Link href={`/vendre/dossier?intent=${intent}`} className={`mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold transition active:scale-[0.98] motion-reduce:transform-none ${primary ? "bg-white text-primary" : "bg-primary text-primary-foreground"}`}>{cta}<ArrowRight size={16} aria-hidden="true" /></Link>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-background py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Le standard AkarFinder</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">Une annonce plus complète, sans formulaire compliqué</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">Vous voyez immédiatement ce qui renforce votre dossier. Une information inconnue peut rester vide ; nous vous expliquons simplement son utilité.</p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STANDARD.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border border-border/20 bg-card p-5">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={18} aria-hidden="true" /></span>
                <h3 className="mt-4 text-sm font-extrabold">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-y border-border/15 bg-surface py-12 sm:py-16">
        <Container>
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Votre bien</p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">Commencez directement par son type</h2>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">Le type choisi ouvre le même dossier avec la première étape déjà préparée.</p>
              <div className="mt-5 flex items-start gap-2 rounded-xl bg-primary/8 p-4 text-xs leading-5 text-muted-foreground"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" /><p>Votre progression est sauvegardée sur cet appareil. Vous pourrez reprendre plus tard.</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {OPTION_A_PROPERTY_TYPES.map((item) => (
                <Link key={item.value} href={`/vendre/dossier?property_type=${encodeURIComponent(item.value)}&intent=publish`} className="group rounded-2xl border border-border/20 bg-card p-2.5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md motion-reduce:transform-none">
                  <div className="aspect-[16/10] overflow-hidden rounded-xl bg-surface-muted"><PropertyTypeArtwork kind={item.value} className="h-full w-full" decorative /></div>
                  <div className="mt-2 flex items-center justify-between gap-2 px-1"><span className="text-xs font-extrabold">{item.label}</span><span className="text-primary" aria-hidden="true">→</span></div>
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-background py-14 sm:py-18">
        <Container>
          <div className="mx-auto max-w-4xl rounded-[1.75rem] border border-border/20 bg-card p-7 text-center shadow-sm sm:p-10">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-primary">Première étape</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.04em]">Décrivez votre bien, sans engagement</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">Type, ville, surface et téléphone suffisent pour enregistrer un premier dossier. Les autres informations améliorent progressivement “Annonce prête”.</p>
            <Link href="/vendre/dossier?intent=publish" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-extrabold text-primary-foreground">Commencer mon dossier <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
        </Container>
      </section>
      <SiteFooter />
    </main>
  );
}
