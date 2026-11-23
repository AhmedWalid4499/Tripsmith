import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { countryName } from "@/lib/countries";
import { findSharedTrip, getSharedTripContent } from "@/server/share";
import { SharedTripView } from "@/components/share/shared-trip-view";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata({ params }: PageProps<"/t/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const shared = await findSharedTrip(slug);
  // Shared trips are for the people they're sent to, not search engines.
  const robots = { index: false, follow: false };
  if (!shared) return { title: "Trip not found", robots };
  const trip = await getSharedTripContent(shared.id, shared.shareShowCosts);
  const where = trip.stops.map((s) => s.city).join(", ");
  const description = `${trip.lengthDays}-day plan for ${trip.travellers} ${trip.travellers === 1 ? "traveller" : "travellers"}: ${where}, ${trip.countries.map(countryName).join(", ")}. Made with Tripsmith.`;
  return {
    title: trip.title,
    description,
    robots,
    openGraph: { title: trip.title, description, type: "article", siteName: "Tripsmith" },
    twitter: { card: "summary_large_image", title: trip.title, description },
  };
}

export default function SharedTripPage({ params }: PageProps<"/t/[slug]">) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 print:max-w-none print:px-0 print:py-0">
      <Suspense fallback={<SharedSkeleton />}>
        <SharedTrip params={params} />
      </Suspense>
    </div>
  );
}

function SharedSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading trip">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}

async function SharedTrip({ params }: { params: PageProps<"/t/[slug]">["params"] }) {
  const { slug } = await params;
  const shared = await findSharedTrip(slug);
  if (!shared) notFound();
  const trip = await getSharedTripContent(shared.id, shared.shareShowCosts);
  return <SharedTripView trip={trip} />;
}
