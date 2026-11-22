import { isJobActive, type ProgressEvent } from "@/lib/progress-event";
import { db } from "@/server/db";
import { subscribeToTrip } from "@/server/jobs/listener";
import { findOwnedTrip } from "@/server/trip-access";

async function snapshot(tripId: string): Promise<ProgressEvent | null> {
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: {
      status: true,
      jobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          kind: true,
          status: true,
          params: true,
          step: true,
          progress: true,
          message: true,
          error: true,
        },
      },
    },
  });
  if (!trip) return null;
  const job = trip.jobs[0];
  return {
    tripStatus: trip.status,
    job: job
      ? { ...job, params: (job.params ?? null) as NonNullable<ProgressEvent["job"]>["params"] }
      : null,
  };
}

/** Server-Sent Events stream of generation progress for one trip. */
export async function GET(request: Request, ctx: RouteContext<"/api/trips/[id]/events">) {
  const { id } = await ctx.params;
  const owned = await findOwnedTrip(id);
  if (!owned) return new Response("Not found", { status: 404 });

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let last = "";
      const close = () => {
        if (closed) return;
        closed = true;
        cleanup();
        try {
          controller.close();
        } catch {}
      };
      const push = async () => {
        if (closed) return;
        try {
          const event = await snapshot(id);
          if (!event) return close();
          const data = JSON.stringify(event);
          if (data !== last) {
            last = data;
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          // Done when the trip is settled and no edit is still running on it.
          if (
            (event.tripStatus === "READY" || event.tripStatus === "FAILED") &&
            !isJobActive(event)
          )
            close();
        } catch (error) {
          console.error("[sse] snapshot failed", error);
        }
      };

      const unsubscribe = subscribeToTrip(id, () => void push());
      const poll = setInterval(() => void push(), 4000); // safety net if NOTIFY is missed
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(`: keep-alive\n\n`));
      }, 15000);
      cleanup = () => {
        unsubscribe();
        clearInterval(poll);
        clearInterval(heartbeat);
      };
      request.signal.addEventListener("abort", close);
      controller.enqueue(encoder.encode(`retry: 3000\n\n`));
      void push();
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
