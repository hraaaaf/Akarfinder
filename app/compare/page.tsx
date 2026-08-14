import { SiteFooter } from "@/components/landing/SiteFooter";
import { ComparePageShell } from "@/components/compare/ComparePageShell";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Container } from "@/components/ui/Container";
import { ui } from "@/components/ui/design-system";

export const dynamic = "force-dynamic";

export default function ComparePage() {
  return (
    <main className={`min-h-screen ${ui.pageLight}`}>
      <SiteHeader searchMode fluid />
      <Container>
        <ComparePageShell />
      </Container>
      <SiteFooter />
    </main>
  );
}
