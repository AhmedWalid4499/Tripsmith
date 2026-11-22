import type { Metadata } from "next";
import { CompassIcon } from "lucide-react";

export const metadata: Metadata = { title: "Plan a trip" };

// Placeholder: the multi-step trip form ships in Phase 2.
export default function NewPlanPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center px-4 py-20 text-center">
      <span className="bg-sea-wash text-primary flex size-14 items-center justify-center rounded-full">
        <CompassIcon className="size-7" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-3xl font-semibold">Plan a trip</h1>
      <p className="text-muted-foreground mt-3">
        The trip form is being built in the next phase. Check back soon.
      </p>
    </div>
  );
}
