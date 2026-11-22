import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { CalendarIcon, MapIcon, PlusIcon, UsersIcon } from "lucide-react";
import { requireUser } from "@/server/session";
import { db } from "@/server/db";
import { countryFlag } from "@/lib/countries";
import { formatDateRange } from "@/lib/dates";
import { TripStatusBadge } from "@/components/trips/trip-status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "My trips" };

export default function TripsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">My trips</h1>
          <p className="text-muted-foreground mt-1">Every plan you&apos;ve made, newest first.</p>
        </div>
        <Button asChild>
          <Link href="/plan/new">
            <PlusIcon />
            Plan a trip
          </Link>
        </Button>
      </div>
      <Suspense fallback={<TripListSkeleton />}>
        <TripList />
      </Suspense>
    </div>
  );
}

function TripListSkeleton() {
  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading trips">
      {Array.from({ length: 3 }, (_, i) => (
        <li key={i}>
          <Card className="gap-3 p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </Card>
        </li>
      ))}
    </ul>
  );
}

async function TripList() {
  const user = await requireUser("/trips");
  const trips = await db.trip.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      destinationQuery: true,
      countries: true,
      startDate: true,
      endDate: true,
      lengthDays: true,
      travellers: true,
      status: true,
    },
  });

  if (trips.length === 0) {
    return (
      <div className="bg-card mt-8 flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
        <span className="bg-sea-wash text-primary flex size-12 items-center justify-center rounded-full">
          <MapIcon className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-xl font-semibold">No trips yet</h2>
        <p className="text-muted-foreground mt-2 max-w-sm">
          Tell us where you&apos;d like to go and we&apos;ll put together a full plan, from visas to
          the last dinner.
        </p>
        <Button asChild className="mt-6">
          <Link href="/plan/new">Plan your first trip</Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {trips.map((trip) => (
        <li key={trip.id}>
          <Link
            href={`/trips/${trip.id}`}
            className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Card className="group-hover:border-primary/40 h-full gap-3 p-5 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-lg leading-snug font-semibold">
                  {trip.countries.length > 0 ? (
                    <span aria-hidden="true" className="mr-1.5">
                      {trip.countries.map(countryFlag).join(" ")}
                    </span>
                  ) : null}
                  {trip.title}
                </h2>
                <TripStatusBadge status={trip.status} />
              </div>
              <dl className="text-muted-foreground space-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="size-4" aria-hidden="true" />
                  <dt className="sr-only">Dates</dt>
                  <dd>
                    {trip.startDate && trip.endDate
                      ? formatDateRange(trip.startDate, trip.endDate)
                      : `${trip.lengthDays} days, flexible dates`}
                  </dd>
                </div>
                <div className="flex items-center gap-2">
                  <UsersIcon className="size-4" aria-hidden="true" />
                  <dt className="sr-only">Travellers</dt>
                  <dd>
                    {trip.travellers} {trip.travellers === 1 ? "traveller" : "travellers"}
                  </dd>
                </div>
              </dl>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
