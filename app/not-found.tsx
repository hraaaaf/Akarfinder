import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#071B33] px-5 text-white">
      <section className="w-full max-w-xl text-center">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.24em] text-blue-300">Erreur 404</p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.05em] sm:text-6xl">Cette page n’existe pas.</h1>
        <p className="mx-auto mt-4 max-w-lg text-[15px] leading-7 text-white/70">
          Revenez aux annonces disponibles ou lancez directement une nouvelle recherche immobilière.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/search" className="rounded-xl bg-[#0B63CE] px-5 py-3 text-[13px] font-extrabold text-white hover:bg-[#084FA8]">
            Voir les annonces
          </Link>
          <Link href="/" className="rounded-xl border border-white/20 px-5 py-3 text-[13px] font-extrabold text-white hover:bg-white/10">
            Retour à l’accueil
          </Link>
        </div>
      </section>
    </main>
  );
}
