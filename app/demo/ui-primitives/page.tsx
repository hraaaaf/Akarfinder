import { Bell, Building2, Check, Heart, Search } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ui } from "@/components/ui/design-system";

export default function UiPrimitivesDemoPage() {
  return (
    <main className={`min-h-screen py-10 ${ui.pageLight}`} data-ui-contract="p1-a2">
      <Container className="space-y-8">
        <header className="max-w-3xl">
          <p className={ui.eyebrow}>AkarFinder Golden Master · P1-A2</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-[-0.05em] text-[#0B1F3A] sm:text-5xl">
            Shared UI primitives
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Contrat visuel commun : bleu AkarFinder, surfaces douces, profondeur légère, actions de 48 px et aucun accent bronze.
          </p>
        </header>

        <section className={`${ui.surfacePremium} p-6 sm:p-8`}>
          <div className="flex items-start gap-4">
            <span className={ui.iconTile}><Building2 size={22} aria-hidden="true" /></span>
            <div>
              <p className={ui.eyebrow}>Surfaces</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">Une hiérarchie unique</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Le panneau principal porte la décision. Les panneaux secondaires restent plus légers sans changer de langage visuel.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[Bell, Heart, Search].map((Icon, index) => (
              <article key={index} className={`${ui.subtlePanel} p-5`}>
                <Icon size={18} className="text-[#0B63CE]" aria-hidden="true" />
                <h3 className="mt-4 text-sm font-extrabold">Bloc secondaire {index + 1}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-500">Même bordure, même rayon, même profondeur.</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${ui.surfacePremium} p-6 sm:p-8`}>
          <p className={ui.eyebrow}>Actions</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">CTA cohérents, rôle explicite</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className={`${ui.primaryAction} gap-2`}><Check size={16} />Action principale</button>
            <button type="button" className={ui.secondaryAction}>Action secondaire</button>
            <button type="button" className={ui.chip}>Filtre</button>
            <button type="button" className={`${ui.chip} ${ui.chipActive}`}>Filtre actif</button>
          </div>
        </section>

        <section className={`${ui.surfacePremium} p-6 sm:p-8`}>
          <p className={ui.eyebrow}>Champs</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em]">Formulaires au même rythme</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2"><span className={ui.label}>Ville</span><input className={`${ui.field} px-4`} placeholder="Rabat" /></label>
            <label className="space-y-2"><span className={ui.label}>Budget</span><select className={`${ui.field} px-4`} defaultValue=""><option value="">Choisir</option><option>2 000 000 DH</option></select></label>
          </div>
        </section>
      </Container>
    </main>
  );
}
