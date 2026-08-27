import type { Metadata } from "next";
import { siteConfig } from "@/lib/seo/site";

export type PublicPageMetadataInput = {
  title: string;
  description: string;
  canonicalPath: `/${string}` | "/";
};

function absoluteSiteUrl(path: string): string {
  return new URL(path, `${siteConfig.siteUrl}/`).toString();
}

export function buildPublicPageMetadata({
  title,
  description,
  canonicalPath,
}: PublicPageMetadataInput): Metadata {
  const canonical = absoluteSiteUrl(canonicalPath);
  const image = absoluteSiteUrl(siteConfig.defaultOgImage);

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      siteName: siteConfig.siteName,
      title,
      description,
      url: canonical,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
  };
}
