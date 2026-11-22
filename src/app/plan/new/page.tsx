import { Suspense } from "react";
import type { Metadata } from "next";
import { getCurrentUser } from "@/server/session";
import { TripForm } from "@/components/plan/trip-form";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Plan a trip" };

export default function NewPlanPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold sm:text-4xl">Plan a trip</h1>
      <p className="text-muted-foreground mt-2">
        Five quick steps. Then we build the whole plan while you watch.
      </p>
      <div className="mt-8">
        <Suspense fallback={<FormSkeleton />}>
          <TripFormWithDefaults />
        </Suspense>
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading form">
      <Skeleton className="h-1.5 w-full" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}

async function TripFormWithDefaults() {
  const user = await getCurrentUser();
  return (
    <TripForm
      isGuest={!user}
      defaults={{
        departureCity: user?.homeCity ?? "",
        nationality: user?.nationality ?? "",
        budgetCurrency: user?.displayCurrency ?? "USD",
      }}
    />
  );
}
