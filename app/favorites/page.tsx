import { SiteFooter } from "@/components/landing/SiteFooter";
import { FavoritesPageShell } from "@/components/favorites/FavoritesPageShell";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { ui } from "@/components/ui/design-system";

export const dynamic = "force-dynamic";

export default function FavoritesPage() {
  return (
    <main className={`min-h-screen ${ui.pageLight}`}>
      <SiteHeader searchMode fluid />
      <Container>
        <FavoritesPageShell />
      </Container>
      <SiteFooter />
    </main>
  );
}
