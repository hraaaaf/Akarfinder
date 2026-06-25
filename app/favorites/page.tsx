import { SiteFooter } from "@/components/landing/SiteFooter";
import { FavoritesPageShell } from "@/components/favorites/FavoritesPageShell";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";

export const dynamic = "force-dynamic";

export default function FavoritesPage() {
  return (
    <main className="min-h-screen bg-[#f8f9fa] text-gray-900">
      <SiteHeader />
      <Container>
        <FavoritesPageShell />
      </Container>
      <SiteFooter />
    </main>
  );
}
