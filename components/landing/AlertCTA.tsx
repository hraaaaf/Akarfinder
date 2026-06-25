import { Container } from "@/components/ui/Container";

export function AlertCTA() {
  return (
    <section className="relative overflow-hidden bg-[#2563eb] py-14 sm:py-16">
      {/* Background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(255,255,255,0.08),transparent_50%),radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.06),transparent_40%)]" />
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:32px_32px]" />

      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-white/90">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
            Gratuit · Sans inscription
          </span>

          <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-[-0.04em] text-white sm:text-4xl lg:text-[2.6rem]">
            Ne ratez plus le bon bien
          </h2>
          <p className="mt-4 text-[1.05rem] leading-7 text-white/80">
            Créez une alerte gratuite et soyez le premier notifié dès qu'un bien correspond à votre recherche.
          </p>

          {/* Email form */}
          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
            <input
              type="email"
              placeholder="Votre adresse email"
              aria-label="Email pour les alertes"
              className="min-w-0 flex-1 rounded-xl border-0 bg-white px-5 py-4 text-[15px] font-medium text-gray-900 shadow-[0_4px_16px_rgba(0,0,0,0.12)] outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-white/40"
            />
            <button
              type="button"
              className="shrink-0 rounded-xl bg-[#ff7a1a] px-7 py-4 text-[15px] font-bold text-white shadow-[0_4px_16px_rgba(255,122,26,0.4)] transition hover:bg-[#ea6c0a] active:scale-[0.98]"
            >
              Créer mon alerte →
            </button>
          </div>

          {/* Trust micro-signals */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-[13px] font-semibold text-white/70">
            {[
              "✓ Aucune carte bancaire",
              "✓ Alertes par email ou SMS",
              "✓ Désactivation en 1 clic",
            ].map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
