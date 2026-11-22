"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, LoaderCircleIcon, RotateCwIcon } from "lucide-react";
import type { ProgressEvent } from "@/app/api/trips/[id]/events/route";
import { retryGenerationAction } from "@/server/actions/trips";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const STAGES = [
  { id: "outline", label: "Route", match: (s: string) => s === "outline" || s === "save-outline" },
  {
    id: "details",
    label: "Weather, visa, flights, hotels",
    match: (s: string) => ["weather", "visa", "flights", "hotels"].includes(s),
  },
  { id: "days", label: "Day-by-day plan", match: (s: string) => s.startsWith("day:") },
  { id: "checklist", label: "Checklist", match: (s: string) => s === "checklist" || s === "done" },
];

function stageIndex(step: string | null | undefined) {
  if (!step) return -1;
  return STAGES.findIndex((s) => s.match(step));
}

export function GenerationProgress({
  tripId,
  initial,
}: {
  tripId: string;
  initial: ProgressEvent;
}) {
  const router = useRouter();
  const [state, setState] = useState<ProgressEvent>(initial);
  const [retrying, startRetry] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);
  const failed = state.tripStatus === "FAILED";

  useEffect(() => {
    if (failed) return;
    const source = new EventSource(`/api/trips/${tripId}/events`);
    source.onmessage = (e) => {
      const next = JSON.parse(e.data) as ProgressEvent;
      setState(next);
      if (next.tripStatus === "READY" || next.tripStatus === "FAILED") {
        source.close();
        router.refresh();
      }
    };
    return () => source.close();
  }, [tripId, failed, router]);

  const progress = state.job?.progress ?? 0;
  const current = stageIndex(state.job?.step);

  if (failed) {
    return (
      <div className="border-destructive/30 bg-card rounded-xl border p-6" role="alert">
        <h2 className="text-xl font-semibold">We couldn&apos;t finish this plan</h2>
        <p className="text-muted-foreground mt-2">
          {state.job?.error ?? "Something went wrong while planning."}
        </p>
        {retryError ? <p className="text-destructive mt-2 text-sm">{retryError}</p> : null}
        <Button
          className="mt-5"
          disabled={retrying}
          onClick={() =>
            startRetry(async () => {
              const result = await retryGenerationAction(tripId);
              if (result?.error) setRetryError(result.error);
              else setState({ tripStatus: "QUEUED", job: null });
            })
          }
        >
          <RotateCwIcon className={cn(retrying && "animate-spin")} />
          {retrying ? "Starting again…" : "Try again"}
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <LoaderCircleIcon className="text-primary size-5 animate-spin" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Planning your trip</h2>
      </div>
      <p aria-live="polite" className="mt-3 min-h-6 text-lg">
        {state.job?.message ?? "Waiting for a planner…"}
      </p>
      <div
        role="progressbar"
        aria-label="Plan progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        className="bg-secondary mt-4 h-2 overflow-hidden rounded-full"
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-500"
          style={{ width: `${Math.max(progress, 3)}%` }}
        />
      </div>
      <ol className="mt-6 space-y-3">
        {STAGES.map((stage, i) => {
          const done = i < current || state.tripStatus === "READY";
          const active = i === current && !done;
          return (
            <li key={stage.id} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary text-primary",
                )}
              >
                {done ? (
                  <CheckIcon className="size-3.5" />
                ) : active ? (
                  <span className="bg-primary size-2 rounded-full" />
                ) : null}
              </span>
              <span
                className={cn(
                  done || active ? "text-foreground" : "text-muted-foreground",
                  active && "font-medium",
                )}
              >
                {stage.label}
                <span className="sr-only">{done ? " (done)" : active ? " (in progress)" : ""}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-muted-foreground mt-6 text-sm">
        This usually takes a minute or two. You can leave this page; your trip keeps building.
      </p>
    </div>
  );
}
