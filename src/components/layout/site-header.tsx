import { Suspense } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { UserNav, UserNavSkeleton } from "@/components/layout/user-nav";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="bg-background/90 supports-[backdrop-filter]:bg-background/75 sticky top-0 z-40 border-b backdrop-blur print:hidden">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Main" className="ml-6 hidden items-center gap-1 sm:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/trips">My trips</Link>
          </Button>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/plan/new">
              <PlusIcon />
              <span>Plan a trip</span>
            </Link>
          </Button>
          {/* Reads the session cookie, so it streams in behind its own boundary. */}
          <Suspense fallback={<UserNavSkeleton />}>
            <UserNav />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
