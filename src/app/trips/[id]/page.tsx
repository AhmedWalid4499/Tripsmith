import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTripDetail } from "@/server/trips";
import { GenerationProgress } from "@/components/trip/generation-progress";
import { TripView } from "@/components/trip/trip-view";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Your trip", robots: { index: false } };

export default function TripPage({ params }: PageProps<"/trips/[id]">) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <Suspense fallback={<TripSkeleton />}>
        <TripContent params={params} />
      </Suspense>
    </div>
  );
}

function TripSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading trip">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

async function TripContent({ params }: { params: PageProps<"/trips/[id]">["params"] }) {
  const { id } = await params;
  const detail = await getTripDetail(id);
  if (!detail) notFound();

  const { trip, latestJob } = detail;
  if (trip.status !== "READY") {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-semibold">
          {trip.surpriseMe && trip.status !== "FAILED" ? "Your surprise trip" : trip.title}
        </h1>
        <GenerationProgress
          tripId={trip.id}
          initial={{
            tripStatus: trip.status,
            job: latestJob
              ? {
                  status: latestJob.status,
                  step: latestJob.step,
                  progress: latestJob.progress,
                  message: latestJob.message,
                  error: latestJob.error,
                }
              : null,
          }}
        />
      </div>
    );
  }
  return <TripView detail={detail} />;
}
