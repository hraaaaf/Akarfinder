// SEO-FOUNDATION-1 — injection JSON-LD sûre (pas de dangerouslySetInnerHTML
// avec du contenu utilisateur : uniquement des objets construits côté serveur).
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
