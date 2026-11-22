import { db } from "@/server/db";
import { subscribeToTrip } from "@/server/jobs/listener";
import { findOwnedTrip } from "@/server/trip-access";

export type ProgressEvent = {
  tripStatus: "DRAFT" | "QUEUED" | "GENERATING" | "READY" | "FAILED";
  job: {
    status: string;
    step: string | null;
    progress: number;
    message: string | null;
    error: string | null;
  } | null;
};

async function snapshot(tripId: string): Promise<ProgressEvent | null> {
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: {
      status: true,
      jobs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true, step: true, progress: true, message: true, error: true },
      },
    },
  });
  if (!trip) return null;
  return { tripStatus: trip.status, job: trip.jobs[0] ?? null };
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
          if (event.tripStatus === "READY" || event.tripStatus === "FAILED") close();
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
