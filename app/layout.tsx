import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider, NO_FLASH_SCRIPT } from "@/components/theme/ThemeProvider";
import { JsonLd } from "@/components/seo/JsonLd";
import { getOrganizationJsonLd, getWebsiteJsonLd } from "@/lib/seo/structured-data";
import { siteConfig } from "@/lib/seo/site";

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
  metadataBase: new URL(siteConfig.siteUrl),
  // Pas de title.template ici : chaque page du site suffixe déjà son propre
  // titre avec "— AkarFinder" manuellement. Un template global doublerait ce
  // suffixe sur toutes les pages existantes. `default` ne sert que de filet
  // pour les segments sans title propre (ex. la page d'accueil).
  title: siteConfig.defaultTitle,
  description: siteConfig.defaultDescription,
  applicationName: siteConfig.siteName,
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
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
    locale: siteConfig.locale,
    siteName: siteConfig.siteName,
    title: siteConfig.defaultTitle,
    description: siteConfig.defaultDescription,
    images: [
      {
        url: siteConfig.defaultOgImage,
        width: 1200,
        height: 630,
        alt: siteConfig.defaultTitle,
      },
    ],
  },
  twitter: {
    card: siteConfig.twitterCard,
    title: siteConfig.defaultTitle,
    description: siteConfig.defaultDescription,
    images: [siteConfig.defaultOgImage],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={jakartaSans.variable} suppressHydrationWarning>
      <head>
        {/* Applies the persisted/system theme before paint — avoids flash. */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        <JsonLd data={getOrganizationJsonLd()} />
        <JsonLd data={getWebsiteJsonLd()} />
      </head>
      <body>
        <a href="#main-content" className="skip-link">
          Aller au contenu principal
        </a>
        <ThemeProvider>
          <div id="main-content" tabIndex={-1}>
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
