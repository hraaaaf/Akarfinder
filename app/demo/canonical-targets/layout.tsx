import type { ReactNode } from "react";

export default function CanonicalTargetsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        /* B1 mockups must reuse the exact production logo assets. */
        [data-canonical-target] header > [aria-label="AkarFinder"] {
          display: none !important;
        }

        [data-canonical-target] header::before {
          content: "";
          display: block;
          width: 132px;
          height: 34px;
          flex: 0 0 auto;
          background: url("/brand/logo-v2/logo-header-light.png") left center / contain no-repeat;
        }

        [data-canonical-target] header.text-white::before {
          background-image: url("/brand/logo-v2/logo-header-dark.png");
        }

        @media (max-width: 767px) {
          [data-canonical-target] header::before {
            width: 116px;
            height: 29px;
          }

          [data-canonical-target="search"] > div:first-of-type,
          [data-canonical-target="map"] > div:first-of-type {
            overflow-x: auto !important;
            overscroll-behavior-inline: contain;
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
          }

          [data-canonical-target="search"] > div:first-of-type::-webkit-scrollbar,
          [data-canonical-target="map"] > div:first-of-type::-webkit-scrollbar {
            display: none;
          }

          [data-canonical-target="map"] [data-mock-map] {
            min-height: calc(100dvh - 118px) !important;
          }

          [data-canonical-target="mon-projet"] aside > div:last-child,
          [data-canonical-target="publier"] aside:first-of-type > div:last-child {
            display: none !important;
          }

          [data-canonical-target="publier"] aside:first-of-type::after {
            content: "Étape 1 sur 6 · Type";
            display: block;
            margin-top: 1rem;
            font-size: 0.75rem;
            font-weight: 800;
            color: #0B63CE;
          }
        }
      `}</style>
      {children}
    </>
  );
}
