# Plus Jakarta Sans — local build asset

- Font: original **Plus Jakarta Sans** variable upright font (weight axis 200–800).
- Distributor: [Google Fonts / plusjakartasans](https://github.com/google/fonts/tree/main/ofl/plusjakartasans).
- Original authors: The Plus Jakarta Sans Project Authors / Tokotype.
- Upstream pinned commit (as recorded by Google Fonts metadata): `18d1cd2f7ea10481919d2f05c1f7064b7307fc26`.
- Source Git blob SHA-1: `0cb13a998ed525ba226d911b10d6c4c4f923a961`; verified byte-for-byte after transfer.
- License: **SIL Open Font License 1.1**, complete terms and copyright in `OFL.txt`.
- Asset: `PlusJakartaSans-Variable.ttf` (original unmodified Google Fonts binary, not a derivative).
- Purpose: prevent intermittent `next/font/google` build-time CSS parsing failures; the CSS variable remains `--font-jakarta`.
- Validation gate: existing Home/Search/Seller screenshots 390/430/768/1280 BEFORE vs AFTER, two clean production builds same SHA, no Google Fonts download during compilation.

Do not modify the original font file without reviewing reserved-name and license requirements.
