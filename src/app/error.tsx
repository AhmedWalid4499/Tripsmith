"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground mt-2">
        Sorry about that. Try again, and if it keeps happening, come back in a few minutes.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground mt-2 text-xs">Reference: {error.digest}</p>
      ) : null}
      <Button onClick={reset} className="mt-8">
        Try again
      </Button>
    </div>
  );
}
