export function NeufHeroProgramPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[500px]" aria-label="Aperçu structuré d’un programme neuf">
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[#D69E2E]/12 blur-3xl" />
      <div className="relative rounded-[2rem] border border-[#D7E6F7] bg-white p-4 shadow-[0_30px_90px_rgba(11,31,58,0.16)] sm:p-5">
        <div className="relative h-52 overflow-hidden rounded-[1.35rem] bg-[linear-gradient(135deg,#BFD6E8_0%,#EEF4F8_42%,#D8C6AE_100%)]">
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#071B33]/70 to-transparent" />
          <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#0B1F3A]">Aperçu du format programme</span>
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <p className="text-[11px] font-bold text-[#F6D28B]">Exemple d’interface</p>
            <h2 className="mt-1 text-[1.35rem] font-extrabold">Programme structuré</h2>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {["Typologies", "Livraison", "État"].map((item) => <div key={item} className="rounded-xl bg-[#F6F9FC] px-2 py-3 text-center text-[11px] font-bold text-[#315E8F]">{item}</div>)}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E8EEF5] pt-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">Lecture AkarFinder</p><p className="mt-1 text-[13px] font-extrabold text-[#0B1F3A]">Données structurées</p></div>
          <span className="rounded-full bg-[#E8F2FF] px-3 py-1.5 text-[10px] font-extrabold text-[#0B63CE]">Source visible</span>
        </div>
      </div>
    </div>
  );
}
