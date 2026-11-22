import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t print:hidden">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Prices are estimates unless marked{" "}
          <span className="text-foreground font-medium">live</span>. Always verify visa rules with
          official sources before you travel.
        </p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link href="/plan/new" className="hover:text-foreground">
            Plan a trip
          </Link>
          <Link href="/trips" className="hover:text-foreground">
            My trips
          </Link>
        </nav>
      </div>
    </footer>
  );
}
