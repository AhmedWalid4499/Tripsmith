"use client";

import { createContext, use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isJobActive, type ProgressEvent } from "@/lib/progress-event";

type TripLive = {
  event: ProgressEvent;
  /** True while any planner job runs; the editor locks itself meanwhile. */
  busy: boolean;
  busyDayNumber: number | null;
  busyItemId: string | null;
};

const TripLiveContext = createContext<TripLive | null>(null);

export function useTripLive(): TripLive {
  const value = use(TripLiveContext);
  if (!value) throw new Error("useTripLive must be used inside <TripLiveProvider>");
  return value;
}

/**
 * Follows the trip's latest job over SSE while one is running. When it finishes, refreshes the
 * server-rendered planner (totals included) and reports the outcome in a toast.
 */
export function TripLiveProvider({
  tripId,
  initial,
  children,
}: {
  tripId: string;
  initial: ProgressEvent;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [event, setEvent] = useState(initial);
  const [syncedJobId, setSyncedJobId] = useState(initial.job?.id);
  const announced = useRef(new Set<string>());

  // A new job started (e.g. after "Regenerate day"): adopt the fresh server snapshot.
  if (initial.job?.id !== syncedJobId) {
    setSyncedJobId(initial.job?.id);
    setEvent(initial);
  }

  const active = isJobActive(event);
  const activeJobId = active ? event.job?.id : undefined;

  useEffect(() => {
    if (!activeJobId) return;
    const source = new EventSource(`/api/trips/${tripId}/events`);
    source.onmessage = (e) => {
      const next = JSON.parse(e.data) as ProgressEvent;
      setEvent(next);
      const job = next.job;
      if (job && !isJobActive(next) && !announced.current.has(job.id)) {
        announced.current.add(job.id);
        source.close();
        if (job.status === "FAILED") toast.error(job.error ?? "That change didn't work.");
        else if (job.message) toast.success(job.message);
        router.refresh();
      }
    };
    return () => source.close();
  }, [tripId, activeJobId, router]);

  const params = active ? event.job?.params : null;
  const value: TripLive = {
    event,
    busy: active,
    busyDayNumber:
      active && event.job?.kind === "REGENERATE_DAY" ? (params?.dayNumber ?? null) : null,
    busyItemId: active && event.job?.kind === "SWAP_ACTIVITY" ? (params?.itemId ?? null) : null,
  };

  return (
    <TripLiveContext value={value}>
      {active ? (
        <p role="status" className="sr-only">
          {event.job?.message}
        </p>
      ) : null}
      {children}
    </TripLiveContext>
  );
}
