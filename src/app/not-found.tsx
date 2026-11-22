import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="font-display text-terracotta text-6xl font-semibold">404</p>
      <h1 className="mt-4 text-2xl font-semibold">This page took a wrong turn</h1>
      <p className="text-muted-foreground mt-2">
        The link may be old, or the trip is no longer shared.
      </p>
      <Button asChild className="mt-8">
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
}
