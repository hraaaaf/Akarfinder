from pathlib import Path


def replace_exact(path: str, replacements: list[tuple[str, str]]) -> None:
    p = Path(path)
    s = p.read_text()
    for old, new in replacements:
        if old not in s:
            raise SystemExit(f"missing anchor in {path}: {old[:80]}")
        s = s.replace(old, new)
    p.write_text(s)


replace_exact(
    "components/listings/PropertyMediaGallery.tsx",
    [
        (
            'rounded-[1.6rem] border border-[#eadfca] bg-white shadow-[0_18px_54px_rgba(7,27,51,0.16)]',
            'rounded-[1.55rem] border border-slate-200 bg-white shadow-[0_16px_42px_rgba(15,38,68,0.10)]',
        ),
        ('h-[280px] sm:h-[460px]', 'h-[300px] sm:h-[440px]'),
        ('h-[320px] sm:h-[500px]', 'h-[300px] sm:h-[440px]'),
        (
            'relative hidden h-[500px] gap-1.5 bg-slate-100 lg:grid lg:grid-cols-[1.55fr_1fr]',
            'relative hidden h-[460px] gap-2 bg-slate-50 lg:grid lg:grid-cols-[1.9fr_0.75fr]',
        ),
        ('grid min-w-0 gap-1.5', 'grid min-w-0 gap-2'),
        (
            'className="absolute bottom-4 right-4 z-20 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-[12px] font-extrabold text-[#0B2545] shadow-lg transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE]"',
            'className="absolute bottom-4 right-4 z-20 inline-flex min-h-11 items-center gap-2 rounded-full bg-black/60 px-4 text-[12px] font-extrabold text-white shadow-lg backdrop-blur transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"',
        ),
        (
            'className="grid h-11 min-w-11 place-items-center rounded-full bg-white/95 px-3 text-[#0B2545] shadow-lg backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE]"',
            'className="grid h-11 min-w-11 place-items-center rounded-full bg-white/95 px-3 text-[#0B2545] shadow-md ring-1 ring-black/5 backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B63CE]"',
        ),
        (
            'className="grid h-11 min-w-11 place-items-center rounded-full bg-white/95 shadow-lg backdrop-blur"',
            'className="grid h-11 min-w-11 place-items-center rounded-full bg-white/95 shadow-md ring-1 ring-black/5 backdrop-blur"',
        ),
    ],
)

replace_exact(
    "components/listings/PropertyDetailV2.tsx",
    [
        (
            'className="mt-3 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start"',
            'className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start xl:gap-7"',
        ),
        ('<div className="mt-5">\n            <PropertyCore listing={listing} />\n          </div>', '<div className="mt-5">\n            <PropertyCore listing={listing} />\n          </div>'),
        (
            '<aside className="hidden space-y-5 lg:sticky lg:top-6 lg:block">',
            '<aside className="hidden space-y-4 lg:sticky lg:top-5 lg:block">',
        ),
    ],
)
