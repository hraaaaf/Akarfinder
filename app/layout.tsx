import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider, NO_FLASH_SCRIPT } from "@/components/theme/ThemeProvider";

export const viewport: Viewport = {
  themeColor: "#071B33",
};

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://akarfinder.ma"),
  title: "AkarFinder — Intelligence immobilière au Maroc",
  description:
    "AkarFinder centralise la recherche immobilière au Maroc : une plateforme premium pour comparer, fiabiliser et décider. Intelligence immobilière au Maroc.",
  applicationName: "AkarFinder",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/favicon.ico", sizes: "any" },
      { url: "/brand/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/favicon-16.png", type: "image/png", sizes: "16x16" },
      { url: "/brand/favicon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "fr_MA",
    siteName: "AkarFinder",
    title: "AkarFinder — Intelligence immobilière au Maroc",
    description:
      "La plateforme immobilière premium du Maroc. Cherchez moins. Trouvez mieux.",
    images: [
      {
        url: "/brand/og-image.png",
        width: 1200,
        height: 630,
        alt: "AkarFinder — Intelligence immobilière au Maroc",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AkarFinder — Intelligence immobilière au Maroc",
    description:
      "La plateforme immobilière premium du Maroc. Cherchez moins. Trouvez mieux.",
    images: ["/brand/og-image.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={jakartaSans.variable} suppressHydrationWarning>
      <head>
        {/* Applies the persisted/system theme before paint — avoids flash. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
