import type { ReactNode } from "react";

export default function SearchV2BrandLayout({ children }: { children: ReactNode }) {
  return (
    <div className="akar-brand-aligned">
      {children}
      <style>{`
        .akar-brand-aligned {
          --akar-navy: #071B33;
          --akar-ink: #0B1F3A;
          --akar-blue: #0B63CE;
          --akar-blue-dark: #084FA8;
          --akar-blue-soft: #EEF6FF;
          --akar-blue-mid: #60A5FA;
          --akar-blue-pale: #BFDBFE;
          --akar-border: #DCE8F5;
          color: var(--akar-ink);
        }

        .akar-brand-aligned main {
          color: var(--akar-ink) !important;
          background: #F7FAFE !important;
        }

        .akar-brand-aligned main > header:first-of-type {
          border-color: var(--akar-border) !important;
          background: #FFFFFF !important;
          box-shadow: 0 1px 0 rgba(11,31,58,.04) !important;
        }

        .akar-brand-aligned main > header:first-of-type > div > div:first-child {
          width: 154px !important;
          min-width: 154px !important;
          height: 39px !important;
          overflow: hidden !important;
          color: transparent !important;
          font-size: 0 !important;
          background-image: url('https://akarfinder.vercel.app/brand/logo-v2/logo-horizontal-bilingual.png') !important;
          background-repeat: no-repeat !important;
          background-position: left center !important;
          background-size: contain !important;
        }

        .akar-brand-aligned main > header:first-of-type > div > div:first-child svg {
          display: none !important;
        }

        .akar-brand-aligned button[class*='bg-blue-700'],
        .akar-brand-aligned button[class*='bg-blue-600'],
        .akar-brand-aligned span[class*='bg-blue-700'] {
          background-color: var(--akar-blue) !important;
        }

        .akar-brand-aligned button[class*='text-blue-700'],
        .akar-brand-aligned a[class*='text-blue-700'],
        .akar-brand-aligned span[class*='text-blue-700'] {
          color: var(--akar-blue) !important;
        }

        .akar-brand-aligned [class*='bg-blue-50'] {
          background-color: var(--akar-blue-soft) !important;
        }

        .akar-brand-aligned [class*='border-blue-300'] {
          border-color: var(--akar-blue-mid) !important;
        }

        .akar-brand-aligned [class*='border-slate-200'] {
          border-color: var(--akar-border) !important;
        }

        .akar-brand-aligned [class*='text-slate-950'],
        .akar-brand-aligned [class*='text-slate-900'],
        .akar-brand-aligned [class*='text-slate-800'] {
          color: var(--akar-ink) !important;
        }

        .akar-brand-aligned article {
          border-color: var(--akar-border) !important;
          box-shadow: 0 12px 34px rgba(11,31,58,.07) !important;
        }

        .akar-brand-aligned article:hover {
          box-shadow: 0 18px 46px rgba(11,99,206,.12) !important;
        }

        .akar-brand-aligned input:focus,
        .akar-brand-aligned button:focus-visible,
        .akar-brand-aligned a:focus-visible {
          outline: 2px solid var(--akar-blue-mid) !important;
          outline-offset: 2px !important;
        }

        @media (max-width: 767px) {
          .akar-brand-aligned main > header:first-of-type > div > div:first-child {
            width: 126px !important;
            min-width: 126px !important;
            height: 32px !important;
          }
        }
      `}</style>
    </div>
  );
}
