type SearchResultsHeaderProps = {
  resultCount: number;
};

export function SearchResultsHeader({ resultCount }: SearchResultsHeaderProps) {
  return (
    <div className="flex flex-col gap-3 rounded-[1.5rem] border border-navy/10 bg-white p-5 shadow-[0_18px_60px_rgba(9,28,58,0.06)] sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#145ee8]">
          Resultats
        </p>
        <h2 className="mt-2 text-[1.6rem] font-bold tracking-[-0.03em] text-navy">
          {resultCount} bien{resultCount > 1 ? "s" : ""} a comparer
        </h2>
      </div>
      <p className="max-w-xl text-[14px] leading-7 text-stone">
        Apercu de l'experience de recherche AkarFinder avec filtres client-side, score de fiabilite et signal MRE.
      </p>
    </div>
  );
}
